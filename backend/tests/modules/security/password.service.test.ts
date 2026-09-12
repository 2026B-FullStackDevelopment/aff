import { describe, it, expect, vi } from 'vitest';
import bcrypt from 'bcryptjs';
import { hashPassword, verifyPassword, dummyCompare } from '../../../src/modules/security/password.service.js';

describe('security/password.service', () => {
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

  it('dummyCompare actually calls into bcrypt', async () => {
    const spy = vi.spyOn(bcrypt, 'compare');

    await dummyCompare();

    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});
