import { describe, it, expect, vi, beforeEach } from 'vitest';

const { createUserMock, findUserByEmailMock } = vi.hoisted(() => ({
  createUserMock: vi.fn(),
  findUserByEmailMock: vi.fn(),
}));

vi.mock('../../../src/modules/users/user.interface.js', () => ({
  userInterface: {
    createUser: createUserMock,
    findUserByEmail: findUserByEmailMock,
  },
}));

import { register, login, verifyAccessToken } from '../../../src/modules/auth/auth.service.js';

describe('auth.service', () => {
  beforeEach(() => {
    createUserMock.mockClear();
    findUserByEmailMock.mockClear();
  });

  describe('register', () => {
    it('creates the user and builds a session', async () => {
      createUserMock.mockResolvedValue({ _id: 'u1' });

      const session = await register({
        username: 'alice',
        email: 'alice@example.com',
        password: 'secret',
        role: 'RECIPIENT',
      });

      expect(createUserMock).toHaveBeenCalledWith({
        username: 'alice',
        email: 'alice@example.com',
        password: 'secret',
        role: 'RECIPIENT',
      });
      expect(session).toEqual({
        accessToken: 'demo-token-for-u1',
        user: { _id: 'u1' },
      });
    });
  });

  describe('login', () => {
    it('finds the user by email and builds a session', async () => {
      findUserByEmailMock.mockResolvedValue({ _id: 'u1' });

      const session = await login({ email: 'alice@example.com', password: 'secret' });

      expect(findUserByEmailMock).toHaveBeenCalledWith('alice@example.com');
      expect(session).toEqual({
        accessToken: 'demo-token-for-u1',
        user: { _id: 'u1' },
      });
    });

    it('throws a 401 error when no user matches the email', async () => {
      findUserByEmailMock.mockResolvedValue(null);

      await expect(login({ email: 'nobody@example.com', password: 'secret' })).rejects.toThrow(
        'Invalid email or password.'
      );
    });

    it('sets statusCode 401 on the thrown error', async () => {
      findUserByEmailMock.mockResolvedValue(null);
      let caught;

      try {
        await login({ email: 'nobody@example.com', password: 'secret' });
      } catch (error) {
        caught = error;
      }

      expect(caught.statusCode).toBe(401);
    });
  });

  describe('verifyAccessToken', () => {
    it('returns a placeholder userId/role for a given token', async () => {
      const result = await verifyAccessToken('some-token');

      expect(result).toEqual({ userId: 'some-token', role: 'RECIPIENT' });
    });

    it('falls back to a demo userId when no token is given', async () => {
      const result = await verifyAccessToken('');

      expect(result).toEqual({ userId: 'demo-user-id', role: 'RECIPIENT' });
    });
  });
});
