import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { INodeExecutor, NodeExecutionContext, NodeOutput } from '../../executor/node-executor.interface';
import { WorkflowExecutorService } from '../../executor/workflow-executor.service';
import { ExpressionEvaluator } from '../../../../common/expression/expression-evaluator';

@Injectable()
export class SubWorkflowExecutor implements INodeExecutor {
  constructor(
    @Inject(forwardRef(() => WorkflowExecutorService))
    private executor: WorkflowExecutorService,
    private expr: ExpressionEvaluator,
  ) {}

  async execute(ctx: NodeExecutionContext): Promise<NodeOutput> {
    const now = new Date().toISOString();
    const config = ctx.nodeConfig as {
      workflowId: string;
      inputMappings?: Array<{ key: string; valueExpression: string }>;
    };

    const resolveCtx = {
      record: ctx.context['record'],
      context: ctx.context,
      actor: ctx.actor,
      variables: ctx.variables,
    };

    // Build child context from input mappings
    const childContext: Record<string, unknown> = {
      parentRunId: ctx.runId,
      parentNodeId: ctx.nodeId,
    };

    for (const mapping of config.inputMappings ?? []) {
      childContext[mapping.key] = this.expr.evaluate(mapping.valueExpression, resolveCtx);
    }

    // Start child run
    const childRunId = await this.executor.startRun(config.workflowId, {
      type: 'sub_workflow',
      context: childContext,
      actorId: ctx.actor.id,
    });

    return {
      status: 'waiting',
      data: { childRunId, parentRunId: ctx.runId, childWorkflowId: config.workflowId },
      contextPatch: { subWorkflowRunId: childRunId },
      meta: {
        nodeId: ctx.nodeId, nodeType: 'sub_workflow',
        startedAt: now, completedAt: now, actor: ctx.actor,
      },
    };
  }
}
