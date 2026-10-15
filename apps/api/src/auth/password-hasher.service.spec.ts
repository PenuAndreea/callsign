import argon2 from 'argon2';

import { PasswordHasher } from './password-hasher.service';

// Real argon2: at these parameters a hash takes ~20 ms, fast enough for unit tests.
describe('PasswordHasher', () => {
  const hasher = new PasswordHasher();

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('hashes with argon2id and the configured parameters', async () => {
    const hash = await hasher.hash('correct horse');
    expect(hash).toMatch(/^\$argon2id\$v=19\$m=19456,p=1,t=2\$/);
  });

  it('salts every hash, so equal passphrases get different hashes', async () => {
    const [a, b] = await Promise.all([hasher.hash('same'), hasher.hash('same')]);
    expect(a).not.toBe(b);
  });

  it('verifies the right passphrase and rejects a wrong one', async () => {
    const hash = await hasher.hash('correct horse');
    await expect(hasher.verify(hash, 'correct horse')).resolves.toBe(true);
    await expect(hasher.verify(hash, 'correct horsf')).resolves.toBe(false);
  });

  it('does not trim or normalize the passphrase', async () => {
    const hash = await hasher.hash(' padded ');
    await expect(hasher.verify(hash, 'padded')).resolves.toBe(false);
  });

  it('still runs a verification when there is no stored hash (unknown callsign)', async () => {
    const verify = jest.spyOn(argon2, 'verify');
    await expect(hasher.verify(undefined, 'anything')).resolves.toBe(false);
    expect(verify).toHaveBeenCalledTimes(1);
  });

  it('never accepts a passphrase for an unknown callsign, even the dummy one', async () => {
    await expect(hasher.verify(undefined, '')).resolves.toBe(false);
  });
});
