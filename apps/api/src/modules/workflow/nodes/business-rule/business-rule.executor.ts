import { Injectable } from '@nestjs/common';
import { INodeExecutor, NodeExecutionContext, NodeOutput } from '../../executor/node-executor.interface';
import { ExpressionEvaluator } from '../../../../common/expression/expression-evaluator';

@Injectable()
export class BusinessRuleExecutor implements INodeExecutor {
  constructor(private expr: ExpressionEvaluator) {}

  async execute(ctx: NodeExecutionContext): Promise<NodeOutput> {
    const now = new Date().toISOString();
    const config = ctx.nodeConfig as {
      rules: Array<{
        id: string;
        label: string;
        condition: string;
        targetEdgeId: string;
      }>;
      defaultEdgeId: string;
    };

    const resolveCtx = {
      record: ctx.context['record'],
      context: ctx.context,
      actor: ctx.actor,
      variables: ctx.variables,
      taskResult: ctx.context['taskResult'],
      approvalResult: ctx.context['approvalResult'],
    };

    let matchedEdgeId: string = config.defaultEdgeId;
    let matchedRule: string | null = null;

    for (const rule of config.rules) {
      try {
        const passed = this.expr.evaluateCondition(rule.condition, resolveCtx);
        if (passed) {
          matchedEdgeId = rule.targetEdgeId;
          matchedRule = rule.label;
          break;
        }
      } catch (err) {
        // Condition evaluation error — skip this rule
        continue;
      }
    }

    return {
      status: 'success',
      data: {
        matchedEdgeId,
        matchedRule: matchedRule ?? 'default',
        defaultEdgeId: config.defaultEdgeId,
      },
      nextNodeIds: [matchedEdgeId],
      contextPatch: { businessRuleDecision: { edge: matchedEdgeId, rule: matchedRule } },
      meta: {
        nodeId: ctx.nodeId, nodeType: 'business_rule',
        startedAt: now, completedAt: new Date().toISOString(), actor: ctx.actor,
      },
    };
  }
}
