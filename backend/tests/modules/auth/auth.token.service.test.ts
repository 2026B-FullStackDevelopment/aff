import { describe, it, expect, vi, beforeEach } from 'vitest';

const { signAccessTokenMock, decodeAccessTokenMock, isTokenRevokedMock } = vi.hoisted(() => ({
  signAccessTokenMock: vi.fn(),
  decodeAccessTokenMock: vi.fn(),
  isTokenRevokedMock: vi.fn(),
}));

vi.mock('../../../src/shared/security/token.js', () => ({
  signAccessToken: signAccessTokenMock,
  decodeAccessToken: decodeAccessTokenMock,
}));

vi.mock('../../../src/modules/auth/revoked-token.repository.js', () => ({
  isTokenRevoked: isTokenRevokedMock,
}));

import { issueSession, verifyAccessToken } from '../../../src/modules/auth/auth.token.service.js';

const expiresAt = new Date('2026-08-11T12:00:00.000Z');

describe('auth.token.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    signAccessTokenMock.mockReturnValue({ token: 't1', jti: 'j1', expiresAt });
    decodeAccessTokenMock.mockReturnValue({ userId: 'u1', role: 'DONOR', jti: 'j1', expiresAt });
    isTokenRevokedMock.mockResolvedValue(false);
  });

  describe('issueSession', () => {
    it('signs a token carrying the user id and role', () => {
      issueSession({ _id: 'u1', role: 'DONOR' });

      expect(signAccessTokenMock).toHaveBeenCalledWith({ userId: 'u1', role: 'DONOR' });
    });

    it('returns the token, jti, expiry and user', () => {
      const user = { _id: 'u1', role: 'DONOR' };

      expect(issueSession(user)).toEqual({ accessToken: 't1', jti: 'j1', expiresAt, user });
    });
  });

  describe('verifyAccessToken', () => {
    it('returns the decoded payload for a valid, unrevoked token', async () => {
      await expect(verifyAccessToken('t1')).resolves.toEqual({
        userId: 'u1',
        role: 'DONOR',
        jti: 'j1',
        expiresAt,
      });
    });

    it('checks the revocation list using the token jti', async () => {
      await verifyAccessToken('t1');

      expect(isTokenRevokedMock).toHaveBeenCalledWith('j1');
    });

    it('rejects a revoked token with a 401', async () => {
      isTokenRevokedMock.mockResolvedValue(true);
      let caught;

      try {
        await verifyAccessToken('t1');
      } catch (error) {
        caught = error;
      }

      expect(caught.statusCode).toBe(401);
      expect(caught.message).toBe('Your session is no longer valid. Please log in again.');
    });

    it('propagates the 401 from an undecodable token', async () => {
      const decodeError: Error = new Error('Your session is invalid or has expired.');
      decodeError.statusCode = 401;
      decodeAccessTokenMock.mockImplementation(() => {
        throw decodeError;
      });

      await expect(verifyAccessToken('bad')).rejects.toThrow('Your session is invalid or has expired.');
      expect(isTokenRevokedMock).not.toHaveBeenCalled();
    });
  });
});
