import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { authenticator } from 'otplib';
import * as QRCode from 'qrcode';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
  ) {}

  async login(email: string, password: string, userAgent?: string, ip?: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: {
        id: true, email: true, status: true, passwordHash: true,
        mfaEnabled: true, roleSlug: true, permissions: true, fullName: true,
      },
    });

    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Email hoặc mật khẩu không đúng.');
    }
    if (user.status === 'suspended') {
      throw new UnauthorizedException('Tài khoản đã bị tạm dừng.');
    }
    if (user.status !== 'active') {
      throw new UnauthorizedException('Tài khoản chưa được kích hoạt.');
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Email hoặc mật khẩu không đúng.');
    }

    if (user.mfaEnabled) {
      return { requiresMfa: true, userId: user.id };
    }

    return this.issueTokens(user, userAgent, ip);
  }

  async loginWithMfa(userId: string, totpCode: string, userAgent?: string, ip?: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true, email: true, status: true, mfaEnabled: true,
        mfaSecret: true, mfaBackupCodes: true, roleSlug: true, permissions: true,
      },
    });
    if (!user || !user.mfaEnabled || !user.mfaSecret) {
      throw new UnauthorizedException('MFA không được cấu hình.');
    }

    const isValid = authenticator.verify({ token: totpCode, secret: user.mfaSecret });
    if (!isValid) {
      // Check backup codes
      const codeIndex = user.mfaBackupCodes.indexOf(totpCode);
      if (codeIndex === -1) {
        throw new UnauthorizedException('Mã xác thực không đúng.');
      }
      // Consume backup code
      const updatedCodes = [...user.mfaBackupCodes];
      updatedCodes.splice(codeIndex, 1);
      await this.prisma.user.update({
        where: { id: userId },
        data: { mfaBackupCodes: updatedCodes },
      });
    }

    return this.issueTokens(user, userAgent, ip);
  }

  async refresh(refreshToken: string) {
    const session = await this.prisma.userSession.findUnique({
      where: { refreshToken },
      include: {
        user: {
          select: {
            id: true, email: true, status: true, roleSlug: true, permissions: true,
          },
        },
      },
    });

    if (!session || session.revokedAt || session.expiresAt < new Date()) {
      throw new UnauthorizedException('Phiên đăng nhập không hợp lệ.');
    }
    if (session.user.status !== 'active') {
      throw new UnauthorizedException('Tài khoản không hoạt động.');
    }

    // Rotate refresh token
    const newRefreshToken = uuidv4();
    const refreshExpiry = new Date();
    refreshExpiry.setDate(refreshExpiry.getDate() + 30);

    await this.prisma.userSession.update({
      where: { id: session.id },
      data: {
        refreshToken: newRefreshToken,
        expiresAt: refreshExpiry,
      },
    });

    const accessToken = this.signAccess(session.user);
    return { accessToken, refreshToken: newRefreshToken };
  }

  async logout(refreshToken: string) {
    await this.prisma.userSession.updateMany({
      where: { refreshToken },
      data: { revokedAt: new Date() },
    });
  }

  async acceptInvitation(token: string, password: string, fullName: string) {
    const user = await this.prisma.user.findUnique({
      where: { invitationToken: token },
    });

    if (!user) throw new BadRequestException('Token mời không hợp lệ.');
    if (user.invitationExpiresAt && user.invitationExpiresAt < new Date()) {
      throw new BadRequestException('Token mời đã hết hạn.');
    }

    const hash = await bcrypt.hash(password, 12);

    const updated = await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: hash,
        fullName,
        status: 'active',
        invitationToken: null,
        invitationExpiresAt: null,
        joinedAt: new Date(),
        emailVerifiedAt: new Date(),
      },
      select: { id: true, email: true, roleSlug: true, permissions: true },
    });

    return this.issueTokens(updated);
  }

  async enableMfa(userId: string) {
    const secret = authenticator.generateSecret();
    const company = await this.prisma.company.findFirst();
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { email: true } });

    const otpAuthUrl = authenticator.keyuri(
      user!.email,
      company?.name ?? 'XBuild',
      secret,
    );
    const qrCode = await QRCode.toDataURL(otpAuthUrl);

    await this.prisma.user.update({
      where: { id: userId },
      data: { mfaSecret: secret },
    });

    return { secret, qrCode, otpAuthUrl };
  }

  async verifyAndActivateMfa(userId: string, totpCode: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { mfaSecret: true },
    });
    if (!user?.mfaSecret) throw new BadRequestException('MFA chưa được khởi tạo.');

    const valid = authenticator.verify({ token: totpCode, secret: user.mfaSecret });
    if (!valid) throw new BadRequestException('Mã TOTP không đúng.');

    const backupCodes = Array.from({ length: 8 }, () =>
      Math.random().toString(36).slice(2, 10).toUpperCase(),
    );

    await this.prisma.user.update({
      where: { id: userId },
      data: { mfaEnabled: true, mfaBackupCodes: backupCodes },
    });

    return { backupCodes };
  }

  private async issueTokens(
    user: { id: string; email: string; roleSlug?: string | null; permissions: string[] },
    userAgent?: string,
    ip?: string,
  ) {
    const accessToken = this.signAccess(user);
    const refreshToken = uuidv4();
    const refreshExpiry = new Date();
    refreshExpiry.setDate(refreshExpiry.getDate() + 30);

    await this.prisma.userSession.create({
      data: {
        userId: user.id,
        refreshToken,
        userAgent,
        ipAddress: ip,
        expiresAt: refreshExpiry,
      },
    });

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastActiveAt: new Date() },
    });

    return { accessToken, refreshToken };
  }

  private signAccess(user: { id: string; email: string; roleSlug?: string | null; permissions: string[] }) {
    return this.jwt.sign(
      { sub: user.id, email: user.email },
      {
        secret: this.config.get<string>('JWT_ACCESS_SECRET'),
        expiresIn: this.config.get<string>('JWT_ACCESS_EXPIRES_IN', '15m'),
      },
    );
  }
}
