import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';

import { PasswordHasher } from '../auth/password-hasher.service';
import { validateEnv } from '../config/validate-env';
import { DatabaseModule } from '../database/database.module';
import { Message, MessageSchema } from '../messages/message.schema';
import { RoomsModule } from '../rooms/rooms.module';
import { Session, SessionSchema } from '../sessions/session.schema';
import { UsersModule } from '../users/users.module';
import { Seeder } from './seeder.service';

/**
 * Only what the seed needs, run as an application context (no HTTP server, no sockets, so
 * `RealtimeService` stays detached and its calls are no-ops). Message and Session models are
 * registered here directly: the seed writes and empties them without their services.
 */
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, cache: true, validate: validateEnv }),
    DatabaseModule,
    MongooseModule.forFeature([
      { name: Message.name, schema: MessageSchema },
      { name: Session.name, schema: SessionSchema },
    ]),
    UsersModule,
    RoomsModule,
  ],
  providers: [PasswordHasher, Seeder],
})
export class SeedModule {}
