import { Module } from '@nestjs/common';
import { AppTemplatesService } from './app-templates.service';
import { AppTemplatesController } from './app-templates.controller';

@Module({
  controllers: [AppTemplatesController],
  providers: [AppTemplatesService],
  exports: [AppTemplatesService],
})
export class AppTemplatesModule {}
