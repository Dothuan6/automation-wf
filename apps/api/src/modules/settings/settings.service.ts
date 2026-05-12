import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import * as crypto from 'crypto';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SettingsService {
  private cache = new Map<string, { value: unknown; expiresAt: number }>();
  private readonly CACHE_TTL_MS = 60_000; // 60 seconds

  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    private config: ConfigService,
  ) {}

  async get<T = unknown>(key: string): Promise<T | null> {
    // Check cache
    const cached = this.cache.get(key);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.value as T;
    }

    const setting = await this.prisma.appSetting.findUnique({ where: { key } });
    if (!setting) return null;

    let value = setting.value as unknown;
    if (setting.encrypted) {
      value = this.decrypt(String(value));
    }

    this.cache.set(key, { value, expiresAt: Date.now() + this.CACHE_TTL_MS });
    return value as T;
  }

  async set(key: string, value: unknown, updatedBy: string): Promise<void> {
    const setting = await this.prisma.appSetting.findUnique({ where: { key } });
    let storedValue = value;

    if (setting?.encrypted) {
      storedValue = this.encrypt(String(value));
    }

    await this.prisma.appSetting.upsert({
      where: { key },
      update: { value: storedValue as any, updatedBy },
      create: {
        key,
        value: storedValue as any,
        valueType: 'string',
        updatedBy,
        encrypted: false,
        autoload: false,
      },
    });

    // Bust cache
    this.cache.delete(key);

    await this.audit.log('settings.updated', { id: updatedBy, type: 'user' }, {
      key,
      sensitive: setting?.encrypted ?? false,
    });
  }

  async getMany(keys: string[]): Promise<Record<string, unknown>> {
    const settings = await this.prisma.appSetting.findMany({
      where: { key: { in: keys } },
    });

    const result: Record<string, unknown> = {};
    for (const s of settings) {
      result[s.key] = s.encrypted ? '[encrypted]' : s.value;
    }
    return result;
  }

  async getByCategory(category: string): Promise<Record<string, unknown>> {
    const settings = await this.prisma.appSetting.findMany({
      where: { category },
      orderBy: { key: 'asc' },
    });

    const result: Record<string, unknown> = {};
    for (const s of settings) {
      result[s.key] = s.encrypted ? '[encrypted]' : s.value;
    }
    return result;
  }

  async getAllAutoload(): Promise<Record<string, unknown>> {
    const settings = await this.prisma.appSetting.findMany({
      where: { autoload: true },
    });

    const result: Record<string, unknown> = {};
    for (const s of settings) {
      result[s.key] = s.encrypted ? '[encrypted]' : s.value;
    }
    return result;
  }

  private encrypt(value: string): string {
    const key = this.config.get<string>('ENCRYPTION_KEY', '').slice(0, 32).padEnd(32, '0');
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(key), iv);
    const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
    return `${iv.toString('hex')}:${encrypted.toString('hex')}`;
  }

  private decrypt(value: string): string {
    try {
      const [ivHex, encryptedHex] = value.split(':');
      const key = this.config.get<string>('ENCRYPTION_KEY', '').slice(0, 32).padEnd(32, '0');
      const iv = Buffer.from(ivHex, 'hex');
      const encrypted = Buffer.from(encryptedHex, 'hex');
      const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(key), iv);
      return decipher.update(encrypted) + decipher.final('utf8');
    } catch {
      return '[decryption_error]';
    }
  }
}
