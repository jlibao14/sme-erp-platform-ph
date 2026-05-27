import { INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';
import { createTenant, createTestApp, destroyTenant, uniqueSlug } from './utils';

describe('Auth (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let tenantId: string;
  const slug = uniqueSlug('auth');
  const email = 'admin@auth-test.local';
  const password = 'Secret123!';

  beforeAll(async () => {
    app = await createTestApp();
    prisma = new PrismaClient();
    const t = await createTenant(prisma, { slug, companyName: 'Auth Co', email, password });
    tenantId = t.tenant.id;
  });

  afterAll(async () => {
    await destroyTenant(prisma, tenantId);
    await prisma.$disconnect();
    await app.close();
  });

  const http = () => request(app.getHttpServer());

  it('logs in and returns tokens in the standard envelope', async () => {
    const res = await http()
      .post('/api/v1/auth/login')
      .send({ tenantSlug: slug, email, password })
      .expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.accessToken).toEqual(expect.any(String));
    expect(res.body.data.refreshToken).toEqual(expect.any(String));
  });

  it('rejects a wrong password with 401', async () => {
    await http()
      .post('/api/v1/auth/login')
      .send({ tenantSlug: slug, email, password: 'wrong' })
      .expect(401);
  });

  it('rejects /me without a token', async () => {
    await http().get('/api/v1/auth/me').expect(401);
  });

  it('returns the principal for /me with a valid token', async () => {
    const login = await http()
      .post('/api/v1/auth/login')
      .send({ tenantSlug: slug, email, password });
    const res = await http()
      .get('/api/v1/auth/me')
      .set('authorization', `Bearer ${login.body.data.accessToken}`)
      .expect(200);
    expect(res.body.data.email).toBe(email);
    expect(res.body.data.tenantId).toBe(tenantId);
  });

  it('rotates refresh tokens and revokes the old one on reuse', async () => {
    const login = await http()
      .post('/api/v1/auth/login')
      .send({ tenantSlug: slug, email, password });
    const oldRefresh = login.body.data.refreshToken;

    const rotated = await http()
      .post('/api/v1/auth/refresh-token')
      .send({ refreshToken: oldRefresh })
      .expect(200);
    expect(rotated.body.data.refreshToken).not.toBe(oldRefresh);

    // Reusing the old (now rotated) refresh token must fail.
    await http().post('/api/v1/auth/refresh-token').send({ refreshToken: oldRefresh }).expect(401);
  });
});
