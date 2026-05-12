import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../../prisma/prisma.service';

export interface FindNotificationsOptions {
  unreadOnly?: boolean;
  page?: number;
  limit?: number;
}

export interface TaskCreatedPayload {
  taskId: string;
  runId: string;
  nodeId: string;
  assigneeId: string;
  title: string;
}

export interface ApprovalRequestedPayload {
  approvalId: string;
  runId: string;
  nodeId: string;
  approverId: string;
  subject?: string;
}

export interface InAppNotificationPayload {
  runId: string;
  nodeId: string;
  recipientIds: string[];
  subject?: string;
  body: string;
  templateId?: string;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ─── Queries ──────────────────────────────────────────────────────────────

  async findByUser(userId: string, opts: FindNotificationsOptions = {}) {
    const { page = 1, limit = 30, unreadOnly = false } = opts;
    const skip = (page - 1) * limit;

    // NotificationRecord is keyed by runId, not userId.
    // We look for records whose recipients JSON contains this userId.
    // Using raw JSON containment query via Prisma JSON filter.
    const where: any = {
      recipients: { array_contains: [{ id: userId }] },
    };

    if (unreadOnly) {
      // deliveryStatus shape: { [userId]: { read: boolean, readAt: string|null } }
      // We cannot do a Prisma-native unread filter on nested JSONB easily;
      // use a raw AND filter approximation.
      where.deliveryStatus = {
        path: [userId, 'read'],
        equals: false,
      };
    }

    const [items, total] = await Promise.all([
      this.prisma.notificationRecord.findMany({
        where,
        orderBy: { sentAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.notificationRecord.count({ where }),
    ]);

    return { items, total, page, limit };
  }

  async markRead(notificationId: string, userId: string): Promise<void> {
    const record = await this.prisma.notificationRecord.findUnique({
      where: { id: notificationId },
    });
    if (!record) return;

    const status = (record.deliveryStatus as Record<string, unknown>) ?? {};
    status[userId] = { read: true, readAt: new Date().toISOString() };

    await this.prisma.notificationRecord.update({
      where: { id: notificationId },
      data: { deliveryStatus: status },
    });
  }

  async markAllRead(userId: string): Promise<void> {
    // Find all unread notifications for this user and mark them read.
    const records = await this.prisma.notificationRecord.findMany({
      where: {
        recipients: { array_contains: [{ id: userId }] },
        deliveryStatus: { path: [userId, 'read'], equals: false },
      },
    });

    const now = new Date().toISOString();
    await Promise.all(
      records.map((r) => {
        const status = (r.deliveryStatus as Record<string, unknown>) ?? {};
        status[userId] = { read: true, readAt: now };
        return this.prisma.notificationRecord.update({
          where: { id: r.id },
          data: { deliveryStatus: status },
        });
      }),
    );
  }

  // ─── Internal factory ─────────────────────────────────────────────────────

  private async createInAppNotification(
    runId: string,
    nodeId: string,
    recipientIds: string[],
    subject: string | undefined,
    body: string,
    templateId?: string,
  ) {
    if (!recipientIds.length) return;

    const recipients = recipientIds.map((id) => ({ id }));

    // Initial delivery status: unread for each recipient
    const deliveryStatus: Record<string, unknown> = {};
    for (const id of recipientIds) {
      deliveryStatus[id] = { read: false, readAt: null };
    }

    try {
      await this.prisma.notificationRecord.create({
        data: {
          runId,
          nodeId,
          recipients,
          channels: ['in_app'],
          subject,
          templateId,
          deliveryStatus,
        },
      });
    } catch (err) {
      this.logger.error('Failed to create NotificationRecord', err);
    }
  }

  // ─── Event listeners ──────────────────────────────────────────────────────

  @OnEvent('notification.task_created')
  async onTaskCreated(payload: TaskCreatedPayload) {
    this.logger.debug(`notification.task_created: taskId=${payload.taskId}`);
    await this.createInAppNotification(
      payload.runId,
      payload.nodeId,
      [payload.assigneeId],
      'Bạn có một nhiệm vụ mới',
      `Nhiệm vụ "${payload.title}" đã được giao cho bạn.`,
    );
  }

  @OnEvent('notification.approval_requested')
  async onApprovalRequested(payload: ApprovalRequestedPayload) {
    this.logger.debug(
      `notification.approval_requested: approvalId=${payload.approvalId}`,
    );
    await this.createInAppNotification(
      payload.runId,
      payload.nodeId,
      [payload.approverId],
      'Yêu cầu phê duyệt mới',
      payload.subject ?? 'Bạn có một yêu cầu phê duyệt đang chờ xử lý.',
    );
  }

  @OnEvent('notification.send.in_app')
  async onSendInApp(payload: InAppNotificationPayload) {
    this.logger.debug(
      `notification.send.in_app: recipients=${payload.recipientIds.join(',')}`,
    );
    await this.createInAppNotification(
      payload.runId,
      payload.nodeId,
      payload.recipientIds,
      payload.subject,
      payload.body,
      payload.templateId,
    );
  }
}
