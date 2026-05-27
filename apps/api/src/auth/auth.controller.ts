import { Body, Controller, Get, HttpCode, Post, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import {
  AuthenticatedUser,
  CurrentUser,
} from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(200)
  async login(@Body() dto: LoginDto, @Req() req: Request) {
    const { accessToken, refreshToken } = await this.auth.login(
      dto.tenantSlug,
      dto.email,
      dto.password,
      this.meta(req),
    );
    return { success: true, data: { accessToken, refreshToken } };
  }

  @Public()
  @Post('refresh-token')
  @HttpCode(200)
  async refresh(@Body() dto: RefreshTokenDto, @Req() req: Request) {
    const { accessToken, refreshToken } = await this.auth.refresh(dto.refreshToken, this.meta(req));
    return { success: true, data: { accessToken, refreshToken } };
  }

  @ApiBearerAuth()
  @Post('logout')
  @HttpCode(200)
  async logout(@CurrentUser() user: AuthenticatedUser, @Body() dto: RefreshTokenDto) {
    await this.auth.logout(user.tenantId, user.userId, dto.refreshToken);
    return { success: true, message: 'Logged out' };
  }

  @ApiBearerAuth()
  @Get('me')
  me(@CurrentUser() user: AuthenticatedUser) {
    return { success: true, data: user };
  }

  private meta(req: Request) {
    return {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    };
  }
}
