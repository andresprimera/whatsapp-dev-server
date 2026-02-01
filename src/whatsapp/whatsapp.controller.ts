import { Controller, Post, Body, Get, BadRequestException } from '@nestjs/common';
import { WhatsappService } from './whatsapp.service';

@Controller('whatsapp')
export class WhatsappController {
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
    return this.whatsappService.logout();
  }
}
