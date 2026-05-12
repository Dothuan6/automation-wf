import { Injectable } from '@nestjs/common';
import { INodeExecutor, NodeExecutionContext, NodeOutput } from '../../executor/node-executor.interface';
import { PrismaService } from '../../../../prisma/prisma.service';
import { ExpressionEvaluator } from '../../../../common/expression/expression-evaluator';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { addHours } from 'date-fns';

@Injectable()
export class ApprovalTaskExecutor implements INodeExecutor {
  constructor(
    private prisma: PrismaService,
    private expr: ExpressionEvaluator,
    private events: EventEmitter2,
  ) {}

  async execute(ctx: NodeExecutionContext): Promise<NodeOutput> {
    const now = new Date().toISOString();
    const config = ctx.nodeConfig as {
      approver: { type: 'user' | 'role' | 'manager' | 'expression'; value: string };
      subject: { titleTemplate: string; summaryTemplate?: string };
      contextItems?: Array<{ label: string; valueExpression: string }>;
      slaHours?: number;
      escalateTo?: string;
    };

    const resolveCtx = {
      record: ctx.context['record'],
      context: ctx.context,
      actor: ctx.actor,
      variables: ctx.variables,
    };

    const approverSubject = {
      title: this.expr.resolveTemplate(config.subject.titleTemplate, resolveCtx),
      summary: config.subject.summaryTemplate
        ? this.expr.resolveTemplate(config.subject.summaryTemplate, resolveCtx)
        : undefined,
    };

    const reviewItems = (config.contextItems ?? []).map((item) => ({
      label: item.label,
      value: this.expr.evaluate(item.valueExpression, resolveCtx),
    }));

    const approverId = await this.resolveApprover(config.approver, ctx);
    const dueAt = config.slaHours ? addHours(new Date(), config.slaHours) : undefined;

    const approval = await this.prisma.approvalItem.create({
      data: {
        runId: ctx.runId,
        nodeId: ctx.nodeId,
        requesterId: ctx.actor.id,
        approverId,
        approvalSubject,
        reviewItems,
        dueAt,
        escalatedTo: config.escalateTo,
        status: 'pending',
      },
    });

    this.events.emit('notification.approval_requested', {
      approvalId: approval.id,
      approverId,
      subject: approverSubject.title,
      runId: ctx.runId,
      dueAt,
    });

    return {
      status: 'waiting',
      data: { approvalId: approval.id, approverId, subject: approverSubject },
      meta: {
        nodeId: ctx.nodeId, nodeType: 'approval_task',
        startedAt: now, completedAt: now, actor: ctx.actor,
      },
    };
  }

  private async resolveApprover(
    approver: { type: string; value: string },
    ctx: NodeExecutionContext,
  ): Promise<string> {
    if (approver.type === 'user') return approver.value;
    if (approver.type === 'expression') {
      const val = this.expr.evaluate(approver.value, {
        record: ctx.context['record'],
        context: ctx.context,
        actor: ctx.actor,
      });
      return String(val ?? ctx.actor.id);
    }
    return ctx.actor.id;
  }
}
