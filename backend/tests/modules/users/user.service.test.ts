import { describe, it, expect, vi, beforeEach } from 'vitest';

const {
  createUserMock,
  findUserByEmailMock,
  findUserByIdMock,
  updateLoginStateMock,
  deleteUserMock,
  createRecipientMock,
  createDonorMock,
  hashPasswordMock,
} = vi.hoisted(() => ({
  createUserMock: vi.fn(),
  findUserByEmailMock: vi.fn(),
  findUserByIdMock: vi.fn(),
  updateLoginStateMock: vi.fn(),
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
