import { describe, it, expect } from 'vitest';
import jwt from 'jsonwebtoken';
import { signAccessToken, decodeAccessToken } from '../../../src/shared/security/token.js';

describe('shared/security/token', () => {
  it('round-trips the userId and role', () => {
    const { token } = signAccessToken({ userId: 'u1', role: 'DONOR' });
    const decoded = decodeAccessToken(token);

    expect(decoded.userId).toBe('u1');
    expect(decoded.role).toBe('DONOR');
  });

  it('issues a unique jti per call and exposes it on both sign and decode', () => {
    const first = signAccessToken({ userId: 'u1', role: 'RECIPIENT' });
    const second = signAccessToken({ userId: 'u1', role: 'RECIPIENT' });

    expect(first.jti).not.toBe(second.jti);
    expect(decodeAccessToken(first.token).jti).toBe(first.jti);
  });

  it('returns an expiry in the future as a Date', () => {
    const { expiresAt } = signAccessToken({ userId: 'u1', role: 'RECIPIENT' });

    expect(expiresAt).toBeInstanceOf(Date);
    expect(expiresAt.getTime()).toBeGreaterThan(Date.now());
  });

  it('rejects a token signed with a different secret', () => {
    const foreign = jwt.sign({ userId: 'u1', role: 'ADMIN' }, 'a-different-secret', {
      expiresIn: '1h',
      jwtid: 'x',
    });

    expect(() => decodeAccessToken(foreign)).toThrow('Your session is invalid or has expired.');
  });

  it('rejects an expired token', () => {
    const expired = jwt.sign({ userId: 'u1', role: 'ADMIN' }, process.env.JWT_SECRET, {
      expiresIn: '-1s',
      jwtid: 'x',
    });

    expect(() => decodeAccessToken(expired)).toThrow('Your session is invalid or has expired.');
  });

  it('rejects a malformed token with statusCode 401', () => {
    let caught;

    try {
      decodeAccessToken('not.a.jwt');
    } catch (error) {
      caught = error;
    }

    expect(caught.statusCode).toBe(401);
  });
});
