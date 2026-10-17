import { Module } from '@nestjs/common';

import { RealtimeService } from './realtime.service';

/** A leaf module: imported by Rooms (membership sync) and Messages (gateway, broadcasts). */
@Module({
  providers: [RealtimeService],
  exports: [RealtimeService],
})
export class RealtimeModule {}
