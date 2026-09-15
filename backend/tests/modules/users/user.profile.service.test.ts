import { describe, it, expect, vi, beforeEach } from 'vitest';

const {
  updateUserMock,
  findUserByEmailMock,
  getUserByIdMock,
  findRecipientByUserIdMock,
  findDonorByUserIdMock,
  updateDonorMock,
  hashPasswordMock,
  revokeTokenMock,
  getMySubscriptionStatusMock,
} = vi.hoisted(() => ({
  updateUserMock: vi.fn(),
  findUserByEmailMock: vi.fn(),
  getUserByIdMock: vi.fn(),
  findRecipientByUserIdMock: vi.fn(),
  findDonorByUserIdMock: vi.fn(),
  updateDonorMock: vi.fn(),
  hashPasswordMock: vi.fn(),
  revokeTokenMock: vi.fn(),
  getMySubscriptionStatusMock: vi.fn(),
}));

vi.mock('../../../src/modules/users/user.account.repository.js', () => ({
  updateUser: updateUserMock,
  findUserByEmail: findUserByEmailMock,
}));

vi.mock('../../../src/modules/users/user.account.service.js', () => ({
  getUserById: getUserByIdMock,
  duplicateEmailError: () => {
    const error: Error & { statusCode?: number } = new Error('This email is already registered.');
    error.statusCode = 409;
    return error;
  },
}));

vi.mock('../../../src/modules/users/recipient.repository.js', () => ({
  findRecipientByUserId: findRecipientByUserIdMock,
}));

vi.mock('../../../src/modules/users/donor.repository.js', () => ({
  findDonorByUserId: findDonorByUserIdMock,
  updateDonor: updateDonorMock,
}));

vi.mock('../../../src/modules/security/security.interface.js', () => ({
  securityInterface: {
    hashPassword: hashPasswordMock,
    revokeToken: revokeTokenMock,
  },
}));

vi.mock('../../../src/modules/subscriptions/subscription.interface.js', () => ({
  subscriptionInterface: {
    getMySubscriptionStatus: getMySubscriptionStatusMock,
  },
}));

import {
  getMyProfileDto,
  updateUserProfile,
  changePassword,
  changeEmail,
} from '../../../src/modules/users/user.profile.service.js';

