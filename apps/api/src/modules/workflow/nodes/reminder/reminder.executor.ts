import { Injectable } from '@nestjs/common';
import { INodeExecutor, NodeExecutionContext, NodeOutput } from '../../executor/node-executor.interface';
import { PrismaService } from '../../../../prisma/prisma.service';
import { ExpressionEvaluator } from '../../../../common/expression/expression-evaluator';
import { parseISO } from 'date-fns';

@Injectable()
export class ReminderExecutor implements INodeExecutor {
  constructor(
    private prisma: PrismaService,
    private expr: ExpressionEvaluator,
  ) {}

  async execute(ctx: NodeExecutionContext): Promise<NodeOutput> {
    const now = new Date().toISOString();
    const config = ctx.nodeConfig as {
      dueDateExpression: string;
      offsets: string[];
      stopCondition?: string;
      stopMode?: 'task_completed' | 'record_field_changed' | 'manual_cancel';
      reschedulePolicy: 'skip_if_done' | 'always_send' | 'send_once';
      timezone?: string;
      notificationConfig: {
        channels: string[];
        recipientExpression: string;
        subjectTemplate: string;
        bodyTemplate: string;
      };
    };

    const resolveCtx = {
      record: ctx.context['record'],
      context: ctx.context,
      actor: ctx.actor,
      variables: ctx.variables,
    };

    const dueDateStr = String(this.expr.evaluate(config.dueDateExpression, resolveCtx) ?? now);
    const dueDate = parseISO(dueDateStr);

    await this.prisma.reminderSchedule.create({
      data: {
        runId: ctx.runId,
        nodeId: ctx.nodeId,
        dueDateAt: dueDate,
        offsets: config.offsets,
        stopCondition: config.stopCondition,
        stopMode: config.stopMode,
        reschedulePolicy: config.reschedulePolicy,
        timezone: config.timezone ?? 'Asia/Ho_Chi_Minh',
        status: 'active',
      },
    });

    // Reminder is fire-and-continue — does NOT block workflow
    return {
      status: 'success',
      data: { scheduled: true, dueDate: dueDate.toISOString(), offsets: config.offsets },
      meta: {
        nodeId: ctx.nodeId, nodeType: 'reminder',
        startedAt: now, completedAt: new Date().toISOString(), actor: ctx.actor,
      },
    };
  }
}
