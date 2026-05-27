import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PaginationQueryDto, paginated } from '../common/dto/pagination.dto';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBranchDto, UpdateBranchDto } from './dto/branch.dto';

@Injectable()
export class BranchesService {
  constructor(private readonly prisma: PrismaService) {}

  list(tenantId: string, query: PaginationQueryDto, companyId?: string) {
    const where: Prisma.BranchWhereInput = {
      deletedAt: null,
      ...(companyId ? { companyId } : {}),
      ...(query.search ? { name: { contains: query.search, mode: 'insensitive' } } : {}),
    };
    return this.prisma.withTenant(tenantId, async (tx) => {
      const [rows, total] = await Promise.all([
        tx.branch.findMany({
          where,
          orderBy: { name: query.sortOrder },
          skip: query.skip,
          take: query.limit,
        }),
        tx.branch.count({ where }),
      ]);
      return paginated(rows, total, query);
    });
  }

  async get(tenantId: string, id: string) {
    const branch = await this.prisma.withTenant(tenantId, (tx) =>
      tx.branch.findFirst({ where: { id, deletedAt: null } }),
    );
    if (!branch) {
      throw new NotFoundException('Branch not found');
    }
    return branch;
  }

  create(tenantId: string, dto: CreateBranchDto, actorId: string) {
    return this.prisma.withTenant(tenantId, async (tx) => {
      await assertCompany(tx, dto.companyId);
      if (await tx.branch.findFirst({ where: { code: dto.code, deletedAt: null } })) {
        throw new ConflictException(`Branch code "${dto.code}" already in use`);
      }
      return tx.branch.create({
        data: {
          tenantId,
          companyId: dto.companyId,
          name: dto.name,
          code: dto.code,
          address: dto.address,
          createdBy: actorId,
          updatedBy: actorId,
        },
      });
    });
  }

  update(tenantId: string, id: string, dto: UpdateBranchDto, actorId: string) {
    return this.prisma.withTenant(tenantId, async (tx) => {
      const existing = await tx.branch.findFirst({ where: { id, deletedAt: null } });
      if (!existing) {
        throw new NotFoundException('Branch not found');
      }
      if (dto.code && dto.code !== existing.code) {
        if (await tx.branch.findFirst({ where: { code: dto.code, deletedAt: null } })) {
          throw new ConflictException(`Branch code "${dto.code}" already in use`);
        }
      }
      return tx.branch.update({ where: { id }, data: { ...dto, updatedBy: actorId } });
    });
  }

  async remove(tenantId: string, id: string, actorId: string) {
    await this.prisma.withTenant(tenantId, async (tx) => {
      const existing = await tx.branch.findFirst({ where: { id, deletedAt: null } });
      if (!existing) {
        throw new NotFoundException('Branch not found');
      }
      await tx.branch.update({ where: { id }, data: { deletedAt: new Date(), updatedBy: actorId } });
    });
    return { success: true };
  }
}

async function assertCompany(tx: Prisma.TransactionClient, companyId: string) {
  if (!(await tx.company.findFirst({ where: { id: companyId, deletedAt: null } }))) {
    throw new BadRequestException('companyId does not exist in this tenant');
  }
}
