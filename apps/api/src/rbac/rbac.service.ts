import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

type TxClient = Prisma.TransactionClient;

@Injectable()
export class RbacService {
  constructor(private readonly prisma: PrismaService) {}

  // Global permission catalogue (not tenant-owned).
  listPermissions() {
    return this.prisma.permission.findMany({ orderBy: [{ module: 'asc' }, { key: 'asc' }] });
  }

  listRoles(tenantId: string) {
    return this.prisma.withTenant(tenantId, (tx) =>
      tx.role.findMany({
        where: { deletedAt: null },
        include: { permissions: { include: { permission: true } } },
        orderBy: { name: 'asc' },
      }),
    );
  }

  async createRole(tenantId: string, name: string, description: string | undefined, actorId: string) {
    return this.prisma.withTenant(tenantId, async (tx) => {
      const existing = await tx.role.findFirst({ where: { name, deletedAt: null } });
      if (existing) {
        throw new ConflictException(`Role "${name}" already exists`);
      }
      return tx.role.create({
        data: { tenantId, name, description, createdBy: actorId, updatedBy: actorId },
      });
    });
  }

  async setRolePermissions(tenantId: string, roleId: string, permissionKeys: string[]) {
    return this.prisma.withTenant(tenantId, async (tx) => {
      const role = await tx.role.findFirst({ where: { id: roleId, deletedAt: null } });
      if (!role) {
        throw new NotFoundException('Role not found');
      }

      const permissions = await tx.permission.findMany({ where: { key: { in: permissionKeys } } });
      this.assertAllResolved(permissionKeys, permissions.map((p) => p.key));

      await tx.rolePermission.deleteMany({ where: { roleId } });
      if (permissions.length > 0) {
        await tx.rolePermission.createMany({
          data: permissions.map((p) => ({ roleId, permissionId: p.id })),
        });
      }
      return this.findRoleWithPermissions(tx, roleId);
    });
  }

  async assignUserRoles(tenantId: string, userId: string, roleIds: string[]) {
    return this.prisma.withTenant(tenantId, async (tx) => {
      const user = await tx.user.findFirst({ where: { id: userId, deletedAt: null } });
      if (!user) {
        throw new NotFoundException('User not found');
      }

      const roles = await tx.role.findMany({ where: { id: { in: roleIds }, deletedAt: null } });
      if (roles.length !== roleIds.length) {
        throw new BadRequestException('One or more roles do not exist in this tenant');
      }

      await tx.userRole.deleteMany({ where: { userId } });
      if (roleIds.length > 0) {
        await tx.userRole.createMany({ data: roleIds.map((roleId) => ({ userId, roleId })) });
      }
      return tx.userRole.findMany({ where: { userId }, include: { role: true } });
    });
  }

  private async findRoleWithPermissions(tx: TxClient, roleId: string) {
    return tx.role.findFirst({
      where: { id: roleId },
      include: { permissions: { include: { permission: true } } },
    });
  }

  private assertAllResolved(requested: string[], found: string[]) {
    const missing = requested.filter((k) => !found.includes(k));
    if (missing.length > 0) {
      throw new BadRequestException(`Unknown permission key(s): ${missing.join(', ')}`);
    }
  }
}
