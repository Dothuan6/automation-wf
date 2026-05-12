import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { FileStorageService, CompleteUploadDto } from './file-storage.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('files')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('files')
export class FileStorageController {
  constructor(private readonly service: FileStorageService) {}

  /**
   * POST /files/presign-upload
   * Returns a presigned S3 PUT URL + the s3Key to pass to complete-upload.
   */
  @Post('presign-upload')
  @ApiOperation({ summary: 'Get a presigned S3 upload URL (15 min TTL)' })
  presignUpload(
    @Body() body: { fileName: string; contentType: string },
    @CurrentUser('sub') userId: string,
  ) {
    return this.service.presignUpload(body.fileName, body.contentType, userId);
  }

  /**
   * POST /files/complete-upload
   * Persists file metadata after the browser has finished uploading.
   */
  @Post('complete-upload')
  @ApiOperation({ summary: 'Persist file metadata after direct S3 upload' })
  completeUpload(
    @Body() dto: CompleteUploadDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.service.completeUpload(dto, userId);
  }

  /**
   * GET /files/:id/download
   * Returns a presigned GET URL (1 hour TTL).
   */
  @Get(':id/download')
  @ApiOperation({ summary: 'Get a presigned S3 download URL (1 h TTL)' })
  getDownloadUrl(@Param('id') id: string) {
    return this.service.getDownloadUrl(id);
  }

  /**
   * DELETE /files/:id
   * Soft-deletes the FileRecord and removes the S3 object.
   */
  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete a file (soft-delete + S3 removal)' })
  deleteFile(@Param('id') id: string, @CurrentUser('sub') userId: string) {
    return this.service.deleteFile(id, userId);
  }
}
