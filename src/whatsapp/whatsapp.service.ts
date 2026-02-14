import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { Client, LocalAuth } from 'whatsapp-web.js';
import * as qrcode from 'qrcode-terminal';
import axios from 'axios';

@Injectable()
export class WhatsappService implements OnModuleInit {
  private client: Client;
  private readonly logger = new Logger(WhatsappService.name);
  private webhookUrl: string;
  private isReady = false;

  onModuleInit() {
    this.webhookUrl = process.env.WEBHOOK_URL;
    
    this.client = new Client({
      authStrategy: new LocalAuth(),
      puppeteer: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      },
    });

    this.client.on('qr', (qr) => {
      this.logger.log('QR Code received, scan it with your phone:');
      qrcode.generate(qr, { small: true });
    });

    this.client.on('ready', () => {
      this.isReady = true;
      this.logger.log('WhatsApp Client is ready!');
      this.logger.log(`Current Webhook URL: ${this.webhookUrl || 'Not set'}`);
    });

    this.client.on('message', async (message) => {
      this.logger.log(`Received message from ${message.from}: ${message.body}`);
      if (this.webhookUrl) {
        // Construct Cloud API-like webhook payload
        const myNumber = this.client.info?.wid?.user || 'unknown';
        const payload = {
          object: 'whatsapp_business_account',
          entry: [
            {
              id: myNumber, 
              changes: [
                {
                  value: {
                    messaging_product: 'whatsapp',
                    metadata: {
                      display_phone_number: myNumber, 
                      phone_number_id: myNumber,      
                    },
                    contacts: [
                      {
                        profile: {
                            name: (message as any).notifyName || 'Unknown',
                        },
                        wa_id: message.from.replace('@c.us', ''),
                      },
                    ],
                    messages: [
                      {
                        from: message.from.replace('@c.us', ''),
                        id: message.id.id,
                        timestamp: message.timestamp.toString(),
                        text: {
                          body: message.body,
                        },
                        type: 'text',
                      },
                    ],
                  },
                  field: 'messages',
                },
              ],
            },
          ],
        };

        try {
          this.logger.log(`Sending webhook payload: ${JSON.stringify(payload, null, 2)}`);
          await axios.post(this.webhookUrl, payload);
          this.logger.log(`Message forwarded to webhook: ${this.webhookUrl}`);
        } catch (error) {
          this.logger.error(`Failed to forward message to webhook ${this.webhookUrl}`, error);
        }
      } else {
        this.logger.warn('WEBHOOK_URL not set, message not forwarded');
      }
    });
    
    this.client.on('disconnected', (reason) => {
        this.isReady = false;
        this.logger.warn('WhatsApp Client was disconnected', reason);
    });

    this.client.on('auth_failure', (msg) => {
        this.isReady = false;
        this.logger.error('Authentication failed:', msg);
    });

    this.client.on('loading_screen', (percent, message) => {
        this.logger.log(`Loading: ${percent}% - ${message}`);
    });

    this.logger.log('Initializing WhatsApp client...');
    this.client.initialize().catch((err) => {
        this.logger.error('Failed to initialize WhatsApp client:', err);
    });
  }

  getWebhookUrl() {
    return { webhookUrl: this.webhookUrl };
  }

  setWebhookUrl(url: string) {
    this.webhookUrl = url;
    this.logger.log(`Webhook URL updated to: ${url}`);
    return { success: true, webhookUrl: this.webhookUrl };
  }

  async sendMessage(to: string, message: string) {
    if (!this.isReady) {
      this.logger.error('Cannot send message: client is not connected');
      throw new Error('WhatsApp client is not connected. Please scan the QR code first.');
    }
    try {
      // Convert phone number to whatsapp-web.js format if needed
      const chatId = to.includes('@') ? to : `${to}@c.us`;
      const response = await this.client.sendMessage(chatId, message);
      return { success: true, response };
    } catch (error) {
      this.logger.error('Failed to send message', error);
      throw error;
    }
  }

  async sendCloudApiMessage(to: string, message: string) {
    if (!this.isReady) {
      this.logger.error('Cannot send message: client is not connected');
      throw new Error('WhatsApp client is not connected. Please scan the QR code first.');
    }
    try {
      const phoneNumber = to.replace('@c.us', '').replace(/^\+/, '');
      const chatId = to.includes('@') ? to : `${phoneNumber}@c.us`;
      const response = await this.client.sendMessage(chatId, message);

      const messageId = `wamid.${response.id.id}`;

      return {
        messaging_product: 'whatsapp',
        contacts: [{ input: phoneNumber, wa_id: phoneNumber }],
        messages: [{ id: messageId }],
      };
    } catch (error) {
      this.logger.error('Failed to send message', error);
      throw error;
    }
  }

  async markAsRead(messageId: string) {
    this.logger.log(`Mark as read request for message: ${messageId}`);
    // whatsapp-web.js doesn't have a direct "mark as read" API for arbitrary message IDs
    // We acknowledge the request and return success
    return {
      success: true,
    };
  }

  async logout() {
    if (!this.isReady) {
      this.logger.warn('Cannot logout: client is not connected');
      return { success: false, message: 'Client is not connected' };
    }
    try {
      await this.client.logout();
      this.isReady = false;
      this.logger.log('Client logged out');
      return { success: true, message: 'Logged out successfully' };
    } catch (error) {
      this.logger.error('Failed to logout', error);
      throw error;
    }
  }
}
