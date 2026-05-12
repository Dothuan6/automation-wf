import { Injectable } from '@nestjs/common';
import { INodeExecutor, NodeExecutionContext, NodeOutput } from '../../executor/node-executor.interface';
import { ExpressionEvaluator } from '../../../../common/expression/expression-evaluator';

@Injectable()
export class RecordTriggerExecutor implements INodeExecutor {
  constructor(private expr: ExpressionEvaluator) {}

  async execute(ctx: NodeExecutionContext): Promise<NodeOutput> {
    const now = new Date().toISOString();
    const config = ctx.nodeConfig as {
      collectionId: string;
      event: 'created' | 'updated' | 'deleted' | 'field_changed';
      condition?: string;
      watchedFields?: string[];
    };

    const record = ctx.context['record'] as Record<string, unknown>;
    const recordBefore = ctx.context['recordBefore'] as Record<string, unknown> | undefined;

    // Evaluate filter condition if present
    if (config.condition) {
      const passes = this.expr.evaluateCondition(config.condition, {
        record,
        recordBefore,
        context: ctx.context,
        actor: ctx.actor,
        triggeredAt: ctx.triggeredAt,
      });
      if (!passes) {
        return {
          status: 'skipped',
          data: { reason: 'condition_not_met' },
          meta: {
            nodeId: ctx.nodeId, nodeType: 'record_trigger',
            startedAt: now, completedAt: now, actor: ctx.actor,
          },
        };
      }
    }

    return {
      status: 'success',
      data: { triggerType: 'record_event', event: config.event, record, recordBefore },
      contextPatch: { recordTrigger: { event: config.event, record, recordBefore } },
      meta: {
        nodeId: ctx.nodeId, nodeType: 'record_trigger',
        startedAt: now, completedAt: now, actor: ctx.actor,
      },
    };
  }
}
