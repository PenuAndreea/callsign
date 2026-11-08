import { Logger } from '@nestjs/common';

import type { SecurityEvent } from './security-event';
import { SecurityLog } from './security-log.service';

describe('SecurityLog', () => {
  const securityLog = new SecurityLog();
  let log: jest.SpyInstance;
  let warn: jest.SpyInstance;

  beforeEach(() => {
    log = jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => jest.restoreAllMocks());

  it('records a failed login as a warning, with exactly its fields', () => {
    const entry: SecurityEvent = {
      event: 'login_failed',
      callsign: 'wolf-2',
      reason: 'wrong_passphrase',
      ip: '203.0.113.7',
      client: 'web',
    };

    securityLog.record(entry);

    expect(warn).toHaveBeenCalledWith(entry);
    expect(log).not.toHaveBeenCalled();
  });

  it('records a successful login at log level', () => {
    const entry: SecurityEvent = {
      event: 'login_succeeded',
      userId: 'u1',
      callsign: 'wolf-2',
      ip: '203.0.113.7',
      client: 'mobile',
    };

    securityLog.record(entry);

    expect(log).toHaveBeenCalledWith(entry);
    expect(warn).not.toHaveBeenCalled();
  });

  it.each<SecurityEvent>([
    { event: 'rate_limited', method: 'POST', route: '/api/auth/login', ip: '203.0.113.7' },
    { event: 'refresh_token_reuse', sessionId: 's1', userId: 'u1' },
  ])('records $event as a warning', (entry) => {
    securityLog.record(entry);
    expect(warn).toHaveBeenCalledWith(entry);
  });
});
