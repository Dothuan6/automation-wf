import { Injectable } from '@nestjs/common';
import { INodeExecutor, NodeExecutionContext, NodeOutput } from '../../executor/node-executor.interface';
import { PrismaService } from '../../../../prisma/prisma.service';
import { ExpressionEvaluator } from '../../../../common/expression/expression-evaluator';
import { addHours, addDays, addMinutes, parseISO } from 'date-fns';

@Injectable()
export class TimerWaitExecutor implements INodeExecutor {
  constructor(
    private prisma: PrismaService,
    private expr: ExpressionEvaluator,
  ) {}

  async execute(ctx: NodeExecutionContext): Promise<NodeOutput> {
    const now = new Date().toISOString();
    const config = ctx.nodeConfig as {
      mode: 'relative' | 'absolute' | 'expression';
      value?: string | number;
      unit?: 'minutes' | 'hours' | 'days';
      dateExpression?: string;
      timezone?: string;
    };

    let scheduledAt: Date;

    if (config.mode === 'relative') {
      const amount = Number(config.value ?? 1);
      const now2 = new Date();
      switch (config.unit) {
        case 'minutes': scheduledAt = addMinutes(now2, amount); break;
        case 'hours': scheduledAt = addHours(now2, amount); break;
        case 'days': scheduledAt = addDays(now2, amount); break;
        default: scheduledAt = addHours(now2, amount);
      }
    } else if (config.mode === 'absolute' && config.value) {
      scheduledAt = parseISO(String(config.value));
    } else if (config.mode === 'expression' && config.dateExpression) {
      const resolved = this.expr.evaluate(config.dateExpression, {
        record: ctx.context['record'],
        context: ctx.context,
        actor: ctx.actor,
        variables: ctx.variables,
      });
      scheduledAt = parseISO(String(resolved));
    } else {
      scheduledAt = addHours(new Date(), 1);
    }

    const timerId = `timer:${ctx.runId}:${ctx.nodeId}`;
    await this.prisma.timerJob.create({
      data: {
        id: timerId,
        runId: ctx.runId,
        nodeId: ctx.nodeId,
        mode: config.mode,
        scheduledAt,
        status: 'pending',
        payload: { nodeId: ctx.nodeId },
        timezone: config.timezone,
      },
    });

    return {
      status: 'waiting',
      data: { timerId, scheduledAt: scheduledAt.toISOString() },
      meta: {
        nodeId: ctx.nodeId, nodeType: 'timer_wait',
        startedAt: now, completedAt: now, actor: ctx.actor,
      },
    };
  }
}
