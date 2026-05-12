import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly service: DashboardService) {}

  /**
   * GET /dashboard/summary
   * Returns the current user's task count, approval count, and last 5 runs.
   */
  @Get('summary')
  @ApiOperation({ summary: "Get current user's dashboard summary" })
  getSummary(@CurrentUser('sub') userId: string) {
    return this.service.getSummary(userId);
  }

  /**
   * GET /dashboard/kpi
   * Returns aggregate KPI stats for the whole company instance.
   */
  @Get('kpi')
  @ApiOperation({ summary: 'Get system-wide KPI stats' })
  getKpi() {
    return this.service.getKpi();
  }
}
