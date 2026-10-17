import { api, apiError, authResponse, server } from '@callsign/hooks/testing';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';

import { renderScreen } from '../../test/renderScreen';
import { RegisterScreen } from './RegisterScreen';

const fill = async (callsign: string, passphrase: string, confirm: string) => {
  const user = userEvent.setup();
  await user.type(screen.getByRole('textbox', { name: 'Callsign' }), callsign);
  await user.type(screen.getByLabelText('Passphrase'), passphrase);
  await user.type(screen.getByLabelText('Confirm passphrase'), confirm);
  await user.click(screen.getByRole('button', { name: 'Request clearance' }));
};

const renderRegister = () => renderScreen(<RegisterScreen onBack={vi.fn()} onSignIn={vi.fn()} />);

describe('RegisterScreen', () => {
  it('registers without sending the confirmation, and signs in', async () => {
    let body: unknown;
    server.use(
      http.post(api('/auth/register'), async ({ request }) => {
        body = await request.json();
        return HttpResponse.json(authResponse('access-new'), { status: 201 });
      }),
    );
    const { apiClient } = renderRegister();
    await fill('Eagle-1', 'correct horse', 'correct horse');

    await waitFor(() => expect(apiClient.getAccessToken()).toBe('access-new'));
    expect(body).toEqual({ callsign: 'eagle-1', passphrase: 'correct horse' });
  });

  it('checks the passphrase rules and the confirmation', async () => {
    renderRegister();
    await fill('eagle-1', 'short', 'different');

    expect(await screen.findByText('At least 8 characters')).toBeInTheDocument();
    expect(screen.getByText('Passphrases do not match')).toBeInTheDocument();
  });

  it('shows a taken callsign under the callsign field, not as a form error', async () => {
    server.use(http.post(api('/auth/register'), () => apiError(409, 'CALLSIGN_TAKEN')));
    renderRegister();
    await fill('wolf-2', 'correct horse', 'correct horse');

    const message = await screen.findByText('That callsign is already on the net. Pick another.');
    expect(message).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Callsign' })).toHaveAttribute(
      'aria-invalid',
      'true',
    );
    expect(screen.getAllByRole('alert')).toHaveLength(1);
  });

  it('shows other failures as a form error', async () => {
    server.use(http.post(api('/auth/register'), () => HttpResponse.error()));
    renderRegister();
    await fill('eagle-1', 'correct horse', 'correct horse');

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No contact with the net. Check your connection.',
    );
  });

  it('moves through the fields with the next key', async () => {
    const user = userEvent.setup();
    renderRegister();

    await user.type(screen.getByRole('textbox', { name: 'Callsign' }), 'eagle-1{Enter}');
    expect(screen.getByLabelText('Passphrase')).toHaveFocus();
    await user.type(screen.getByLabelText('Passphrase'), 'correct horse{Enter}');
    expect(screen.getByLabelText('Confirm passphrase')).toHaveFocus();
  });

  it('goes back and to sign in', async () => {
    const onBack = vi.fn();
    const onSignIn = vi.fn();
    renderScreen(<RegisterScreen onBack={onBack} onSignIn={onSignIn} />);

    await userEvent.click(screen.getByRole('button', { name: 'Back' }));
    await userEvent.click(screen.getByRole('button', { name: 'Already on the net? Report in' }));
    expect(onBack).toHaveBeenCalledOnce();
    expect(onSignIn).toHaveBeenCalledOnce();
  });
});
