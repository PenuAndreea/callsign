import { api, apiError, authResponse, server, webPlatform } from '@callsign/hooks/testing';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { createMemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';

import App from '../App';
import { routes } from '../routes';

const refreshAnswers = (session: 'signedIn' | 'signedOut' | 'offline') =>
  server.use(
    http.post(api('/auth/refresh'), () => {
      if (session === 'offline') return HttpResponse.error();
      return session === 'signedIn'
        ? HttpResponse.json(authResponse('access-1'))
        : apiError(401, 'UNAUTHORIZED');
    }),
  );

/** The real routes in a memory router, against MSW (the test platform has an absolute API URL). */
function renderApp(path = '/') {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  render(<App platform={webPlatform} router={router} />);
  return router;
}

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
    expect(screen.getByText('Station WOLF-2')).toBeInTheDocument();
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
});
