import {
  Controller,
  Post,
  Body,
  Param,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { WhatsappService } from './whatsapp.service';

@Controller()
export class CloudApiController {
  private readonly logger = new Logger(CloudApiController.name);

  constructor(private readonly whatsappService: WhatsappService) {}

  @Post(':version/:phoneId/messages')
  async handleMessages(
    @Param('version') version: string,
    @Param('phoneId') phoneId: string,
    @Body() body: any,
  ) {
    this.logger.log(
      `Cloud API request: ${version}/${phoneId}/messages - ${JSON.stringify(body)}`,
    );

    if (body.messaging_product !== 'whatsapp') {
      throw new BadRequestException('messaging_product must be "whatsapp"');
    }

    // Handle "mark as read" request
    if (body.status === 'read' && body.message_id) {
      return this.whatsappService.markAsRead(body.message_id);
    }

    // Handle send message request
    if (body.type === 'text' && body.text?.body && body.to) {
      if (body.recipient_type && body.recipient_type !== 'individual') {
        throw new BadRequestException('recipient_type must be "individual"');
      }
      return this.whatsappService.sendCloudApiMessage(body.to, body.text.body);
    }

    throw new BadRequestException(
      'Invalid request. Must be either a send message request (with type, to, text.body) or mark as read (with status: "read", message_id)',
    );
  }
}
