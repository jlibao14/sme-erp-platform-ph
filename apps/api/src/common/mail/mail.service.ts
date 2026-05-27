import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

const AGENTMAIL_BASE_URL = 'https://api.agentmail.to/v0';

// Sends transactional email via AgentMail (https://agentmail.to) when configured.
// Falls back to logging the action link when AGENTMAIL_API_KEY is unset (local
// dev / tests). Sending is best-effort: a delivery failure is logged, never
// thrown, so it cannot break invite/reset flows (the token row still exists).
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(private readonly config: ConfigService) {}

  private appUrl() {
    return this.config.get<string>('APP_URL', 'http://localhost:3000');
  }

  sendInvite(email: string, tenantSlug: string, token: string) {
    const link = `${this.appUrl()}/accept-invite?tenant=${tenantSlug}&token=${token}`;
    void this.deliver(email, 'You have been invited', 'invite', link);
  }

  sendPasswordReset(email: string, token: string) {
    const link = `${this.appUrl()}/reset-password?token=${token}`;
    void this.deliver(email, 'Reset your password', 'password reset', link);
  }

  sendEmailVerification(email: string, token: string) {
    const link = `${this.appUrl()}/verify-email?token=${token}`;
    void this.deliver(email, 'Verify your email', 'email verification', link);
  }

  private async deliver(to: string, subject: string, kind: string, link: string) {
    const apiKey = this.config.get<string>('AGENTMAIL_API_KEY');
    const inboxId = this.config.get<string>('AGENTMAIL_INBOX_ID') ?? this.config.get<string>('MAIL_FROM');

    if (!apiKey || !inboxId) {
      this.logger.log(`[mail:${kind}] to=${to} link=${link} (no provider configured; not sent)`);
      return;
    }

    const text = `${subject}\n\nOpen this link to continue:\n${link}\n\nIf you did not expect this email, you can ignore it.`;
    const html = `<p>${subject}.</p><p><a href="${link}">Continue</a></p><p>If you did not expect this email, you can ignore it.</p>`;

    try {
      const res = await fetch(
        `${AGENTMAIL_BASE_URL}/inboxes/${encodeURIComponent(inboxId)}/messages/send`,
        {
          method: 'POST',
          headers: {
            authorization: `Bearer ${apiKey}`,
            'content-type': 'application/json',
          },
          body: JSON.stringify({ to, subject, text, html }),
        },
      );
      if (!res.ok) {
        const body = await res.text();
        this.logger.error(`[mail:${kind}] AgentMail send failed (${res.status}): ${body}`);
        return;
      }
      this.logger.log(`[mail:${kind}] sent to=${to} via AgentMail`);
    } catch (err) {
      this.logger.error(`[mail:${kind}] AgentMail request error: ${err instanceof Error ? err.message : err}`);
    }
  }
}
