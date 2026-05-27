import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

// Dev-stage mailer: logs the action link instead of sending. Swap the body of
// these methods for a real SMTP/provider transport without touching callers.
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(private readonly config: ConfigService) {}

  private appUrl() {
    return this.config.get<string>('APP_URL', 'http://localhost:3000');
  }

  sendInvite(email: string, tenantSlug: string, token: string) {
    this.deliver(email, 'invite', `${this.appUrl()}/accept-invite?tenant=${tenantSlug}&token=${token}`);
  }

  sendPasswordReset(email: string, token: string) {
    this.deliver(email, 'password reset', `${this.appUrl()}/reset-password?token=${token}`);
  }

  sendEmailVerification(email: string, token: string) {
    this.deliver(email, 'email verification', `${this.appUrl()}/verify-email?token=${token}`);
  }

  private deliver(email: string, kind: string, link: string) {
    this.logger.log(`[mail:${kind}] to=${email} link=${link}`);
  }
}
