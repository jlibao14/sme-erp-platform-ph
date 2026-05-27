import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';

type TxClient = Prisma.TransactionClient;

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  // Runs `fn` inside a transaction scoped to a tenant. The SET LOCAL sets the
  // GUC that Row-Level Security policies read, so the database itself rejects
  // any cross-tenant row even if a query forgets to filter by tenant_id.
  async withTenant<T>(tenantId: string, fn: (tx: TxClient) => Promise<T>): Promise<T> {
    return this.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.current_tenant', ${tenantId}, true)`;
      return fn(tx);
    });
  }

  // Platform/super-admin scope: bypasses RLS. Use sparingly (e.g. resolving a
  // tenant by slug at login, cross-tenant admin tooling).
  async withBypass<T>(fn: (tx: TxClient) => Promise<T>): Promise<T> {
    return this.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.bypass_rls', 'on', true)`;
      return fn(tx);
    });
  }
}
