import { Injectable } from '@nestjs/common';
import { INodeExecutor, NodeExecutionContext, NodeOutput } from '../../executor/node-executor.interface';
import { PrismaService } from '../../../../prisma/prisma.service';
import { ExpressionEvaluator } from '../../../../common/expression/expression-evaluator';
import { EventEmitter2 } from '@nestjs/event-emitter';
import * as crypto from 'crypto';

@Injectable()
export class NotificationExecutor implements INodeExecutor {
  constructor(
    private prisma: PrismaService,
    private expr: ExpressionEvaluator,
    private events: EventEmitter2,
  ) {}

  async execute(ctx: NodeExecutionContext): Promise<NodeOutput> {
    const now = new Date().toISOString();
    const config = ctx.nodeConfig as {
      recipients: Array<{ type: 'user' | 'role' | 'team' | 'expression'; value: string }>;
      channels: Array<'in_app' | 'email' | 'zalo_oa' | 'slack'>;
      subjectTemplate: string;
      bodyTemplate: string;
      dedupeWindowMinutes?: number;
    };

    const resolveCtx = {
      record: ctx.context['record'],
      context: ctx.context,
      actor: ctx.actor,
      variables: ctx.variables,
      taskResult: ctx.context['taskResult'],
      approvalResult: ctx.context['approvalResult'],
    };

    const subject = this.expr.resolveTemplate(config.subjectTemplate, resolveCtx);
    const body = this.expr.resolveTemplate(config.bodyTemplate, resolveCtx);
    const bodyHash = crypto.createHash('md5').update(subject + body).digest('hex');

    // Deduplicate: check if same notification sent recently
    const dedupeWindow = config.dedupeWindowMinutes ?? 5;
    const windowStart = new Date(Date.now() - dedupeWindow * 60 * 1000);
    const existing = await this.prisma.notificationRecord.findFirst({
      where: {
        runId: ctx.runId,
        nodeId: ctx.nodeId,
        bodyHash,
        sentAt: { gte: windowStart },
      },
    });

    if (existing) {
      return {
        status: 'success',
        data: { deduped: true, originalId: existing.id },
        meta: {
          nodeId: ctx.nodeId, nodeType: 'notification',
          startedAt: now, completedAt: new Date().toISOString(), actor: ctx.actor,
          warnings: ['Notification deduped'],
        },
      };
    }

    // Resolve recipients
    const recipientIds = await this.resolveRecipients(config.recipients, ctx);

    // Create notification record
    const record = await this.prisma.notificationRecord.create({
      data: {
        runId: ctx.runId,
        nodeId: ctx.nodeId,
        recipients: recipientIds,
        channels: config.channels,
        subject,
        bodyHash,
        deliveryStatus: {},
        deduped: false,
      },
    });

    // Emit to notification service for delivery
    for (const channel of config.channels) {
      this.events.emit(`notification.send.${channel}`, {
        notificationId: record.id,
        recipients: recipientIds,
        subject,
        body,
        runId: ctx.runId,
      });
    }

    return {
      status: 'success',
      data: { notificationId: record.id, recipientCount: recipientIds.length, channels: config.channels },
      contextPatch: { lastNotificationId: record.id },
      meta: {
        nodeId: ctx.nodeId, nodeType: 'notification',
        startedAt: now, completedAt: new Date().toISOString(), actor: ctx.actor,
      },
    };
  }

  private async resolveRecipients(
    recipients: Array<{ type: string; value: string }>,
    ctx: NodeExecutionContext,
  ): Promise<string[]> {
    const ids: string[] = [];
    for (const r of recipients) {
      if (r.type === 'user') {
        ids.push(r.value);
      } else if (r.type === 'expression') {
        const val = this.expr.evaluate(r.value, {
          record: ctx.context['record'],
          context: ctx.context,
          actor: ctx.actor,
        });
        if (typeof val === 'string') ids.push(val);
      }
    }
    return [...new Set(ids)];
  }
}
