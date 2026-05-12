import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface TemplateManifest {
  collections?: Array<{
    name: string;
    slug: string;
    emoji?: string;
    description?: string;
    schema: unknown[];
    displayGroup?: string;
  }>;
  workflows?: Array<{
    name: string;
    description?: string;
    tags?: string[];
    jsonDefinition: Record<string, unknown>;
  }>;
}

@Injectable()
export class AppTemplatesService {
  private readonly logger = new Logger(AppTemplatesService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ─── CRUD ─────────────────────────────────────────────────────────────────

  async findAll(options?: { category?: string; search?: string }) {
    const where: any = {};
    if (options?.category) where.category = options.category;
    if (options?.search) {
      where.OR = [
        { name: { contains: options.search, mode: 'insensitive' } },
        { description: { contains: options.search, mode: 'insensitive' } },
      ];
    }

    return this.prisma.appTemplate.findMany({
      where,
      orderBy: { name: 'asc' },
    });
  }

  async findById(id: string) {
    const template = await this.prisma.appTemplate.findUnique({ where: { id } });
    if (!template) throw new NotFoundException('App template không tồn tại.');
    return template;
  }

  async create(dto: {
    name: string;
    slug: string;
    description?: string;
    emoji?: string;
    category?: string;
    manifest: TemplateManifest;
    version: string;
  }) {
    const existing = await this.prisma.appTemplate.findUnique({
      where: { slug: dto.slug },
    });
    if (existing) throw new ConflictException(`Slug '${dto.slug}' đã tồn tại.`);

    return this.prisma.appTemplate.create({
      data: {
        name: dto.name,
        slug: dto.slug,
        description: dto.description,
        emoji: dto.emoji,
        category: dto.category,
        manifest: dto.manifest as any,
        version: dto.version,
      },
    });
  }

  async update(
    id: string,
    dto: Partial<{
      name: string;
      description: string;
      emoji: string;
      category: string;
      manifest: TemplateManifest;
      version: string;
    }>,
  ) {
    await this.findById(id);
    return this.prisma.appTemplate.update({
      where: { id },
      data: dto as any,
    });
  }

  async delete(id: string): Promise<void> {
    const template = await this.findById(id);
    if (template.isInstalled) {
      throw new BadRequestException(
        'Template đang được cài đặt. Vui lòng gỡ cài đặt trước khi xoá.',
      );
    }
    await this.prisma.appTemplate.delete({ where: { id } });
  }

  // ─── Install / Uninstall ──────────────────────────────────────────────────

  /**
   * Reads the manifest and creates Collections + WorkflowDefinitions
   * that are referenced by this template.
   */
  async install(id: string, userId: string) {
    const template = await this.findById(id);
    if (template.isInstalled) {
      throw new ConflictException('Template đã được cài đặt.');
    }

    const manifest = template.manifest as unknown as TemplateManifest;

    await this.prisma.$transaction(async (tx) => {
      // 1. Create Collections
      for (const col of manifest.collections ?? []) {
        const existingCol = await tx.collection.findUnique({
          where: { slug: col.slug },
        });
        if (!existingCol) {
          await tx.collection.create({
            data: {
              name: col.name,
              slug: col.slug,
              emoji: col.emoji,
              description: col.description,
              schema: col.schema as any,
              displayGroup: col.displayGroup,
              appTemplateId: id,
              createdBy: userId,
            },
          });
          this.logger.log(`install: created collection slug=${col.slug}`);
        }
      }

      // 2. Create WorkflowDefinitions
      for (const wf of manifest.workflows ?? []) {
        const definition = await tx.workflowDefinition.create({
          data: {
            name: wf.name,
            description: wf.description,
            status: 'draft',
            tags: wf.tags ?? [],
            createdBy: userId,
          },
        });

        await tx.workflowDefinitionVersion.create({
          data: {
            workflowId: definition.id,
            version: template.version,
            jsonDefinition: wf.jsonDefinition as any,
          },
        });

        this.logger.log(`install: created workflow name=${wf.name}`);
      }

      // 3. Mark as installed
      await tx.appTemplate.update({
        where: { id },
        data: {
          isInstalled: true,
          installedAt: new Date(),
          installedBy: userId,
        },
      });
    });

    return this.findById(id);
  }

  /**
   * Removes Collections created by this template (if no records exist)
   * and marks template as uninstalled.
   * Workflows are NOT deleted automatically to preserve audit history.
   */
  async uninstall(id: string, userId: string) {
    const template = await this.findById(id);
    if (!template.isInstalled) {
      throw new BadRequestException('Template chưa được cài đặt.');
    }

    await this.prisma.$transaction(async (tx) => {
      // Remove collections that belong to this template and have no records
      const collections = await tx.collection.findMany({
        where: { appTemplateId: id },
        include: { _count: { select: { records: true } } },
      });

      for (const col of collections) {
        if (col._count.records === 0) {
          await tx.collection.delete({ where: { id: col.id } });
          this.logger.log(`uninstall: deleted collection slug=${col.slug}`);
        } else {
          this.logger.warn(
            `uninstall: keeping collection slug=${col.slug} (has ${col._count.records} records)`,
          );
        }
      }

      await tx.appTemplate.update({
        where: { id },
        data: { isInstalled: false, installedAt: null, installedBy: null },
      });
    });

    return this.findById(id);
  }
}
