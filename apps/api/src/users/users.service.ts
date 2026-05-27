import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { AuditService } from '../common/audit/audit.service';
import { PaginationQueryDto, paginated } from '../common/dto/pagination.dto';
import { MailService } from '../common/mail/mail.service';
import { TokensService } from '../common/tokens/tokens.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

const INVITE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days

const userSelect = {
  id: true,
  tenantId: true,
  companyId: true,
  branchId: true,
  departmentId: true,
  email: true,
  firstName: true,
  lastName: true,
  status: true,
  emailVerifiedAt: true,
  lastLoginAt: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tokens: TokensService,
    private readonly mail: MailService,
    private readonly audit: AuditService,
  ) {}

  async list(tenantId: string, query: PaginationQueryDto) {
    const where: Prisma.UserWhereInput = {
      deletedAt: null,
      ...(query.search
        ? {
            OR: [
              { email: { contains: query.search, mode: 'insensitive' } },
              { firstName: { contains: query.search, mode: 'insensitive' } },
              { lastName: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    return this.prisma.withTenant(tenantId, async (tx) => {
      const [rows, total] = await Promise.all([
        tx.user.findMany({
          where,
          select: userSelect,
          orderBy: { createdAt: query.sortOrder },
          skip: query.skip,
          take: query.limit,
        }),
        tx.user.count({ where }),
      ]);
      return paginated(rows, total, query);
    });
  }

  async get(tenantId: string, id: string) {
    const user = await this.prisma.withTenant(tenantId, (tx) =>
      tx.user.findFirst({ where: { id, deletedAt: null }, select: userSelect }),
    );
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async invite(tenantId: string, dto: CreateUserDto, actorId: string, meta: AuditMeta) {
    const tenant = await this.prisma.tenant.findFirst({ where: { id: tenantId } });
    // Unusable random hash until the invitee sets their password via accept-invite.
    const placeholderHash = await bcrypt.hash(randomBytes(24).toString('hex'), 12);

    const user = await this.prisma.withTenant(tenantId, async (tx) => {
      const existing = await tx.user.findFirst({ where: { email: dto.email, deletedAt: null } });
      if (existing) {
        throw new ConflictException('A user with this email already exists');
      }
      await this.assertScopesExist(tx, dto);
      if (dto.roleIds?.length) {
        await this.assertRolesExist(tx, dto.roleIds);
      }

      const created = await tx.user.create({
        data: {
          tenantId,
          companyId: dto.companyId,
          branchId: dto.branchId,
          departmentId: dto.departmentId,
          email: dto.email,
          passwordHash: placeholderHash,
          firstName: dto.firstName,
          lastName: dto.lastName,
          status: 'INVITED',
          createdBy: actorId,
          updatedBy: actorId,
        },
        select: userSelect,
      });

      if (dto.roleIds?.length) {
        await tx.userRole.createMany({
          data: dto.roleIds.map((roleId) => ({ userId: created.id, roleId })),
        });
      }
      return created;
    });

    const token = await this.tokens.issue(tenantId, user.id, 'INVITE', INVITE_TTL);
    this.mail.sendInvite(user.email, tenant?.slug ?? '', token);
    await this.audit.log({
      tenantId,
      userId: actorId,
      module: 'users',
      action: 'invite',
      recordId: user.id,
      newValue: { email: user.email },
      ...meta,
    });
    return user;
  }

  async update(tenantId: string, id: string, dto: UpdateUserDto, actorId: string) {
    return this.prisma.withTenant(tenantId, async (tx) => {
      const existing = await tx.user.findFirst({ where: { id, deletedAt: null } });
      if (!existing) {
        throw new NotFoundException('User not found');
      }
      await this.assertScopesExist(tx, dto);
      return tx.user.update({
        where: { id },
        data: { ...dto, updatedBy: actorId },
        select: userSelect,
      });
    });
  }

  async setStatus(tenantId: string, id: string, status: 'ACTIVE' | 'DISABLED', actorId: string) {
    return this.prisma.withTenant(tenantId, async (tx) => {
      const existing = await tx.user.findFirst({ where: { id, deletedAt: null } });
      if (!existing) {
        throw new NotFoundException('User not found');
      }
      const user = await tx.user.update({
        where: { id },
        data: { status, updatedBy: actorId },
        select: userSelect,
      });
      // Disabling a user cuts off their active sessions immediately.
      if (status === 'DISABLED') {
        await tx.session.updateMany({
          where: { userId: id, revokedAt: null },
          data: { revokedAt: new Date() },
        });
      }
      return user;
    });
  }

  async remove(tenantId: string, id: string, actorId: string) {
    await this.prisma.withTenant(tenantId, async (tx) => {
      const existing = await tx.user.findFirst({ where: { id, deletedAt: null } });
      if (!existing) {
        throw new NotFoundException('User not found');
      }
      await tx.user.update({ where: { id }, data: { deletedAt: new Date(), updatedBy: actorId } });
      await tx.session.updateMany({
        where: { userId: id, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    });
    return { success: true };
  }

  private async assertScopesExist(
    tx: Prisma.TransactionClient,
    dto: { companyId?: string; branchId?: string; departmentId?: string },
  ) {
    if (dto.companyId && !(await tx.company.findFirst({ where: { id: dto.companyId, deletedAt: null } }))) {
      throw new BadRequestException('companyId does not exist in this tenant');
    }
    if (dto.branchId && !(await tx.branch.findFirst({ where: { id: dto.branchId, deletedAt: null } }))) {
      throw new BadRequestException('branchId does not exist in this tenant');
    }
    if (
      dto.departmentId &&
      !(await tx.department.findFirst({ where: { id: dto.departmentId, deletedAt: null } }))
    ) {
      throw new BadRequestException('departmentId does not exist in this tenant');
    }
  }

  private async assertRolesExist(tx: Prisma.TransactionClient, roleIds: string[]) {
    const count = await tx.role.count({ where: { id: { in: roleIds }, deletedAt: null } });
    if (count !== roleIds.length) {
      throw new BadRequestException('One or more roles do not exist in this tenant');
    }
  }
}

interface AuditMeta {
  ipAddress?: string;
  userAgent?: string;
}
