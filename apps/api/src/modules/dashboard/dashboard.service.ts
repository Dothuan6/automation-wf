import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Returns counts of tasks/approvals assigned to the user plus the 5 most
   * recent workflow runs triggered by that user.
   */
  async getSummary(userId: string) {
    const [myTasksCount, myApprovalsCount, recentRuns] = await Promise.all([
      // Pending tasks assigned to the user
      this.prisma.taskItem.count({
        where: {
          assigneeId: userId,
          status: { in: ['pending', 'in_progress'] },
        },
      }),

      // Pending approvals waiting for the user
      this.prisma.approvalItem.count({
        where: {
          approverId: userId,
          status: 'pending',
        },
      }),

      // Last 5 workflow runs triggered by the user
      this.prisma.workflowRun.findMany({
        where: { triggeredBy: userId },
        orderBy: { triggeredAt: 'desc' },
        take: 5,
        select: {
          id: true,
          status: true,
          triggerType: true,
          triggeredAt: true,
          completedAt: true,
          workflow: {
            select: { id: true, name: true },
          },
        },
      }),
    ]);

    return { myTasksCount, myApprovalsCount, recentRuns };
  }

  /**
   * Returns KPI stats: total collections, records, workflow definitions,
   * and active workflow runs.
   */
  async getKpi() {
    const [
      totalCollections,
      totalRecords,
      totalWorkflowDefinitions,
      activeRuns,
      totalFiles,
    ] = await Promise.all([
      this.prisma.collection.count(),

      this.prisma.collectionRecord.count({ where: { deletedAt: null } }),

      this.prisma.workflowDefinition.count({
        where: { status: { not: 'archived' } },
      }),

      this.prisma.workflowRun.count({
        where: {
          status: {
            in: [
              'created',
              'running',
              'waiting_task',
              'waiting_approval',
              'waiting_timer',
              'waiting_parallel',
              'waiting_sub_workflow',
            ],
          },
        },
      }),

      this.prisma.fileRecord.count({ where: { deletedAt: null } }),
    ]);

    return {
      totalCollections,
      totalRecords,
      totalWorkflowDefinitions,
      activeRuns,
      totalFiles,
    };
  }
}
