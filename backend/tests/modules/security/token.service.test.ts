import { describe, it, expect, vi, beforeEach } from 'vitest';
import jwt from 'jsonwebtoken';

const { isTokenRevokedMock } = vi.hoisted(() => ({ isTokenRevokedMock: vi.fn() }));

vi.mock('../../../src/modules/security/revoked-token.repository.js', () => ({
  isTokenRevoked: isTokenRevokedMock,
}));

import {
  signAccessToken,
  decodeAccessToken,
  verifyAccessToken,
  issueSession,
} from '../../../src/modules/security/token.service.js';

describe('security/token.service', () => {
  beforeEach(() => {
    isTokenRevokedMock.mockReset();
    isTokenRevokedMock.mockResolvedValue(false);
  });

  describe('signAccessToken / decodeAccessToken', () => {
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

  describe('verifyAccessToken', () => {
    it('returns the decoded payload for a valid, unrevoked token', async () => {
      const { token, jti } = signAccessToken({ userId: 'u1', role: 'DONOR' });

      const decoded = await verifyAccessToken(token);

      expect(decoded.userId).toBe('u1');
      expect(decoded.role).toBe('DONOR');
      expect(decoded.jti).toBe(jti);
      expect(decoded.expiresAt).toBeInstanceOf(Date);
    });

    it('checks the revocation list using the token jti', async () => {
      const { token, jti } = signAccessToken({ userId: 'u1', role: 'DONOR' });

      await verifyAccessToken(token);

      expect(isTokenRevokedMock).toHaveBeenCalledWith(jti);
    });

    it('rejects a revoked token with a 401', async () => {
      isTokenRevokedMock.mockResolvedValue(true);
      const { token } = signAccessToken({ userId: 'u1', role: 'DONOR' });
      let caught;

      try {
        await verifyAccessToken(token);
      } catch (error) {
        caught = error;
      }

      expect(caught.statusCode).toBe(401);
      expect(caught.message).toBe('Your session is no longer valid. Please log in again.');
    });

    it('propagates the 401 from an undecodable token without hitting the revocation list', async () => {
      await expect(verifyAccessToken('not.a.jwt')).rejects.toThrow(
        'Your session is invalid or has expired.'
      );
      expect(isTokenRevokedMock).not.toHaveBeenCalled();
    });
  });

  describe('issueSession', () => {
    it('signs a token carrying the user id and role and bundles the user', () => {
      const user = { _id: 'u1', role: 'DONOR' };

      const session = issueSession(user);

      expect(session.user).toBe(user);
      expect(typeof session.accessToken).toBe('string');
      expect(session.expiresAt).toBeInstanceOf(Date);
      expect(decodeAccessToken(session.accessToken)).toMatchObject({
        userId: 'u1',
        role: 'DONOR',
        jti: session.jti,
      });
    });
  });
});
