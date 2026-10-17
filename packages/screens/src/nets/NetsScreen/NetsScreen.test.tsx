import { api, apiError, net, page, server } from '@callsign/hooks/testing';
import type { RoomDto } from '@callsign/types';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';

import { renderScreen } from '../../test/renderScreen';
import { NetsScreen } from './NetsScreen';

const tower = net('tower', {
  memberCount: 4,
  lastMessage: { content: 'Hold at bay four.', createdAt: '2026-10-17T22:14:00.000Z' },
});
const ground = net('ground', { isMember: false, memberCount: 0 });

function nets(joined: RoomDto[], open: RoomDto[]) {
  server.use(
    http.get(api('/rooms'), ({ request }) =>
      HttpResponse.json(
        page(new URL(request.url).searchParams.get('scope') === 'joined' ? joined : open),
      ),
    ),
  );
}

const renderNets = (props: Partial<Parameters<typeof NetsScreen>[0]> = {}) => {
  const onOpenNet = vi.fn();
  const onNewNet = vi.fn();
  renderScreen(<NetsScreen onOpenNet={onOpenNet} onNewNet={onNewNet} {...props} />, {
    session: 'signedIn',
  });
  return { onOpenNet, onNewNet };
};

describe('NetsScreen', () => {
  it('lists joined nets with their last message and count, then open nets', async () => {
    nets([tower], [ground]);
    renderNets();

    expect(await screen.findByText('Station wolf-2')).toBeInTheDocument();
    expect(
      await screen.findByRole('button', { name: 'tower, joined, Hold at bay four., 4 stations' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Joined')).toBeInTheDocument();
    expect(screen.getByText('Open to join')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Join ground' })).toBeInTheDocument();
  });

  it('opens a joined net', async () => {
    nets([tower], []);
    const { onOpenNet } = renderNets();

    await userEvent.click(await screen.findByRole('button', { name: /^tower, joined/ }));
    expect(onOpenNet).toHaveBeenCalledWith(tower.id);
  });

  it('joins an open net, then opens it', async () => {
    nets([], [ground]);
    server.use(
      http.put(api(`/rooms/${ground.id}/members/me`), () =>
        HttpResponse.json({ ...ground, isMember: true, memberCount: 1 }),
      ),
    );
    const { onOpenNet } = renderNets();

    await userEvent.click(await screen.findByRole('button', { name: 'Join ground' }));
    await waitFor(() => expect(onOpenNet).toHaveBeenCalledWith(ground.id));
  });

  it('shows a failed join', async () => {
    nets([], [ground]);
    server.use(http.put(api('/rooms/:id/members/me'), () => apiError(404, 'NOT_FOUND')));
    const { onOpenNet } = renderNets();

    await userEvent.click(await screen.findByRole('button', { name: 'Join ground' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('That net is off the air.');
    expect(onOpenNet).not.toHaveBeenCalled();
  });

  it('says when a section is empty', async () => {
    nets([], []);
    renderNets();

    expect(await screen.findByText(/No nets yet/)).toBeInTheDocument();
    expect(screen.getByText('You are on every net.')).toBeInTheDocument();
  });

  it('shows a failed section with a retry', async () => {
    let fail = true;
    server.use(
      http.get(api('/rooms'), ({ request }) => {
        const scope = new URL(request.url).searchParams.get('scope');
        if (scope === 'joined' && fail) return apiError(500, 'INTERNAL_ERROR');
        return HttpResponse.json(page(scope === 'joined' ? [tower] : []));
      }),
    );
    renderNets();

    expect(await screen.findByRole('alert')).toHaveTextContent('Something went wrong');
    fail = false;
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('button', { name: /^tower, joined/ })).toBeInTheDocument();
  });

  it('highlights the selected net', async () => {
    nets([tower], []);
    renderNets({ selectedNetId: tower.id });

    const row = await screen.findByRole('button', { name: /^tower, joined/ });
    expect(row).toHaveAttribute('aria-selected', 'true');
  });

  it('starts a new net', async () => {
    nets([], []);
    const { onNewNet } = renderNets();

    await userEvent.click(await screen.findByRole('button', { name: 'New net' }));
    expect(onNewNet).toHaveBeenCalledOnce();
  });
});
