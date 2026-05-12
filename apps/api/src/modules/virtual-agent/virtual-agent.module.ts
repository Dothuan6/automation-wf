import { Module } from '@nestjs/common';
import { VirtualAgentService } from './virtual-agent.service';
import { VirtualAgentController } from './virtual-agent.controller';

@Module({
  controllers: [VirtualAgentController],
  providers: [VirtualAgentService],
  exports: [VirtualAgentService],
})
export class VirtualAgentModule {}
