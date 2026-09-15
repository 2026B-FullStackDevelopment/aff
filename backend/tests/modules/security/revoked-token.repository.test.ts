import { describe, it, expect, vi, beforeEach } from 'vitest';

const { createMock, existsMock, removeActiveTokenMock } = vi.hoisted(() => ({
  createMock: vi.fn(),
  existsMock: vi.fn(),
  removeActiveTokenMock: vi.fn(),
}));

vi.mock('../../../src/modules/security/revoked-token.model.js', () => ({
  default: { create: createMock, exists: existsMock },
}));

vi.mock('../../../src/modules/security/active-token.repository.js', () => ({
  removeActiveToken: removeActiveTokenMock,
}));

import { revokeToken, isTokenRevoked } from '../../../src/modules/security/revoked-token.repository.js';

const expiresAt = new Date('2026-08-11T12:00:00.000Z');

describe('revoked-token.repository', () => {
  beforeEach(() => {
    createMock.mockClear();
    existsMock.mockClear();
    removeActiveTokenMock.mockClear();
    createMock.mockResolvedValue({});
    removeActiveTokenMock.mockResolvedValue(undefined);
  });

  it('revokeToken stores the jti with reason LOGOUT by default', async () => {
    await revokeToken({ jti: 'j1', userId: 'u1', expiresAt });

    const persisted = createMock.mock.calls[0][0];

    expect(persisted.jti).toBe('j1');
    expect(persisted.userId).toBe('u1');
    expect(persisted.reason).toBe('LOGOUT');
    expect(persisted.expiresAt).toBe(expiresAt);
    expect(persisted.revokedAt).toBeInstanceOf(Date);
  });

  it('revokeToken accepts an explicit reason', async () => {
    await revokeToken({ jti: 'j1', userId: 'u1', expiresAt, reason: 'ADMIN_DEACTIVATE' });

    expect(createMock.mock.calls[0][0].reason).toBe('ADMIN_DEACTIVATE');
  });

  it('revokeToken treats a duplicate jti as already revoked', async () => {
    createMock.mockRejectedValue({ code: 11000 });

    await expect(revokeToken({ jti: 'j1', userId: 'u1', expiresAt })).resolves.toBeUndefined();
  });

  it('revokeToken rethrows errors that are not duplicate-key errors', async () => {
    createMock.mockRejectedValue(new Error('connection lost'));

    await expect(revokeToken({ jti: 'j1', userId: 'u1', expiresAt })).rejects.toThrow(
      'connection lost'
    );
  });

  it('revokeToken removes the token from the live-session table', async () => {
    await revokeToken({ jti: 'j1', userId: 'u1', expiresAt });

    expect(removeActiveTokenMock).toHaveBeenCalledWith('j1');
  });

  it('revokeToken still removes the live-session row on a duplicate-key revoke', async () => {
    createMock.mockRejectedValue({ code: 11000 });

    await revokeToken({ jti: 'j1', userId: 'u1', expiresAt });

    expect(removeActiveTokenMock).toHaveBeenCalledWith('j1');
  });

  it('isTokenRevoked returns true when a record exists', async () => {
    existsMock.mockResolvedValue({ _id: 'r1' });

    await expect(isTokenRevoked('j1')).resolves.toBe(true);
    expect(existsMock).toHaveBeenCalledWith({ jti: 'j1' });
  });

  it('isTokenRevoked returns false when no record exists', async () => {
    existsMock.mockResolvedValue(null);

    await expect(isTokenRevoked('j1')).resolves.toBe(false);
  });
});
