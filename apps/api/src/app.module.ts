import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { PrismaModule } from './prisma/prisma.module';
import { IamModule } from './modules/iam/iam.module';
import { CollectionsModule } from './modules/collections/collections.module';
import { WorkflowModule } from './modules/workflow/workflow.module';
import { FileStorageModule } from './modules/file-storage/file-storage.module';
import { FileManagementModule } from './modules/file-management/file-management.module';
import { SettingsModule } from './modules/settings/settings.module';
import { VirtualAgentModule } from './modules/virtual-agent/virtual-agent.module';
import { AuditModule } from './modules/audit/audit.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { AppTemplatesModule } from './modules/app-templates/app-templates.module';
import { HealthController } from './health.controller';

@Module({
  imports: [
    // Config
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),

    // Rate limiting
    ThrottlerModule.forRoot([
      { name: 'short', ttl: 1000, limit: 20 },
      { name: 'long', ttl: 60000, limit: 200 },
    ]),

    // Event bus
    EventEmitterModule.forRoot({ wildcard: true }),

    // Core
    PrismaModule,

    // Feature modules
    IamModule,
    CollectionsModule,
    WorkflowModule,
    FileStorageModule,
    FileManagementModule,
    SettingsModule,
    VirtualAgentModule,
    AuditModule,
    NotificationsModule,
    DashboardModule,
    AppTemplatesModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
