import { io } from 'socket.io-client';
import { describe, expect, it, vi } from 'vitest';

import { webPlatform } from '../test/fixtures';
import { defaultSocketFactory } from './defaultSocketFactory';
import type { SocketFactory } from './realtime.types';
import { resolveSocketFactory } from './resolveSocketFactory';

vi.mock('socket.io-client', () => ({ io: vi.fn(() => ({ fake: 'socket' })) }));

const options = { autoConnect: false } as const;

describe('resolveSocketFactory', () => {
  it('turns realtime off with false', () => {
    expect(resolveSocketFactory({ ...webPlatform, createSocket: false })).toBeNull();
  });

  it('uses the platform factory when there is one', () => {
    const factory: SocketFactory = vi.fn();
    expect(resolveSocketFactory({ ...webPlatform, createSocket: factory })).toBe(factory);
  });

  it('defaults to io() on the API origin', () => {
    const { createSocket: _off, ...platform } = webPlatform;
    resolveSocketFactory({ ...platform, apiUrl: 'http://api.test' })?.(options);
    expect(io).toHaveBeenLastCalledWith('http://api.test', options);
  });
});

describe('defaultSocketFactory', () => {
  it('passes no URL for an empty API URL, so the page origin is used (Vite proxy)', () => {
    defaultSocketFactory('')(options);
    expect(io).toHaveBeenLastCalledWith(options);
  });

  it('adds the platform options, without letting them replace auth or autoConnect', () => {
    defaultSocketFactory('http://api.test', { transports: ['websocket'] })(options);
    expect(io).toHaveBeenLastCalledWith('http://api.test', {
      transports: ['websocket'],
      ...options,
    });
  });
});
