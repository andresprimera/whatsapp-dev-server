import { Controller, Post, Body, Get, BadRequestException, Logger } from '@nestjs/common';
import { WhatsappService } from './whatsapp.service';

@Controller('whatsapp')
export class WhatsappController {
  private readonly logger = new Logger(WhatsappController.name);

  constructor(private readonly whatsappService: WhatsappService) {}

  @Post('send')
  async sendMessage(@Body() body: any) {
    // Basic validation for Cloud API payload structure
    if (
      body.messaging_product !== 'whatsapp' ||
      body.recipient_type !== 'individual' ||
      body.type !== 'text' ||
      !body.to ||
      !body.text?.body
    ) {
        throw new BadRequestException('Invalid Cloud API payload format');
    }

    return this.whatsappService.sendMessage(body.to, body.text.body);
  }

  @Get('logout')
  async logout() {
    this.logger.log('Logout request received');
    return this.whatsappService.logout();
  }

  @Get('config/webhook')
  async getWebhookUrl() {
    return this.whatsappService.getWebhookUrl();
  }

  @Post('config/webhook')
  async setWebhookUrl(@Body() body: { url: string }) {
    if (!body.url) {
        throw new BadRequestException('URL is required');
    }
    return this.whatsappService.setWebhookUrl(body.url);
  }
}
