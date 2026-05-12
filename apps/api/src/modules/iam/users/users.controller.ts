import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query,
  UseGuards, HttpCode,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { PermissionGuard } from '../../../common/guards/permission.guard';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import {
  CreateUserInviteDto, UpdateUserDto, SetUserPermissionsDto, SetUserRoleDto,
} from './users.dto';

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get()
  @RequirePermission('member.list')
  findAll(
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.usersService.findAll({ status, search, page, limit });
  }

  @Get(':id')
  @RequirePermission('member.list')
  findById(@Param('id') id: string) {
    return this.usersService.findById(id);
  }

  @Post('invite')
  @RequirePermission('member.invite')
  invite(@Body() dto: CreateUserInviteDto, @CurrentUser('sub') actorId: string) {
    return this.usersService.invite(dto, actorId);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser('sub') actorId: string,
  ) {
    return this.usersService.update(id, dto, actorId);
  }

  @Patch(':id/role')
  @RequirePermission('member.set_role')
  setRole(
    @Param('id') id: string,
    @Body() dto: SetUserRoleDto,
    @CurrentUser('sub') actorId: string,
  ) {
    return this.usersService.setRole(id, dto.roleSlug, actorId);
  }

  @Patch(':id/permissions')
  @RequirePermission('member.set_permissions')
  setPermissions(
    @Param('id') id: string,
    @Body() dto: SetUserPermissionsDto,
    @CurrentUser('sub') actorId: string,
  ) {
    return this.usersService.setPermissions(id, dto, actorId);
  }

  @Patch(':id/suspend')
  @RequirePermission('member.suspend')
  @HttpCode(204)
  suspend(@Param('id') id: string, @CurrentUser('sub') actorId: string) {
    return this.usersService.suspend(id, actorId);
  }

  @Patch(':id/restore')
  @RequirePermission('member.suspend')
  @HttpCode(204)
  restore(@Param('id') id: string, @CurrentUser('sub') actorId: string) {
    return this.usersService.restore(id, actorId);
  }
}
