import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword, dummyCompare } from '../../../src/shared/security/password.js';

describe('shared/security/password', () => {
  it('hashPassword never returns the plaintext', async () => {
    const hash = await hashPassword('Str0ng!Pass');

    expect(hash).not.toBe('Str0ng!Pass');
    expect(hash.length).toBeGreaterThan(20);
  });

  it('hashPassword produces a different hash each call because of the salt', async () => {
    const first = await hashPassword('Str0ng!Pass');
    const second = await hashPassword('Str0ng!Pass');

    expect(first).not.toBe(second);
  });

  it('verifyPassword returns true for the correct password', async () => {
    const hash = await hashPassword('Str0ng!Pass');

    await expect(verifyPassword('Str0ng!Pass', hash)).resolves.toBe(true);
  });

  it('verifyPassword returns false for a wrong password', async () => {
    const hash = await hashPassword('Str0ng!Pass');

    await expect(verifyPassword('wrong', hash)).resolves.toBe(false);
  });

  it('verifyPassword returns false instead of throwing when the hash is malformed', async () => {
    await expect(verifyPassword('Str0ng!Pass', 'not-a-bcrypt-hash')).resolves.toBe(false);
  });

  it('dummyCompare resolves without throwing', async () => {
    await expect(dummyCompare()).resolves.toBeUndefined();
  });
});
