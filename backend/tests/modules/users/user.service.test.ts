import { describe, it, expect, vi, beforeEach } from 'vitest';

const { createUserMock, findUserByEmailMock, findUserByIdMock } = vi.hoisted(() => ({
  createUserMock: vi.fn(),
  findUserByEmailMock: vi.fn(),
  findUserByIdMock: vi.fn(),
}));

vi.mock('../../../src/modules/users/user.repository.js', () => ({
  createUser: createUserMock,
  findUserByEmail: findUserByEmailMock,
  findUserById: findUserByIdMock,
}));

import { createUser, findUserByEmail, getUserById } from '../../../src/modules/users/user.service.js';

describe('user.service', () => {
  beforeEach(() => {
    createUserMock.mockClear();
    findUserByEmailMock.mockClear();
    findUserByIdMock.mockClear();
  });

  describe('createUser', () => {
    it('maps payload fields, with a hashing fallback and default role', async () => {
      createUserMock.mockResolvedValue({ _id: 'u1' });

      await createUser({ username: 'alice', email: 'alice@example.com' });

      expect(createUserMock).toHaveBeenCalledWith({
        username: 'alice',
        email: 'alice@example.com',
        passwordHash: 'replace-with-hash',
        role: 'RECIPIENT',
        country: undefined,
        city: undefined,
      });
    });

    it('passes through password, role, country, and city when provided', async () => {
      createUserMock.mockResolvedValue({ _id: 'u1' });

      await createUser({
        username: 'bob',
        email: 'bob@example.com',
        password: 'hashed-value',
        role: 'DONOR',
        country: 'VN',
        city: 'Hanoi',
      });

      expect(createUserMock).toHaveBeenCalledWith({
        username: 'bob',
        email: 'bob@example.com',
        passwordHash: 'hashed-value',
        role: 'DONOR',
        country: 'VN',
        city: 'Hanoi',
      });
    });
  });

  describe('findUserByEmail', () => {
    it('delegates to the repository', async () => {
      findUserByEmailMock.mockResolvedValue({ _id: 'u1' });

      const result = await findUserByEmail('alice@example.com');

      expect(findUserByEmailMock).toHaveBeenCalledWith('alice@example.com');
      expect(result).toEqual({ _id: 'u1' });
    });
  });

  describe('getUserById', () => {
    it('returns the user when found', async () => {
      findUserByIdMock.mockResolvedValue({ _id: 'u1' });

      const result = await getUserById('u1');

      expect(result).toEqual({ _id: 'u1' });
    });

    it('throws a 404 error when the user is not found', async () => {
      findUserByIdMock.mockResolvedValue(null);

      await expect(getUserById('missing')).rejects.toThrow('User not found.');
    });

    it('sets statusCode 404 on the thrown error', async () => {
      findUserByIdMock.mockResolvedValue(null);
      let caught;

      try {
        await getUserById('missing');
      } catch (error) {
        caught = error;
      }

      expect(caught.statusCode).toBe(404);
    });
  });
});
