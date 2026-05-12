import { Injectable } from '@nestjs/common';
import { INodeExecutor, NodeExecutionContext, NodeOutput } from '../../executor/node-executor.interface';

@Injectable()
export class EndExecutor implements INodeExecutor {
  async execute(ctx: NodeExecutionContext): Promise<NodeOutput> {
    const now = new Date().toISOString();
    const config = ctx.nodeConfig as {
      endStatus?: 'success' | 'cancelled' | 'rejected';
      reason?: string;
    };

    // End node: pure terminal marker. Does NOT write to DB or send notifications.
    // WorkflowExecutorService handles completing the run when it sees End node.
    return {
      status: 'success',
      data: {
        endStatus: config.endStatus ?? 'success',
        reason: config.reason,
        completedAt: now,
      },
      meta: {
        nodeId: ctx.nodeId, nodeType: 'end',
        startedAt: now, completedAt: now, actor: ctx.actor,
      },
    };
  }
}
