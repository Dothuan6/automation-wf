import { Injectable } from '@nestjs/common';
import { INodeExecutor, NodeExecutionContext, NodeOutput } from '../../executor/node-executor.interface';

@Injectable()
export class ManualTriggerExecutor implements INodeExecutor {
  async execute(ctx: NodeExecutionContext): Promise<NodeOutput> {
    const now = new Date().toISOString();

    // Manual trigger: validate form inputs and initialize context
    const formValues = ctx.context['formValues'] as Record<string, unknown> ?? {};

    return {
      status: 'success',
      data: {
        triggerType: 'manual',
        formValues,
        triggeredAt: ctx.triggeredAt,
      },
      contextPatch: { manualTrigger: { formValues, triggeredAt: ctx.triggeredAt } },
      meta: {
        nodeId: ctx.nodeId,
        nodeType: 'manual_trigger',
        startedAt: now,
        completedAt: now,
        actor: ctx.actor,
      },
    };
  }
}
