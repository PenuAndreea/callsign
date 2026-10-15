import { Types } from 'mongoose';

import { toUserDto } from './users.mapper';

describe('toUserDto', () => {
  it('maps a document to the API shape', () => {
    const _id = new Types.ObjectId();
    const createdAt = new Date('2026-10-15T22:14:00.000Z');
    expect(toUserDto({ _id, callsign: 'wolf-2', createdAt })).toEqual({
      id: _id.toHexString(),
      callsign: 'wolf-2',
      createdAt: '2026-10-15T22:14:00.000Z',
    });
  });

  it('drops every other field, secrets included', () => {
    const user = {
      _id: new Types.ObjectId(),
      callsign: 'wolf-2',
      createdAt: new Date(),
      passwordHash: '$argon2id$...',
      updatedAt: new Date(),
    };
    expect(Object.keys(toUserDto(user)).sort()).toEqual(['callsign', 'createdAt', 'id']);
  });
});
