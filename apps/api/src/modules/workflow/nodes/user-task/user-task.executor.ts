import { Injectable } from '@nestjs/common';
import { INodeExecutor, NodeExecutionContext, NodeOutput } from '../../executor/node-executor.interface';
import { PrismaService } from '../../../../prisma/prisma.service';
import { ExpressionEvaluator } from '../../../../common/expression/expression-evaluator';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { addHours } from 'date-fns';

@Injectable()
export class UserTaskExecutor implements INodeExecutor {
  constructor(
    private prisma: PrismaService,
    private expr: ExpressionEvaluator,
    private events: EventEmitter2,
  ) {}

  async execute(ctx: NodeExecutionContext): Promise<NodeOutput> {
    const now = new Date().toISOString();
    const config = ctx.nodeConfig as {
      title: string;
      description?: string;
      assignee: { type: 'user' | 'role' | 'team' | 'record_owner' | 'expression'; value: string };
      priority?: string;
      slaHours?: number;
      formSchema?: unknown;
    };

    // Resolve title template
    const title = this.expr.resolveTemplate(config.title, {
      record: ctx.context['record'],
      context: ctx.context,
      actor: ctx.actor,
      variables: ctx.variables,
    });

    // Resolve assignee
    const assigneeId = await this.resolveAssignee(config.assignee, ctx);

    // Compute due date
    const dueAt = config.slaHours ? addHours(new Date(), config.slaHours) : undefined;

    // Create TaskItem
    const task = await this.prisma.taskItem.create({
      data: {
        runId: ctx.runId,
        nodeId: ctx.nodeId,
        title,
        description: config.description,
        assigneeId,
        priority: config.priority,
        dueAt,
        formSchema: config.formSchema as any,
        status: 'pending',
      },
    });

    // Emit notification event
    this.events.emit('notification.task_created', {
      taskId: task.id,
      assigneeId,
      title,
      runId: ctx.runId,
      dueAt,
    });

    return {
      status: 'waiting',
      data: { taskId: task.id, assigneeId, title, dueAt },
      meta: {
        nodeId: ctx.nodeId, nodeType: 'user_task',
        startedAt: now, completedAt: now, actor: ctx.actor,
      },
    };
  }

  private async resolveAssignee(
    assignee: { type: string; value: string },
    ctx: NodeExecutionContext,
  ): Promise<string> {
    switch (assignee.type) {
      case 'user':
        return assignee.value;
      case 'expression': {
        const resolved = this.expr.evaluate(assignee.value, {
          record: ctx.context['record'],
          context: ctx.context,
          actor: ctx.actor,
          variables: ctx.variables,
        });
        return String(resolved ?? ctx.actor.id);
      }
      case 'record_owner': {
        const record = ctx.context['record'] as Record<string, unknown>;
        return String(record?.['created_by'] ?? ctx.actor.id);
      }
      default:
        return ctx.actor.id;
    }
  }
}
