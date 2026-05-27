import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// Global permission catalogue. Extend per module as features land.
const PERMISSIONS: Array<{ key: string; module: string; description: string }> = [
  { key: 'admin.user.manage', module: 'admin', description: 'Manage users' },
  { key: 'admin.role.manage', module: 'admin', description: 'Manage roles and permissions' },
  { key: 'sales.invoice.create', module: 'sales', description: 'Create sales invoices' },
  { key: 'sales.invoice.view', module: 'sales', description: 'View sales invoices' },
  { key: 'sales.invoice.approve', module: 'sales', description: 'Approve sales invoices' },
  { key: 'sales.invoice.void', module: 'sales', description: 'Void sales invoices' },
  { key: 'inventory.product.create', module: 'inventory', description: 'Create products' },
  { key: 'inventory.product.update', module: 'inventory', description: 'Update products' },
  { key: 'inventory.stock.adjust', module: 'inventory', description: 'Adjust stock' },
  { key: 'finance.journal.create', module: 'finance', description: 'Create journal entries' },
  { key: 'finance.journal.post', module: 'finance', description: 'Post journal entries' },
  { key: 'hr.employee.create', module: 'hr', description: 'Create employees' },
  { key: 'payroll.run.process', module: 'payroll', description: 'Process payroll runs' },
];

async function main() {
  // Permissions are global (no RLS) — safe to upsert directly.
  for (const p of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { key: p.key },
      update: { module: p.module, description: p.description },
      create: p,
    });
  }
  const allPermissions = await prisma.permission.findMany();

  const slug = 'demo';
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? 'admin@demo.test';
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? 'Admin123!';
  const passwordHash = await bcrypt.hash(adminPassword, 12);

  // Tenant-owned writes must run with RLS bypassed.
  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.bypass_rls', 'on', true)`;

    let tenant = await tx.tenant.findFirst({ where: { slug, deletedAt: null } });
    if (!tenant) {
      tenant = await tx.tenant.create({ data: { name: 'Demo Company', slug } });
    }

    const company =
      (await tx.company.findFirst({ where: { tenantId: tenant.id, deletedAt: null } })) ??
      (await tx.company.create({ data: { tenantId: tenant.id, name: 'Demo Company Inc' } }));

    let role = await tx.role.findFirst({ where: { tenantId: tenant.id, name: 'Administrator' } });
    if (!role) {
      role = await tx.role.create({
        data: { tenantId: tenant.id, name: 'Administrator', isSystem: true },
      });
    }
    await tx.rolePermission.deleteMany({ where: { roleId: role.id } });
    await tx.rolePermission.createMany({
      data: allPermissions.map((p) => ({ roleId: role!.id, permissionId: p.id })),
    });

    let user = await tx.user.findFirst({ where: { tenantId: tenant.id, email: adminEmail } });
    if (!user) {
      user = await tx.user.create({
        data: {
          tenantId: tenant.id,
          companyId: company.id,
          email: adminEmail,
          passwordHash,
          firstName: 'Demo',
          lastName: 'Admin',
          status: 'ACTIVE',
          emailVerifiedAt: new Date(),
        },
      });
    } else {
      user = await tx.user.update({
        where: { id: user.id },
        data: { passwordHash, status: 'ACTIVE' },
      });
    }

    const existingAssignment = await tx.userRole.findFirst({
      where: { userId: user.id, roleId: role.id },
    });
    if (!existingAssignment) {
      await tx.userRole.create({ data: { userId: user.id, roleId: role.id } });
    }

    console.log(`Seeded tenant "${slug}" with admin ${adminEmail}`);
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
