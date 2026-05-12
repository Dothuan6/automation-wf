import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AppTemplatesService, TemplateManifest } from './app-templates.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('app-templates')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('app-templates')
export class AppTemplatesController {
  constructor(private readonly service: AppTemplatesService) {}

  @Get()
  @ApiOperation({ summary: 'List all app templates' })
  findAll(
    @Query('category') category?: string,
    @Query('search') search?: string,
  ) {
    return this.service.findAll({ category, search });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single app template' })
  findById(@Param('id') id: string) {
    return this.service.findById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new app template' })
  create(
    @Body()
    body: {
      name: string;
      slug: string;
      description?: string;
      emoji?: string;
      category?: string;
      manifest: TemplateManifest;
      version: string;
    },
  ) {
    return this.service.create(body);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an app template' })
  update(@Param('id') id: string, @Body() body: any) {
    return this.service.update(id, body);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete an app template (must be uninstalled)' })
  delete(@Param('id') id: string) {
    return this.service.delete(id);
  }

  @Post(':id/install')
  @ApiOperation({ summary: 'Install a template: creates Collections & Workflows from manifest' })
  install(@Param('id') id: string, @CurrentUser('sub') userId: string) {
    return this.service.install(id, userId);
  }

  @Post(':id/uninstall')
  @ApiOperation({ summary: 'Uninstall a template: removes empty Collections, marks uninstalled' })
  uninstall(@Param('id') id: string, @CurrentUser('sub') userId: string) {
    return this.service.uninstall(id, userId);
  }
}
