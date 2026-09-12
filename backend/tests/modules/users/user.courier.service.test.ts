import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  createUserMock,
  findUserByEmailMock,
  findUsersByRoleMock,
  deleteUserMock,
  createCourierMock,
  findCouriersByUserIdsMock,
  findDonorsByUserIdsMock,
  hashPasswordMock,
} = vi.hoisted(() => ({
  createUserMock: vi.fn(),
  findUserByEmailMock: vi.fn(),
  findUsersByRoleMock: vi.fn(),
  deleteUserMock: vi.fn(),
  createCourierMock: vi.fn(),
  findCouriersByUserIdsMock: vi.fn(),
  findDonorsByUserIdsMock: vi.fn(),
  hashPasswordMock: vi.fn(),
}));

vi.mock('../../../src/modules/users/user.repository.js', () => ({
  createUser: createUserMock,
  findUserByEmail: findUserByEmailMock,
  findUsersByRole: findUsersByRoleMock,
  deleteUser: deleteUserMock,
}));

vi.mock('../../../src/modules/users/courier.repository.js', () => ({
  createCourier: createCourierMock,
  findCouriersByUserIds: findCouriersByUserIdsMock,
}));

vi.mock('../../../src/modules/users/recipient.repository.js', () => ({}));
vi.mock('../../../src/modules/users/donor.repository.js', () => ({
  findDonorsByUserIds: findDonorsByUserIdsMock,
}));
vi.mock('../../../src/modules/security/security.interface.js', () => ({
  securityInterface: { hashPassword: hashPasswordMock },
}));

import {
  createCourierAccount,
  listCouriers,
  findCourierProfilesByUserIds,
  findDonorsByUserIds,
} from '../../../src/modules/users/user.service.js';

describe('user.service — Courier accounts', () => {
  const input = {
    username: 'courier_01',
    email: 'courier@aff.com',
    password: 'Str0ng#Pass',
    fullName: 'Nguyen Van A',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    hashPasswordMock.mockResolvedValue('hashed');
    findUserByEmailMock.mockResolvedValue(null);
  });

  describe('createCourierAccount', () => {
    it('creates the USER with the COURIER role and then its profile', async () => {
      const user = { _id: 'u1', email: input.email, role: 'COURIER' };
      const courier = { userId: 'u1', fullName: input.fullName };
      createUserMock.mockResolvedValue(user);
      createCourierMock.mockResolvedValue(courier);

      const result = await createCourierAccount(input);

      expect(createUserMock).toHaveBeenCalledWith(
        expect.objectContaining({
          username: 'courier_01',
          email: 'courier@aff.com',
          passwordHash: 'hashed',
          role: 'COURIER',
        }),
      );
      expect(createCourierMock).toHaveBeenCalledWith({
        userId: 'u1',
        fullName: 'Nguyen Van A',
      });
      expect(result).toEqual({ user, courier });
    });

    it('rejects a duplicate email with 409 and never creates a profile', async () => {
      findUserByEmailMock.mockResolvedValue({ _id: 'existing' });

      await expect(createCourierAccount(input)).rejects.toMatchObject({
        statusCode: 409,
      });

      expect(createUserMock).not.toHaveBeenCalled();
      expect(createCourierMock).not.toHaveBeenCalled();
    });

    it('deletes the orphaned USER when the profile write fails', async () => {
      createUserMock.mockResolvedValue({ _id: 'u1' });
      const failure = new Error('profile write failed');
      createCourierMock.mockRejectedValue(failure);

      await expect(createCourierAccount(input)).rejects.toBe(failure);

      expect(deleteUserMock).toHaveBeenCalledWith('u1');
    });
  });

  describe('listCouriers', () => {
    it('pairs each Courier account with its profile', async () => {
      findUsersByRoleMock.mockResolvedValue({
        items: [{ _id: 'u1' }, { _id: 'u2' }],
        page: 1,
        limit: 20,
        total: 2,
      });
      findCouriersByUserIdsMock.mockResolvedValue([
        { userId: 'u2', fullName: 'Second Courier' },
        { userId: 'u1', fullName: 'First Courier' },
      ]);

      const result = await listCouriers({ page: 1, limit: 20 });

      expect(findUsersByRoleMock).toHaveBeenCalledWith('COURIER', {
        page: 1,
        limit: 20,
      });
      expect(findCouriersByUserIdsMock).toHaveBeenCalledWith(['u1', 'u2']);
      expect(result).toEqual({
        items: [
          { user: { _id: 'u1' }, courier: { userId: 'u1', fullName: 'First Courier' } },
          { user: { _id: 'u2' }, courier: { userId: 'u2', fullName: 'Second Courier' } },
        ],
        page: 1,
        limit: 20,
        total: 2,
      });
    });

    it('still lists an account whose profile row is missing', async () => {
      findUsersByRoleMock.mockResolvedValue({
        items: [{ _id: 'u1' }],
        page: 1,
        limit: 20,
        total: 1,
      });
      findCouriersByUserIdsMock.mockResolvedValue([]);

      const result = await listCouriers({ page: 1, limit: 20 });

      expect(result.items).toEqual([{ user: { _id: 'u1' }, courier: null }]);
    });

    it('does not query profiles when the page is empty', async () => {
      findUsersByRoleMock.mockResolvedValue({
        items: [],
        page: 9,
        limit: 20,
        total: 0,
      });

      const result = await listCouriers({ page: 9, limit: 20 });

      expect(findCouriersByUserIdsMock).not.toHaveBeenCalled();
      expect(result.items).toEqual([]);
    });
  });

  describe('findCourierProfilesByUserIds', () => {
    it('loads the requested Courier profiles in one query', async () => {
      const profiles = [{ userId: 'u1', fullName: 'Nguyen Van A' }];
      findCouriersByUserIdsMock.mockResolvedValue(profiles);

      const result = await findCourierProfilesByUserIds(['u1']);

      expect(findCouriersByUserIdsMock).toHaveBeenCalledWith(['u1']);
      expect(result).toBe(profiles);
    });

    it('skips the database entirely when asked for nothing', async () => {
      const result = await findCourierProfilesByUserIds([]);

      expect(findCouriersByUserIdsMock).not.toHaveBeenCalled();
      expect(result).toEqual([]);
    });
  });

  describe('findDonorsByUserIds', () => {
    it('loads the requested Donor profiles in one query', async () => {
      const donors = [{ userId: 'd1', companyName: 'Fresh Foods' }];
      findDonorsByUserIdsMock.mockResolvedValue(donors);

      const result = await findDonorsByUserIds(['d1']);

      expect(findDonorsByUserIdsMock).toHaveBeenCalledWith(['d1']);
      expect(result).toBe(donors);
    });

    it('skips the database entirely when asked for nothing', async () => {
      const result = await findDonorsByUserIds([]);

      expect(findDonorsByUserIdsMock).not.toHaveBeenCalled();
      expect(result).toEqual([]);
    });
  });
});
