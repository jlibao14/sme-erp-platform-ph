import { INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';
import request from 'supertest';
import { TokensService } from '../src/common/tokens/tokens.service';
import { createTenant, createTestApp, destroyTenant, uniqueSlug } from './utils';

describe('Users & RBAC (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let tokens: TokensService;
  let tenantId: string;
  let adminAccess: string;

  const slug = uniqueSlug('ur');
  const adminEmail = 'admin@ur-test.local';
  const adminPassword = 'Secret123!';

  beforeAll(async () => {
    app = await createTestApp();
    tokens = app.get(TokensService);
    prisma = new PrismaClient();
    const t = await createTenant(prisma, { slug, companyName: 'UR Co', email: adminEmail, password: adminPassword });
    tenantId = t.tenant.id;
    // Grant the admin user some — but not all — permissions.
    await grant(prisma, tenantId, t.user.id, [
      'admin.user.view',
      'admin.user.manage',
      'admin.company.manage',
    ]);
    adminAccess = await login(adminEmail, adminPassword);
  });

  afterAll(async () => {
    await destroyTenant(prisma, tenantId);
    await prisma.$disconnect();
    await app.close();
  });

  const http = () => request(app.getHttpServer());

  async function login(email: string, password: string) {
    const res = await http().post('/api/v1/auth/login').send({ tenantSlug: slug, email, password });
    return res.body.data.accessToken as string;
  }

  async function grant(p: PrismaClient, tid: string, userId: string, keys: string[]) {
    await p.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.bypass_rls', 'on', true)`;
      const perms = [];
      for (const key of keys) {
        perms.push(
          await tx.permission.upsert({
            where: { key },
            update: {},
            create: { key, module: key.split('.')[0], description: key },
          }),
        );
      }
      const role = await tx.role.create({ data: { tenantId: tid, name: `TestRole-${randomUUID().slice(0, 6)}` } });
      await tx.rolePermission.createMany({ data: perms.map((pm) => ({ roleId: role.id, permissionId: pm.id })) });
      await tx.userRole.create({ data: { userId, roleId: role.id } });
    });
  }

  it('denies an endpoint when the user lacks the required permission (403)', async () => {
    // Admin has user/company perms but NOT admin.role.manage.
    await http().get('/api/v1/admin/roles').set('authorization', `Bearer ${adminAccess}`).expect(403);
  });

  it('invites a user who then shows up as INVITED', async () => {
    const invite = await http()
      .post('/api/v1/users')
      .set('authorization', `Bearer ${adminAccess}`)
      .send({ email: 'newhire@ur-test.local', firstName: 'New', lastName: 'Hire' })
      .expect(201);
    expect(invite.body.data.status).toBe('INVITED');

    const list = await http()
      .get('/api/v1/users?search=newhire')
      .set('authorization', `Bearer ${adminAccess}`)
      .expect(200);
    expect(list.body.data.some((u: { email: string }) => u.email === 'newhire@ur-test.local')).toBe(true);
    expect(list.body.meta).toMatchObject({ page: 1, limit: 20 });
  });

  it('lets an invited user accept the invite and log in', async () => {
    const invite = await http()
      .post('/api/v1/users')
      .set('authorization', `Bearer ${adminAccess}`)
      .send({ email: 'invitee@ur-test.local', firstName: 'In', lastName: 'Vitee' })
      .expect(201);
    const userId = invite.body.data.id as string;

    const rawToken = await tokens.issue(tenantId, userId, 'INVITE', 60_000);
    await http()
      .post('/api/v1/auth/accept-invite')
      .send({ token: rawToken, password: 'BrandNew123!' })
      .expect(200);

    const access = await login('invitee@ur-test.local', 'BrandNew123!');
    expect(access).toEqual(expect.any(String));
  });

  it('resets a password and invalidates the old one', async () => {
    const me = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.bypass_rls', 'on', true)`;
      return tx.user.findFirstOrThrow({ where: { tenantId, email: adminEmail } });
    });
    const rawToken = await tokens.issue(tenantId, me.id, 'PASSWORD_RESET', 60_000);

    await http()
      .post('/api/v1/auth/reset-password')
      .send({ token: rawToken, password: 'Rotated123!' })
      .expect(200);

    await http()
      .post('/api/v1/auth/login')
      .send({ tenantSlug: slug, email: adminEmail, password: adminPassword })
      .expect(401);
    await http()
      .post('/api/v1/auth/login')
      .send({ tenantSlug: slug, email: adminEmail, password: 'Rotated123!' })
      .expect(200);
  });
});
