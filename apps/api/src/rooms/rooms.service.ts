import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Page, RoomDto, RoomsQuery } from '@callsign/types';
import { roomNameSchema } from '@callsign/types';
import type { QueryFilter } from 'mongoose';
import type { Types } from 'mongoose';
import { isObjectIdOrHexString, Model } from 'mongoose';

import { ApiException } from '../common/errors/api.exception';
import { isDuplicateKeyError } from '../common/mongo/is-duplicate-key-error';
import { decodeCursor } from '../common/pagination/cursor';
import { pageFetchLimit, toPage } from '../common/pagination/to-page';
import { MembershipsService } from '../memberships/memberships.service';
import { RealtimeService } from '../realtime/realtime.service';
import { toMessagePreview } from './message-preview';
import type { RoomDocument, RoomLastMessage } from './room.schema';
import { Room } from './room.schema';
import { netNotFound } from './net-not-found';
import { toRoomDto } from './rooms.mapper';

/**
 * Nets: create, list, read, join, leave, and the last-message preview. Owns `memberCount`: it changes only when
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
    private readonly realtime: RealtimeService,
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

  /**
   * One page of the user's nets (`joined`) or the nets they can join (`open`), sorted by name.
   * Membership is not stored on the room: the scope splits all rooms by the user's memberships,
   * which is also why `isMember` follows from the scope without a lookup per room.
   * @throws ApiException 400 `VALIDATION_FAILED` for a cursor we did not issue.
   */
  async list(userId: string, { scope, cursor, limit }: RoomsQuery): Promise<Page<RoomDto>> {
    // Decode first: a bad cursor fails before any database work.
    const after = cursor === undefined ? undefined : decodeCursor(cursor, roomNameSchema);
    const roomIds = await this.memberships.roomIdsFor(userId);

    const filter: QueryFilter<Room> = {
      _id: scope === 'joined' ? { $in: roomIds } : { $nin: roomIds },
    };
    // Names are unique, so "after the last name" never skips or repeats a room.
    if (after !== undefined) filter.name = { $gt: after };

    const rooms = await this.roomModel
      .find(filter)
      .sort({ name: 1 })
      .limit(pageFetchLimit(limit))
      .lean()
      .exec();
    const isMember = scope === 'joined';
    return toPage(rooms, {
      limit,
      cursorOf: (room) => room.name,
      toItem: (room) => toRoomDto(room, isMember),
    });
  }

  /** @throws ApiException 404 `NOT_FOUND` */
  async findOne(userId: string, roomId: string): Promise<RoomDto> {
    const room = await this.findRoom(roomId);
    return toRoomDto(room, await this.memberships.isMember(userId, room.id));
  }

  /**
   * Idempotent: joining a net you are already in returns it unchanged. Moves every socket of
   * the user into the net, then tells the net's sockets (the joiner's too) the new count.
   * @throws ApiException 404 `NOT_FOUND`
   */
  async join(userId: string, roomId: string): Promise<RoomDto> {
    const room = await this.findRoom(roomId);
    const added = await this.memberships.add(userId, room.id);
    // Also on a repeated join: cheap, and repairs a socket that missed an earlier sync.
    this.realtime.joinUserToNet(userId, room.id);
    if (!added) return toRoomDto(room, true);

    const updated = await this.roomModel
      .findByIdAndUpdate(room._id, { $inc: { memberCount: 1 } }, { returnDocument: 'after' })
      .exec();
    if (!updated) throw netNotFound();
    this.realtime.broadcastRoomUpdate({ id: updated.id, memberCount: updated.memberCount });
    return toRoomDto(updated, true);
  }

  /**
   * Idempotent: leaving a net you are not in is a no-op. The net is kept when the last
   * member leaves (0 members, still listed under "Open to join"). Takes every socket of the
   * user out of the net, then tells the remaining members the new count.
   * @throws ApiException 404 `NOT_FOUND`
   */
  async leave(userId: string, roomId: string): Promise<void> {
    const room = await this.findRoom(roomId);
    const removed = await this.memberships.remove(userId, room.id);
    // Also on a repeated leave: repairs a socket still in a net the user is not in.
    this.realtime.removeUserFromNet(userId, room.id);
    if (!removed) return;

    const updated = await this.roomModel
      .findByIdAndUpdate(room._id, { $inc: { memberCount: -1 } }, { returnDocument: 'after' })
      .exec();
    if (updated) {
      this.realtime.broadcastRoomUpdate({ id: updated.id, memberCount: updated.memberCount });
    }
  }

  /**
   * Sets the net's preview to this message, unless a newer one is already there. The filter
   * and the write are one atomic `updateOne`, so two sends finishing out of order cannot
   * overwrite the newer preview with the older one. ObjectIds grow with time, so "newer"
   * is a plain id comparison (no ties, unlike `createdAt`).
   * @returns whether the preview changed.
   */
  async recordLastMessage(message: {
    messageId: Types.ObjectId;
    roomId: Types.ObjectId;
    senderId: Types.ObjectId;
    content: string;
    createdAt: Date;
  }): Promise<boolean> {
    const { messageId, roomId, senderId, content, createdAt } = message;
    const lastMessage: RoomLastMessage = {
      messageId,
      senderId,
      content: toMessagePreview(content),
      createdAt,
    };
    const { modifiedCount } = await this.roomModel
      .updateOne(
        {
          _id: roomId,
          // `null` also matches a room created before the field existed.
          $or: [{ lastMessage: null }, { 'lastMessage.messageId': { $lt: messageId } }],
        },
        { $set: { lastMessage } },
      )
      .exec();
    return modifiedCount === 1;
  }

  /** A malformed id is a 404 too: an id that cannot exist does not exist. */
  private async findRoom(roomId: string): Promise<RoomDocument> {
    const room = isObjectIdOrHexString(roomId)
      ? await this.roomModel.findById(roomId).exec()
      : null;
    if (!room) throw netNotFound();
    return room;
  }
}
