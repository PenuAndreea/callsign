// Web Crypto random bytes (Node in tests); the app passes expo-crypto's.
import { randomBytes } from '@noble/ciphers/utils.js';
import { createCipher } from '@/offlineStorage/cipher';

const key = randomBytes(32);

describe('createCipher', () => {
  it('decrypts what it encrypted, and never shows the plaintext', () => {
    const { encrypt, decrypt } = createCipher(key, randomBytes);
    const payload = encrypt('Gusts up to 25 knots. Over.', 'cache');

    expect(payload).not.toContain('Gusts');
    expect(decrypt(payload, 'cache')).toBe('Gusts up to 25 knots. Over.');
  });

  it('uses a new nonce for every write', () => {
    const { encrypt } = createCipher(key, randomBytes);
    expect(encrypt('same', 'cache')).not.toBe(encrypt('same', 'cache'));
  });

  it('refuses a changed payload', () => {
    const { encrypt, decrypt } = createCipher(key, randomBytes);
    const payload = encrypt('tower', 'cache');
    const flipped = `${payload.slice(0, -1)}${payload.endsWith('0') ? '1' : '0'}`;
    expect(() => decrypt(flipped, 'cache')).toThrow();
  });

  it('refuses a value moved under another storage key', () => {
    const { encrypt, decrypt } = createCipher(key, randomBytes);
    expect(() => decrypt(encrypt('tower', 'cache'), 'outbox')).toThrow();
  });

  it('refuses another key', () => {
    const payload = createCipher(key, randomBytes).encrypt('tower', 'cache');
    expect(() => createCipher(randomBytes(32), randomBytes).decrypt(payload, 'cache')).toThrow();
  });
});
