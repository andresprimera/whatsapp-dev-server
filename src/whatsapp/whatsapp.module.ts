import { Module } from '@nestjs/common';
import { WhatsappService } from './whatsapp.service';
import { WhatsappController } from './whatsapp.controller';
import { CloudApiController } from './cloud-api.controller';

@Module({
  providers: [WhatsappService],
  controllers: [WhatsappController, CloudApiController],
})
export class WhatsappModule {}
