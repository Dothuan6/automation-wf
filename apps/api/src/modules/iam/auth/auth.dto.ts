import { IsEmail, IsString, MinLength, IsUUID } from 'class-validator';

export class LoginDto {
  @IsEmail({}, { message: 'Email không hợp lệ' })
  email: string;

  @IsString()
  @MinLength(6)
  password: string;
}

export class MfaVerifyDto {
  @IsUUID()
  userId: string;

  @IsString()
  @MinLength(6)
  totpCode: string;
}

export class RefreshDto {
  @IsString()
  refreshToken: string;
}

export class AcceptInvitationDto {
  @IsString()
  token: string;

  @IsString()
  @MinLength(8, { message: 'Mật khẩu phải ít nhất 8 ký tự' })
  password: string;

  @IsString()
  @MinLength(2)
  fullName: string;
}

export class EnableMfaDto {
  @IsString()
  @MinLength(6)
  totpCode: string;
}
