export interface SlidingWindowOptions {
  /** Most actions allowed per key within one window. */
  limit: number;
  windowMs: number;
}

/**
 * In-memory rate limit per key: at most `limit` actions in any `windowMs` span (a sliding
 * window, so a burst at the end of one window and the start of the next is still capped).
 * One API instance only; several would need a shared store. Call `forget` when a key goes
 * away (a socket disconnects), so the map never grows with old keys.
 */
export class SlidingWindowLimiter {
  private readonly hits = new Map<string, number[]>();

  constructor(private readonly options: SlidingWindowOptions) {}

  /** Records an action for `key` and returns `true`, or returns `false` if over the limit. */
  tryConsume(key: string, now = Date.now()): boolean {
    const windowStart = now - this.options.windowMs;
    const recent = (this.hits.get(key) ?? []).filter((time) => time > windowStart);
    if (recent.length >= this.options.limit) {
      this.hits.set(key, recent);
      return false;
    }
    recent.push(now);
    this.hits.set(key, recent);
    return true;
  }

  forget(key: string): void {
    this.hits.delete(key);
  }

  /** Number of keys tracked (for tests). */
  get size(): number {
    return this.hits.size;
  }
}
