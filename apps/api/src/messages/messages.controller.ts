import { Controller, Get, Param, Query } from '@nestjs/common';
import type { MessageDto, Page, PageQuery } from '@callsign/types';
import { pageQuerySchema } from '@callsign/types';

import type { AuthUser } from '../auth/auth-user';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { MessagesService } from './messages.service';

/**
 * Net history. Read-only: messages are sent over the socket, so there is no POST.
 * Needs an access token (global `JwtAuthGuard`).
 */
@Controller('rooms/:id/messages')
export class MessagesController {
  constructor(private readonly messages: MessagesService) {}

  /** `?cursor&limit`, newest first. */
  @Get()
  history(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Query(new ZodValidationPipe(pageQuerySchema)) query: PageQuery,
  ): Promise<Page<MessageDto>> {
    return this.messages.history(user.userId, id, query);
  }
}
