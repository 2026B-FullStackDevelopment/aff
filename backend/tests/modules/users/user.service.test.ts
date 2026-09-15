import { describe, it, expect, vi, beforeEach } from 'vitest';

const {
  createUserMock,
  findUserByEmailMock,
  findUserByIdMock,
  searchActiveRecipientsByEmailMock,
  updateUserMock,
  updateAccountStatusMock,
  updateLoginStateMock,
  incrementFailedLoginInWindowMock,
  startFailedLoginWindowMock,
  lockAccountMock,
  deleteUserMock,
  findUsersForAdminMock,
  createRecipientMock,
  findRecipientByUserIdMock,
  createDonorMock,
  findDonorByUserIdMock,
  updateDonorMock,
  hashPasswordMock,
  revokeTokenMock,
  revokeAllTokensForUserMock,
  getMySubscriptionStatusMock,
  findRecipientByStripeCustomerIdMock,
  setRecipientTierIfChangedMock,
} = vi.hoisted(() => ({
  createUserMock: vi.fn(),
  findUserByEmailMock: vi.fn(),
  findUserByIdMock: vi.fn(),
  searchActiveRecipientsByEmailMock: vi.fn(),
  updateUserMock: vi.fn(),
  updateAccountStatusMock: vi.fn(),
  updateLoginStateMock: vi.fn(),
  incrementFailedLoginInWindowMock: vi.fn(),
  startFailedLoginWindowMock: vi.fn(),
  lockAccountMock: vi.fn(),
  deleteUserMock: vi.fn(),
  findUsersForAdminMock: vi.fn(),
  createRecipientMock: vi.fn(),
  findRecipientByUserIdMock: vi.fn(),
  createDonorMock: vi.fn(),
  findDonorByUserIdMock: vi.fn(),
  updateDonorMock: vi.fn(),
  hashPasswordMock: vi.fn(),
  revokeTokenMock: vi.fn(),
  revokeAllTokensForUserMock: vi.fn(),
  getMySubscriptionStatusMock: vi.fn(),
  findRecipientByStripeCustomerIdMock: vi.fn(),
  setRecipientTierIfChangedMock: vi.fn(),
}));

vi.mock('../../../src/modules/users/user.repository.js', () => ({
  createUser: createUserMock,
  findUserByEmail: findUserByEmailMock,
  findUserById: findUserByIdMock,
  searchActiveRecipientsByEmail: searchActiveRecipientsByEmailMock,
  updateUser: updateUserMock,
  updateAccountStatus: updateAccountStatusMock,
  updateLoginState: updateLoginStateMock,
  incrementFailedLoginInWindow: incrementFailedLoginInWindowMock,
  startFailedLoginWindow: startFailedLoginWindowMock,
  lockAccount: lockAccountMock,
  deleteUser: deleteUserMock,
  findUsersForAdmin: findUsersForAdminMock,
}));

vi.mock('../../../src/modules/users/recipient.repository.js', () => ({
  createRecipient: createRecipientMock,
  findRecipientByUserId: findRecipientByUserIdMock,
  findRecipientByStripeCustomerId: findRecipientByStripeCustomerIdMock,
  setRecipientTierIfChanged: setRecipientTierIfChangedMock,
}));

vi.mock('../../../src/modules/subscriptions/subscription.interface.js', () => ({
  subscriptionInterface: {
    getMySubscriptionStatus: getMySubscriptionStatusMock,
  },
}));

vi.mock('../../../src/modules/users/donor.repository.js', () => ({
  createDonor: createDonorMock,
  findDonorByUserId: findDonorByUserIdMock,
  updateDonor: updateDonorMock,
}));

vi.mock('../../../src/modules/security/security.interface.js', () => ({
  securityInterface: {
    hashPassword: hashPasswordMock,
    revokeToken: revokeTokenMock,
    revokeAllTokensForUser: revokeAllTokensForUserMock,
  },
}));

import {
  createUser,
  getUserById,
  deleteUser,
  updateLoginState,
  recordFailedLogin,
  lockAccount,
  createRecipientProfile,
  createDonorProfile,
  getMyProfileDto,
  updateUserProfile,
  changePassword,
  changeEmail,
  searchRecipientsByEmail,
  findRecipientByStripeCustomerId,
  setRecipientTier,
  listUsersForAdmin,
  updateAccountStatusForAdmin,
} from '../../../src/modules/users/user.service.js';

