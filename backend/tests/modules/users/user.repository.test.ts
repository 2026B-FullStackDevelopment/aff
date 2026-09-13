import { describe, it, expect, vi, beforeEach } from 'vitest';

const {
  createMock,
  findMock,
  findOneMock,
  findByIdMock,
  findByIdAndUpdateMock,
  findOneAndUpdateMock,
  updateOneMock,
  deleteOneMock,
  aggregateMock,
  leanMock,
  searchLeanMock,
  selectMock,
  limitMock,
} = vi.hoisted(() => {
  const leanMock = vi.fn();
  const searchLeanMock = vi.fn();
  const limitMock = vi.fn(() => ({ lean: searchLeanMock }));
  const selectMock = vi.fn(() => ({ limit: limitMock }));
  return {
    createMock: vi.fn(),
    findMock: vi.fn(() => ({ select: selectMock })),
    findOneMock: vi.fn(() => ({ lean: leanMock })),
    findByIdMock: vi.fn(() => ({ lean: leanMock })),
    findByIdAndUpdateMock: vi.fn(() => ({ lean: leanMock })),
    findOneAndUpdateMock: vi.fn(() => ({ lean: leanMock })),
    updateOneMock: vi.fn(),
    deleteOneMock: vi.fn(),
    aggregateMock: vi.fn(),
    leanMock,
    searchLeanMock,
    selectMock,
    limitMock,
  };
});

vi.mock('../../../src/modules/users/user.model.js', () => ({
  default: {
    create: createMock,
    find: findMock,
    findOne: findOneMock,
    findById: findByIdMock,
    findByIdAndUpdate: findByIdAndUpdateMock,
    findOneAndUpdate: findOneAndUpdateMock,
    updateOne: updateOneMock,
    aggregate: aggregateMock,
    deleteOne: deleteOneMock,
  },
}));

import {
  createUser,
  findUserByEmail,
  searchActiveRecipientsByEmail,
  findUserById,
  updateUser,
  updateLoginState,
  incrementFailedLoginInWindow,
  startFailedLoginWindow,
  lockAccount,
  deleteUser,
  findUsersByRole,
  findUsersForAdmin,
} from '../../../src/modules/users/user.repository.js';

