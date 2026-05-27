import { INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service';
import { createTenant, createTestApp, destroyTenant, uniqueSlug } from './utils';

describe('Tenant isolation (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let prismaService: PrismaService;

  const a = { slug: uniqueSlug('iso-a'), email: 'a@iso.local', password: 'Secret123!' };
  const b = { slug: uniqueSlug('iso-b'), email: 'b@iso.local', password: 'Secret123!' };
  let tenantA: string;
  let tenantB: string;
  let companyB: string;

  beforeAll(async () => {
    app = await createTestApp();
    prismaService = app.get(PrismaService);
    prisma = new PrismaClient();
    const ta = await createTenant(prisma, { ...a, companyName: 'Alpha Trading' });
    const tb = await createTenant(prisma, { ...b, companyName: 'Bravo Distribution' });
    tenantA = ta.tenant.id;
    tenantB = tb.tenant.id;
    companyB = tb.company.id;
  });

  afterAll(async () => {
    await destroyTenant(prisma, tenantA);
    await destroyTenant(prisma, tenantB);
    await prisma.$disconnect();
    await app.close();
  });

  const http = () => request(app.getHttpServer());

  async function token(t: { slug: string; email: string; password: string }) {
    const res = await http()
      .post('/api/v1/auth/login')
      .send({ tenantSlug: t.slug, email: t.email, password: t.password });
    return res.body.data.accessToken as string;
  }

  it('only returns the caller tenant companies via the API', async () => {
    const res = await http()
      .get('/api/v1/companies')
      .set('authorization', `Bearer ${await token(a)}`)
      .expect(200);
    const names = res.body.data.map((c: { name: string }) => c.name);
    expect(names).toContain('Alpha Trading');
    expect(names).not.toContain('Bravo Distribution');
  });

  it('cannot fetch another tenant company by id (404, not 200)', async () => {
    await http()
      .get(`/api/v1/companies/${companyB}`)
      .set('authorization', `Bearer ${await token(a)}`)
      .expect(404);
  });

  it('RLS hides cross-tenant rows even from a direct DB query', async () => {
    // Scoped to tenant A, B's company is invisible at the database layer.
    const fromA = await prismaService.withTenant(tenantA, (tx) =>
      tx.company.findFirst({ where: { id: companyB } }),
    );
    expect(fromA).toBeNull();

    const countA = await prismaService.withTenant(tenantA, (tx) => tx.company.count());
    expect(countA).toBe(1);
  });
});
