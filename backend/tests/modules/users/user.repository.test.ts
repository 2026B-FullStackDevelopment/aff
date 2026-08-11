import { describe, it, expect, vi, beforeEach } from 'vitest';

const { createMock, findOneMock, findByIdMock, findByIdAndUpdateMock, updateOneMock, deleteOneMock, leanMock } =
  vi.hoisted(() => {
    const leanMock = vi.fn();
    return {
      createMock: vi.fn(),
      findOneMock: vi.fn(() => ({ lean: leanMock })),
      findByIdMock: vi.fn(() => ({ lean: leanMock })),
      findByIdAndUpdateMock: vi.fn(() => ({ lean: leanMock })),
      updateOneMock: vi.fn(),
      deleteOneMock: vi.fn(),
      leanMock,
    };
  });

vi.mock('../../../src/modules/users/user.model.js', () => ({
  default: {
    create: createMock,
    findOne: findOneMock,
    findById: findByIdMock,
    findByIdAndUpdate: findByIdAndUpdateMock,
    updateOne: updateOneMock,
    deleteOne: deleteOneMock,
  },
}));

import {
  createUser,
  findUserByEmail,
  findUserById,
  updateUser,
  updateLoginState,
  deleteUser,
} from '../../../src/modules/users/user.repository.js';

describe('user.repository', () => {
  beforeEach(() => {
    createMock.mockClear();
    findOneMock.mockClear();
    findByIdMock.mockClear();
    findByIdAndUpdateMock.mockClear();
    updateOneMock.mockClear();
    deleteOneMock.mockClear();
    leanMock.mockClear();
    leanMock.mockResolvedValue({ _id: 'u1' });
  });

  it('createUser calls User.create with the given data', async () => {
    createMock.mockResolvedValue({ _id: 'u1', username: 'alice' });

    const result = await createUser({
      username: 'alice',
      email: 'alice@example.com',
      passwordHash: 'hash',
      role: 'RECIPIENT',
    });

    expect(createMock).toHaveBeenCalledWith({
      username: 'alice',
      email: 'alice@example.com',
      passwordHash: 'hash',
      role: 'RECIPIENT',
    });
    expect(result).toEqual({ _id: 'u1', username: 'alice' });
  });

  it('findUserByEmail queries by email and returns a lean document', async () => {
    await findUserByEmail('alice@example.com');

    expect(findOneMock).toHaveBeenCalledWith({ email: 'alice@example.com' });
    expect(leanMock).toHaveBeenCalled();
  });

  it('findUserById queries by id and returns a lean document', async () => {
    await findUserById('u1');

    expect(findByIdMock).toHaveBeenCalledWith('u1');
    expect(leanMock).toHaveBeenCalled();
  });

  it('updateUser updates by id and returns the new lean document', async () => {
    await updateUser('u1', { city: 'Paris' });

    expect(findByIdAndUpdateMock).toHaveBeenCalledWith('u1', { city: 'Paris' }, { new: true });
    expect(leanMock).toHaveBeenCalled();
  });

  it('updateLoginState writes the three lockout columns', async () => {
    const windowStartedAt = new Date('2026-08-11T10:00:00.000Z');
    const lockedUntil = new Date('2026-08-11T10:05:00.000Z');

    await updateLoginState('u1', { failedLoginCount: 3, windowStartedAt, lockedUntil });

    expect(updateOneMock).toHaveBeenCalledWith(
      { _id: 'u1' },
      { failedLoginCount: 3, windowStartedAt, lockedUntil }
    );
  });

  it('deleteUser removes the user by id', async () => {
    await deleteUser('u1');

    expect(deleteOneMock).toHaveBeenCalledWith({ _id: 'u1' });
  });
});
