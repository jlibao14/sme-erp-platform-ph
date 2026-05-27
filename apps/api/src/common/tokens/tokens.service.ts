import { Injectable, UnauthorizedException } from '@nestjs/common';
import { Prisma, UserTokenType } from '@prisma/client';
import { createHash, randomBytes } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';

type TxClient = Prisma.TransactionClient;

export interface ConsumedToken {
  tenantId: string;
  userId: string;
}

@Injectable()
export class TokensService {
  constructor(private readonly prisma: PrismaService) {}

  // Issues a single-use token, storing only its SHA-256 hash. Returns the raw
  // token (to be emailed). Runs in the tenant's RLS context.
  async issue(tenantId: string, userId: string, type: UserTokenType, ttlMs: number) {
    const raw = randomBytes(32).toString('hex');
    await this.prisma.withTenant(tenantId, (tx) =>
      tx.userToken.create({
        data: { tenantId, userId, type, tokenHash: this.hash(raw), expiresAt: new Date(Date.now() + ttlMs) },
      }),
    );
    return raw;
  }

  // Validates + consumes a token atomically (marks it used) and runs `fn` in the
  // same RLS-bypassing transaction, since the caller (e.g. reset) acts before
  // any tenant context exists. Throws if the token is unknown/expired/used.
  async consume<T>(
    raw: string,
    type: UserTokenType,
    fn: (tx: TxClient, ctx: ConsumedToken) => Promise<T>,
  ): Promise<T> {
    const tokenHash = this.hash(raw);
    return this.prisma.withBypass(async (tx) => {
      const token = await tx.userToken.findFirst({ where: { tokenHash, type } });
      if (!token || token.usedAt || token.expiresAt < new Date()) {
        throw new UnauthorizedException('Invalid or expired token');
      }
      await tx.userToken.update({ where: { id: token.id }, data: { usedAt: new Date() } });
      return fn(tx, { tenantId: token.tenantId, userId: token.userId });
    });
  }

  private hash(raw: string) {
    return createHash('sha256').update(raw).digest('hex');
  }
}
