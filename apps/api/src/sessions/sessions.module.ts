import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { SecurityLogModule } from '../common/security/security-log.module';
import { Session, SessionSchema } from './session.schema';
import { SessionsService } from './sessions.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Session.name, schema: SessionSchema }]),
    SecurityLogModule,
  ],
  providers: [SessionsService],
  exports: [SessionsService],
})
export class SessionsModule {}
