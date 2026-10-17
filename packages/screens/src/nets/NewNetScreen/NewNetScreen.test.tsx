import { api, apiError, net, server } from '@callsign/hooks/testing';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';

import { renderScreen } from '../../test/renderScreen';
import { NewNetScreen } from './NewNetScreen';

const renderNewNet = () => {
  const onBack = vi.fn();
  const onCreated = vi.fn();
  renderScreen(<NewNetScreen onBack={onBack} onCreated={onCreated} />, { session: 'signedIn' });
  return { onBack, onCreated };
};

const submitName = async (name: string) => {
  const user = userEvent.setup();
  await user.type(await screen.findByRole('textbox', { name: 'Net name' }), name);
  await user.click(screen.getByRole('button', { name: 'Open the net' }));
};

describe('NewNetScreen', () => {
  it('creates the net with the normalized name and reports its id', async () => {
    const ops = net('flight ops');
    let body: unknown;
    server.use(
      http.post(api('/rooms'), async ({ request }) => {
        body = await request.json();
        return HttpResponse.json(ops, { status: 201 });
      }),
    );
    const { onCreated } = renderNewNet();
    await submitName('  Flight Ops ');

    await waitFor(() => expect(onCreated).toHaveBeenCalledWith(ops.id));
    expect(body).toEqual({ name: 'flight ops' });
  });

  it('checks the length before calling the API', async () => {
    renderNewNet();
    await submitName('ab');
    expect(await screen.findByText('At least 3 characters')).toBeInTheDocument();
  });

  it('shows a taken name under the field', async () => {
    server.use(http.post(api('/rooms'), () => apiError(409, 'NET_NAME_TAKEN')));
    renderNewNet();
    await submitName('tower');

    expect(await screen.findByText('A net with that name already exists.')).toBeInTheDocument();
    expect(screen.getAllByRole('alert')).toHaveLength(1);
  });

  it('goes back', async () => {
    const { onBack } = renderNewNet();
    await userEvent.click(await screen.findByRole('button', { name: 'Back' }));
    expect(onBack).toHaveBeenCalledOnce();
  });
});
