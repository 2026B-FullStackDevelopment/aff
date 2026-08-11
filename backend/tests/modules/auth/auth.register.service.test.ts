import { describe, it, expect, vi, beforeEach } from 'vitest';

const {
  createUserMock,
  createRecipientProfileMock,
  createDonorProfileMock,
  deleteUserMock,
  issueSessionMock,
} = vi.hoisted(() => ({
  createUserMock: vi.fn(),
  createRecipientProfileMock: vi.fn(),
  createDonorProfileMock: vi.fn(),
  deleteUserMock: vi.fn(),
  issueSessionMock: vi.fn(),
}));

vi.mock('../../../src/modules/users/user.interface.js', () => ({
  userInterface: {
    createUser: createUserMock,
    createRecipientProfile: createRecipientProfileMock,
    createDonorProfile: createDonorProfileMock,
    deleteUser: deleteUserMock,
  },
}));

vi.mock('../../../src/modules/auth/auth.token.service.js', () => ({
  issueSession: issueSessionMock,
}));

import {
  registerRecipient,
  registerDonor,
} from '../../../src/modules/auth/auth.register.service.js';

const recipientPayload = {
  username: 'john_doe',
  email: 'john@example.com',
  password: 'Str0ng!Pass',
  city: 'Hà Nội',
};

const donorPayload = {
  companyName: 'Fresh Foods Ltd',
  email: 'donor@example.com',
  password: 'Str0ng!Pass',
  taxCode: '0123456789',
  city: 'Hà Nội',
  addressText: '12 Trần Hưng Đạo',
  location: { latitude: 21.0278, longitude: 105.8342 },
};

describe('auth.register.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createUserMock.mockResolvedValue({ _id: 'u1', role: 'RECIPIENT' });
    createRecipientProfileMock.mockResolvedValue({ userId: 'u1', tier: 'STANDARD' });
    createDonorProfileMock.mockResolvedValue({ userId: 'u1', companyName: 'Fresh Foods Ltd' });
    issueSessionMock.mockReturnValue({ accessToken: 't1', jti: 'j1', user: { _id: 'u1' } });
  });

  describe('registerRecipient', () => {
    it('creates an ACTIVE RECIPIENT user from the payload', async () => {
      await registerRecipient(recipientPayload);

      expect(createUserMock).toHaveBeenCalledWith({
        username: 'john_doe',
        email: 'john@example.com',
        password: 'Str0ng!Pass',
        role: 'RECIPIENT',
        city: 'Hà Nội',
      });
    });

    it('creates the recipient profile for the new user', async () => {
      await registerRecipient(recipientPayload);

      expect(createRecipientProfileMock).toHaveBeenCalledWith('u1');
    });

    it('returns the session and the recipient profile', async () => {
      const result = await registerRecipient(recipientPayload);

      expect(result.session.accessToken).toBe('t1');
      expect(result.recipient).toEqual({ userId: 'u1', tier: 'STANDARD' });
    });

    it('issues the session only after the profile exists', async () => {
      const order = [];
      createRecipientProfileMock.mockImplementation(async () => {
        order.push('profile');
        return { userId: 'u1' };
      });
      issueSessionMock.mockImplementation(() => {
        order.push('session');
        return { accessToken: 't1' };
      });

      await registerRecipient(recipientPayload);

      expect(order).toEqual(['profile', 'session']);
    });

    it('deletes the user and rethrows when profile creation fails', async () => {
      createRecipientProfileMock.mockRejectedValue(new Error('profile write failed'));

      await expect(registerRecipient(recipientPayload)).rejects.toThrow('profile write failed');
      expect(deleteUserMock).toHaveBeenCalledWith('u1');
    });

    it('propagates the 409 from a duplicate email without touching profiles', async () => {
      const conflict: Error = new Error('This email is already registered.');
      conflict.statusCode = 409;
      createUserMock.mockRejectedValue(conflict);
      let caught;

      try {
        await registerRecipient(recipientPayload);
      } catch (error) {
        caught = error;
      }

      expect(caught.statusCode).toBe(409);
      expect(createRecipientProfileMock).not.toHaveBeenCalled();
      expect(deleteUserMock).not.toHaveBeenCalled();
    });
  });

  describe('registerDonor', () => {
    beforeEach(() => {
      createUserMock.mockResolvedValue({ _id: 'u1', role: 'DONOR' });
    });

    it('creates a DONOR user using the company name as the username', async () => {
      await registerDonor(donorPayload);

      expect(createUserMock).toHaveBeenCalledWith({
        username: 'Fresh Foods Ltd',
        email: 'donor@example.com',
        password: 'Str0ng!Pass',
        role: 'DONOR',
        city: 'Hà Nội',
      });
    });

    it('creates the donor profile with the company details and coordinates', async () => {
      await registerDonor(donorPayload);

      expect(createDonorProfileMock).toHaveBeenCalledWith({
        userId: 'u1',
        companyName: 'Fresh Foods Ltd',
        taxCode: '0123456789',
        addressText: '12 Trần Hưng Đạo',
        location: { latitude: 21.0278, longitude: 105.8342 },
      });
    });

    it('returns the session and the donor profile', async () => {
      const result = await registerDonor(donorPayload);

      expect(result.session.accessToken).toBe('t1');
      expect(result.donor.companyName).toBe('Fresh Foods Ltd');
    });

    it('deletes the user and rethrows when donor profile creation fails', async () => {
      createDonorProfileMock.mockRejectedValue(new Error('profile write failed'));

      await expect(registerDonor(donorPayload)).rejects.toThrow('profile write failed');
      expect(deleteUserMock).toHaveBeenCalledWith('u1');
    });
  });
});
