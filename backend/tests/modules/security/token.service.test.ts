import { describe, it, expect, vi, beforeEach } from 'vitest';
import jwt from 'jsonwebtoken';

const { isTokenRevokedMock, revokeTokenMock, recordIssuedTokenMock, listActiveTokensForUserMock } =
  vi.hoisted(() => ({
    isTokenRevokedMock: vi.fn(),
    revokeTokenMock: vi.fn(),
    recordIssuedTokenMock: vi.fn(),
    listActiveTokensForUserMock: vi.fn(),
  }));

vi.mock('../../../src/modules/security/revoked-token.repository.js', () => ({
  isTokenRevoked: isTokenRevokedMock,
  revokeToken: revokeTokenMock,
}));

vi.mock('../../../src/modules/security/active-token.repository.js', () => ({
  recordIssuedToken: recordIssuedTokenMock,
  listActiveTokensForUser: listActiveTokensForUserMock,
}));

import {
  signAccessToken,
  decodeAccessToken,
  verifyAccessToken,
  issueSession,
  revokeAllTokensForUser,
} from '../../../src/modules/security/token.service.js';

describe('security/token.service', () => {
  beforeEach(() => {
    isTokenRevokedMock.mockReset();
    isTokenRevokedMock.mockResolvedValue(false);
    revokeTokenMock.mockReset();
    revokeTokenMock.mockResolvedValue(undefined);
    recordIssuedTokenMock.mockReset();
    recordIssuedTokenMock.mockResolvedValue(undefined);
    listActiveTokensForUserMock.mockReset();
    listActiveTokensForUserMock.mockResolvedValue([]);
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
    it('signs a token carrying the user id and role and bundles the user', async () => {
      const user = { _id: 'u1', role: 'DONOR' };

      const session = await issueSession(user);

      expect(session.user).toBe(user);
      expect(typeof session.accessToken).toBe('string');
      expect(session.expiresAt).toBeInstanceOf(Date);
      expect(decodeAccessToken(session.accessToken)).toMatchObject({
        userId: 'u1',
        role: 'DONOR',
        jti: session.jti,
      });
    });

    it('records the issued token as live', async () => {
      const user = { _id: 'u1', role: 'DONOR' };

      const session = await issueSession(user);

      expect(recordIssuedTokenMock).toHaveBeenCalledWith({
        jti: session.jti,
        userId: 'u1',
        expiresAt: session.expiresAt,
      });
    });
  });

  describe('revokeAllTokensForUser', () => {
    it('revokes every live token for the user with the given reason', async () => {
      const expiresAt1 = new Date('2026-08-11T12:00:00.000Z');
      const expiresAt2 = new Date('2026-08-11T13:00:00.000Z');
      listActiveTokensForUserMock.mockResolvedValue([
        { jti: 'j1', expiresAt: expiresAt1 },
        { jti: 'j2', expiresAt: expiresAt2 },
      ]);

      await revokeAllTokensForUser('u1', 'ADMIN_DEACTIVATE');

      expect(listActiveTokensForUserMock).toHaveBeenCalledWith('u1');
      expect(revokeTokenMock).toHaveBeenCalledWith({
        jti: 'j1',
        userId: 'u1',
        expiresAt: expiresAt1,
        reason: 'ADMIN_DEACTIVATE',
      });
      expect(revokeTokenMock).toHaveBeenCalledWith({
        jti: 'j2',
        userId: 'u1',
        expiresAt: expiresAt2,
        reason: 'ADMIN_DEACTIVATE',
      });
    });

    it('does nothing when the user has no live tokens', async () => {
      listActiveTokensForUserMock.mockResolvedValue([]);

      await revokeAllTokensForUser('u1', 'ADMIN_DEACTIVATE');

      expect(revokeTokenMock).not.toHaveBeenCalled();
    });

    it('propagates a failure from any single revoke', async () => {
      listActiveTokensForUserMock.mockResolvedValue([
        { jti: 'j1', expiresAt: new Date() },
        { jti: 'j2', expiresAt: new Date() },
      ]);
      revokeTokenMock.mockImplementation(({ jti }) =>
        jti === 'j2' ? Promise.reject(new Error('connection lost')) : Promise.resolve()
      );

      await expect(revokeAllTokensForUser('u1', 'ADMIN_DEACTIVATE')).rejects.toThrow(
        'connection lost'
      );
    });
  });
});
