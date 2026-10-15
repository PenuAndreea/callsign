import type { UserDto } from '@callsign/types';
import type { Types } from 'mongoose';

import type { User } from './user.schema';

/** Document → API shape. Picks fields explicitly, so secrets can never leak through a spread. */
export function toUserDto(
  user: Pick<User, 'callsign' | 'createdAt'> & { _id: Types.ObjectId },
): UserDto {
  return {
    id: user._id.toHexString(),
    callsign: user.callsign,
    createdAt: user.createdAt.toISOString(),
  };
}
