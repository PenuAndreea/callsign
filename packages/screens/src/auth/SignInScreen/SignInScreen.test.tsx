import { api, apiError, authResponse, server } from '@callsign/hooks/testing';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';

import { renderScreen } from '../../test/renderScreen';
import { SignInScreen } from './SignInScreen';

const fill = async (callsign: string, passphrase: string) => {
  const user = userEvent.setup();
  if (callsign) await user.type(screen.getByRole('textbox', { name: 'Callsign' }), callsign);
  if (passphrase) await user.type(screen.getByLabelText('Passphrase'), passphrase);
  await user.click(screen.getByRole('button', { name: 'Report in' }));
};

describe('SignInScreen', () => {
  it('shows the masthead, both fields and the register link', () => {
    renderScreen(<SignInScreen onRegister={vi.fn()} />);

    expect(screen.getByRole('heading', { name: 'Callsign' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Callsign' })).toBeInTheDocument();
    expect(screen.getByLabelText('Passphrase')).toHaveAttribute('type', 'password');
    expect(screen.getByRole('button', { name: 'New station? Register here' })).toBeInTheDocument();
  });

  it('validates with the shared schema before calling the API', async () => {
    renderScreen(<SignInScreen onRegister={vi.fn()} />);
    await fill('ab', '');

    expect(await screen.findByText('At least 3 characters')).toBeInTheDocument();
    expect(screen.getByText('Enter your passphrase')).toBeInTheDocument();
  });

  it('logs in with the normalized callsign and signs the session in', async () => {
    let body: unknown;
    server.use(
      http.post(api('/auth/login'), async ({ request }) => {
        body = await request.json();
        return HttpResponse.json(authResponse('access-login'));
      }),
    );
    const { apiClient } = renderScreen(<SignInScreen onRegister={vi.fn()} />);
    await fill('  WOLF-2 ', 'correct horse');

    await waitFor(() => expect(apiClient.getAccessToken()).toBe('access-login'));
    expect(body).toEqual({ callsign: 'wolf-2', passphrase: 'correct horse' });
  });

  it('shows the error copy for wrong credentials', async () => {
    server.use(http.post(api('/auth/login'), () => apiError(401, 'INVALID_CREDENTIALS')));
    renderScreen(<SignInScreen onRegister={vi.fn()} />);
    await fill('wolf-2', 'wrong passphrase');

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Callsign or passphrase not recognised.',
    );
  });

  it('opens register from the link', async () => {
    const onRegister = vi.fn();
    renderScreen(<SignInScreen onRegister={onRegister} />);

    await userEvent.click(screen.getByRole('button', { name: 'New station? Register here' }));
    expect(onRegister).toHaveBeenCalledOnce();
  });
});
