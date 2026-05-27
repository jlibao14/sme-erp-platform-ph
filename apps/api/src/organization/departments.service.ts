import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PaginationQueryDto, paginated } from '../common/dto/pagination.dto';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDepartmentDto, UpdateDepartmentDto } from './dto/department.dto';

@Injectable()
export class DepartmentsService {
  constructor(private readonly prisma: PrismaService) {}

  list(tenantId: string, query: PaginationQueryDto, companyId?: string) {
    const where: Prisma.DepartmentWhereInput = {
      deletedAt: null,
      ...(companyId ? { companyId } : {}),
      ...(query.search ? { name: { contains: query.search, mode: 'insensitive' } } : {}),
    };
    return this.prisma.withTenant(tenantId, async (tx) => {
      const [rows, total] = await Promise.all([
        tx.department.findMany({
          where,
          orderBy: { name: query.sortOrder },
          skip: query.skip,
          take: query.limit,
        }),
        tx.department.count({ where }),
      ]);
      return paginated(rows, total, query);
    });
  }

  async get(tenantId: string, id: string) {
    const department = await this.prisma.withTenant(tenantId, (tx) =>
      tx.department.findFirst({ where: { id, deletedAt: null } }),
    );
    if (!department) {
      throw new NotFoundException('Department not found');
    }
    return department;
  }

  create(tenantId: string, dto: CreateDepartmentDto, actorId: string) {
    return this.prisma.withTenant(tenantId, async (tx) => {
      if (!(await tx.company.findFirst({ where: { id: dto.companyId, deletedAt: null } }))) {
        throw new BadRequestException('companyId does not exist in this tenant');
      }
      const clash = await tx.department.findFirst({
        where: { companyId: dto.companyId, code: dto.code, deletedAt: null },
      });
      if (clash) {
        throw new ConflictException(`Department code "${dto.code}" already in use for this company`);
      }
      return tx.department.create({
        data: {
          tenantId,
          companyId: dto.companyId,
          name: dto.name,
          code: dto.code,
          createdBy: actorId,
          updatedBy: actorId,
        },
      });
    });
  }

  update(tenantId: string, id: string, dto: UpdateDepartmentDto, actorId: string) {
    return this.prisma.withTenant(tenantId, async (tx) => {
      const existing = await tx.department.findFirst({ where: { id, deletedAt: null } });
      if (!existing) {
        throw new NotFoundException('Department not found');
      }
      if (dto.code && dto.code !== existing.code) {
        const clash = await tx.department.findFirst({
          where: { companyId: existing.companyId, code: dto.code, deletedAt: null },
        });
        if (clash) {
          throw new ConflictException(`Department code "${dto.code}" already in use for this company`);
        }
      }
      return tx.department.update({ where: { id }, data: { ...dto, updatedBy: actorId } });
    });
  }

  async remove(tenantId: string, id: string, actorId: string) {
    await this.prisma.withTenant(tenantId, async (tx) => {
      const existing = await tx.department.findFirst({ where: { id, deletedAt: null } });
      if (!existing) {
        throw new NotFoundException('Department not found');
      }
      await tx.department.update({ where: { id }, data: { deletedAt: new Date(), updatedBy: actorId } });
    });
    return { success: true };
  }
}
