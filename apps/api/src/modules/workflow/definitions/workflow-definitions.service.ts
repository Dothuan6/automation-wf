import {
  Injectable, NotFoundException, BadRequestException, ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { WorkflowDefinitionJson } from '../executor/workflow-executor.service';

const MAX_NODES = 100;
const MAX_DEFINITION_SIZE_KB = 256;

const VALID_SUCCESSORS: Record<string, string[]> = {
  manual_trigger: ['user_task', 'approval_task', 'parallel_tasks', 'record_action', 'http_request', 'notification', 'ai_transformer', 'business_rule', 'if_else', 'timer_wait', 'reminder', 'sub_workflow', 'end'],
  record_trigger: ['user_task', 'approval_task', 'parallel_tasks', 'record_action', 'http_request', 'notification', 'ai_transformer', 'business_rule', 'if_else', 'timer_wait', 'reminder', 'sub_workflow', 'end'],
  user_task: ['user_task', 'approval_task', 'parallel_tasks', 'record_action', 'http_request', 'notification', 'ai_transformer', 'business_rule', 'if_else', 'timer_wait', 'reminder', 'sub_workflow', 'end'],
  approval_task: ['user_task', 'approval_task', 'parallel_tasks', 'record_action', 'http_request', 'notification', 'ai_transformer', 'business_rule', 'if_else', 'timer_wait', 'reminder', 'sub_workflow', 'end'],
  parallel_tasks: ['user_task', 'approval_task', 'record_action', 'http_request', 'notification', 'ai_transformer', 'business_rule', 'if_else', 'sub_workflow', 'end'],
  record_action: ['user_task', 'approval_task', 'parallel_tasks', 'record_action', 'http_request', 'notification', 'ai_transformer', 'business_rule', 'if_else', 'timer_wait', 'reminder', 'sub_workflow', 'end'],
  http_request: ['user_task', 'approval_task', 'parallel_tasks', 'record_action', 'http_request', 'notification', 'ai_transformer', 'business_rule', 'if_else', 'timer_wait', 'reminder', 'sub_workflow', 'end'],
  notification: ['user_task', 'approval_task', 'parallel_tasks', 'record_action', 'http_request', 'notification', 'ai_transformer', 'business_rule', 'if_else', 'timer_wait', 'reminder', 'sub_workflow', 'end'],
  ai_transformer: ['user_task', 'approval_task', 'parallel_tasks', 'record_action', 'http_request', 'notification', 'ai_transformer', 'business_rule', 'if_else', 'timer_wait', 'reminder', 'sub_workflow', 'end'],
  business_rule: ['user_task', 'approval_task', 'parallel_tasks', 'record_action', 'http_request', 'notification', 'ai_transformer', 'if_else', 'timer_wait', 'reminder', 'sub_workflow', 'end'],
  if_else: ['user_task', 'approval_task', 'parallel_tasks', 'record_action', 'http_request', 'notification', 'ai_transformer', 'business_rule', 'if_else', 'timer_wait', 'reminder', 'sub_workflow', 'end'],
  timer_wait: ['user_task', 'approval_task', 'parallel_tasks', 'record_action', 'http_request', 'notification', 'ai_transformer', 'business_rule', 'if_else', 'reminder', 'sub_workflow', 'end'],
  reminder: ['user_task', 'approval_task', 'parallel_tasks', 'record_action', 'http_request', 'notification', 'ai_transformer', 'business_rule', 'if_else', 'timer_wait', 'sub_workflow', 'end'],
  sub_workflow: ['user_task', 'approval_task', 'parallel_tasks', 'record_action', 'http_request', 'notification', 'ai_transformer', 'business_rule', 'if_else', 'timer_wait', 'reminder', 'end'],
  end: [],
};

@Injectable()
export class WorkflowDefinitionsService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  async findAll(options?: { search?: string; status?: string; page?: number; limit?: number }) {
    const { search, status, page = 1, limit = 20 } = options ?? {};
    const skip = (page - 1) * limit;

    const where: any = {};
    if (status) where.status = status;
    if (search) where.name = { contains: search, mode: 'insensitive' };

    const [items, total] = await Promise.all([
      this.prisma.workflowDefinition.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip,
        take: limit,
        include: { _count: { select: { runs: true } } },
      }),
      this.prisma.workflowDefinition.count({ where }),
    ]);

    return { items, total, page, limit };
  }

  async findById(id: string) {
    const wf = await this.prisma.workflowDefinition.findUnique({
      where: { id },
      include: { versions: { orderBy: { publishedAt: 'desc' } } },
    });
    if (!wf) throw new NotFoundException('Workflow không tồn tại.');
    return wf;
  }

  async create(dto: { name: string; description?: string; tags?: string[] }, createdBy: string) {
    const wf = await this.prisma.workflowDefinition.create({
      data: {
        name: dto.name,
        description: dto.description,
        tags: dto.tags ?? [],
        createdBy,
        status: 'draft',
      },
    });

    await this.audit.log('workflow.created', { id: createdBy, type: 'user' }, { workflowId: wf.id });
    return wf;
  }

  async update(id: string, dto: { name?: string; description?: string; tags?: string[] }, actorId: string) {
    const wf = await this.prisma.workflowDefinition.findUnique({ where: { id } });
    if (!wf) throw new NotFoundException('Workflow không tồn tại.');

    return this.prisma.workflowDefinition.update({
      where: { id },
      data: dto,
    });
  }

  async saveVersion(
    id: string,
    dto: { jsonDefinition: WorkflowDefinitionJson; version?: string },
    actorId: string,
  ) {
    const wf = await this.prisma.workflowDefinition.findUnique({ where: { id } });
    if (!wf) throw new NotFoundException('Workflow không tồn tại.');

    const version = dto.version ?? `draft-${Date.now()}`;
    const jsonStr = JSON.stringify(dto.jsonDefinition);
    const sizeKb = Buffer.byteLength(jsonStr, 'utf8') / 1024;
    if (sizeKb > MAX_DEFINITION_SIZE_KB) {
      throw new BadRequestException(`Workflow definition quá lớn: ${sizeKb.toFixed(1)}KB (giới hạn ${MAX_DEFINITION_SIZE_KB}KB)`);
    }

    return this.prisma.workflowDefinitionVersion.upsert({
      where: { workflowId_version: { workflowId: id, version } },
      update: { jsonDefinition: dto.jsonDefinition as any },
      create: {
        workflowId: id,
        version,
        jsonDefinition: dto.jsonDefinition as any,
      },
    });
  }

  async publish(id: string, versionId: string, actorId: string) {
    const version = await this.prisma.workflowDefinitionVersion.findUnique({
      where: { id: versionId },
    });
    if (!version || version.workflowId !== id) throw new NotFoundException('Version không tồn tại.');
    if (version.publishedAt) throw new ConflictException('Version đã được publish.');

    const defJson = version.jsonDefinition as unknown as WorkflowDefinitionJson;
    const errors = this.validateDefinition(defJson);
    if (errors.length) throw new BadRequestException(`Workflow validation failed:\n${errors.join('\n')}`);

    const publishedVersion = `v${Date.now()}`;

    await this.prisma.$transaction([
      this.prisma.workflowDefinitionVersion.update({
        where: { id: versionId },
        data: {
          version: publishedVersion,
          publishedAt: new Date(),
          publishedBy: actorId,
        },
      }),
      this.prisma.workflowDefinition.update({
        where: { id },
        data: { status: 'published', currentVersion: publishedVersion },
      }),
    ]);

    await this.audit.log('workflow.published', { id: actorId, type: 'user' }, {
      workflowId: id, version: publishedVersion,
    });

    return { success: true, version: publishedVersion };
  }

  async delete(id: string, actorId: string) {
    const wf = await this.prisma.workflowDefinition.findUnique({ where: { id } });
    if (!wf) throw new NotFoundException('Workflow không tồn tại.');

    const activeRuns = await this.prisma.workflowRun.count({
      where: { workflowId: id, status: { in: ['running', 'waiting_task', 'waiting_approval', 'waiting_timer'] } },
    });
    if (activeRuns > 0) throw new BadRequestException('Không thể xoá workflow đang có run đang chạy.');

    await this.prisma.workflowDefinition.update({
      where: { id },
      data: { status: 'archived' },
    });

    await this.audit.log('workflow.archived', { id: actorId, type: 'user' }, { workflowId: id });
  }

  private validateDefinition(def: WorkflowDefinitionJson): string[] {
    const errors: string[] = [];
    const { nodes, edges } = def;

    if (!nodes?.length) { errors.push('Workflow phải có ít nhất một node.'); return errors; }
    if (nodes.length > MAX_NODES) errors.push(`Workflow không được quá ${MAX_NODES} nodes.`);

    const triggerNodes = nodes.filter((n) => n.type === 'manual_trigger' || n.type === 'record_trigger');
    if (!triggerNodes.length) errors.push('Workflow phải có ít nhất một trigger node.');

    const endNodes = nodes.filter((n) => n.type === 'end');
    if (!endNodes.length) errors.push('Workflow phải có ít nhất một end node.');

    const nodeIds = new Set(nodes.map((n) => n.id));

    for (const edge of edges ?? []) {
      if (!nodeIds.has(edge.source)) errors.push(`Edge source '${edge.source}' không tồn tại.`);
      if (!nodeIds.has(edge.target)) errors.push(`Edge target '${edge.target}' không tồn tại.`);

      const sourceNode = nodes.find((n) => n.id === edge.source);
      if (sourceNode) {
        const allowed = VALID_SUCCESSORS[sourceNode.type] ?? [];
        const targetNode = nodes.find((n) => n.id === edge.target);
        if (targetNode && !allowed.includes(targetNode.type)) {
          errors.push(`${sourceNode.type} không thể kết nối đến ${targetNode.type}.`);
        }
      }
    }

    for (const node of nodes) {
      if (!node.id) errors.push('Mỗi node phải có id.');
      if (!node.type) errors.push(`Node '${node.id}' không có type.`);

      if (['business_rule', 'if_else'].includes(node.type)) {
        const config = node.config as any;
        if (!config?.defaultEdgeId) {
          errors.push(`Branching node '${node.id}' phải có defaultEdgeId.`);
        }
      }
    }

    return errors;
  }
}
