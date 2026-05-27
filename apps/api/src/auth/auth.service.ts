import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { createHash, randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

type TxClient = Prisma.TransactionClient;

interface TokenContext {
  userId: string;
  tenantId: string;
  email: string;
}

interface RequestMeta {
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async login(tenantSlug: string, email: string, password: string, meta: RequestMeta) {
    const tenant = await this.prisma.tenant.findFirst({
      where: { slug: tenantSlug, deletedAt: null, status: 'ACTIVE' },
    });
    // Same generic error whether the tenant, user, or password is wrong.
    if (!tenant) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.prisma.withTenant(tenant.id, async (tx) => {
      const user = await tx.user.findFirst({
        where: { email, deletedAt: null, status: 'ACTIVE' },
      });
      if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
        throw new UnauthorizedException('Invalid credentials');
      }

      await tx.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

      return this.issueSession(tx, { userId: user.id, tenantId: tenant.id, email: user.email }, meta);
    });
  }

  async refresh(refreshToken: string, meta: RequestMeta) {
    const payload = await this.verifyRefreshToken(refreshToken);
    const tokenHash = this.hashToken(refreshToken);

    return this.prisma.withTenant(payload.tid, async (tx) => {
      const session = await tx.session.findFirst({
        where: { id: payload.sid, userId: payload.sub },
      });

      const valid =
        session &&
        session.revokedAt === null &&
        session.expiresAt > new Date() &&
        session.refreshTokenHash === tokenHash;

      if (!valid) {
        // Token reuse / theft: revoke the whole chain for this user as a precaution.
        await tx.session.updateMany({
          where: { userId: payload.sub, revokedAt: null },
          data: { revokedAt: new Date() },
        });
        throw new UnauthorizedException('Invalid refresh token');
      }

      const tokens = await this.issueSession(
        tx,
        { userId: payload.sub, tenantId: payload.tid, email: payload.email },
        meta,
      );

      await tx.session.update({
        where: { id: session.id },
        data: { revokedAt: new Date(), replacedById: tokens.sessionId },
      });

      return tokens;
    });
  }

  async logout(tenantId: string, userId: string, refreshToken: string) {
    const payload = await this.verifyRefreshToken(refreshToken).catch(() => null);
    if (!payload || payload.tid !== tenantId || payload.sub !== userId) {
      return { success: true };
    }
    await this.prisma.withTenant(tenantId, (tx) =>
      tx.session.updateMany({
        where: { id: payload.sid, userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    );
    return { success: true };
  }

  private async issueSession(tx: TxClient, ctx: TokenContext, meta: RequestMeta) {
    const sessionId = randomUUID();
    const accessToken = await this.signAccessToken(ctx);
    const refreshToken = await this.signRefreshToken(ctx, sessionId);

    await tx.session.create({
      data: {
        id: sessionId,
        tenantId: ctx.tenantId,
        userId: ctx.userId,
        refreshTokenHash: this.hashToken(refreshToken),
        userAgent: meta.userAgent,
        ipAddress: meta.ipAddress,
        expiresAt: this.refreshExpiryDate(),
      },
    });

    return { accessToken, refreshToken, sessionId };
  }

  private signAccessToken(ctx: TokenContext) {
    return this.jwt.signAsync(
      { sub: ctx.userId, tid: ctx.tenantId, email: ctx.email },
      {
        secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
        expiresIn: this.config.get<string>('JWT_ACCESS_EXPIRES_IN', '15m'),
      },
    );
  }

  private signRefreshToken(ctx: TokenContext, sessionId: string) {
    return this.jwt.signAsync(
      { sub: ctx.userId, tid: ctx.tenantId, email: ctx.email, sid: sessionId },
      {
        secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
        expiresIn: this.config.get<string>('JWT_REFRESH_EXPIRES_IN', '7d'),
      },
    );
  }

  private async verifyRefreshToken(token: string) {
    try {
      return await this.jwt.verifyAsync<{
        sub: string;
        tid: string;
        email: string;
        sid: string;
      }>(token, { secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET') });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  private hashToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }

  private refreshExpiryDate() {
    const raw = this.config.get<string>('JWT_REFRESH_EXPIRES_IN', '7d');
    const days = Number(raw.replace(/\D/g, '')) || 7;
    return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  }
}
