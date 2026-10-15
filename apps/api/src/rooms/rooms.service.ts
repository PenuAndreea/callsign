import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { RoomDto } from '@callsign/types';
import { isObjectIdOrHexString, Model } from 'mongoose';

import { ApiException } from '../common/errors/api.exception';
import { isDuplicateKeyError } from '../common/mongo/is-duplicate-key-error';
import { MembershipsService } from '../memberships/memberships.service';
import type { RoomDocument } from './room.schema';
import { Room } from './room.schema';
import { toRoomDto } from './rooms.mapper';

/**
 * Nets: create, read, join, leave. Owns `memberCount`: it changes only when
 * `MembershipsService` reports that a row was really added or removed.
 *
 * Known trade-off: the membership write and the `$inc` are two writes, not one transaction
 * (that needs a replica set). A crash between them leaves the count off by one; access
 * checks always use `memberships`, never the count.
 */
@Injectable()
export class RoomsService {
  constructor(
    @InjectModel(Room.name) private readonly roomModel: Model<Room>,
    private readonly memberships: MembershipsService,
  ) {}

  /**
   * Creates the net and joins the creator to it.
   * @throws ApiException 409 `NET_NAME_TAKEN` (from the unique index, so it is race-safe).
   */
  async create(userId: string, name: string): Promise<RoomDto> {
    let room: RoomDocument;
    try {
      room = await this.roomModel.create({ name, createdBy: userId });
    } catch (error) {
      if (isDuplicateKeyError(error, 'name')) {
        throw new ApiException(HttpStatus.CONFLICT, 'NET_NAME_TAKEN', 'Net name is already taken');
      }
      throw error;
    }
    return this.join(userId, room.id);
  }

  /** @throws ApiException 404 `NOT_FOUND` */
  async findOne(userId: string, roomId: string): Promise<RoomDto> {
    const room = await this.findRoom(roomId);
    return toRoomDto(room, await this.memberships.isMember(userId, room.id));
  }

  /**
   * Idempotent: joining a net you are already in returns it unchanged.
   * @throws ApiException 404 `NOT_FOUND`
   */
  async join(userId: string, roomId: string): Promise<RoomDto> {
    const room = await this.findRoom(roomId);
    if (!(await this.memberships.add(userId, room.id))) return toRoomDto(room, true);

    const updated = await this.roomModel
      .findByIdAndUpdate(room._id, { $inc: { memberCount: 1 } }, { returnDocument: 'after' })
      .exec();
    if (!updated) throw notFound();
    return toRoomDto(updated, true);
  }

  /**
   * Idempotent: leaving a net you are not in is a no-op. The net is kept when the last
   * member leaves (0 members, still listed under "Open to join").
   * @throws ApiException 404 `NOT_FOUND`
   */
  async leave(userId: string, roomId: string): Promise<void> {
    const room = await this.findRoom(roomId);
    if (!(await this.memberships.remove(userId, room.id))) return;
    await this.roomModel.updateOne({ _id: room._id }, { $inc: { memberCount: -1 } }).exec();
  }

  /** A malformed id is a 404 too: an id that cannot exist does not exist. */
  private async findRoom(roomId: string): Promise<RoomDocument> {
    const room = isObjectIdOrHexString(roomId)
      ? await this.roomModel.findById(roomId).exec()
      : null;
    if (!room) throw notFound();
    return room;
  }
}

function notFound(): ApiException {
  return new ApiException(HttpStatus.NOT_FOUND, 'NOT_FOUND', 'Net not found');
}
