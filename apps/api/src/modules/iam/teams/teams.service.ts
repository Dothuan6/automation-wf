import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

const MAX_DEPTH = 5;

@Injectable()
export class TeamsService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.team.findMany({
      include: {
        members: {
          include: { user: { select: { id: true, fullName: true, avatarUrl: true } } },
        },
      },
      orderBy: { path: 'asc' },
    });
  }

  async create(dto: { name: string; parentId?: string; emoji?: string; description?: string }, createdBy: string) {
    let depth = 0;
    let path = '';

    if (dto.parentId) {
      const parent = await this.prisma.team.findUnique({ where: { id: dto.parentId } });
      if (!parent) throw new NotFoundException('Team cha không tồn tại.');
      depth = parent.depth + 1;
      if (depth > MAX_DEPTH) {
        throw new BadRequestException(`Team không thể sâu hơn ${MAX_DEPTH} cấp.`);
      }
      path = `${parent.path}/${dto.parentId}`;
    }

    const team = await this.prisma.team.create({
      data: {
        name: dto.name,
        parentId: dto.parentId,
        emoji: dto.emoji,
        description: dto.description,
        depth,
        path: path || '/',
        createdBy,
      },
    });

    // Update path with team's own id
    return this.prisma.team.update({
      where: { id: team.id },
      data: { path: path ? `${path}/${team.id}` : `/${team.id}` },
    });
  }

  async addMember(teamId: string, userId: string) {
    await this.prisma.userTeamMembership.upsert({
      where: { userId_teamId: { userId, teamId } },
      update: {},
      create: { userId, teamId },
    });
  }

  async removeMember(teamId: string, userId: string) {
    await this.prisma.userTeamMembership.deleteMany({
      where: { userId, teamId },
    });
  }

  async delete(id: string) {
    const children = await this.prisma.team.count({ where: { parentId: id } });
    if (children > 0) {
      throw new BadRequestException('Xoá các team con trước.');
    }
    await this.prisma.team.delete({ where: { id } });
  }
}
