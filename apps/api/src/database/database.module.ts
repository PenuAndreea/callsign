import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';

import type { Env } from '../config/env.schema';

/** One shared Mongoose connection for the whole app; feature modules use `MongooseModule.forFeature`. */
@Module({
  imports: [
    MongooseModule.forRootAsync({
      inject: [ConfigService], // lets connection wait until env has been validated
      useFactory: (config: ConfigService<Env, true>) => ({
        uri: config.get('MONGODB_URI', { infer: true }),
        // Fail fast when MongoDB is unreachable instead of hanging for the 30 s default.
        serverSelectionTimeoutMS: 5000,
      }),
    }),
  ],
})
export class DatabaseModule {}
