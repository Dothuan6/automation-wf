import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

export interface CreateRoleDto {
  slug: string;
  name: string;
  description?: string;
  permissions: string[];
  color?: string;
  emoji?: string;
}

export interface UpdateRoleDto {
  name?: string;
  description?: string;
  permissions?: string[];
  color?: string;
  emoji?: string;
}

@Injectable()
export class RolesService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.role.findMany({ orderBy: { createdAt: 'asc' } });
  }

  async findBySlug(slug: string) {
    const role = await this.prisma.role.findUnique({ where: { slug } });
    if (!role) throw new NotFoundException(`Role '${slug}' không tồn tại.`);
    return role;
  }

  async create(dto: CreateRoleDto, createdBy: string) {
    const existing = await this.prisma.role.findUnique({ where: { slug: dto.slug } });
    if (existing) throw new ConflictException(`Role '${dto.slug}' đã tồn tại.`);

    return this.prisma.role.create({
      data: { ...dto, createdBy, isSystem: false },
    });
  }

  async update(slug: string, dto: UpdateRoleDto) {
    const role = await this.prisma.role.findUnique({ where: { slug } });
    if (!role) throw new NotFoundException(`Role '${slug}' không tồn tại.`);

    const updated = await this.prisma.role.update({
      where: { slug },
      data: dto,
    });

    // Sync permissions to all users with this role
    if (dto.permissions) {
      await this.prisma.user.updateMany({
        where: { roleSlug: slug },
        data: { permissions: dto.permissions },
      });
    }

    return updated;
  }

  async delete(slug: string) {
    const role = await this.prisma.role.findUnique({ where: { slug } });
    if (!role) throw new NotFoundException(`Role '${slug}' không tồn tại.`);
    if (role.isSystem) throw new ConflictException('Không thể xoá role hệ thống.');

    await this.prisma.role.delete({ where: { slug } });
  }
}
