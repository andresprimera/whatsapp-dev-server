import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

import { Logger } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const port = process.env.PORT || 3005;
  const baseUrl = process.env.BASE_URL || `http://localhost:${port}`;
  await app.listen(port);
  Logger.log(`Server running on ${baseUrl}`, 'Bootstrap');
  Logger.log(`Logout URL: ${baseUrl}/whatsapp/logout`, 'Bootstrap');
}
bootstrap();
