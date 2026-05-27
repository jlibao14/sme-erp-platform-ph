import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { PrismaService } from '../../prisma/prisma.service';

export interface AccessTokenPayload {
  sub: string; // user id
  tid: string; // tenant id
  email: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_ACCESS_SECRET'),
    });
  }

  // Loads the user inside the tenant's RLS context and resolves the live set of
  // permissions (roles -> role_permissions -> permissions). Permissions are read
  // fresh each request so a revoked role takes effect immediately.
  async validate(payload: AccessTokenPayload): Promise<AuthenticatedUser> {
    const user = await this.prisma.withTenant(payload.tid, (tx) =>
      tx.user.findFirst({
        where: { id: payload.sub, deletedAt: null, status: 'ACTIVE' },
        include: {
          userRoles: {
            include: { role: { include: { permissions: { include: { permission: true } } } } },
          },
        },
      }),
    );

    if (!user) {
      throw new UnauthorizedException('User is not active');
    }

    const permissions = new Set<string>();
    for (const ur of user.userRoles) {
      for (const rp of ur.role.permissions) {
        permissions.add(rp.permission.key);
      }
    }

    return {
      userId: user.id,
      tenantId: user.tenantId,
      email: user.email,
      permissions: [...permissions],
    };
  }
}
