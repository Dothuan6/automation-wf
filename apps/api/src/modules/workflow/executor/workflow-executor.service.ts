import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { NodeExecutorRegistry } from './node-executor.registry';
import { NodeExecutionContext, NodeOutput } from './node-executor.interface';
import { NodeStatus, RunStatus, NodeType } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

export interface WorkflowNode {
  id: string;
  type: NodeType;
  config: Record<string, unknown>;
  position?: { x: number; y: number };
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  condition?: string;
  label?: string;
}

export interface WorkflowDefinitionJson {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  variables: Array<{ name: string; type: string; direction: string; defaultValue?: unknown }>;
  triggers: Array<{ type: string; config: Record<string, unknown> }>;
}

@Injectable()
export class WorkflowExecutorService {
  private readonly logger = new Logger(WorkflowExecutorService.name);

  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    private events: EventEmitter2,
    private registry: NodeExecutorRegistry,
  ) {}

  async startRun(
    workflowId: string,
    trigger: { type: string; context: Record<string, unknown>; actorId: string },
  ): Promise<string> {
    const definition = await this.prisma.workflowDefinition.findUnique({
      where: { id: workflowId },
      include: {
        versions: {
          where: { version: undefined },
          orderBy: { publishedAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!definition) throw new NotFoundException('Workflow không tồn tại.');
    if (definition.status !== 'published') throw new Error('Workflow chưa được publish.');
    if (!definition.versions.length) throw new Error('Workflow không có version.');

    const version = definition.versions[0];
    const defJson = version.jsonDefinition as unknown as WorkflowDefinitionJson;

    // Find trigger node
    const triggerNode = defJson.nodes.find((n) =>
      n.type === 'manual_trigger' || n.type === 'record_trigger',
    );
    if (!triggerNode) throw new Error('Không tìm thấy trigger node.');

    // Initialize variables
    const variables: Record<string, unknown> = {};
    for (const v of defJson.variables ?? []) {
      variables[v.name] = v.defaultValue ?? null;
    }

    const run = await this.prisma.workflowRun.create({
      data: {
        workflowId,
        workflowVersion: version.version,
        triggerType: trigger.type,
        triggeredBy: trigger.actorId,
        context: trigger.context,
        variables,
        status: 'created',
        currentNodeId: triggerNode.id,
      },
    });

    await this.audit.log('workflow_run.started', { id: trigger.actorId, type: 'user' }, {
      runId: run.id, workflowId, triggerType: trigger.type,
    }, { runId: run.id });

    // Start execution from trigger node
    await this.executeNode(run.id, triggerNode.id);

    return run.id;
  }

  async executeNode(runId: string, nodeId: string): Promise<void> {
    const run = await this.prisma.workflowRun.findUnique({ where: { id: runId } });
    if (!run) { this.logger.error(`Run ${runId} not found`); return; }
    if (run.status === 'cancelled' || run.status === 'completed' || run.status === 'failed') return;

    const definition = await this.loadDefinition(run.workflowId, run.workflowVersion);
    if (!definition) return;

    const node = definition.nodes.find((n) => n.id === nodeId);
    if (!node) {
      this.logger.error(`Node ${nodeId} not found in workflow ${run.workflowId}`);
      return;
    }

    const idempotencyKey = `${runId}:${nodeId}:1`;
    const existing = await this.prisma.nodeExecution.findUnique({
      where: { runId_nodeId_attempt: { runId, nodeId, attempt: 1 } },
    });
    if (existing?.status === 'completed') {
      this.logger.warn(`Node ${nodeId} already completed, skipping`);
      return;
    }

    // Create node execution record
    const nodeExec = await this.prisma.nodeExecution.upsert({
      where: { runId_nodeId_attempt: { runId, nodeId, attempt: 1 } },
      update: { status: 'running', startedAt: new Date() },
      create: {
        runId, nodeId, nodeType: node.type, status: 'running',
        attempt: 1, idempotencyKey,
      },
    });

    // Update run status
    await this.prisma.workflowRun.update({
      where: { id: runId },
      data: { status: 'running', currentNodeId: nodeId },
    });

    const startedAt = new Date().toISOString();

    try {
      const executor = this.registry.get(node.type);
      if (!executor) throw new Error(`No executor for node type: ${node.type}`);

      const ctx: NodeExecutionContext = {
        runId,
        workflowId: run.workflowId,
        workflowVersion: run.workflowVersion,
        nodeId,
        nodeType: node.type,
        nodeConfig: node.config,
        context: run.context as Record<string, unknown>,
        variables: run.variables as Record<string, unknown>,
        actor: { id: run.triggeredBy },
        triggeredAt: run.triggeredAt.toISOString(),
      };

      const output = await executor.execute(ctx);

      // Persist node output
      await this.prisma.nodeExecution.update({
        where: { id: nodeExec.id },
        data: {
          status: output.status === 'waiting' ? 'waiting' : output.status === 'success' ? 'completed' : 'failed',
          completedAt: output.status !== 'waiting' ? new Date() : undefined,
          output: output as any,
        },
      });

      // Apply context patch
      if (output.contextPatch) {
        const updatedContext = {
          ...(run.context as object),
          ...output.contextPatch,
        };
        await this.prisma.workflowRun.update({
          where: { id: runId },
          data: { context: updatedContext },
        });
      }

      await this.audit.log('node.completed', { id: run.triggeredBy, type: 'user' }, {
        status: output.status, nodeType: node.type,
      }, { runId, nodeId });

      // Handle next nodes
      if (output.status === 'success') {
        await this.advanceToNextNodes(runId, nodeId, output, definition);
      } else if (output.status === 'waiting') {
        // Update run status to waiting
        const waitStatus = this.getWaitStatus(node.type);
        await this.prisma.workflowRun.update({
          where: { id: runId },
          data: { status: waitStatus },
        });
      } else if (output.status === 'failed') {
        await this.failRun(runId, `Node ${nodeId} failed`);
      }
    } catch (err) {
      this.logger.error(`Node execution error: ${(err as Error).message}`, (err as Error).stack);

      await this.prisma.nodeExecution.update({
        where: { id: nodeExec.id },
        data: {
          status: 'failed',
          completedAt: new Date(),
          error: { message: (err as Error).message, stack: (err as Error).stack },
        },
      });

      await this.audit.log('node.failed', { id: run.triggeredBy, type: 'user' }, {
        error: (err as Error).message, nodeType: node.type,
      }, { runId, nodeId });

      await this.failRun(runId, (err as Error).message);
    }
  }

  async resumeFromTask(runId: string, nodeId: string, taskResult: Record<string, unknown>): Promise<void> {
    const run = await this.prisma.workflowRun.findUnique({ where: { id: runId } });
    if (!run) return;

    // Update context with task result
    const updatedContext = {
      ...(run.context as object),
      taskResult,
    };
    await this.prisma.workflowRun.update({
      where: { id: runId },
      data: { context: updatedContext },
    });

    const definition = await this.loadDefinition(run.workflowId, run.workflowVersion);
    if (!definition) return;

    const output = {
      status: 'success' as const,
      data: taskResult,
      meta: { nodeId, nodeType: 'user_task', startedAt: '', completedAt: new Date().toISOString(), actor: {} },
    };

    await this.advanceToNextNodes(runId, nodeId, output, definition);
  }

  async resumeFromApproval(runId: string, nodeId: string, approvalResult: {
    decision: string; note?: string; approverId: string;
  }): Promise<void> {
    const run = await this.prisma.workflowRun.findUnique({ where: { id: runId } });
    if (!run) return;

    const updatedContext = {
      ...(run.context as object),
      approvalResult,
    };
    await this.prisma.workflowRun.update({
      where: { id: runId },
      data: { context: updatedContext },
    });

    const definition = await this.loadDefinition(run.workflowId, run.workflowVersion);
    if (!definition) return;

    const output = {
      status: 'success' as const,
      data: approvalResult,
      meta: { nodeId, nodeType: 'approval_task', startedAt: '', completedAt: new Date().toISOString(), actor: {} },
    };

    await this.advanceToNextNodes(runId, nodeId, output, definition);
  }

  async cancelRun(runId: string, actorId: string): Promise<void> {
    await this.prisma.workflowRun.update({
      where: { id: runId },
      data: { status: 'cancelled', completedAt: new Date() },
    });
    await this.audit.log('workflow_run.cancelled', { id: actorId, type: 'user' }, { runId }, { runId });
  }

  private async advanceToNextNodes(
    runId: string,
    currentNodeId: string,
    output: NodeOutput | { status: string; data: Record<string, unknown>; meta: any },
    definition: WorkflowDefinitionJson,
  ): Promise<void> {
    // Use explicit nextNodeIds if provided (branching nodes set this)
    if ((output as NodeOutput).nextNodeIds?.length) {
      for (const nextId of (output as NodeOutput).nextNodeIds!) {
        await this.executeNode(runId, nextId);
      }
      return;
    }

    // Otherwise follow edges from current node
    const outEdges = definition.edges.filter((e) => e.source === currentNodeId);
    if (!outEdges.length) {
      // No more edges = run complete (if last node is end)
      const currentNode = definition.nodes.find((n) => n.id === currentNodeId);
      if (currentNode?.type === 'end') {
        await this.completeRun(runId);
      }
      return;
    }

    for (const edge of outEdges) {
      await this.executeNode(runId, edge.target);
    }
  }

  private async completeRun(runId: string): Promise<void> {
    await this.prisma.workflowRun.update({
      where: { id: runId },
      data: { status: 'completed', completedAt: new Date(), endStatus: 'success' },
    });
    this.events.emit('workflow_run.completed', { runId });
  }

  private async failRun(runId: string, reason: string): Promise<void> {
    await this.prisma.workflowRun.update({
      where: { id: runId },
      data: { status: 'failed', completedAt: new Date(), endReason: reason },
    });
    this.events.emit('workflow_run.failed', { runId, reason });
  }

  private getWaitStatus(nodeType: NodeType): RunStatus {
    switch (nodeType) {
      case 'user_task': return 'waiting_task';
      case 'approval_task': return 'waiting_approval';
      case 'timer_wait': return 'waiting_timer';
      case 'parallel_tasks': return 'waiting_parallel';
      case 'sub_workflow': return 'waiting_sub_workflow';
      default: return 'running';
    }
  }

  private async loadDefinition(workflowId: string, version: string): Promise<WorkflowDefinitionJson | null> {
    const v = await this.prisma.workflowDefinitionVersion.findUnique({
      where: { workflowId_version: { workflowId, version } },
    });
    if (!v) return null;
    return v.jsonDefinition as unknown as WorkflowDefinitionJson;
  }
}
