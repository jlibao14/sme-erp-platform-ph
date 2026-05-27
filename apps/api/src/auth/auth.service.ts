import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { createHash, randomUUID } from 'crypto';
import { AuditService } from '../common/audit/audit.service';
import { MailService } from '../common/mail/mail.service';
import { TokensService } from '../common/tokens/tokens.service';
import { PrismaService } from '../prisma/prisma.service';

type TxClient = Prisma.TransactionClient;

const BCRYPT_ROUNDS = 12;
const PASSWORD_RESET_TTL = 60 * 60 * 1000; // 1 hour

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
    private readonly tokens: TokensService,
    private readonly mail: MailService,
    private readonly audit: AuditService,
  ) {}

  async login(tenantSlug: string, email: string, password: string, meta: RequestMeta) {
    const tenant = await this.prisma.tenant.findFirst({
      where: { slug: tenantSlug, deletedAt: null, status: 'ACTIVE' },
    });
    if (!tenant) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.prisma.withTenant(tenant.id, async (tx) => {
      const user = await tx.user.findFirst({
        where: { email, deletedAt: null, status: 'ACTIVE' },
      });
      if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
        await this.audit.log({
          tenantId: tenant.id,
          module: 'auth',
          action: 'login_failed',
          newValue: { email },
          ...meta,
        });
        throw new UnauthorizedException('Invalid credentials');
      }

      await tx.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
      const tokens = await this.issueSession(
        tx,
        { userId: user.id, tenantId: tenant.id, email: user.email },
        meta,
      );
      await this.audit.log({
        tenantId: tenant.id,
        userId: user.id,
        module: 'auth',
        action: 'login',
        ...meta,
      });
      return tokens;
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

  // Always returns success to avoid leaking which emails exist.
  async forgotPassword(tenantSlug: string, email: string) {
    const tenant = await this.prisma.tenant.findFirst({
      where: { slug: tenantSlug, deletedAt: null, status: 'ACTIVE' },
    });
    if (tenant) {
      const user = await this.prisma.withTenant(tenant.id, (tx) =>
        tx.user.findFirst({ where: { email, deletedAt: null } }),
      );
      if (user) {
        const token = await this.tokens.issue(tenant.id, user.id, 'PASSWORD_RESET', PASSWORD_RESET_TTL);
        this.mail.sendPasswordReset(email, token);
      }
    }
    return { success: true };
  }

  async resetPassword(token: string, password: string) {
    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    await this.tokens.consume(token, 'PASSWORD_RESET', async (tx, ctx) => {
      await tx.user.update({ where: { id: ctx.userId }, data: { passwordHash } });
      // Invalidate all existing sessions after a password reset.
      await tx.session.updateMany({
        where: { userId: ctx.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    });
    return { success: true };
  }

  async acceptInvite(token: string, password: string) {
    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    await this.tokens.consume(token, 'INVITE', async (tx, ctx) => {
      await tx.user.update({
        where: { id: ctx.userId },
        data: { passwordHash, status: 'ACTIVE', emailVerifiedAt: new Date() },
      });
    });
    return { success: true };
  }

  async verifyEmail(token: string) {
    await this.tokens.consume(token, 'EMAIL_VERIFICATION', async (tx, ctx) => {
      await tx.user.update({ where: { id: ctx.userId }, data: { emailVerifiedAt: new Date() } });
    });
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
