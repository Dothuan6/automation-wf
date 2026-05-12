import { NodeType } from '@prisma/client';

export interface NodeExecutionContext {
  runId: string;
  workflowId: string;
  workflowVersion: string;
  nodeId: string;
  nodeType: NodeType;
  nodeConfig: Record<string, unknown>;
  context: Record<string, unknown>;
  variables: Record<string, unknown>;
  actor: { id: string; email?: string };
  triggeredAt: string;
  previousNodeOutput?: Record<string, unknown>;
}

export type NodeOutputStatus = 'success' | 'failed' | 'waiting' | 'skipped';

export interface NodeOutput {
  status: NodeOutputStatus;
  data: Record<string, unknown>;
  contextPatch?: Record<string, unknown>;
  nextNodeIds?: string[];
  meta: {
    nodeId: string;
    nodeType: string;
    startedAt: string;
    completedAt: string;
    actor: Record<string, unknown>;
    warnings?: string[];
  };
}

export interface INodeExecutor {
  execute(ctx: NodeExecutionContext): Promise<NodeOutput>;
}
