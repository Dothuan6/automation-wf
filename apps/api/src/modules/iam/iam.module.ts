import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { AuthController } from './auth/auth.controller';
import { AuthService } from './auth/auth.service';
import { JwtStrategy } from './auth/strategies/jwt.strategy';
import { UsersController } from './users/users.controller';
import { UsersService } from './users/users.service';
import { RolesService } from './roles/roles.service';
import { TeamsService } from './teams/teams.service';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get('JWT_ACCESS_SECRET'),
        signOptions: { expiresIn: config.get('JWT_ACCESS_EXPIRES_IN', '15m') },
      }),
    }),
    AuditModule,
  ],
  controllers: [AuthController, UsersController],
  providers: [AuthService, JwtStrategy, UsersService, RolesService, TeamsService],
  exports: [AuthService, UsersService, RolesService, TeamsService],
})
export class IamModule {}
