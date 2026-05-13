import { Module } from '@nestjs/common';
import { VirtualAgentService } from './virtual-agent.service';
import { VirtualAgentController } from './virtual-agent.controller';
import { SettingsModule } from '../settings/settings.module';

@Module({
  imports: [SettingsModule],
  controllers: [VirtualAgentController],
  providers: [VirtualAgentService],
  exports: [VirtualAgentService],
})
export class VirtualAgentModule {}