describe('user.repository', () => {
  beforeEach(() => {
    createMock.mockClear();
    findMock.mockClear();
    findOneMock.mockClear();
    findByIdMock.mockClear();
    findByIdAndUpdateMock.mockClear();
    findOneAndUpdateMock.mockClear();
    updateOneMock.mockClear();
    deleteOneMock.mockClear();
    leanMock.mockClear();
    leanMock.mockResolvedValue({ _id: 'u1' });
    searchLeanMock.mockReset();
    selectMock.mockClear();
    limitMock.mockClear();
    aggregateMock.mockReset();
  });

  it('createUser calls User.create with the given data', async () => {
    createMock.mockResolvedValue({ _id: 'u1', username: 'alice' });

    const result = await createUser({
      username: 'alice',
      email: 'alice@example.com',
      passwordHash: 'hash',
      role: 'RECIPIENT',
    });

    expect(createMock).toHaveBeenCalledWith({
      username: 'alice',
      email: 'alice@example.com',
      passwordHash: 'hash',
      role: 'RECIPIENT',
    });
    expect(result).toEqual({ _id: 'u1', username: 'alice' });
  });

  it('findUserByEmail queries by email and returns a lean document', async () => {
    await findUserByEmail('alice@example.com');

    expect(findOneMock).toHaveBeenCalledWith({ email: 'alice@example.com' });
    expect(leanMock).toHaveBeenCalled();
  });

  it('searches only active Recipient emails with an escaped prefix and limit', async () => {
    searchLeanMock.mockResolvedValue([
      {
        _id: 'r1',
        username: 'recipient',
        email: 'rec+test@example.com',
      },
    ]);

    const result = await searchActiveRecipientsByEmail('rec+test', 10);

    expect(findMock).toHaveBeenCalledWith({
      role: 'RECIPIENT',
      status: 'ACTIVE',
      email: {
        $regex: '^rec\\+test',
        $options: 'i',
      },
    });
    expect(selectMock).toHaveBeenCalledWith({
      _id: 1,
      username: 1,
      email: 1,
    });
    expect(limitMock).toHaveBeenCalledWith(10);
    expect(result).toHaveLength(1);
  });

  it('findUserById queries by id and returns a lean document', async () => {
    await findUserById('u1');

    expect(findByIdMock).toHaveBeenCalledWith('u1');
    expect(leanMock).toHaveBeenCalled();
  });

  it('updateUser updates by id and returns the new lean document', async () => {
    await updateUser('u1', { city: 'Paris' });

    expect(findByIdAndUpdateMock).toHaveBeenCalledWith('u1', { city: 'Paris' }, { new: true });
    expect(leanMock).toHaveBeenCalled();
  });

  it('updateUser accepts avatarUrl even though it is not part of CreateUserInput', async () => {
    await updateUser('u1', { avatarUrl: 'https://cdn.example.com/avatars/u1.png' });

    expect(findByIdAndUpdateMock).toHaveBeenCalledWith(
      'u1',
      { avatarUrl: 'https://cdn.example.com/avatars/u1.png' },
      { new: true }
    );
  });

  it('updateLoginState writes the three lockout columns', async () => {
    const windowStartedAt = new Date('2026-08-11T10:00:00.000Z');
    const lockedUntil = new Date('2026-08-11T10:05:00.000Z');

    await updateLoginState('u1', { failedLoginCount: 3, windowStartedAt, lockedUntil });

    expect(updateOneMock).toHaveBeenCalledWith(
      { _id: 'u1' },
      { failedLoginCount: 3, windowStartedAt, lockedUntil }
    );
  });

  it('incrementFailedLoginInWindow uses $inc and filters on a live window', async () => {
    const windowStartedAfter = new Date('2026-08-11T09:59:00.000Z');

    await incrementFailedLoginInWindow('u1', windowStartedAfter);

    expect(findOneAndUpdateMock).toHaveBeenCalledWith(
      { _id: 'u1', windowStartedAt: { $gt: windowStartedAfter } },
      { $inc: { failedLoginCount: 1 } },
      { new: true }
    );
    expect(leanMock).toHaveBeenCalled();
  });

  it('startFailedLoginWindow sets the counter to 1 and stamps the window start', async () => {
    const now = new Date('2026-08-11T10:00:00.000Z');

    await startFailedLoginWindow('u1', now);

    expect(findOneAndUpdateMock).toHaveBeenCalledWith(
      { _id: 'u1' },
      { $set: { failedLoginCount: 1, windowStartedAt: now } },
      { new: true }
    );
    expect(leanMock).toHaveBeenCalled();
  });

  it('lockAccount resets the counter and window while setting lockedUntil', async () => {
    const lockedUntil = new Date('2026-08-11T10:05:00.000Z');

    await lockAccount('u1', lockedUntil);

    expect(updateOneMock).toHaveBeenCalledWith(
      { _id: 'u1' },
      { $set: { failedLoginCount: 0, windowStartedAt: null, lockedUntil } }
    );
  });

  it('deleteUser removes the user by id', async () => {
    await deleteUser('u1');

    expect(deleteOneMock).toHaveBeenCalledWith({ _id: 'u1' });
  });

  describe('findUsersByRole', () => {
    it('returns one page of accounts in that role plus the total', async () => {
      const courier = { _id: 'u1', role: 'COURIER' };
      aggregateMock.mockResolvedValue([
        { items: [courier], metadata: [{ total: 3 }] },
      ]);

      const result = await findUsersByRole('COURIER', { page: 2, limit: 1 });

      const [pipeline] = aggregateMock.mock.calls[0];
      expect(pipeline[0]).toEqual({ $match: { role: 'COURIER' } });
      expect(result).toEqual({
        items: [courier],
        page: 2,
        limit: 1,
        total: 3,
      });
    });

    it('reports an empty page when no account holds that role', async () => {
      aggregateMock.mockResolvedValue([{ items: [], metadata: [] }]);

      const result = await findUsersByRole('COURIER', { page: 1, limit: 20 });

      expect(result.items).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  describe('findUsersForAdmin', () => {
    it('joins role profiles before searching and paginating accounts', async () => {
      const account = { _id: 'u1', role: 'DONOR' };
      aggregateMock.mockResolvedValue([{ items: [account], metadata: [{ total: 1 }] }]);

      const result = await findUsersForAdmin({
        page: 1,
        limit: 10,
        role: 'DONOR',
        status: 'ACTIVE',
        search: 'Fresh Foods',
      });

      const [pipeline] = aggregateMock.mock.calls[0];
      expect(pipeline[0]).toEqual({ $match: { role: 'DONOR', status: 'ACTIVE' } });
      expect(pipeline.filter((stage) => '$lookup' in stage)).toHaveLength(3);
      expect(pipeline).toContainEqual({
        $match: {
          $or: [
            { username: { $regex: 'Fresh Foods', $options: 'i' } },
            { email: { $regex: 'Fresh Foods', $options: 'i' } },
            { profileName: { $regex: 'Fresh Foods', $options: 'i' } },
          ],
        },
      });
      expect(result).toEqual({ items: [account], page: 1, limit: 10, total: 1 });
    });

    it('escapes regular-expression characters in account searches', async () => {
      aggregateMock.mockResolvedValue([{ items: [], metadata: [] }]);

      await findUsersForAdmin({ page: 1, limit: 20, search: 'a+b@example.com' });

      const [pipeline] = aggregateMock.mock.calls[0];
      expect(pipeline).toContainEqual({
        $match: {
          $or: [
            { username: { $regex: 'a\\+b@example\\.com', $options: 'i' } },
            { email: { $regex: 'a\\+b@example\\.com', $options: 'i' } },
            { profileName: { $regex: 'a\\+b@example\\.com', $options: 'i' } },
          ],
        },
      });
    });
  });
});
