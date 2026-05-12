import {
  Injectable, NotFoundException, ConflictException, BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuditService } from '../../audit/audit.service';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { CreateUserInviteDto, UpdateUserDto, SetUserPermissionsDto } from './users.dto';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  async findAll(options?: { status?: string; search?: string; page?: number; limit?: number }) {
    const { status, search, page = 1, limit = 20 } = options ?? {};
    const skip = (page - 1) * limit;

    const where: any = { deletedAt: null };
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { fullName: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: {
          id: true, email: true, fullName: true, displayName: true,
          avatarUrl: true, roleSlug: true, status: true, joinedAt: true,
          lastActiveAt: true, createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.user.count({ where }),
    ]);

    return { items, total, page, limit };
  }

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true, email: true, fullName: true, displayName: true, avatarUrl: true,
        locale: true, timezone: true, roleSlug: true, permissions: true,
        status: true, mfaEnabled: true, joinedAt: true, lastActiveAt: true, createdAt: true,
        teamMemberships: {
          include: { team: { select: { id: true, name: true, emoji: true } } },
        },
      },
    });
    if (!user) throw new NotFoundException('Không tìm thấy người dùng.');
    return user;
  }

  async invite(dto: CreateUserInviteDto, invitedBy: string) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Email đã được sử dụng.');

    const token = uuidv4();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        fullName: dto.fullName ?? dto.email.split('@')[0],
        status: 'pending_invitation',
        invitationToken: token,
        invitationExpiresAt: expiresAt,
        invitedRoleSlug: dto.roleSlug,
        roleSlug: dto.roleSlug,
        permissions: await this.getPermissionsForRole(dto.roleSlug),
      },
      select: { id: true, email: true, status: true },
    });

    await this.audit.log('user.invited', { id: invitedBy, type: 'user' }, {
      targetUserId: user.id,
      email: dto.email,
      roleSlug: dto.roleSlug,
    });

    // TODO: send invitation email via NotificationService

    return { ...user, invitationToken: token };
  }

  async update(id: string, dto: UpdateUserDto, actorId: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('Không tìm thấy người dùng.');

    const updated = await this.prisma.user.update({
      where: { id },
      data: {
        ...(dto.fullName && { fullName: dto.fullName }),
        ...(dto.displayName !== undefined && { displayName: dto.displayName }),
        ...(dto.avatarUrl !== undefined && { avatarUrl: dto.avatarUrl }),
        ...(dto.locale && { locale: dto.locale }),
        ...(dto.timezone && { timezone: dto.timezone }),
      },
      select: { id: true, email: true, fullName: true, displayName: true, avatarUrl: true },
    });

    await this.audit.log('user.updated', { id: actorId, type: 'user' }, { userId: id, changes: dto });
    return updated;
  }

  async setRole(userId: string, roleSlug: string, actorId: string) {
    const role = await this.prisma.role.findUnique({ where: { slug: roleSlug } });
    if (!role) throw new NotFoundException(`Role '${roleSlug}' không tồn tại.`);

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        roleSlug,
        permissions: role.permissions,
      },
    });

    await this.audit.log('user.role_changed', { id: actorId, type: 'user' }, {
      userId, oldRole: undefined, newRole: roleSlug,
    });
  }

  async setPermissions(userId: string, dto: SetUserPermissionsDto, actorId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { permissions: dto.permissions },
    });
    await this.audit.log('user.permissions_changed', { id: actorId, type: 'user' }, {
      userId, permissions: dto.permissions,
    });
  }

  async suspend(userId: string, actorId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { status: 'suspended' },
    });
    await this.audit.log('user.suspended', { id: actorId, type: 'user' }, { userId });
  }

  async restore(userId: string, actorId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { status: 'active' },
    });
    await this.audit.log('user.restored', { id: actorId, type: 'user' }, { userId });
  }

  async getEffectivePermissions(userId: string): Promise<string[]> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { permissions: true },
    });
    return user?.permissions ?? [];
  }

  private async getPermissionsForRole(roleSlug?: string): Promise<string[]> {
    if (!roleSlug) return [];
    const role = await this.prisma.role.findUnique({ where: { slug: roleSlug } });
    return role?.permissions ?? [];
  }
}
