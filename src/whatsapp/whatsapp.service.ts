import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { Client, LocalAuth } from 'whatsapp-web.js';
import * as qrcode from 'qrcode-terminal';
import axios from 'axios';

@Injectable()
export class WhatsappService implements OnModuleInit {
  private client: Client;
  private readonly logger = new Logger(WhatsappService.name);
  private webhookUrl: string;

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
      this.logger.log('WhatsApp Client is ready!');
      this.logger.log(`Current Webhook URL: ${this.webhookUrl || 'Not set'}`);
    });

    this.client.on('message', async (message) => {
      this.logger.log(`Received message from ${message.from}: ${message.body}`);
      if (this.webhookUrl) {
        // Construct Cloud API-like webhook payload
        const payload = {
          object: 'whatsapp_business_account',
          entry: [
            {
              id: '123456789', // Mock Account ID
              changes: [
                {
                  value: {
                    messaging_product: 'whatsapp',
                    metadata: {
                      display_phone_number: '1234567890', // Mock display number
                      phone_number_id: '1234567890',      // Mock phone ID
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
        this.logger.warn('WhatsApp Client was disconnected', reason);
    });

    this.client.initialize();
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
    try {
      const response = await this.client.sendMessage(to, message);
      return { success: true, response };
    } catch (error) {
      this.logger.error('Failed to send message', error);
      throw error;
    }
  }

  async logout() {
    try {
      await this.client.logout();
      this.logger.log('Client logged out');
      return { success: true, message: 'Logged out successfully' };
    } catch (error) {
      this.logger.error('Failed to logout', error);
      throw error;
    }
  }
}
