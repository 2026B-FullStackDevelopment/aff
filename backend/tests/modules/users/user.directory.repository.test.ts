import { describe, it, expect, vi, beforeEach } from 'vitest';

const {
  findMock,
  aggregateMock,
  searchLeanMock,
  selectMock,
  limitMock,
} = vi.hoisted(() => {
  const searchLeanMock = vi.fn();
  const limitMock = vi.fn(() => ({ lean: searchLeanMock }));
  const selectMock = vi.fn(() => ({ limit: limitMock }));
  return {
    findMock: vi.fn(() => ({ select: selectMock, lean: searchLeanMock })),
    aggregateMock: vi.fn(),
    searchLeanMock,
    selectMock,
    limitMock,
  };
});

vi.mock('../../../src/modules/users/user.model.js', () => ({
  default: {
    find: findMock,
    aggregate: aggregateMock,
  },
}));

import {
  searchActiveRecipientsByEmail,
  findUsersByRole,
  findUsersForAdmin,
  findDonorUserIdsByUsername,
} from '../../../src/modules/users/user.directory.repository.js';

describe('user.directory.repository', () => {
  beforeEach(() => {
    findMock.mockClear();
    searchLeanMock.mockReset();
    selectMock.mockClear();
    limitMock.mockClear();
    aggregateMock.mockReset();
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

  it('finds Donor ids by an escaped, case-insensitive username term', async () => {
    searchLeanMock.mockResolvedValue([{ _id: 'd1' }]);

    const result = await findDonorUserIdsByUsername('bakery (east)');

    expect(findMock).toHaveBeenCalledWith(
      {
        role: 'DONOR',
        username: { $regex: 'bakery \\(east\\)', $options: 'i' },
      },
      { _id: 1 },
    );
    expect(result).toEqual([{ _id: 'd1' }]);
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
