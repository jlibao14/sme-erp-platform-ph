import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuditService } from '../common/audit/audit.service';
import { PaginationQueryDto, paginated } from '../common/dto/pagination.dto';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCompanyDto, UpdateCompanyDto } from './dto/company.dto';

@Injectable()
export class CompaniesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  list(tenantId: string, query: PaginationQueryDto) {
    const where: Prisma.CompanyWhereInput = {
      deletedAt: null,
      ...(query.search ? { name: { contains: query.search, mode: 'insensitive' } } : {}),
    };
    return this.prisma.withTenant(tenantId, async (tx) => {
      const [rows, total] = await Promise.all([
        tx.company.findMany({
          where,
          orderBy: { name: query.sortOrder },
          skip: query.skip,
          take: query.limit,
        }),
        tx.company.count({ where }),
      ]);
      return paginated(rows, total, query);
    });
  }

  async get(tenantId: string, id: string) {
    const company = await this.prisma.withTenant(tenantId, (tx) =>
      tx.company.findFirst({ where: { id, deletedAt: null } }),
    );
    if (!company) {
      throw new NotFoundException('Company not found');
    }
    return company;
  }

  async create(tenantId: string, dto: CreateCompanyDto, actorId: string) {
    const company = await this.prisma.withTenant(tenantId, (tx) =>
      tx.company.create({ data: { tenantId, ...dto, createdBy: actorId, updatedBy: actorId } }),
    );
    await this.audit.log({
      tenantId,
      userId: actorId,
      module: 'companies',
      action: 'create',
      recordId: company.id,
      newValue: { ...dto },
    });
    return company;
  }

  async update(tenantId: string, id: string, dto: UpdateCompanyDto, actorId: string) {
    const company = await this.prisma.withTenant(tenantId, async (tx) => {
      const existing = await tx.company.findFirst({ where: { id, deletedAt: null } });
      if (!existing) {
        throw new NotFoundException('Company not found');
      }
      return tx.company.update({ where: { id }, data: { ...dto, updatedBy: actorId } });
    });
    await this.audit.log({
      tenantId,
      userId: actorId,
      module: 'companies',
      action: 'update',
      recordId: id,
      newValue: { ...dto },
    });
    return company;
  }

  async remove(tenantId: string, id: string, actorId: string) {
    await this.prisma.withTenant(tenantId, async (tx) => {
      const existing = await tx.company.findFirst({ where: { id, deletedAt: null } });
      if (!existing) {
        throw new NotFoundException('Company not found');
      }
      await tx.company.update({ where: { id }, data: { deletedAt: new Date(), updatedBy: actorId } });
    });
    await this.audit.log({
      tenantId,
      userId: actorId,
      module: 'companies',
      action: 'delete',
      recordId: id,
    });
    return { success: true };
  }
}
