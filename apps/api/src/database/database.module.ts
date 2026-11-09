import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { set as setMongooseOption } from 'mongoose';

import { TransactionRunner } from '../common/mongo/transaction-runner';
import type { Env } from '../config/env.schema';

/**
 * One shared Mongoose connection for the whole app; feature modules use `MongooseModule.forFeature`.
 * Global, so any service can inject `TransactionRunner` without importing this module.
 */
@Global()
@Module({
  imports: [
    MongooseModule.forRootAsync({
      inject: [ConfigService], // lets connection wait until env has been validated
      useFactory: (config: ConfigService<Env, true>) => {
        // Queries inside `TransactionRunner.run` pick up its session on their own.
        setMongooseOption('transactionAsyncLocalStorage', true);
        return {
          uri: config.get('MONGODB_URI', { infer: true }),
          // Fail fast when MongoDB is unreachable instead of hanging for the 30 s default.
          serverSelectionTimeoutMS: 5000,
        };
      },
    }),
  ],
  providers: [TransactionRunner],
  exports: [TransactionRunner],
})
export class DatabaseModule {}
