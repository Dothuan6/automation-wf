import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { PrismaService } from '../../prisma/prisma.service';
import { v4 as uuidv4 } from 'uuid';

export interface PresignUploadResult {
  uploadUrl: string;
  s3Key: string;
  expiresIn: number;
}

export interface CompleteUploadDto {
  s3Key: string;
  originalName: string;
  mimeType: string;
  size: number;
  folderId?: string;
  isPublic?: boolean;
}

@Injectable()
export class FileStorageService {
  private readonly logger = new Logger(FileStorageService.name);
  private readonly s3: S3Client;
  private readonly bucket: string;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    const endpoint = this.config.get<string>('S3_ENDPOINT');
    const region = this.config.get<string>('S3_REGION', 'us-east-1');
    const accessKeyId = this.config.get<string>('S3_ACCESS_KEY', '');
    const secretAccessKey = this.config.get<string>('S3_SECRET_KEY', '');
    const forcePathStyle = this.config.get<string>('S3_FORCE_PATH_STYLE', 'false') === 'true';

    this.bucket = this.config.get<string>('S3_BUCKET', 'xbuild');

    this.s3 = new S3Client({
      region,
      ...(endpoint ? { endpoint } : {}),
      forcePathStyle,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });
  }

  /**
   * Generate a presigned PUT URL so the browser can upload directly to S3.
   * Returns the s3Key the client must pass to completeUpload() afterward.
   */
  async presignUpload(
    fileName: string,
    contentType: string,
    userId: string,
  ): Promise<PresignUploadResult> {
    const ext = fileName.includes('.') ? fileName.slice(fileName.lastIndexOf('.')) : '';
    const s3Key = `uploads/${userId}/${uuidv4()}${ext}`;
    const expiresIn = 15 * 60; // 15 minutes

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: s3Key,
      ContentType: contentType,
    });

    const uploadUrl = await getSignedUrl(this.s3, command, { expiresIn });

    this.logger.debug(`presignUpload: key=${s3Key} user=${userId}`);

    return { uploadUrl, s3Key, expiresIn };
  }

  /**
   * After the client has finished uploading, call this to persist a FileRecord.
   */
  async completeUpload(dto: CompleteUploadDto, userId: string) {
    const name = dto.originalName;

    const record = await this.prisma.fileRecord.create({
      data: {
        name,
        originalName: dto.originalName,
        mimeType: dto.mimeType,
        size: BigInt(dto.size),
        s3Key: dto.s3Key,
        folderId: dto.folderId ?? null,
        uploadedBy: userId,
        isPublic: dto.isPublic ?? false,
      },
    });

    this.logger.log(`completeUpload: fileId=${record.id} user=${userId}`);

    return {
      ...record,
      size: record.size.toString(), // BigInt serialisation
    };
  }

  /**
   * Generate a presigned GET URL valid for 1 hour.
   */
  async getDownloadUrl(fileId: string): Promise<{ downloadUrl: string; expiresIn: number }> {
    const record = await this.prisma.fileRecord.findFirst({
      where: { id: fileId, deletedAt: null },
    });
    if (!record) throw new NotFoundException('File không tồn tại.');

    const expiresIn = 60 * 60; // 1 hour

    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: record.s3Key,
    });

    const downloadUrl = await getSignedUrl(this.s3, command, { expiresIn });

    return { downloadUrl, expiresIn };
  }

  /**
   * Soft-delete the FileRecord and remove the object from S3.
   * Only the uploader (or an admin passing the same userId) may delete.
   */
  async deleteFile(fileId: string, userId: string): Promise<void> {
    const record = await this.prisma.fileRecord.findFirst({
      where: { id: fileId, deletedAt: null },
    });
    if (!record) throw new NotFoundException('File không tồn tại.');
    if (record.uploadedBy !== userId) {
      throw new ForbiddenException('Bạn không có quyền xoá file này.');
    }

    // Soft-delete in DB first
    await this.prisma.fileRecord.update({
      where: { id: fileId },
      data: { deletedAt: new Date() },
    });

    // Then remove from S3 (best-effort)
    try {
      await this.s3.send(
        new DeleteObjectCommand({ Bucket: this.bucket, Key: record.s3Key }),
      );
    } catch (err) {
      this.logger.error(`Failed to delete S3 object ${record.s3Key}`, err);
    }
  }

  /** List files, optionally filtered by folder and/or a search string. */
  async findByFolder(folderId: string | null, search?: string) {
    const where: any = { deletedAt: null };
    if (folderId !== undefined) where.folderId = folderId;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { originalName: { contains: search, mode: 'insensitive' } },
      ];
    }

    const records = await this.prisma.fileRecord.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return records.map((r) => ({ ...r, size: r.size.toString() }));
  }
}
