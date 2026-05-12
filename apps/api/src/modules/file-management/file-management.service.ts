import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

const MAX_FOLDER_DEPTH = 7;

export interface CreateFolderDto {
  name: string;
  parentId?: string;
}

export interface MoveFolderDto {
  targetParentId: string | null;
}

@Injectable()
export class FileManagementService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Folder CRUD ──────────────────────────────────────────────────────────

  async createFolder(dto: CreateFolderDto, createdBy: string) {
    let depth = 0;
    let path = '';

    if (dto.parentId) {
      const parent = await this.prisma.folder.findUnique({
        where: { id: dto.parentId },
      });
      if (!parent) throw new NotFoundException('Thư mục cha không tồn tại.');
      if (parent.depth >= MAX_FOLDER_DEPTH - 1) {
        throw new BadRequestException(
          `Không thể tạo thư mục vượt quá ${MAX_FOLDER_DEPTH} cấp.`,
        );
      }
      depth = parent.depth + 1;
      path = `${parent.path}/${dto.name}`;
    } else {
      path = `/${dto.name}`;
    }

    const existing = await this.prisma.folder.findFirst({
      where: { parentId: dto.parentId ?? null, name: dto.name },
    });
    if (existing) {
      throw new ConflictException(
        `Tên thư mục '${dto.name}' đã tồn tại trong vị trí này.`,
      );
    }

    return this.prisma.folder.create({
      data: {
        name: dto.name,
        parentId: dto.parentId ?? null,
        depth,
        path,
        createdBy,
      },
    });
  }

  async listFolders(parentId?: string) {
    return this.prisma.folder.findMany({
      where: { parentId: parentId ?? null },
      include: {
        _count: { select: { children: true, files: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  async getFolderById(id: string) {
    const folder = await this.prisma.folder.findUnique({
      where: { id },
      include: {
        children: true,
        files: { where: { deletedAt: null }, orderBy: { createdAt: 'desc' } },
      },
    });
    if (!folder) throw new NotFoundException('Thư mục không tồn tại.');
    return folder;
  }

  async renameFolder(id: string, name: string) {
    const folder = await this.prisma.folder.findUnique({ where: { id } });
    if (!folder) throw new NotFoundException('Thư mục không tồn tại.');

    const conflict = await this.prisma.folder.findFirst({
      where: { parentId: folder.parentId, name, NOT: { id } },
    });
    if (conflict) {
      throw new ConflictException(
        `Tên thư mục '${name}' đã tồn tại trong vị trí này.`,
      );
    }

    // Update path: replace the last segment
    const newPath = folder.path.replace(/[^/]+$/, name);

    return this.prisma.folder.update({
      where: { id },
      data: { name, path: newPath },
    });
  }

  async moveFolder(id: string, dto: MoveFolderDto) {
    const folder = await this.prisma.folder.findUnique({ where: { id } });
    if (!folder) throw new NotFoundException('Thư mục không tồn tại.');

    let newDepth = 0;
    let newPathPrefix = '';

    if (dto.targetParentId) {
      const target = await this.prisma.folder.findUnique({
        where: { id: dto.targetParentId },
      });
      if (!target) throw new NotFoundException('Thư mục đích không tồn tại.');
      if (dto.targetParentId === id) {
        throw new BadRequestException('Không thể di chuyển vào chính nó.');
      }
      // Guard: target must not be a descendant of folder
      if (target.path.startsWith(folder.path + '/')) {
        throw new BadRequestException(
          'Không thể di chuyển vào thư mục con của chính nó.',
        );
      }
      if (target.depth + 1 >= MAX_FOLDER_DEPTH) {
        throw new BadRequestException(
          `Di chuyển sẽ vượt quá độ sâu tối đa ${MAX_FOLDER_DEPTH}.`,
        );
      }
      newDepth = target.depth + 1;
      newPathPrefix = target.path;
    }

    const newPath = dto.targetParentId
      ? `${newPathPrefix}/${folder.name}`
      : `/${folder.name}`;

    // Update folder and rewrite paths of all descendants
    const oldPathPrefix = folder.path;

    await this.prisma.$transaction(async (tx) => {
      await tx.folder.update({
        where: { id },
        data: { parentId: dto.targetParentId, depth: newDepth, path: newPath },
      });

      // Update descendants' paths
      const descendants = await tx.folder.findMany({
        where: { path: { startsWith: oldPathPrefix + '/' } },
      });
      for (const desc of descendants) {
        await tx.folder.update({
          where: { id: desc.id },
          data: {
            path: newPath + desc.path.slice(oldPathPrefix.length),
            depth: newDepth + (desc.depth - folder.depth),
          },
        });
      }
    });

    return this.prisma.folder.findUnique({ where: { id } });
  }

  async deleteFolder(id: string): Promise<void> {
    const folder = await this.prisma.folder.findUnique({ where: { id } });
    if (!folder) throw new NotFoundException('Thư mục không tồn tại.');

    // Cascade: Prisma schema has FolderHierarchy self-relation without onDelete,
    // so we delete children first (depth-first) manually.
    await this.deleteFolderRecursive(id);
  }

  private async deleteFolderRecursive(id: string) {
    const children = await this.prisma.folder.findMany({
      where: { parentId: id },
      select: { id: true },
    });
    for (const child of children) {
      await this.deleteFolderRecursive(child.id);
    }
    // Soft-delete all files in this folder
    await this.prisma.fileRecord.updateMany({
      where: { folderId: id, deletedAt: null },
      data: { deletedAt: new Date() },
    });
    await this.prisma.folder.delete({ where: { id } });
  }

  // ─── File queries ─────────────────────────────────────────────────────────

  async findFilesInFolder(folderId: string | null, search?: string) {
    const where: any = { deletedAt: null, folderId: folderId ?? null };
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { originalName: { contains: search, mode: 'insensitive' } },
      ];
    }

    const records = await this.prisma.fileRecord.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return records.map((r) => ({ ...r, size: r.size.toString() }));
  }

  async searchFiles(search: string) {
    const records = await this.prisma.fileRecord.findMany({
      where: {
        deletedAt: null,
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { originalName: { contains: search, mode: 'insensitive' } },
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return records.map((r) => ({ ...r, size: r.size.toString() }));
  }
}
