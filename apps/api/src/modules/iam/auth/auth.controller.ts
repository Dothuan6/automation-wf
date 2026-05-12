import {
  Controller, Post, Body, Req, Res, HttpCode, Get, UseGuards, Patch,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { Public, RequirePermission } from '../../../common/decorators/require-permission.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import {
  LoginDto, MfaVerifyDto, RefreshDto, AcceptInvitationDto,
  EnableMfaDto,
} from './auth.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(200)
  async login(@Body() dto: LoginDto, @Req() req: Request) {
    return this.authService.login(
      dto.email,
      dto.password,
      req.headers['user-agent'],
      req.ip,
    );
  }

  @Public()
  @Post('login/mfa')
  @HttpCode(200)
  loginMfa(@Body() dto: MfaVerifyDto, @Req() req: Request) {
    return this.authService.loginWithMfa(dto.userId, dto.totpCode, req.headers['user-agent'], req.ip);
  }

  @Public()
  @Post('refresh')
  @HttpCode(200)
  refresh(@Body() dto: RefreshDto) {
    return this.authService.refresh(dto.refreshToken);
  }

  @Public()
  @Post('logout')
  @HttpCode(204)
  async logout(@Body() dto: RefreshDto) {
    await this.authService.logout(dto.refreshToken);
  }

  @Public()
  @Post('invitation/accept')
  acceptInvitation(@Body() dto: AcceptInvitationDto) {
    return this.authService.acceptInvitation(dto.token, dto.password, dto.fullName);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('mfa/enable')
  enableMfa(@CurrentUser('sub') userId: string) {
    return this.authService.enableMfa(userId);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('mfa/verify')
  verifyMfa(@CurrentUser('sub') userId: string, @Body() dto: EnableMfaDto) {
    return this.authService.verifyAndActivateMfa(userId, dto.totpCode);
  }
}
