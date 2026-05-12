import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, HttpCode,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { CollectionsService, FilterState } from './collections.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionGuard } from '../../common/guards/permission.guard';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('collections')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('collections')
export class CollectionsController {
  constructor(private service: CollectionsService) {}

  @Get()
  @RequirePermission('collection.list')
  findAll(@Query('search') search?: string, @Query('appTemplateId') appTemplateId?: string) {
    return this.service.findAll({ search, appTemplateId });
  }

  @Get(':id')
  @RequirePermission('collection.list')
  findById(@Param('id') id: string) {
    return this.service.findById(id);
  }

  @Post()
  @RequirePermission('collection.create')
  create(@Body() body: any, @CurrentUser('sub') userId: string) {
    return this.service.create(body, userId);
  }

  @Patch(':id/schema')
  @RequirePermission('collection.manage_schema')
  updateSchema(@Param('id') id: string, @Body() body: any, @CurrentUser('sub') userId: string) {
    return this.service.updateSchema(id, body, userId);
  }

  @Delete(':id')
  @RequirePermission('collection.delete')
  @HttpCode(204)
  delete(@Param('id') id: string, @CurrentUser('sub') userId: string) {
    return this.service.delete(id, userId);
  }

  // ─── Records ─────────────────────────────────────────────────────────────

  @Get(':id/records')
  @RequirePermission('record.list')
  findRecords(
    @Param('id') id: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Body('filter') filter?: FilterState,
  ) {
    return this.service.findRecords(id, { filter, page, limit });
  }

  @Post(':id/records')
  @RequirePermission('record.create')
  createRecord(
    @Param('id') id: string,
    @Body() body: { data: Record<string, unknown> },
    @CurrentUser('sub') userId: string,
  ) {
    return this.service.createRecord(id, body.data, userId);
  }

  @Patch(':id/records/:recordId')
  @RequirePermission('record.update')
  updateRecord(
    @Param('id') id: string,
    @Param('recordId') recordId: string,
    @Body() body: { data: Record<string, unknown> },
    @CurrentUser('sub') userId: string,
  ) {
    return this.service.updateRecord(id, recordId, body.data, userId);
  }

  @Delete(':id/records/:recordId')
  @RequirePermission('record.delete')
  @HttpCode(204)
  deleteRecord(
    @Param('id') id: string,
    @Param('recordId') recordId: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.service.deleteRecord(id, recordId, userId);
  }
}
