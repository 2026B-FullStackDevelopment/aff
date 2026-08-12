import { describe, it, expect, vi, beforeEach } from 'vitest';

const {
  createUserMock,
  findUserByEmailMock,
  findUserByIdMock,
  updateLoginStateMock,
  incrementFailedLoginInWindowMock,
  startFailedLoginWindowMock,
  lockAccountMock,
  deleteUserMock,
  createRecipientMock,
  createDonorMock,
  hashPasswordMock,
} = vi.hoisted(() => ({
  createUserMock: vi.fn(),
  findUserByEmailMock: vi.fn(),
  findUserByIdMock: vi.fn(),
  updateLoginStateMock: vi.fn(),
  incrementFailedLoginInWindowMock: vi.fn(),
  startFailedLoginWindowMock: vi.fn(),
  lockAccountMock: vi.fn(),
  deleteUserMock: vi.fn(),
  createRecipientMock: vi.fn(),
  createDonorMock: vi.fn(),
  hashPasswordMock: vi.fn(),
}));

vi.mock('../../../src/modules/users/user.repository.js', () => ({
  createUser: createUserMock,
  findUserByEmail: findUserByEmailMock,
  findUserById: findUserByIdMock,
  updateLoginState: updateLoginStateMock,
  incrementFailedLoginInWindow: incrementFailedLoginInWindowMock,
  startFailedLoginWindow: startFailedLoginWindowMock,
  lockAccount: lockAccountMock,
  deleteUser: deleteUserMock,
}));

vi.mock('../../../src/modules/users/recipient.repository.js', () => ({
  createRecipient: createRecipientMock,
}));

vi.mock('../../../src/modules/users/donor.repository.js', () => ({
  createDonor: createDonorMock,
}));

vi.mock('../../../src/shared/security/password.js', () => ({
  hashPassword: hashPasswordMock,
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
});
