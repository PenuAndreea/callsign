import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { MessageDto, Page, PageQuery, SendMessageRequest } from '@callsign/types';
import { objectIdSchema } from '@callsign/types';
import type { QueryFilter } from 'mongoose';
import { isObjectIdOrHexString, Model, Types } from 'mongoose';

import type { AuthUser } from '../auth/auth-user';
import { ApiException } from '../common/errors/api.exception';
import { isDuplicateKeyError } from '../common/mongo/is-duplicate-key-error';
import { decodeCursor } from '../common/pagination/cursor';
import { pageFetchLimit, toPage } from '../common/pagination/to-page';
import { MembershipsService } from '../memberships/memberships.service';
import { netNotFound } from '../rooms/net-not-found';
import { RoomsService } from '../rooms/rooms.service';
import type { MessageDocument } from './message.schema';
import { Message } from './message.schema';
import { toMessageDto } from './messages.mapper';

/** `created: false` when the send was a retry of a message that is already saved. */
export interface SendResult {
  message: MessageDto;
  created: boolean;
}

/**
 * Sending (over the socket) and net history (REST). Members only: access is always checked
 * against `memberships`, the single source of truth, never against `memberCount` or socket rooms.
 */
@Injectable()
export class MessagesService {
  private readonly logger = new Logger(MessagesService.name);

  constructor(
    @InjectModel(Message.name) private readonly messageModel: Model<Message>,
    private readonly memberships: MembershipsService,
    private readonly rooms: RoomsService,
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

  /**
   * Saves a message from `sender` (always from the socket's token, never from the payload)
   * and updates the net's preview. The preview is best effort: once the message is saved the
   * send has succeeded, so a failed preview write is logged, not reported to the client (who
   * would otherwise retry and post the message twice). The next message fixes the preview.
   *
   * A retry with a `clientMessageId` that is already saved (in this net, from this sender) returns
   * the saved message with `created: false`: no second copy, no preview write, and the caller
   * does not broadcast it again. The saved content wins if the retry's content differs.
   * @throws ApiException 403 `NOT_A_MEMBER`, also for a net that does not exist.
   */
  async send(
    sender: AuthUser,
    { roomId, content, clientMessageId }: SendMessageRequest,
  ): Promise<SendResult> {
    await this.assertMember(sender.userId, roomId);
    let message: MessageDocument;
    try {
      message = await this.messageModel.create({
        roomId,
        senderId: sender.userId,
        senderCallsign: sender.callsign,
        content,
        ...(clientMessageId !== undefined && { clientMessageId }),
      });
    } catch (error) {
      if (clientMessageId === undefined || !isDuplicateKeyError(error, 'clientMessageId')) {
        throw error;
      }
      return {
        message: await this.findSent(sender.userId, roomId, clientMessageId),
        created: false,
      };
    }

    await this.rooms
      .recordLastMessage({
        messageId: message._id,
        roomId: message.roomId,
        senderId: message.senderId,
        content: message.content,
        createdAt: message.createdAt,
      })
      .catch((error: unknown) => {
        this.logger.error(
          `Preview update failed for message ${message.id}`,
          error instanceof Error ? error.stack : error,
        );
      });

    return { message: toMessageDto(message), created: true };
  }

  /** The message an earlier send with this key saved. It exists: the unique index just said so. */
  private async findSent(
    senderId: string,
    roomId: string,
    clientMessageId: string,
  ): Promise<MessageDto> {
    const message = await this.messageModel
      .findOne({ senderId, roomId, clientMessageId })
      .orFail()
      .lean()
      .exec();
    return toMessageDto(message);
  }

  private async assertMember(userId: string, roomId: string): Promise<void> {
    if (!(await this.memberships.isMember(userId, roomId))) {
      throw new ApiException(HttpStatus.FORBIDDEN, 'NOT_A_MEMBER', 'Join the net first');
    }
  }
}
