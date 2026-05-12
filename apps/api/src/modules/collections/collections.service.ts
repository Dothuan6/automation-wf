import {
  Injectable, NotFoundException, BadRequestException, ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { v4 as uuidv4 } from 'uuid';

export interface FieldSchema {
  id: string;
  name: string;
  type: string;
  required?: boolean;
  unique?: boolean;
  options?: string[];
  relatedCollectionId?: string;
  displayField?: string;
  defaultValue?: unknown;
  sensitive?: boolean;
  description?: string;
}

export interface FilterCondition {
  fieldId: string;
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains' | 'starts_with' | 'ends_with' | 'in' | 'not_in' | 'is_null' | 'is_not_null';
  value?: unknown;
}

export interface FilterState {
  conditions: FilterCondition[];
  logic: 'and' | 'or';
}

@Injectable()
export class CollectionsService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    private events: EventEmitter2,
  ) {}

  async findAll(options?: { search?: string; appTemplateId?: string }) {
    const where: any = {};
    if (options?.search) {
      where.OR = [
        { name: { contains: options.search, mode: 'insensitive' } },
        { description: { contains: options.search, mode: 'insensitive' } },
      ];
    }
    if (options?.appTemplateId) where.appTemplateId = options.appTemplateId;

    return this.prisma.collection.findMany({
      where,
      select: {
        id: true, name: true, slug: true, emoji: true, description: true,
        schema: true, recordCount: true, appTemplateId: true, displayGroup: true,
        createdAt: true, updatedAt: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  async findById(id: string) {
    const collection = await this.prisma.collection.findUnique({
      where: { id },
      include: { _count: { select: { records: true } } },
    });
    if (!collection) throw new NotFoundException('Collection không tồn tại.');
    return collection;
  }

  async create(dto: {
    name: string;
    slug?: string;
    emoji?: string;
    description?: string;
    schema: FieldSchema[];
    displayGroup?: string;
    appTemplateId?: string;
  }, createdBy: string) {
    const slug = dto.slug ?? this.toSlug(dto.name);

    const existing = await this.prisma.collection.findUnique({ where: { slug } });
    if (existing) throw new ConflictException(`Slug '${slug}' đã tồn tại.`);

    const collection = await this.prisma.collection.create({
      data: {
        name: dto.name,
        slug,
        emoji: dto.emoji,
        description: dto.description,
        schema: dto.schema as any,
        displayGroup: dto.displayGroup,
        appTemplateId: dto.appTemplateId,
        createdBy,
      },
    });

    await this.audit.log('collection.created', { id: createdBy, type: 'user' }, { collectionId: collection.id, name: dto.name });
    return collection;
  }

  async updateSchema(id: string, dto: { schema: FieldSchema[] }, actorId: string) {
    const collection = await this.prisma.collection.findUnique({ where: { id } });
    if (!collection) throw new NotFoundException('Collection không tồn tại.');

    const existing = collection.schema as FieldSchema[];
    const existingIds = new Set(existing.map((f) => f.id));
    const incomingIds = new Set(dto.schema.map((f) => f.id));

    // Ensure no existing field is hard-deleted if records exist
    const recordCount = await this.prisma.collectionRecord.count({ where: { collectionId: id } });
    if (recordCount > 0) {
      for (const id of existingIds) {
        if (!incomingIds.has(id)) {
          throw new BadRequestException(`Không thể xoá field đang có dữ liệu. Field id: ${id}`);
        }
      }
    }

    await this.prisma.collection.update({
      where: { id },
      data: { schema: dto.schema as any },
    });

    await this.audit.log('collection.schema_updated', { id: actorId, type: 'user' }, { collectionId: id });
  }

  async delete(id: string, actorId: string) {
    const collection = await this.prisma.collection.findUnique({ where: { id } });
    if (!collection) throw new NotFoundException('Collection không tồn tại.');

    await this.prisma.collection.delete({ where: { id } });
    await this.audit.log('collection.deleted', { id: actorId, type: 'user' }, { collectionId: id, name: collection.name });
  }

  // ─── Records ───────────────────────────────────────────────────────────────

  async findRecords(
    collectionId: string,
    options: {
      filter?: FilterState;
      sort?: { fieldId: string; direction: 'asc' | 'desc' };
      search?: string;
      page?: number;
      limit?: number;
    } = {},
  ) {
    const { page = 1, limit = 50 } = options;
    const skip = (page - 1) * limit;

    const collection = await this.prisma.collection.findUnique({ where: { id: collectionId } });
    if (!collection) throw new NotFoundException('Collection không tồn tại.');

    const where: any = { collectionId, deletedAt: null };

    if (options.filter?.conditions?.length) {
      const filterExpr = this.buildJsonFilter(options.filter);
      if (filterExpr) Object.assign(where, filterExpr);
    }

    const [items, total] = await Promise.all([
      this.prisma.collectionRecord.findMany({
        where,
        orderBy: options.sort
          ? { data: { path: [options.sort.fieldId], sort: options.sort.direction } }
          : { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.collectionRecord.count({ where }),
    ]);

    return { items, total, page, limit };
  }

  async createRecord(collectionId: string, data: Record<string, unknown>, createdBy: string) {
    const collection = await this.prisma.collection.findUnique({ where: { id: collectionId } });
    if (!collection) throw new NotFoundException('Collection không tồn tại.');

    const schema = collection.schema as FieldSchema[];
    this.validateRecord(schema, data);

    const record = await this.prisma.collectionRecord.create({
      data: { collectionId, data, createdBy },
    });

    // Update record count
    await this.prisma.collection.update({
      where: { id: collectionId },
      data: { recordCount: { increment: 1 } },
    });

    // Emit event for record_trigger nodes
    this.events.emit('record.created', {
      collectionId,
      collectionSlug: collection.slug,
      record,
      actor: createdBy,
    });

    await this.audit.log('record.created', { id: createdBy, type: 'user' }, {
      collectionId, recordId: record.id,
    });

    return record;
  }

  async updateRecord(
    collectionId: string,
    recordId: string,
    data: Record<string, unknown>,
    actorId: string,
  ) {
    const record = await this.prisma.collectionRecord.findFirst({
      where: { id: recordId, collectionId, deletedAt: null },
    });
    if (!record) throw new NotFoundException('Bản ghi không tồn tại.');

    const collection = await this.prisma.collection.findUnique({ where: { id: collectionId } });
    const schema = collection!.schema as FieldSchema[];
    const mergedData = { ...(record.data as object), ...data };
    this.validateRecord(schema, mergedData);

    const updated = await this.prisma.collectionRecord.update({
      where: { id: recordId },
      data: { data: mergedData },
    });

    this.events.emit('record.updated', {
      collectionId,
      collectionSlug: collection!.slug,
      recordBefore: record,
      record: updated,
      actor: actorId,
      changedFields: Object.keys(data),
    });

    await this.audit.log('record.updated', { id: actorId, type: 'user' }, {
      collectionId, recordId, changedFields: Object.keys(data),
    });

    return updated;
  }

  async deleteRecord(collectionId: string, recordId: string, actorId: string) {
    const record = await this.prisma.collectionRecord.findFirst({
      where: { id: recordId, collectionId, deletedAt: null },
    });
    if (!record) throw new NotFoundException('Bản ghi không tồn tại.');

    await this.prisma.collectionRecord.update({
      where: { id: recordId },
      data: { deletedAt: new Date() },
    });

    await this.prisma.collection.update({
      where: { id: collectionId },
      data: { recordCount: { decrement: 1 } },
    });

    this.events.emit('record.deleted', { collectionId, recordId, actor: actorId });
    await this.audit.log('record.deleted', { id: actorId, type: 'user' }, { collectionId, recordId });
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────

  private validateRecord(schema: FieldSchema[], data: Record<string, unknown>) {
    for (const field of schema) {
      if (field.required && (data[field.id] === undefined || data[field.id] === null || data[field.id] === '')) {
        throw new BadRequestException(`Trường '${field.name}' là bắt buộc.`);
      }
    }
  }

  private buildJsonFilter(filter: FilterState): Record<string, unknown> | null {
    if (!filter.conditions?.length) return null;

    const conditions = filter.conditions.map((c) => {
      switch (c.operator) {
        case 'eq': return { data: { path: [c.fieldId], equals: c.value } };
        case 'neq': return { NOT: { data: { path: [c.fieldId], equals: c.value } } };
        case 'contains': return { data: { path: [c.fieldId], string_contains: c.value } };
        case 'starts_with': return { data: { path: [c.fieldId], string_starts_with: c.value } };
        case 'ends_with': return { data: { path: [c.fieldId], string_ends_with: c.value } };
        case 'gt': return { data: { path: [c.fieldId], gt: c.value } };
        case 'gte': return { data: { path: [c.fieldId], gte: c.value } };
        case 'lt': return { data: { path: [c.fieldId], lt: c.value } };
        case 'lte': return { data: { path: [c.fieldId], lte: c.value } };
        case 'is_null': return { data: { path: [c.fieldId], equals: null } };
        case 'is_not_null': return { NOT: { data: { path: [c.fieldId], equals: null } } };
        default: return null;
      }
    }).filter(Boolean);

    if (!conditions.length) return null;
    return filter.logic === 'or' ? { OR: conditions } : { AND: conditions };
  }

  private toSlug(name: string): string {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/đ/g, 'd')
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_|_$/g, '');
  }
}
