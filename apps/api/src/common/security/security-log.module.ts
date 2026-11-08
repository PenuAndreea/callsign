import { Module } from '@nestjs/common';

import { SecurityLog } from './security-log.service';

/** Imported by every module that records security events (not global, so each one runs alone). */
@Module({
  providers: [SecurityLog],
  exports: [SecurityLog],
})
export class SecurityLogModule {}
