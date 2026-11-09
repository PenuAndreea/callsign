import { gcm } from '@noble/ciphers/aes.js';
import { bytesToHex, bytesToUtf8, hexToBytes, utf8ToBytes } from '@noble/ciphers/utils.js';

/** AES-GCM's standard nonce size. A random 96-bit nonce per write never repeats in practice. */
const NONCE_BYTES = 12;

export interface Cipher {
  /** Hex of `nonce + ciphertext + tag`. `context` is bound to it: it only decrypts with the same. */
  encrypt(plaintext: string, context: string): string;
  /** @throws when the payload was changed, the context differs, or the key is not the one used. */
  decrypt(payload: string, context: string): string;
}

/**
 * AES-256-GCM in JavaScript (`@noble/ciphers`, audited, no native module, so Expo Go keeps
 * working). GCM authenticates as well as encrypts: a changed byte fails to decrypt instead of
 * reading as garbage. The context (the storage key) is authenticated data, so a value copied
 * under another key does not decrypt either. Hex, not base64: no extra dependency, and the
 * payloads are small (a few pages of messages).
 */
export function createCipher(key: Uint8Array, randomBytes: (count: number) => Uint8Array): Cipher {
  return {
    encrypt(plaintext, context) {
      const nonce = randomBytes(NONCE_BYTES);
      const sealed = gcm(key, nonce, utf8ToBytes(context)).encrypt(utf8ToBytes(plaintext));
      return bytesToHex(nonce) + bytesToHex(sealed);
    },
    decrypt(payload, context) {
      const bytes = hexToBytes(payload);
      const nonce = bytes.subarray(0, NONCE_BYTES);
      const sealed = bytes.subarray(NONCE_BYTES);
      return bytesToUtf8(gcm(key, nonce, utf8ToBytes(context)).decrypt(sealed));
    },
  };
}
