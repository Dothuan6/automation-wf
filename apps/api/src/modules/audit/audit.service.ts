import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

interface Actor {
  id: string;
  type: 'user' | 'system' | 'api_key';
  email?: string;
}

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  async log(event: string, actor: Actor, data: Record<string, unknown> = {}, options?: {
    runId?: string;
    nodeId?: string;
    nodeType?: string;
    redactedKeys?: string[];
  }) {
    await this.prisma.auditEvent.create({
      data: {
        event,
        actor,
        data,
        runId: options?.runId,
        nodeId: options?.nodeId,
        redactedKeys: options?.redactedKeys ?? [],
      },
    });
  }

  async findByRunId(runId: string, limit = 100) {
    return this.prisma.auditEvent.findMany({
      where: { runId },
      orderBy: { createdAt: 'asc' },
      take: limit,
    });
  }

  async findRecent(limit = 50) {
    return this.prisma.auditEvent.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}
