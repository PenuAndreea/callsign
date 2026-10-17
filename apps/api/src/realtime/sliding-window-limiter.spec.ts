import { SlidingWindowLimiter } from './sliding-window-limiter';

describe('SlidingWindowLimiter', () => {
  const create = () => new SlidingWindowLimiter({ limit: 3, windowMs: 1000 });

  it('allows up to the limit within a window, then refuses', () => {
    const limiter = create();
    expect([0, 10, 20, 30].map((t) => limiter.tryConsume('a', t))).toEqual([
      true,
      true,
      true,
      false,
    ]);
  });

  it('allows again once the oldest action leaves the window', () => {
    const limiter = create();
    [0, 500, 900].forEach((t) => limiter.tryConsume('a', t));
    expect(limiter.tryConsume('a', 999)).toBe(false);
    expect(limiter.tryConsume('a', 1000)).toBe(true);
  });

  it('caps a burst across a window boundary (sliding, not fixed windows)', () => {
    const limiter = create();
    [990, 995, 999].forEach((t) => limiter.tryConsume('a', t));
    expect(limiter.tryConsume('a', 1001)).toBe(false);
  });

  it('does not count refused actions', () => {
    const limiter = create();
    [0, 1, 2].forEach((t) => limiter.tryConsume('a', t));
    for (let t = 3; t < 1000; t += 100) limiter.tryConsume('a', t);
    expect(limiter.tryConsume('a', 1001)).toBe(true);
  });

  it('keeps keys apart', () => {
    const limiter = create();
    [0, 1, 2].forEach((t) => limiter.tryConsume('a', t));
    expect(limiter.tryConsume('b', 3)).toBe(true);
  });

  it('forgets a key', () => {
    const limiter = create();
    [0, 1, 2].forEach((t) => limiter.tryConsume('a', t));
    limiter.forget('a');
    expect(limiter.size).toBe(0);
    expect(limiter.tryConsume('a', 3)).toBe(true);
  });
});