const payload = {
  username: 'alice',
  email: 'alice@example.com',
  password: 'Str0ng!Pass',
  role: 'RECIPIENT' as const,
  city: 'Hà Nội',
};

describe('user.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hashPasswordMock.mockResolvedValue('hashed-value');
    findUserByEmailMock.mockResolvedValue(null);
    createUserMock.mockResolvedValue({ _id: 'u1' });
    getMySubscriptionStatusMock.mockResolvedValue({ tier: 'STANDARD', subscription: null });
  });

  describe('searchRecipientsByEmail', () => {
    it('normalizes a useful email prefix and limits results to ten', async () => {
      searchActiveRecipientsByEmailMock.mockResolvedValue([
        { _id: 'r1', email: 'recipient@example.com' },
      ]);

      const result = await searchRecipientsByEmail('  RECIPIENT@  ');

      expect(searchActiveRecipientsByEmailMock).toHaveBeenCalledWith(
        'recipient@',
        10,
      );
      expect(result).toHaveLength(1);
    });

    it('does not query the database for fewer than three characters', async () => {
      await expect(searchRecipientsByEmail('re')).resolves.toEqual([]);
      expect(searchActiveRecipientsByEmailMock).not.toHaveBeenCalled();
    });
  });

  describe('listUsersForAdmin', () => {
    it('maps a mixed account page to role-appropriate response DTOs', async () => {
      const createdAt = new Date('2026-09-13T00:00:00.000Z');
      findUsersForAdminMock.mockResolvedValue({
        page: 1,
        limit: 20,
        total: 2,
        items: [
          {
            _id: 'admin-1',
            username: 'admin',
            email: 'admin@aff.com',
            role: 'ADMIN',
            status: 'ACTIVE',
            avatarUrl: null,
            createdAt,
          },
          {
            _id: 'courier-1',
            username: 'courier_01',
            email: 'courier@aff.com',
            role: 'COURIER',
            status: 'ACTIVE',
            avatarUrl: null,
            createdAt,
            courierProfile: { fullName: 'Nguyen Van A' },
          },
        ],
      });

      const result = await listUsersForAdmin({ page: 1, limit: 20 });

      expect(findUsersForAdminMock).toHaveBeenCalledWith({ page: 1, limit: 20 });
      expect(result).toMatchObject({
        page: 1,
        limit: 20,
        total: 2,
        items: [
          { id: 'admin-1', role: 'ADMIN', username: 'admin' },
          { id: 'courier-1', role: 'COURIER', fullName: 'Nguyen Van A' },
        ],
      });
    });
  });

  describe('updateAccountStatusForAdmin', () => {
    it('revokes every recorded session when an account is deactivated', async () => {
      updateAccountStatusMock.mockResolvedValue({
        _id: 'u1',
        username: 'alice',
        email: 'alice@example.com',
        role: 'RECIPIENT',
        status: 'DEACTIVATED',
        avatarUrl: null,
        createdAt: new Date('2026-09-15T00:00:00.000Z'),
      });

      const result = await updateAccountStatusForAdmin('u1', 'DEACTIVATED');

      expect(updateAccountStatusMock).toHaveBeenCalledWith('u1', 'DEACTIVATED');
      expect(revokeAllTokensForUserMock).toHaveBeenCalledWith(
        'u1',
        'ADMIN_DEACTIVATE',
      );
      expect(result).toMatchObject({ id: 'u1', status: 'DEACTIVATED' });
    });

    it('does not restore or revoke old sessions when an account is reactivated', async () => {
      updateAccountStatusMock.mockResolvedValue({
        _id: 'u1',
        username: 'alice',
        email: 'alice@example.com',
        role: 'RECIPIENT',
        status: 'ACTIVE',
        avatarUrl: null,
        createdAt: new Date('2026-09-15T00:00:00.000Z'),
      });

      await updateAccountStatusForAdmin('u1', 'ACTIVE');

      expect(revokeAllTokensForUserMock).not.toHaveBeenCalled();
    });

    it('throws 404 when the account no longer exists', async () => {
      updateAccountStatusMock.mockResolvedValue(null);

      await expect(updateAccountStatusForAdmin('missing', 'ACTIVE')).rejects.toMatchObject({
        message: 'User not found.',
        statusCode: 404,
      });
      expect(revokeAllTokensForUserMock).not.toHaveBeenCalled();
    });
  });

  describe('createUser', () => {
    it('stores a hash and never the plaintext password', async () => {
      await createUser(payload);

      const persisted = createUserMock.mock.calls[0][0];

      expect(hashPasswordMock).toHaveBeenCalledWith('Str0ng!Pass');
      expect(persisted.passwordHash).toBe('hashed-value');
      expect(persisted).not.toHaveProperty('password');
    });

    it('defaults country to Vietnam', async () => {
      await createUser(payload);

      expect(createUserMock.mock.calls[0][0].country).toBe('Vietnam');
    });

    it('throws a 409 when the email is already registered', async () => {
      findUserByEmailMock.mockResolvedValue({ _id: 'existing' });
      let caught;

      try {
        await createUser(payload);
      } catch (error) {
        caught = error;
      }

      expect(caught.message).toBe('This email is already registered.');
      expect(caught.statusCode).toBe(409);
      expect(createUserMock).not.toHaveBeenCalled();
    });

    it('converts a duplicate-key race into a 409', async () => {
      createUserMock.mockRejectedValue({ code: 11000 });
      let caught;

      try {
        await createUser(payload);
      } catch (error) {
        caught = error;
      }

      expect(caught.statusCode).toBe(409);
    });
  });

  describe('getUserById', () => {
    it('throws a 404 when the user does not exist', async () => {
      findUserByIdMock.mockResolvedValue(null);
      let caught;

      try {
        await getUserById('missing');
      } catch (error) {
        caught = error;
      }

      expect(caught.statusCode).toBe(404);
    });

    it('returns the user when it exists', async () => {
      findUserByIdMock.mockResolvedValue({ _id: 'u1' });

      await expect(getUserById('u1')).resolves.toEqual({ _id: 'u1' });
    });
  });

  it('deleteUser delegates to the repository', async () => {
    await deleteUser('u1');

    expect(deleteUserMock).toHaveBeenCalledWith('u1');
  });

  it('updateLoginState delegates to the repository', async () => {
    const state = { failedLoginCount: 1, windowStartedAt: new Date(), lockedUntil: null };

    await updateLoginState('u1', state);

    expect(updateLoginStateMock).toHaveBeenCalledWith('u1', state);
  });

  describe('recordFailedLogin', () => {
    it('returns the count from an in-window increment without starting a new window', async () => {
      const windowStartedAfter = new Date('2026-08-11T09:59:00.000Z');
      const now = new Date('2026-08-11T10:00:00.000Z');
      incrementFailedLoginInWindowMock.mockResolvedValue({ failedLoginCount: 3 });

      const count = await recordFailedLogin('u1', windowStartedAfter, now);

      expect(count).toBe(3);
      expect(incrementFailedLoginInWindowMock).toHaveBeenCalledWith('u1', windowStartedAfter);
      expect(startFailedLoginWindowMock).not.toHaveBeenCalled();
    });

    it('falls back to starting a fresh window when the increment finds no live window', async () => {
      const windowStartedAfter = new Date('2026-08-11T09:59:00.000Z');
      const now = new Date('2026-08-11T10:00:00.000Z');
      incrementFailedLoginInWindowMock.mockResolvedValue(null);
      startFailedLoginWindowMock.mockResolvedValue({ failedLoginCount: 1 });

      const count = await recordFailedLogin('u1', windowStartedAfter, now);

      expect(count).toBe(1);
      expect(startFailedLoginWindowMock).toHaveBeenCalledWith('u1', now);
    });
  });

  it('lockAccount delegates to the repository', async () => {
    const lockedUntil = new Date('2026-08-11T10:05:00.000Z');

    await lockAccount('u1', lockedUntil);

    expect(lockAccountMock).toHaveBeenCalledWith('u1', lockedUntil);
  });

  it('createRecipientProfile delegates to the recipient repository', async () => {
    createRecipientMock.mockResolvedValue({ userId: 'u1' });

    await createRecipientProfile('u1');

    expect(createRecipientMock).toHaveBeenCalledWith({ userId: 'u1' });
  });

  it('findRecipientByStripeCustomerId delegates to the recipient repository', async () => {
    findRecipientByStripeCustomerIdMock.mockResolvedValue({ userId: 'u1', stripeCustomerId: 'cus_123' });

    const result = await findRecipientByStripeCustomerId('cus_123');

    expect(findRecipientByStripeCustomerIdMock).toHaveBeenCalledWith('cus_123');
    expect(result).toEqual({ userId: 'u1', stripeCustomerId: 'cus_123' });
  });

  it('setRecipientTier delegates to the change-guarded repository setter', async () => {
    setRecipientTierIfChangedMock.mockResolvedValue({ matchedCount: 1, modifiedCount: 1 });

    await setRecipientTier('u1', 'PREMIUM');

    expect(setRecipientTierIfChangedMock).toHaveBeenCalledWith('u1', 'PREMIUM');
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

  describe('getMyProfileDto', () => {
    it('returns the Donor DTO for a DONOR', async () => {
      findUserByIdMock.mockResolvedValue({ _id: 'u1', role: 'DONOR', username: 'freshfoods' });
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
      findUserByIdMock.mockResolvedValue({ _id: 'u1', role: 'RECIPIENT', username: 'alice' });
      findRecipientByUserIdMock.mockResolvedValue({});
      getMySubscriptionStatusMock.mockResolvedValue({ tier: 'PREMIUM', subscription: null });

      const dto = await getMyProfileDto('u1');

      expect(findRecipientByUserIdMock).toHaveBeenCalledWith('u1');
      expect(getMySubscriptionStatusMock).toHaveBeenCalledWith('u1');
      expect(dto).toMatchObject({ tier: 'PREMIUM' });
    });

    it('derives STANDARD for a RECIPIENT with no active subscription', async () => {
      findUserByIdMock.mockResolvedValue({ _id: 'u1', role: 'RECIPIENT', username: 'alice' });
      findRecipientByUserIdMock.mockResolvedValue({});
      getMySubscriptionStatusMock.mockResolvedValue({ tier: 'STANDARD', subscription: null });

      const dto = await getMyProfileDto('u1');

      expect(dto).toMatchObject({ tier: 'STANDARD' });
    });

    it('returns the base DTO for an ADMIN', async () => {
      findUserByIdMock.mockResolvedValue({ _id: 'u1', role: 'ADMIN', username: 'admin' });

      const dto = await getMyProfileDto('u1');

      expect(findDonorByUserIdMock).not.toHaveBeenCalled();
      expect(findRecipientByUserIdMock).not.toHaveBeenCalled();
      expect(dto).not.toHaveProperty('tier');
      expect(dto).not.toHaveProperty('companyName');
    });
  });

  describe('updateUserProfile', () => {
    beforeEach(() => {
      findUserByIdMock.mockResolvedValue({ _id: 'u1', role: 'RECIPIENT', username: 'alice' });
      findRecipientByUserIdMock.mockResolvedValue({ tier: 'STANDARD' });
      findDonorByUserIdMock.mockResolvedValue({ companyName: 'Fresh Foods Ltd' });
    });

    it('applies base field changes via the user repository', async () => {
      await updateUserProfile('u1', 'RECIPIENT', { city: 'Da Nang' });

      expect(updateUserMock).toHaveBeenCalledWith('u1', { city: 'Da Nang' });
      expect(updateDonorMock).not.toHaveBeenCalled();
    });

    it('skips the user repository call when the patch has no base fields', async () => {
      findUserByIdMock.mockResolvedValue({ _id: 'u1', role: 'DONOR', username: 'freshfoods' });

      await updateUserProfile('u1', 'DONOR', { companyName: 'New Name Ltd' });

      expect(updateUserMock).not.toHaveBeenCalled();
      expect(updateDonorMock).toHaveBeenCalledWith('u1', {
        companyName: 'New Name Ltd',
        addressText: undefined,
        location: undefined,
      });
    });

    it('applies Donor field changes via the donor repository when the caller is a DONOR', async () => {
      findUserByIdMock.mockResolvedValue({ _id: 'u1', role: 'DONOR', username: 'freshfoods' });

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
      findUserByIdMock.mockResolvedValue({ _id: 'u1', role: 'RECIPIENT', username: 'alice' });
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
