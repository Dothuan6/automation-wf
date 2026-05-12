import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, HttpCode,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { WorkflowDefinitionsService } from './definitions/workflow-definitions.service';
import { WorkflowRunsService } from './runs/workflow-runs.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionGuard } from '../../common/guards/permission.guard';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('workflows')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('workflows')
export class WorkflowController {
  constructor(
    private definitions: WorkflowDefinitionsService,
    private runs: WorkflowRunsService,
  ) {}

  // ─── Definitions ─────────────────────────────────────────────────────────

  @Get()
  @RequirePermission('workflow.list')
  findAll(
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.definitions.findAll({ search, status, page, limit });
  }

  @Get(':id')
  @RequirePermission('workflow.read')
  findById(@Param('id') id: string) {
    return this.definitions.findById(id);
  }

  @Post()
  @RequirePermission('workflow.create')
  create(@Body() body: any, @CurrentUser('sub') userId: string) {
    return this.definitions.create(body, userId);
  }

  @Patch(':id')
  @RequirePermission('workflow.update')
  update(@Param('id') id: string, @Body() body: any, @CurrentUser('sub') userId: string) {
    return this.definitions.update(id, body, userId);
  }

  @Post(':id/versions')
  @RequirePermission('workflow.update')
  saveVersion(@Param('id') id: string, @Body() body: any, @CurrentUser('sub') userId: string) {
    return this.definitions.saveVersion(id, body, userId);
  }

  @Post(':id/versions/:versionId/publish')
  @RequirePermission('workflow.publish')
  publish(
    @Param('id') id: string,
    @Param('versionId') versionId: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.definitions.publish(id, versionId, userId);
  }

  @Delete(':id')
  @RequirePermission('workflow.delete')
  @HttpCode(204)
  delete(@Param('id') id: string, @CurrentUser('sub') userId: string) {
    return this.definitions.delete(id, userId);
  }

  // ─── Runs ─────────────────────────────────────────────────────────────────

  @Get('runs/all')
  @RequirePermission('workflow.list')
  findRuns(
    @Query('workflowId') workflowId?: string,
    @Query('status') status?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @CurrentUser('sub') userId?: string,
  ) {
    return this.runs.findAll({ workflowId, status, page, limit });
  }

  @Get('runs/my-tasks')
  getMyTasks(@CurrentUser('sub') userId: string) {
    return this.runs.getMyTasks(userId);
  }

  @Get('runs/:runId')
  @RequirePermission('workflow.read')
  findRun(@Param('runId') runId: string) {
    return this.runs.findById(runId);
  }

  @Post(':id/runs')
  @RequirePermission('workflow.run.start')
  startRun(
    @Param('id') id: string,
    @Body() body: { context?: Record<string, unknown> },
    @CurrentUser('sub') userId: string,
  ) {
    return this.runs.startRun(id, body.context ?? {}, userId);
  }

  @Post('runs/:runId/cancel')
  @RequirePermission('workflow.run.cancel')
  cancelRun(@Param('runId') runId: string, @CurrentUser('sub') userId: string) {
    return this.runs.cancelRun(runId, userId);
  }

  @Post('tasks/:taskId/complete')
  completeTask(
    @Param('taskId') taskId: string,
    @Body() body: { formValues: Record<string, unknown> },
    @CurrentUser('sub') userId: string,
  ) {
    return this.runs.completeTask(taskId, body.formValues, userId);
  }

  @Post('approvals/:approvalId/decision')
  submitDecision(
    @Param('approvalId') approvalId: string,
    @Body() body: { decision: 'approved' | 'rejected'; note?: string },
    @CurrentUser('sub') userId: string,
  ) {
    return this.runs.submitDecision(approvalId, body, userId);
  }
}
