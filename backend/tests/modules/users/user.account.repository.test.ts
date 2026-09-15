import { describe, it, expect, vi, beforeEach } from 'vitest';

const {
  createMock,
  findOneMock,
  findByIdMock,
  findByIdAndUpdateMock,
  findOneAndUpdateMock,
  updateOneMock,
  deleteOneMock,
  leanMock,
} = vi.hoisted(() => {
  const leanMock = vi.fn();
  return {
    createMock: vi.fn(),
    findOneMock: vi.fn(() => ({ lean: leanMock })),
    findByIdMock: vi.fn(() => ({ lean: leanMock })),
    findByIdAndUpdateMock: vi.fn(() => ({ lean: leanMock })),
    findOneAndUpdateMock: vi.fn(() => ({ lean: leanMock })),
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
    findOneAndUpdate: findOneAndUpdateMock,
    updateOne: updateOneMock,
    deleteOne: deleteOneMock,
  },
}));

import {
  createUser,
  findUserByEmail,
  findUserById,
  updateUser,
  updateAccountStatus,
  updateLoginState,
  incrementFailedLoginInWindow,
  startFailedLoginWindow,
  lockAccount,
  deleteUser,
} from '../../../src/modules/users/user.account.repository.js';

describe('user.account.repository', () => {
  beforeEach(() => {
    createMock.mockClear();
    findOneMock.mockClear();
    findByIdMock.mockClear();
    findByIdAndUpdateMock.mockClear();
    findOneAndUpdateMock.mockClear();
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

  it('updateUser accepts avatarUrl even though it is not part of CreateUserInput', async () => {
    await updateUser('u1', { avatarUrl: 'https://cdn.example.com/avatars/u1.png' });

    expect(findByIdAndUpdateMock).toHaveBeenCalledWith(
      'u1',
      { avatarUrl: 'https://cdn.example.com/avatars/u1.png' },
      { new: true }
    );
  });

  it('updateAccountStatus updates only status and runs model validators', async () => {
    await updateAccountStatus('u1', 'DEACTIVATED');

    expect(findByIdAndUpdateMock).toHaveBeenCalledWith(
      'u1',
      { $set: { status: 'DEACTIVATED' } },
      { new: true, runValidators: true },
    );
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

  it('incrementFailedLoginInWindow uses $inc and filters on a live window', async () => {
    const windowStartedAfter = new Date('2026-08-11T09:59:00.000Z');

    await incrementFailedLoginInWindow('u1', windowStartedAfter);

    expect(findOneAndUpdateMock).toHaveBeenCalledWith(
      { _id: 'u1', windowStartedAt: { $gt: windowStartedAfter } },
      { $inc: { failedLoginCount: 1 } },
      { new: true }
    );
    expect(leanMock).toHaveBeenCalled();
  });

  it('startFailedLoginWindow sets the counter to 1 and stamps the window start', async () => {
    const now = new Date('2026-08-11T10:00:00.000Z');

    await startFailedLoginWindow('u1', now);

    expect(findOneAndUpdateMock).toHaveBeenCalledWith(
      { _id: 'u1' },
      { $set: { failedLoginCount: 1, windowStartedAt: now } },
      { new: true }
    );
    expect(leanMock).toHaveBeenCalled();
  });

  it('lockAccount resets the counter and window while setting lockedUntil', async () => {
    const lockedUntil = new Date('2026-08-11T10:05:00.000Z');

    await lockAccount('u1', lockedUntil);

    expect(updateOneMock).toHaveBeenCalledWith(
      { _id: 'u1' },
      { $set: { failedLoginCount: 0, windowStartedAt: null, lockedUntil } }
    );
  });

  it('deleteUser removes the user by id', async () => {
    await deleteUser('u1');

    expect(deleteOneMock).toHaveBeenCalledWith({ _id: 'u1' });
  });
});
