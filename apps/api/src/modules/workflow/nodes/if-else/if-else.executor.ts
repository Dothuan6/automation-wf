import { Injectable } from '@nestjs/common';
import { INodeExecutor, NodeExecutionContext, NodeOutput } from '../../executor/node-executor.interface';
import { ExpressionEvaluator } from '../../../../common/expression/expression-evaluator';

@Injectable()
export class IfElseExecutor implements INodeExecutor {
  constructor(private expr: ExpressionEvaluator) {}

  async execute(ctx: NodeExecutionContext): Promise<NodeOutput> {
    const now = new Date().toISOString();
    const config = ctx.nodeConfig as {
      condition: string;
      trueEdgeId: string;
      falseEdgeId: string;
    };

    const resolveCtx = {
      record: ctx.context['record'],
      context: ctx.context,
      actor: ctx.actor,
      variables: ctx.variables,
      taskResult: ctx.context['taskResult'],
      approvalResult: ctx.context['approvalResult'],
    };

    const result = this.expr.evaluateCondition(config.condition, resolveCtx);
    const nextEdgeId = result ? config.trueEdgeId : config.falseEdgeId;

    return {
      status: 'success',
      data: { condition: config.condition, result, nextEdgeId },
      nextNodeIds: [nextEdgeId],
      contextPatch: { ifElseResult: result },
      meta: {
        nodeId: ctx.nodeId, nodeType: 'if_else',
        startedAt: now, completedAt: new Date().toISOString(), actor: ctx.actor,
      },
    };
  }
}
