import { IsEmail, IsString, IsOptional, IsArray, IsUUID } from 'class-validator';

export class CreateUserInviteDto {
  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  fullName?: string;

  @IsOptional()
  @IsString()
  roleSlug?: string;
}

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  fullName?: string;

  @IsOptional()
  @IsString()
  displayName?: string;

  @IsOptional()
  @IsString()
  avatarUrl?: string;

  @IsOptional()
  @IsString()
  locale?: string;

  @IsOptional()
  @IsString()
  timezone?: string;
}

export class SetUserPermissionsDto {
  @IsArray()
  @IsString({ each: true })
  permissions: string[];
}

export class SetUserRoleDto {
  @IsString()
  roleSlug: string;
}
