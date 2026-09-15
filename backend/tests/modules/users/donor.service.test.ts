import { describe, it, expect, vi, beforeEach } from 'vitest';

const {
  createDonorMock,
  findDonorsByUserIdsMock,
  findDonorByUserIdMock,
  findDonorUserIdsByCompanyNameMock,
  findDonorUserIdsByUsernameMock,
} = vi.hoisted(() => ({
  createDonorMock: vi.fn(),
  findDonorsByUserIdsMock: vi.fn(),
  findDonorByUserIdMock: vi.fn(),
  findDonorUserIdsByCompanyNameMock: vi.fn(),
  findDonorUserIdsByUsernameMock: vi.fn(),
}));

vi.mock('../../../src/modules/users/donor.repository.js', () => ({
  createDonor: createDonorMock,
  findDonorsByUserIds: findDonorsByUserIdsMock,
  findDonorByUserId: findDonorByUserIdMock,
  findDonorUserIdsByCompanyName: findDonorUserIdsByCompanyNameMock,
}));

vi.mock('../../../src/modules/users/user.directory.repository.js', () => ({
  findDonorUserIdsByUsername: findDonorUserIdsByUsernameMock,
}));

import {
  createDonorProfile,
  findDonorsByUserIds,
  getDonorByUserId,
  findDonorIdsMatchingSearch,
} from '../../../src/modules/users/donor.service.js';

describe('donor.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('createDonorProfile delegates to the donor repository', async () => {
    createDonorMock.mockResolvedValue({ userId: 'u1' });
    const input = {
      userId: 'u1',
      companyName: 'Fresh Foods Ltd',
      taxCode: '0123456789',
      addressText: '12 Trần Hưng Đạo',
      location: { latitude: 21, longitude: 105 },
    };

    await createDonorProfile(input);

    expect(createDonorMock).toHaveBeenCalledWith(input);
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

  describe('getDonorByUserId', () => {
    it('throws a 404 when no Donor profile exists', async () => {
      findDonorByUserIdMock.mockResolvedValue(null);

      await expect(getDonorByUserId('u1')).rejects.toMatchObject({ statusCode: 404 });
    });

    it('returns the Donor profile when it exists', async () => {
      findDonorByUserIdMock.mockResolvedValue({ userId: 'u1', companyName: 'Fresh Foods Ltd' });

      await expect(getDonorByUserId('u1')).resolves.toEqual({ userId: 'u1', companyName: 'Fresh Foods Ltd' });
    });
  });

  describe('findDonorIdsMatchingSearch', () => {
    it('combines username, company, and exact ObjectId matches without duplicates', async () => {
      const exactId = '507f1f77bcf86cd799439011';
      findDonorUserIdsByUsernameMock.mockResolvedValue([
        { _id: exactId }, { _id: '507f1f77bcf86cd799439012' },
      ]);
      findDonorUserIdsByCompanyNameMock.mockResolvedValue([
        { userId: exactId }, { userId: '507f1f77bcf86cd799439013' },
      ]);

      await expect(findDonorIdsMatchingSearch(exactId)).resolves.toEqual([
        exactId,
        '507f1f77bcf86cd799439012',
        '507f1f77bcf86cd799439013',
      ]);
      expect(findDonorUserIdsByUsernameMock).toHaveBeenCalledWith(exactId);
      expect(findDonorUserIdsByCompanyNameMock).toHaveBeenCalledWith(exactId);
    });
  });
});
