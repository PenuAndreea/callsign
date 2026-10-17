import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { MessageDto, Page, PageQuery } from '@callsign/types';
import { objectIdSchema } from '@callsign/types';
import type { QueryFilter } from 'mongoose';
import { isObjectIdOrHexString, Model, Types } from 'mongoose';

import { ApiException } from '../common/errors/api.exception';
import { decodeCursor } from '../common/pagination/cursor';
import { pageFetchLimit, toPage } from '../common/pagination/to-page';
import { MembershipsService } from '../memberships/memberships.service';
import { netNotFound } from '../rooms/net-not-found';
import { Message } from './message.schema';
import { toMessageDto } from './messages.mapper';

/**
 * Net history (REST). Members only: access is always checked against `memberships`,
 * the single source of truth, never against the room's `memberCount` or socket rooms.
 */
@Injectable()
export class MessagesService {
  constructor(
    @InjectModel(Message.name) private readonly messageModel: Model<Message>,
    private readonly memberships: MembershipsService,
  ) {}

  /**
   * One page of a net's messages, newest first. The cursor is the `_id` of the oldest message
   * on the previous page; the next page continues below it on the `{ roomId, _id }` index.
   * @throws ApiException 404 `NOT_FOUND` for a malformed net id.
   * @throws ApiException 403 `NOT_A_MEMBER`, also for a net that does not exist: there is no
   *   membership without a net, so one lookup answers both.
   * @throws ApiException 400 `VALIDATION_FAILED` for a cursor we did not issue.
   */
  async history(
    userId: string,
    roomId: string,
    { cursor, limit }: PageQuery,
  ): Promise<Page<MessageDto>> {
    if (!isObjectIdOrHexString(roomId)) throw netNotFound();
    // Decode before any database work.
    const before = cursor === undefined ? undefined : decodeCursor(cursor, objectIdSchema);
    await this.assertMember(userId, roomId);

    const filter: QueryFilter<Message> = { roomId: new Types.ObjectId(roomId) };
    // `_id` is unique, so "below the last id" never skips or repeats a message.
    if (before !== undefined) filter._id = { $lt: new Types.ObjectId(before) };

    const messages = await this.messageModel
      .find(filter)
      .sort({ _id: -1 })
      .limit(pageFetchLimit(limit))
      .lean()
      .exec();
    return toPage(messages, {
      limit,
      cursorOf: (message) => message._id.toHexString(),
      toItem: toMessageDto,
    });
  }

  private async assertMember(userId: string, roomId: string): Promise<void> {
    if (!(await this.memberships.isMember(userId, roomId))) {
      throw new ApiException(HttpStatus.FORBIDDEN, 'NOT_A_MEMBER', 'Join the net first');
    }
  }
}
