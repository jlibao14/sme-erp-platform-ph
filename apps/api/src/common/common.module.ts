import { Global, Module } from '@nestjs/common';
import { AuditService } from './audit/audit.service';
import { MailService } from './mail/mail.service';
import { TokensService } from './tokens/tokens.service';

// Shared cross-cutting services available to every feature module.
@Global()
@Module({
  providers: [TokensService, MailService, AuditService],
  exports: [TokensService, MailService, AuditService],
})
export class CommonModule {}
