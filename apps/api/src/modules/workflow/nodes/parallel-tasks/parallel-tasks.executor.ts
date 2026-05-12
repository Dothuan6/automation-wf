import { Injectable } from '@nestjs/common';
import { INodeExecutor, NodeExecutionContext, NodeOutput } from '../../executor/node-executor.interface';
import { PrismaService } from '../../../../prisma/prisma.service';
import { ExpressionEvaluator } from '../../../../common/expression/expression-evaluator';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class ParallelTasksExecutor implements INodeExecutor {
  constructor(
    private prisma: PrismaService,
    private expr: ExpressionEvaluator,
    private events: EventEmitter2,
  ) {}

  async execute(ctx: NodeExecutionContext): Promise<NodeOutput> {
    const now = new Date().toISOString();
    const config = ctx.nodeConfig as {
      tasks: Array<{
        title: string;
        assignee: { type: string; value: string };
      }>;
      joinPolicy: 'all_complete' | 'any_complete' | `threshold:${number}`;
      failurePolicy?: 'fail_fast' | 'wait_others';
    };

    const resolveCtx = {
      record: ctx.context['record'],
      context: ctx.context,
      actor: ctx.actor,
      variables: ctx.variables,
    };

    // Create all task items
    const taskIds: string[] = [];
    for (const task of config.tasks) {
      const title = this.expr.resolveTemplate(task.title, resolveCtx);
      const assigneeId = task.assignee.type === 'user'
        ? task.assignee.value
        : ctx.actor.id;

      const taskItem = await this.prisma.taskItem.create({
        data: {
          runId: ctx.runId,
          nodeId: ctx.nodeId,
          title,
          assigneeId,
          status: 'pending',
        },
      });
      taskIds.push(taskItem.id);

      this.events.emit('notification.task_created', {
        taskId: taskItem.id,
        assigneeId,
        title,
        runId: ctx.runId,
      });
    }

    // Create parallel group
    await this.prisma.parallelGroup.create({
      data: {
        runId: ctx.runId,
        nodeId: ctx.nodeId,
        joinPolicy: config.joinPolicy,
        childTaskIds: taskIds,
        failurePolicy: config.failurePolicy,
        status: 'waiting',
      },
    });

    return {
      status: 'waiting',
      data: { taskIds, joinPolicy: config.joinPolicy, taskCount: taskIds.length },
      meta: {
        nodeId: ctx.nodeId, nodeType: 'parallel_tasks',
        startedAt: now, completedAt: now, actor: ctx.actor,
      },
    };
  }
}
