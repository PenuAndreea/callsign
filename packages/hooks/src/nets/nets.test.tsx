// @vitest-environment jsdom
import { act, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';

import { apiError, authResponse, net, page } from '../test/fixtures';
import { renderHookWithApiProvider } from '../test/renderHookWithApiProvider';
import { api, server } from '../test/server';
import { netKeys } from './netKeys';
import { useNet } from './useNet';
import { useCreateNet, useJoinNet, useLeaveNet } from './useNetMutations';
import { useNets } from './useNets';

const tower = net('tower', { memberCount: 2 });
const ground = net('ground', { isMember: false, memberCount: 0 });

/** Counts list requests per scope, so tests can see what got refetched. */
let listCalls: Record<string, number>;

beforeEach(() => {
  listCalls = { joined: 0, open: 0 };
  server.use(
    http.post(api('/auth/refresh'), () => HttpResponse.json(authResponse('access-1'))),
    http.get(api('/rooms'), ({ request }) => {
      const scope = new URL(request.url).searchParams.get('scope') ?? '';
      listCalls[scope] = (listCalls[scope] ?? 0) + 1;
      return HttpResponse.json(page(scope === 'joined' ? [tower] : [ground]));
    }),
  );
});

describe('useNets', () => {
  it('loads a section and flattens its pages', async () => {
    const { result } = renderHookWithApiProvider(() => useNets('joined'));
    await waitFor(() => expect(result.current.data).toEqual([tower]));
    expect(result.current.hasNextPage).toBe(false);
  });

  it('loads the next page with the cursor of the last one', async () => {
    const cursors: (string | null)[] = [];
    server.use(
      http.get(api('/rooms'), ({ request }) => {
        const cursor = new URL(request.url).searchParams.get('cursor');
        cursors.push(cursor);
        return HttpResponse.json(cursor === null ? page([tower], 'after-tower') : page([ground]));
      }),
    );
    const { result } = renderHookWithApiProvider(() => useNets('open'));
    await waitFor(() => expect(result.current.hasNextPage).toBe(true));

    await act(() => result.current.fetchNextPage());
    await waitFor(() => expect(result.current.data).toEqual([tower, ground]));
    expect(cursors).toEqual([null, 'after-tower']);
    expect(result.current.hasNextPage).toBe(false);
  });
});

describe('useNet', () => {
  /** Loads the joined list first, then opens `tower`: the list copy is read when it opens. */
  async function openFromList() {
    let id = 'not-opened-yet';
    const rendered = renderHookWithApiProvider(() => ({
      list: useNets('joined'),
      net: useNet(id),
    }));
    await waitFor(() => expect(rendered.result.current.list.data).toEqual([tower]));
    id = tower.id;
    rendered.rerender();
    return rendered;
  }

  beforeEach(() => {
    server.use(http.get(api('/rooms/:id'), () => new Promise<never>(() => undefined)));
  });

  it('shows the copy from a loaded list at once, as old as that list', async () => {
    const { result, queryClient } = await openFromList();
    expect(result.current.net.data).toEqual(tower);
    expect(queryClient.getQueryState(netKeys.detail(tower.id))?.dataUpdatedAt).toBe(
      queryClient.getQueryState(netKeys.list('joined'))?.dataUpdatedAt,
    );
  });

  it('keeps the list copy when its own fetch fails', async () => {
    server.use(http.get(api(`/rooms/${tower.id}`), () => apiError(500, 'INTERNAL_ERROR')));
    const { result } = await openFromList();
    await waitFor(() => expect(result.current.net.error).toMatchObject({ code: 'INTERNAL_ERROR' }));
    expect(result.current.net.data).toEqual(tower);
  });

  it('reports a net that does not exist', async () => {
    server.use(http.get(api('/rooms/:id'), () => apiError(404, 'NOT_FOUND')));
    const { result } = renderHookWithApiProvider(() => useNet(tower.id));
    await waitFor(() => expect(result.current.error).toMatchObject({ code: 'NOT_FOUND' }));
  });
});

describe('net mutations', () => {
  it('creates a net, keeps it as its detail and refetches the lists', async () => {
    const created = net('ops');
    let body: unknown;
    server.use(
      http.post(api('/rooms'), async ({ request }) => {
        body = await request.json();
        return HttpResponse.json(created, { status: 201 });
      }),
    );
    const { result, queryClient } = renderHookWithApiProvider(() => ({
      joined: useNets('joined'),
      create: useCreateNet(),
    }));
    await waitFor(() => expect(listCalls.joined).toBe(1));

    await act(() => result.current.create.mutateAsync({ name: 'ops' }));
    expect(body).toEqual({ name: 'ops' });
    expect(queryClient.getQueryData(netKeys.detail(created.id))).toEqual(created);
    expect(listCalls.joined).toBe(2);
  });

  it('reports a taken net name', async () => {
    server.use(http.post(api('/rooms'), () => apiError(409, 'NET_NAME_TAKEN')));
    const { result } = renderHookWithApiProvider(() => useCreateNet());
    await act(() => result.current.mutateAsync({ name: 'tower' }).catch(() => undefined));
    await waitFor(() => expect(result.current.error).toMatchObject({ code: 'NET_NAME_TAKEN' }));
  });

  it('joins with PUT on members/me and refetches both sections', async () => {
    const joined = { ...ground, isMember: true, memberCount: 1 };
    server.use(http.put(api(`/rooms/${ground.id}/members/me`), () => HttpResponse.json(joined)));
    const { result, queryClient } = renderHookWithApiProvider(() => ({
      joined: useNets('joined'),
      open: useNets('open'),
      join: useJoinNet(),
    }));
    await waitFor(() => expect(listCalls).toEqual({ joined: 1, open: 1 }));

    await act(() => result.current.join.mutateAsync(ground.id));
    expect(queryClient.getQueryData(netKeys.detail(ground.id))).toEqual(joined);
    expect(listCalls).toEqual({ joined: 2, open: 2 });
  });

  it('leaves with DELETE, marks the cached net as left and refetches the lists', async () => {
    server.use(
      http.delete(
        api(`/rooms/${tower.id}/members/me`),
        () => new HttpResponse(null, { status: 204 }),
      ),
    );
    const { result, queryClient } = renderHookWithApiProvider(() => ({
      joined: useNets('joined'),
      leave: useLeaveNet(),
    }));
    queryClient.setQueryData(netKeys.detail(tower.id), tower);
    await waitFor(() => expect(listCalls.joined).toBe(1));

    await act(() => result.current.leave.mutateAsync(tower.id));
    expect(queryClient.getQueryData(netKeys.detail(tower.id))).toEqual({
      ...tower,
      isMember: false,
      memberCount: 1,
    });
    expect(listCalls.joined).toBe(2);
  });
});