describe('user.profile.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hashPasswordMock.mockResolvedValue('hashed-value');
    findUserByEmailMock.mockResolvedValue(null);
    getMySubscriptionStatusMock.mockResolvedValue({ tier: 'STANDARD', subscription: null });
  });

  describe('getMyProfileDto', () => {
    it('returns the Donor DTO for a DONOR', async () => {
      getUserByIdMock.mockResolvedValue({ _id: 'u1', role: 'DONOR', username: 'freshfoods' });
      findDonorByUserIdMock.mockResolvedValue({
        companyName: 'Fresh Foods Ltd',
        taxCode: '0123456789',
        addressText: '12 Trần Hưng Đạo',
        location: { latitude: 21, longitude: 105 },
      });

      const dto = await getMyProfileDto('u1');

      expect(findDonorByUserIdMock).toHaveBeenCalledWith('u1');
      expect(dto).toMatchObject({ companyName: 'Fresh Foods Ltd', taxCode: '0123456789' });
    });

    it('returns the Recipient DTO for a RECIPIENT, with tier derived from the subscription status (not recipient.tier)', async () => {
      getUserByIdMock.mockResolvedValue({ _id: 'u1', role: 'RECIPIENT', username: 'alice' });
      findRecipientByUserIdMock.mockResolvedValue({});
      getMySubscriptionStatusMock.mockResolvedValue({ tier: 'PREMIUM', subscription: null });

      const dto = await getMyProfileDto('u1');

      expect(findRecipientByUserIdMock).toHaveBeenCalledWith('u1');
      expect(getMySubscriptionStatusMock).toHaveBeenCalledWith('u1');
      expect(dto).toMatchObject({ tier: 'PREMIUM' });
    });

    it('derives STANDARD for a RECIPIENT with no active subscription', async () => {
      getUserByIdMock.mockResolvedValue({ _id: 'u1', role: 'RECIPIENT', username: 'alice' });
      findRecipientByUserIdMock.mockResolvedValue({});
      getMySubscriptionStatusMock.mockResolvedValue({ tier: 'STANDARD', subscription: null });

      const dto = await getMyProfileDto('u1');

      expect(dto).toMatchObject({ tier: 'STANDARD' });
    });

    it('returns the base DTO for an ADMIN', async () => {
      getUserByIdMock.mockResolvedValue({ _id: 'u1', role: 'ADMIN', username: 'admin' });

      const dto = await getMyProfileDto('u1');

      expect(findDonorByUserIdMock).not.toHaveBeenCalled();
      expect(findRecipientByUserIdMock).not.toHaveBeenCalled();
      expect(dto).not.toHaveProperty('tier');
      expect(dto).not.toHaveProperty('companyName');
    });
  });

  describe('updateUserProfile', () => {
    beforeEach(() => {
      getUserByIdMock.mockResolvedValue({ _id: 'u1', role: 'RECIPIENT', username: 'alice' });
      findRecipientByUserIdMock.mockResolvedValue({ tier: 'STANDARD' });
      findDonorByUserIdMock.mockResolvedValue({ companyName: 'Fresh Foods Ltd' });
    });

    it('applies base field changes via the user repository', async () => {
      await updateUserProfile('u1', 'RECIPIENT', { city: 'Da Nang' });

      expect(updateUserMock).toHaveBeenCalledWith('u1', { city: 'Da Nang' });
      expect(updateDonorMock).not.toHaveBeenCalled();
    });

    it('skips the user repository call when the patch has no base fields', async () => {
      getUserByIdMock.mockResolvedValue({ _id: 'u1', role: 'DONOR', username: 'freshfoods' });

      await updateUserProfile('u1', 'DONOR', { companyName: 'New Name Ltd' });

      expect(updateUserMock).not.toHaveBeenCalled();
      expect(updateDonorMock).toHaveBeenCalledWith('u1', {
        companyName: 'New Name Ltd',
        addressText: undefined,
        location: undefined,
      });
    });

    it('applies Donor field changes via the donor repository when the caller is a DONOR', async () => {
      getUserByIdMock.mockResolvedValue({ _id: 'u1', role: 'DONOR', username: 'freshfoods' });

      await updateUserProfile('u1', 'DONOR', {
        username: 'freshfoods_v2',
        companyName: 'New Name Ltd',
        addressText: '99 Lê Lợi',
        location: { latitude: 21, longitude: 105 },
      });

      expect(updateUserMock).toHaveBeenCalledWith('u1', { username: 'freshfoods_v2' });
      expect(updateDonorMock).toHaveBeenCalledWith('u1', {
        companyName: 'New Name Ltd',
        addressText: '99 Lê Lợi',
        location: { latitude: 21, longitude: 105 },
      });
    });

    it('rejects Donor-only fields with a 400 when the caller is not a DONOR', async () => {
      let caught;

      try {
        await updateUserProfile('u1', 'RECIPIENT', { companyName: 'Sneaky Ltd' });
      } catch (error) {
        caught = error;
      }

      expect(caught.statusCode).toBe(400);
      expect(caught.message).toBe('Only Donors can edit company profile fields.');
      expect(updateUserMock).not.toHaveBeenCalled();
      expect(updateDonorMock).not.toHaveBeenCalled();
    });

    it('returns the fresh authoritative profile DTO after applying the patch', async () => {
      const dto = await updateUserProfile('u1', 'RECIPIENT', { city: 'Da Nang' });

      expect(dto).toMatchObject({ tier: 'STANDARD' });
    });
  });

  describe('changePassword', () => {
    const auth = { jti: 'j1', expiresAt: new Date('2026-08-24T12:00:00.000Z') };

    it('hashes the new password and stores it via the user repository', async () => {
      await changePassword('u1', 'NewStr0ng!Pass', auth);

      expect(hashPasswordMock).toHaveBeenCalledWith('NewStr0ng!Pass');
      expect(updateUserMock).toHaveBeenCalledWith('u1', { passwordHash: 'hashed-value' });
    });

    it('revokes the presented token with reason PASSWORD_CHANGE via the security interface', async () => {
      await changePassword('u1', 'NewStr0ng!Pass', auth);

      expect(revokeTokenMock).toHaveBeenCalledWith({
        userId: 'u1',
        jti: 'j1',
        expiresAt: auth.expiresAt,
        reason: 'PASSWORD_CHANGE',
      });
    });

    it('propagates a failure from the revoke call', async () => {
      revokeTokenMock.mockRejectedValueOnce(new Error('connection lost'));

      await expect(changePassword('u1', 'NewStr0ng!Pass', auth)).rejects.toThrow('connection lost');
    });
  });

  describe('changeEmail', () => {
    beforeEach(() => {
      getUserByIdMock.mockResolvedValue({ _id: 'u1', role: 'RECIPIENT', username: 'alice' });
      findRecipientByUserIdMock.mockResolvedValue({ tier: 'STANDARD' });
    });

    it('updates the email and returns a fresh profile DTO', async () => {
      const dto = await changeEmail('u1', 'new@example.com');

      expect(updateUserMock).toHaveBeenCalledWith('u1', { email: 'new@example.com' });
      expect(dto).toMatchObject({ tier: 'STANDARD' });
    });

    it('throws a 409 when another account already has the email', async () => {
      findUserByEmailMock.mockResolvedValue({ _id: 'other-user' });
      let caught;

      try {
        await changeEmail('u1', 'taken@example.com');
      } catch (error) {
        caught = error;
      }

      expect(caught.statusCode).toBe(409);
      expect(updateUserMock).not.toHaveBeenCalled();
    });

    it('succeeds as a no-op when resubmitting the caller\'s own current email', async () => {
      findUserByEmailMock.mockResolvedValue({ _id: 'u1' });

      const dto = await changeEmail('u1', 'alice@example.com');

      expect(updateUserMock).toHaveBeenCalledWith('u1', { email: 'alice@example.com' });
      expect(dto).toMatchObject({ tier: 'STANDARD' });
    });

    it('converts a duplicate-key race into a 409', async () => {
      updateUserMock.mockRejectedValueOnce({ code: 11000 });
      let caught;

      try {
        await changeEmail('u1', 'new@example.com');
      } catch (error) {
        caught = error;
      }

      expect(caught.statusCode).toBe(409);
    });
  });
});
