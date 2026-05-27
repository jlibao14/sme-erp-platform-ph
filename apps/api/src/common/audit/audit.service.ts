import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export interface AuditEntry {
  tenantId: string;
  userId?: string;
  module: string;
  action: string;
  recordId?: string;
  oldValue?: Prisma.InputJsonValue;
  newValue?: Prisma.InputJsonValue;
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  // Writes an append-only audit record. Best-effort: an audit failure must never
  // break the business operation, so errors are logged and swallowed.
  async log(entry: AuditEntry): Promise<void> {
    try {
      await this.prisma.withTenant(entry.tenantId, (tx) =>
        tx.auditLog.create({
          data: {
            tenantId: entry.tenantId,
            userId: entry.userId,
            module: entry.module,
            action: entry.action,
            recordId: entry.recordId,
            oldValue: entry.oldValue,
            newValue: entry.newValue,
            ipAddress: entry.ipAddress,
            userAgent: entry.userAgent,
          },
        }),
      );
    } catch (err) {
      this.logger.error(`Failed to write audit log: ${err instanceof Error ? err.message : err}`);
    }
  }
}
