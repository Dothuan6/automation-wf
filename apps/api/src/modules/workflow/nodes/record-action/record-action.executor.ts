import { Injectable } from '@nestjs/common';
import { INodeExecutor, NodeExecutionContext, NodeOutput } from '../../executor/node-executor.interface';
import { CollectionsService } from '../../../collections/collections.service';
import { ExpressionEvaluator } from '../../../../common/expression/expression-evaluator';

@Injectable()
export class RecordActionExecutor implements INodeExecutor {
  constructor(
    private collections: CollectionsService,
    private expr: ExpressionEvaluator,
  ) {}

  async execute(ctx: NodeExecutionContext): Promise<NodeOutput> {
    const now = new Date().toISOString();
    const config = ctx.nodeConfig as {
      collectionId: string;
      operation: 'create' | 'update' | 'delete';
      recordIdExpression?: string;
      fieldMappings: Array<{ fieldId: string; valueExpression: string }>;
    };

    const resolveCtx = {
      record: ctx.context['record'],
      context: ctx.context,
      actor: ctx.actor,
      variables: ctx.variables,
      taskResult: ctx.context['taskResult'],
      approvalResult: ctx.context['approvalResult'],
    };

    try {
      let result: unknown;

      if (config.operation === 'create') {
        const data: Record<string, unknown> = {};
        for (const mapping of config.fieldMappings) {
          data[mapping.fieldId] = this.expr.evaluate(mapping.valueExpression, resolveCtx);
        }
        result = await this.collections.createRecord(config.collectionId, data, ctx.actor.id);
      } else if (config.operation === 'update') {
        if (!config.recordIdExpression) throw new Error('recordIdExpression required for update');
        const recordId = String(this.expr.evaluate(config.recordIdExpression, resolveCtx));
        const data: Record<string, unknown> = {};
        for (const mapping of config.fieldMappings) {
          data[mapping.fieldId] = this.expr.evaluate(mapping.valueExpression, resolveCtx);
        }
        result = await this.collections.updateRecord(config.collectionId, recordId, data, ctx.actor.id);
      } else if (config.operation === 'delete') {
        if (!config.recordIdExpression) throw new Error('recordIdExpression required for delete');
        const recordId = String(this.expr.evaluate(config.recordIdExpression, resolveCtx));
        await this.collections.deleteRecord(config.collectionId, recordId, ctx.actor.id);
        result = { deleted: true, recordId };
      }

      return {
        status: 'success',
        data: { operation: config.operation, result },
        contextPatch: { recordActionResult: result },
        meta: {
          nodeId: ctx.nodeId, nodeType: 'record_action',
          startedAt: now, completedAt: new Date().toISOString(), actor: ctx.actor,
        },
      };
    } catch (err) {
      return {
        status: 'failed',
        data: { error: (err as Error).message, operation: config.operation },
        meta: {
          nodeId: ctx.nodeId, nodeType: 'record_action',
          startedAt: now, completedAt: new Date().toISOString(), actor: ctx.actor,
          warnings: [(err as Error).message],
        },
      };
    }
  }
}
