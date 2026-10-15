import { randomBytes } from 'node:crypto';

import { Injectable } from '@nestjs/common';
import type { HashOptions } from 'argon2';
import argon2 from 'argon2';

/**
 * argon2id with OWASP's recommended minimum (19 MiB, 2 passes, 1 lane). Memory-hard, so GPU
 * cracking is expensive, while 10 concurrent logins still need only ~190 MB (the library
 * default is 64 MiB each). The parameters are stored in every hash, so raising them later
 * keeps old hashes verifiable.
 */
const OPTIONS: HashOptions = {
  type: argon2.argon2id,
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
};

/** Wraps argon2 so auth tests can swap in a fast fake. */
@Injectable()
export class PasswordHasher {
  /** Hash of a random secret with the same parameters, for logins with an unknown callsign. */
  private dummyHash: Promise<string> | undefined;

  hash(passphrase: string): Promise<string> {
    return argon2.hash(passphrase, OPTIONS);
  }

  /**
   * Checks a passphrase against a stored hash. With no hash (unknown callsign) it still runs
   * one verification against a dummy, so both cases take the same time: otherwise response
   * timing would tell an attacker which callsigns exist.
   */
  async verify(storedHash: string | undefined, passphrase: string): Promise<boolean> {
    if (storedHash === undefined) {
      await argon2.verify(await this.getDummyHash(), passphrase);
      return false;
    }
    return argon2.verify(storedHash, passphrase);
  }

  private getDummyHash(): Promise<string> {
    this.dummyHash ??= this.hash(randomBytes(32).toString('base64url'));
    return this.dummyHash;
  }
}
