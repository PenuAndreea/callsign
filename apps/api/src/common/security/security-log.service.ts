import { Injectable, Logger } from '@nestjs/common';

import type { SecurityEvent } from './security-event';

/** Successes are routine; everything else may be an attack. */
const ROUTINE_EVENTS: ReadonlySet<SecurityEvent['event']> = new Set(['login_succeeded']);

/**
 * The security audit trail (OWASP A09): one structured entry per event, under the `Security`
 * context, so log tooling can filter and alert on it. In production the logger writes JSON lines
 * (`main.ts`), which also stops a crafted value from forging a log line.
 */
@Injectable()
export class SecurityLog {
  private readonly logger = new Logger('Security');

  record(entry: SecurityEvent): void {
    if (ROUTINE_EVENTS.has(entry.event)) this.logger.log(entry);
    else this.logger.warn(entry);
  }
}
