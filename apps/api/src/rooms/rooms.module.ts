import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { MembershipsModule } from '../memberships/memberships.module';
import { Room, RoomSchema } from './room.schema';
import { RoomsController } from './rooms.controller';
import { RoomsService } from './rooms.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Room.name, schema: RoomSchema }]),
    MembershipsModule,
  ],
  controllers: [RoomsController],
  providers: [RoomsService],
  exports: [RoomsService],
})
export class RoomsModule {}
