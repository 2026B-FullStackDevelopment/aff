import { describe, it, expect, vi, beforeEach } from 'vitest';

const { createMock, deleteOneMock, findMock, leanMock } = vi.hoisted(() => {
  const leanMock = vi.fn();
  return {
    createMock: vi.fn(),
    deleteOneMock: vi.fn(),
    findMock: vi.fn(() => ({ lean: leanMock })),
    leanMock,
  };
});

vi.mock('../../../src/modules/security/active-token.model.js', () => ({
  default: { create: createMock, deleteOne: deleteOneMock, find: findMock },
}));

import {
  recordIssuedToken,
  removeActiveToken,
  listActiveTokensForUser,
} from '../../../src/modules/security/active-token.repository.js';

const expiresAt = new Date('2026-08-11T12:00:00.000Z');

describe('active-token.repository', () => {
  beforeEach(() => {
    createMock.mockClear();
    deleteOneMock.mockClear();
    findMock.mockClear();
    leanMock.mockClear();
    createMock.mockResolvedValue({});
    deleteOneMock.mockResolvedValue({});
    leanMock.mockResolvedValue([]);
  });

  it('recordIssuedToken stores the jti, userId, and expiry', async () => {
    await recordIssuedToken({ jti: 'j1', userId: 'u1', expiresAt });

    const persisted = createMock.mock.calls[0][0];

    expect(persisted.jti).toBe('j1');
    expect(persisted.userId).toBe('u1');
    expect(persisted.expiresAt).toBe(expiresAt);
    expect(persisted.issuedAt).toBeInstanceOf(Date);
  });

  it('recordIssuedToken treats a duplicate jti as already recorded', async () => {
    createMock.mockRejectedValue({ code: 11000 });

    await expect(recordIssuedToken({ jti: 'j1', userId: 'u1', expiresAt })).resolves.toBeUndefined();
  });

  it('recordIssuedToken rethrows errors that are not duplicate-key errors', async () => {
    createMock.mockRejectedValue(new Error('connection lost'));

    await expect(recordIssuedToken({ jti: 'j1', userId: 'u1', expiresAt })).rejects.toThrow(
      'connection lost'
    );
  });

  it('removeActiveToken deletes the row by jti', async () => {
    await removeActiveToken('j1');

    expect(deleteOneMock).toHaveBeenCalledWith({ jti: 'j1' });
  });

  it('listActiveTokensForUser queries by userId and returns lean documents', async () => {
    const rows = [{ jti: 'j1', expiresAt }];
    leanMock.mockResolvedValue(rows);

    await expect(listActiveTokensForUser('u1')).resolves.toBe(rows);
    expect(findMock).toHaveBeenCalledWith({ userId: 'u1' });
  });
});
