import { api, authResponse, net, page, server } from '@callsign/hooks/testing';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import {
  refreshAnswers,
  renderApp,
  setupAppTests,
  setWindowWidth,
  tower,
} from '../test/appTestUtils';

setupAppTests();

const homeHeading = () => screen.findByRole('heading', { name: 'Nets' });
const signInButton = () => screen.findByRole('button', { name: 'Report in' });

describe('App routing', () => {
  it('sends a signed-out visitor to sign in', async () => {
    refreshAnswers('signedOut');
    const router = renderApp('/');

    expect(await signInButton()).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/signin');
  });

  it('restores a session and opens the home page', async () => {
    refreshAnswers('signedIn');
    renderApp('/');

    expect(await homeHeading()).toBeInTheDocument();
    expect(screen.getByText('Station wolf-2')).toBeInTheDocument();
  });

  it('keeps a signed-in station away from sign in', async () => {
    refreshAnswers('signedIn');
    const router = renderApp('/signin');

    expect(await homeHeading()).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/');
  });

  it('sends unknown paths home (then to sign in when signed out)', async () => {
    refreshAnswers('signedOut');
    const router = renderApp('/nowhere');

    expect(await signInButton()).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/signin');
  });

  it('signs in and opens the page that was asked for', async () => {
    refreshAnswers('signedOut');
    server.use(http.post(api('/auth/login'), () => HttpResponse.json(authResponse('access-1'))));
    const user = userEvent.setup();
    const router = renderApp('/');

    await user.type(await screen.findByRole('textbox', { name: 'Callsign' }), 'wolf-2');
    await user.type(screen.getByLabelText('Passphrase'), 'correct horse');
    await user.click(screen.getByRole('button', { name: 'Report in' }));

    expect(await homeHeading()).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/');
  });

  it('moves between sign in and register', async () => {
    refreshAnswers('signedOut');
    const user = userEvent.setup();
    const router = renderApp('/signin');

    await user.click(await screen.findByRole('button', { name: 'New station? Register here' }));
    expect(await screen.findByRole('heading', { name: 'Register' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/register');

    await user.click(screen.getByRole('button', { name: 'Back' }));
    expect(await signInButton()).toBeInTheDocument();
  });

  it('logs out back to sign in', async () => {
    refreshAnswers('signedIn');
    server.use(http.post(api('/auth/logout'), () => new HttpResponse(null, { status: 204 })));
    const user = userEvent.setup();
    renderApp('/');

    await user.click(await screen.findByRole('button', { name: 'Log out' }));
    expect(await signInButton()).toBeInTheDocument();
  });

  it('offers a retry when the API cannot be reached, then restores', async () => {
    refreshAnswers('offline');
    const user = userEvent.setup();
    renderApp('/');

    const retry = await screen.findByRole('button', { name: 'Try again' });
    refreshAnswers('signedIn');
    await user.click(retry);
    expect(await homeHeading()).toBeInTheDocument();
  });

  it('shows the nets sidebar next to the chat panel on wide windows', async () => {
    refreshAnswers('signedIn');
    const user = userEvent.setup();
    const router = renderApp('/');

    expect(await screen.findByText(/Pick a net from the list/)).toBeInTheDocument();
    await user.click(await screen.findByRole('button', { name: /^tower, joined/ }));

    expect(await screen.findByText('Radio check. Over.')).toBeInTheDocument();
    expect(router.state.location.pathname).toBe(`/nets/${tower.id}`);
    // The list stays on screen, with the open net selected, so the chat has no back button.
    expect(screen.getByRole('button', { name: /^tower, joined/ })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(screen.queryByRole('button', { name: 'Back' })).not.toBeInTheDocument();
  });

  it('stacks the list and the chat on narrow windows, with back to the list', async () => {
    setWindowWidth(375);
    refreshAnswers('signedIn');
    const user = userEvent.setup();
    renderApp('/');

    expect(await homeHeading()).toBeInTheDocument();
    expect(screen.queryByText(/Pick a net from the list/)).not.toBeInTheDocument();
    await user.click(await screen.findByRole('button', { name: /^tower, joined/ }));
    expect(await screen.findByText('Radio check. Over.')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Nets' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Back' }));
    expect(await homeHeading()).toBeInTheDocument();
  });

  it('leaves a net back to the list', async () => {
    refreshAnswers('signedIn');
    server.use(
      http.delete(
        api(`/rooms/${tower.id}/members/me`),
        () => new HttpResponse(null, { status: 204 }),
      ),
    );
    const user = userEvent.setup();
    const router = renderApp(`/nets/${tower.id}`);

    await user.click(await screen.findByRole('button', { name: 'Leave' }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/'));
  });

  it('opens a new net and lands in its chat', async () => {
    refreshAnswers('signedIn');
    const ops = net('ops');
    server.use(
      http.post(api('/rooms'), () => HttpResponse.json(ops, { status: 201 })),
      http.get(api(`/rooms/${ops.id}`), () => HttpResponse.json(ops)),
      http.get(api(`/rooms/${ops.id}/messages`), () => HttpResponse.json(page([]))),
    );
    const user = userEvent.setup();
    const router = renderApp('/');

    await user.click(await screen.findByRole('button', { name: 'New net' }));
    await user.type(await screen.findByRole('textbox', { name: 'Net name' }), 'ops');
    await user.click(screen.getByRole('button', { name: 'Open the net' }));

    expect(await screen.findByText('No traffic yet. Open the net. Over.')).toBeInTheDocument();
    expect(router.state.location.pathname).toBe(`/nets/${ops.id}`);
  });
});
