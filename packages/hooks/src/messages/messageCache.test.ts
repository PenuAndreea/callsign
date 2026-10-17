import type { MessageDto } from '@callsign/types';
import { QueryClient } from '@tanstack/react-query';
import { describe, expect, it } from 'vitest';

import { netKeys } from '../nets/netKeys';
import { page } from '../test/fixtures';
import type { MessagePages } from './messageCache';
import { insertMessage } from './messageCache';

const ROOM = 'tower';
const message = (id: string): MessageDto => ({
  id,
  roomId: ROOM,
  sender: { id: 'u1', callsign: 'wolf-2' },
  content: `Message ${id}. Over.`,
  createdAt: '2026-10-17T22:14:00.000Z',
});

function cached(pages: MessagePages['pages']) {
  const queryClient = new QueryClient();
  queryClient.setQueryData<MessagePages>(netKeys.messages(ROOM), {
    pages,
    pageParams: pages.map(() => undefined),
  });
  const ids = () =>
    queryClient
      .getQueryData<MessagePages>(netKeys.messages(ROOM))
      ?.pages.map((p) => p.items.map((item) => item.id));
  return { queryClient, ids };
}

describe('insertMessage', () => {
  it('puts a new message first', () => {
    const { queryClient, ids } = cached([page([message('02'), message('01')])]);
    insertMessage(queryClient, message('03'));
    expect(ids()).toEqual([['03', '02', '01']]);
  });

  it('keeps a message once (the ack, then the broadcast)', () => {
    const { queryClient, ids } = cached([page([message('02')])]);
    insertMessage(queryClient, message('02'));
    expect(ids()).toEqual([['02']]);
  });

  it('puts a late message in order within the first page', () => {
    const { queryClient, ids } = cached([page([message('03'), message('01')])]);
    insertMessage(queryClient, message('02'));
    expect(ids()).toEqual([['03', '02', '01']]);
  });

  it('leaves a message older than the first page to the older pages', () => {
    const { queryClient, ids } = cached([page([message('05'), message('04')], 'cursor')]);
    insertMessage(queryClient, message('01'));
    expect(ids()).toEqual([['05', '04']]);
  });

  it('does nothing when the history is not loaded', () => {
    const queryClient = new QueryClient();
    insertMessage(queryClient, message('01'));
    expect(queryClient.getQueryData(netKeys.messages(ROOM))).toBeUndefined();
  });
});
