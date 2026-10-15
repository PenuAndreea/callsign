import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import type { CreateRoomRequest, Page, RoomDto, RoomsQuery } from '@callsign/types';
import { createRoomRequestSchema, roomsQuerySchema } from '@callsign/types';

import type { AuthUser } from '../auth/auth-user';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { RoomsService } from './rooms.service';

/** Nets. Every route needs an access token (global `JwtAuthGuard`). */
@Controller('rooms')
export class RoomsController {
  constructor(private readonly rooms: RoomsService) {}

  @Post()
  create(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(createRoomRequestSchema)) body: CreateRoomRequest,
  ): Promise<RoomDto> {
    return this.rooms.create(user.userId, body.name);
  }

  /** `?scope=joined|open&cursor&limit`: the nets screen asks once per section. */
  @Get()
  list(
    @CurrentUser() user: AuthUser,
    @Query(new ZodValidationPipe(roomsQuerySchema)) query: RoomsQuery,
  ): Promise<Page<RoomDto>> {
    return this.rooms.list(user.userId, query);
  }

  @Get(':id')
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string): Promise<RoomDto> {
    return this.rooms.findOne(user.userId, id);
  }

  /** `members/me`: the user comes from the token, never from the URL. */
  @Put(':id/members/me')
  join(@CurrentUser() user: AuthUser, @Param('id') id: string): Promise<RoomDto> {
    return this.rooms.join(user.userId, id);
  }

  @Delete(':id/members/me')
  @HttpCode(HttpStatus.NO_CONTENT)
  leave(@CurrentUser() user: AuthUser, @Param('id') id: string): Promise<void> {
    return this.rooms.leave(user.userId, id);
  }
}
