import { describe, it, expect, vi, beforeEach } from 'vitest';

const { revokeTokenMock } = vi.hoisted(() => ({ revokeTokenMock: vi.fn() }));

vi.mock('../../../src/modules/auth/revoked-token.repository.js', () => ({
  revokeToken: revokeTokenMock,
}));

import { logout, revokeForPasswordChange } from '../../../src/modules/auth/auth.logout.service.js';

const expiresAt = new Date('2026-08-11T12:00:00.000Z');
const input = { userId: 'u1', jti: 'j1', expiresAt };

describe('auth.logout.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    revokeTokenMock.mockResolvedValue(undefined);
  });

  it('revokes the presented jti for the user with reason LOGOUT', async () => {
    await logout(input);

    expect(revokeTokenMock).toHaveBeenCalledWith({
      jti: 'j1',
      userId: 'u1',
      expiresAt,
      reason: 'LOGOUT',
    });
  });

  it('copies the token expiry so the TTL index can purge the row', async () => {
    await logout(input);

    expect(revokeTokenMock.mock.calls[0][0].expiresAt).toBe(expiresAt);
  });

  it('resolves when the token was already revoked', async () => {
    await expect(logout(input)).resolves.toBeUndefined();
    await expect(logout(input)).resolves.toBeUndefined();
    expect(revokeTokenMock).toHaveBeenCalledTimes(2);
  });

  it('propagates a real database failure so logout is never falsely reported', async () => {
    revokeTokenMock.mockRejectedValue(new Error('connection lost'));

    await expect(logout(input)).rejects.toThrow('connection lost');
  });
});

describe('auth.logout.service revokeForPasswordChange', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    revokeTokenMock.mockResolvedValue(undefined);
  });

  it('revokes the presented jti for the user with reason PASSWORD_CHANGE', async () => {
    await revokeForPasswordChange(input);

    expect(revokeTokenMock).toHaveBeenCalledWith({
      jti: 'j1',
      userId: 'u1',
      expiresAt,
      reason: 'PASSWORD_CHANGE',
    });
  });

  it('propagates a real database failure', async () => {
    revokeTokenMock.mockRejectedValue(new Error('connection lost'));

    await expect(revokeForPasswordChange(input)).rejects.toThrow('connection lost');
  });
});
