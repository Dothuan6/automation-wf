import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { WorkflowExecutorService } from '../executor/workflow-executor.service';

@Injectable()
export class WorkflowRunsService {
  constructor(
    private prisma: PrismaService,
    private executor: WorkflowExecutorService,
  ) {}

  async startRun(workflowId: string, context: Record<string, unknown>, actorId: string) {
    const runId = await this.executor.startRun(workflowId, {
      type: 'manual',
      context,
      actorId,
    });
    return { runId };
  }

  async findAll(options: {
    workflowId?: string;
    status?: string;
    triggeredBy?: string;
    page?: number;
    limit?: number;
  }) {
    const { workflowId, status, triggeredBy, page = 1, limit = 20 } = options;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (workflowId) where.workflowId = workflowId;
    if (status) where.status = status;
    if (triggeredBy) where.triggeredBy = triggeredBy;

    const [items, total] = await Promise.all([
      this.prisma.workflowRun.findMany({
        where,
        orderBy: { triggeredAt: 'desc' },
        skip,
        take: limit,
        include: {
          workflow: { select: { id: true, name: true } },
        },
      }),
      this.prisma.workflowRun.count({ where }),
    ]);

    return { items, total, page, limit };
  }

  async findById(runId: string) {
    const run = await this.prisma.workflowRun.findUnique({
      where: { id: runId },
      include: {
        workflow: { select: { id: true, name: true } },
        nodeExecutions: { orderBy: { startedAt: 'asc' } },
        taskItems: { orderBy: { createdAt: 'asc' } },
        approvalItems: { orderBy: { createdAt: 'asc' } },
      },
    });
    if (!run) throw new NotFoundException('Run không tồn tại.');
    return run;
  }

  async getMyTasks(userId: string) {
    const [tasks, approvals] = await Promise.all([
      this.prisma.taskItem.findMany({
        where: { assigneeId: userId, status: 'pending' },
        orderBy: { dueAt: 'asc' },
        include: {
          run: { include: { workflow: { select: { id: true, name: true } } } },
        },
      }),
      this.prisma.approvalItem.findMany({
        where: { approverId: userId, status: 'pending' },
        orderBy: { dueAt: 'asc' },
        include: {
          run: { include: { workflow: { select: { id: true, name: true } } } },
        },
      }),
    ]);
    return { tasks, approvals };
  }

  async completeTask(taskId: string, formValues: Record<string, unknown>, actorId: string) {
    const task = await this.prisma.taskItem.findUnique({ where: { id: taskId } });
    if (!task) throw new NotFoundException('Task không tồn tại.');
    if (task.assigneeId !== actorId) throw new Error('Bạn không được phân công task này.');

    await this.prisma.taskItem.update({
      where: { id: taskId },
      data: {
        status: 'completed',
        formValues,
        completedBy: actorId,
        completedAt: new Date(),
      },
    });

    // Resume workflow
    await this.executor.resumeFromTask(task.runId, task.nodeId, { taskId, formValues, completedBy: actorId });

    return { success: true };
  }

  async submitDecision(
    approvalId: string,
    dto: { decision: 'approved' | 'rejected'; note?: string },
    actorId: string,
  ) {
    const approval = await this.prisma.approvalItem.findUnique({ where: { id: approvalId } });
    if (!approval) throw new NotFoundException('Approval không tồn tại.');
    if (approval.approverId !== actorId) throw new Error('Bạn không có quyền duyệt approval này.');

    await this.prisma.approvalItem.update({
      where: { id: approvalId },
      data: {
        status: 'completed',
        decision: dto.decision,
        note: dto.note,
        decisionAt: new Date(),
      },
    });

    await this.executor.resumeFromApproval(approval.runId, approval.nodeId, {
      decision: dto.decision,
      note: dto.note,
      approverId: actorId,
    });

    return { success: true };
  }

  async cancelRun(runId: string, actorId: string) {
    await this.executor.cancelRun(runId, actorId);
    return { success: true };
  }
}
