import { Controller, Get, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { SettingsService } from './settings.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionGuard } from '../../common/guards/permission.guard';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('settings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('settings')
export class SettingsController {
  constructor(private service: SettingsService) {}

  @Get()
  @RequirePermission('settings.read')
  getAll() {
    return this.service.getAllAutoload();
  }

  @Get('category/:category')
  @RequirePermission('settings.read')
  getByCategory(@Param('category') category: string) {
    return this.service.getByCategory(category);
  }

  @Get('key/:key')
  @RequirePermission('settings.read')
  getByKey(@Param('key') key: string) {
    return this.service.get(key);
  }

  @Patch(':key')
  @RequirePermission('settings.manage')
  set(
    @Param('key') key: string,
    @Body() body: { value: unknown },
    @CurrentUser('sub') userId: string,
  ) {
    return this.service.set(key, body.value, userId);
  }
}
