import type * as Screens from '@callsign/screens';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ComponentProps } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  refreshAnswers,
  renderApp,
  setupAppTests,
  setWindowWidth,
  tower,
} from '../test/appTestUtils';

/** Which screen throws while rendering, like a bug. */
const crash = vi.hoisted(() => ({ chat: false, nets: false }));

vi.mock('@callsign/screens', async (importOriginal) => {
  const screens = await importOriginal<typeof Screens>();
  return {
    ...screens,
    ChatScreen: (props: ComponentProps<typeof screens.ChatScreen>) => {
      if (crash.chat) throw new TypeError('chat bug');
      return <screens.ChatScreen {...props} />;
    },
    NetsScreen: (props: ComponentProps<typeof screens.NetsScreen>) => {
      if (crash.nets) throw new TypeError('nets bug');
      return <screens.NetsScreen {...props} />;
    },
  };
});

setupAppTests();

beforeEach(() => {
  crash.chat = false;
  crash.nets = false;
  // React and the default reporter log every caught crash; the screens are what is checked.
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
});

const crashScreen = () => screen.findByText('The fault was logged. Try again. Over.');

describe('crashes on web', () => {
  it('keeps the nets list when the chat panel crashes, and retries the chat', async () => {
    refreshAnswers('signedIn');
    crash.chat = true;
    renderApp(`/nets/${tower.id}`);

    expect(await crashScreen()).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: /^tower, joined/ })).toBeInTheDocument();

    crash.chat = false;
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('Radio check. Over.')).toBeInTheDocument();
  });

  it('offers Back to the list when a stacked chat crashes', async () => {
    setWindowWidth(400);
    refreshAnswers('signedIn');
    crash.chat = true;
    const router = renderApp(`/nets/${tower.id}`);

    await crashScreen();
    await userEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(router.state.location.pathname).toBe('/');
    expect(await screen.findByRole('heading', { name: 'Nets' })).toBeInTheDocument();
  });

  it('shows the crash screen for the whole page, and starts over on another page', async () => {
    refreshAnswers('signedIn');
    crash.nets = true;
    const router = renderApp('/');

    expect(await crashScreen()).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Nets' })).not.toBeInTheDocument();

    crash.nets = false;
    await router.navigate(`/nets/${tower.id}`);
    expect(await screen.findByText('Radio check. Over.')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Nets' })).toBeInTheDocument();
  });
});
