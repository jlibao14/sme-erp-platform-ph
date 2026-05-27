import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import { AppModule } from '../src/app.module';

// Boots the app with the same global config as src/main.ts (the interceptor and
// exception filter are wired via APP_* providers, so they apply automatically).
export async function createTestApp(): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = moduleRef.createNestApplication();
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  );
  await app.init();
  return app;
}

// Creates an isolated tenant + company + active admin user (RLS bypassed).
export async function createTenant(
  prisma: PrismaClient,
  opts: { slug: string; companyName: string; email: string; password: string },
) {
  const passwordHash = await bcrypt.hash(opts.password, 12);
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.bypass_rls', 'on', true)`;
    const tenant = await tx.tenant.create({
      data: { name: opts.companyName, slug: opts.slug },
    });
    const company = await tx.company.create({
      data: { tenantId: tenant.id, name: opts.companyName },
    });
    const user = await tx.user.create({
      data: {
        tenantId: tenant.id,
        companyId: company.id,
        email: opts.email,
        passwordHash,
        firstName: 'Tenant',
        lastName: 'Admin',
        status: 'ACTIVE',
        emailVerifiedAt: new Date(),
      },
    });
    return { tenant, company, user };
  });
}

// No-op by design. audit_logs is append-only (DELETE is blocked at the DB) and
// FK-references users/tenants, so a tenant cannot be fully torn down without
// dropping audit history. Specs use unique slugs/emails so leftover rows never
// collide, and the test database is ephemeral (recreated per CI run).
export async function destroyTenant(_prisma: PrismaClient, _tenantId: string) {
  // intentionally empty
}

export function uniqueSlug(prefix: string) {
  return `${prefix}-${randomUUID().slice(0, 8)}`;
}
