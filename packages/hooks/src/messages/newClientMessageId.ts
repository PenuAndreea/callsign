/**
 * A UUID v4 for `clientMessageId`. It only has to be unique (it is an idempotency key, not a
 * secret), so platforms without `crypto.randomUUID` (some React Native engines) fall back to
 * `Math.random`, still 122 random bits.
 */
export function newClientMessageId(): string {
  const cryptoApi = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
  if (typeof cryptoApi?.randomUUID === 'function') return cryptoApi.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const random = Math.floor(Math.random() * 16);
    return (char === 'x' ? random : (random % 4) + 8).toString(16);
  });
}
