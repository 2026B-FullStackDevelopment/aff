import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const {
  findUserByEmailMock,
  updateLoginStateMock,
  verifyPasswordMock,
  dummyCompareMock,
  issueSessionMock,
} = vi.hoisted(() => ({
  findUserByEmailMock: vi.fn(),
  updateLoginStateMock: vi.fn(),
  verifyPasswordMock: vi.fn(),
  dummyCompareMock: vi.fn(),
  issueSessionMock: vi.fn(),
}));

vi.mock('../../../src/modules/users/user.interface.js', () => ({
  userInterface: {
    findUserByEmail: findUserByEmailMock,
    updateLoginState: updateLoginStateMock,
  },
}));

vi.mock('../../../src/shared/security/password.js', () => ({
  verifyPassword: verifyPasswordMock,
  dummyCompare: dummyCompareMock,
}));

vi.mock('../../../src/modules/auth/auth.token.service.js', () => ({
  issueSession: issueSessionMock,
}));

import { login } from '../../../src/modules/auth/auth.login.service.js';

const NOW = new Date('2026-08-11T10:00:00.000Z');
const credentials = { email: 'john@example.com', password: 'Str0ng!Pass' };
const GENERIC = 'Invalid email or password.';

function activeUser(overrides = {}) {
  return {
    _id: 'u1',
    email: 'john@example.com',
    role: 'RECIPIENT',
    status: 'ACTIVE',
    passwordHash: 'hash',
    failedLoginCount: 0,
    windowStartedAt: null,
    lockedUntil: null,
    ...overrides,
  };
}

async function captureError(promise) {
  try {
    await promise;
  } catch (error) {
    return error;
  }
  throw new Error('Expected the promise to reject, but it resolved.');
}

describe('auth.login.service', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    vi.clearAllMocks();
    findUserByEmailMock.mockResolvedValue(activeUser());
    verifyPasswordMock.mockResolvedValue(true);
    updateLoginStateMock.mockResolvedValue(undefined);
    issueSessionMock.mockReturnValue({ accessToken: 't1', jti: 'j1', user: { _id: 'u1' } });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('success', () => {
    it('returns the session for correct credentials', async () => {
      await expect(login(credentials)).resolves.toEqual({
        accessToken: 't1',
        jti: 'j1',
        user: { _id: 'u1' },
      });
    });

    it('resets the lockout counters', async () => {
      findUserByEmailMock.mockResolvedValue(
        activeUser({ failedLoginCount: 3, windowStartedAt: NOW })
      );

      await login(credentials);

      expect(updateLoginStateMock).toHaveBeenCalledWith('u1', {
        failedLoginCount: 0,
        windowStartedAt: null,
        lockedUntil: null,
      });
    });
  });

  describe('generic failures', () => {
    it('returns the generic message when no account matches', async () => {
      findUserByEmailMock.mockResolvedValue(null);

      const error = await captureError(login(credentials));

      expect(error.message).toBe(GENERIC);
      expect(error.statusCode).toBe(401);
    });

    it('spends time on a dummy compare when no account matches', async () => {
      findUserByEmailMock.mockResolvedValue(null);

      await captureError(login(credentials));

      expect(dummyCompareMock).toHaveBeenCalled();
    });

    it('returns the identical message when the password is wrong', async () => {
      verifyPasswordMock.mockResolvedValue(false);

      const error = await captureError(login(credentials));

      expect(error.message).toBe(GENERIC);
      expect(error.statusCode).toBe(401);
    });

    it('never records a failed attempt for an account that does not exist', async () => {
      findUserByEmailMock.mockResolvedValue(null);

      await captureError(login(credentials));

      expect(updateLoginStateMock).not.toHaveBeenCalled();
    });
  });

  describe('deactivated accounts', () => {
    it('rejects with 403 only after the password verifies', async () => {
      findUserByEmailMock.mockResolvedValue(activeUser({ status: 'DEACTIVATED' }));

      const error = await captureError(login(credentials));

      expect(error.statusCode).toBe(403);
      expect(error.message).toBe('This account has been deactivated.');
      expect(verifyPasswordMock).toHaveBeenCalled();
    });

    it('gives the generic 401 for a deactivated account with a wrong password', async () => {
      findUserByEmailMock.mockResolvedValue(activeUser({ status: 'DEACTIVATED' }));
      verifyPasswordMock.mockResolvedValue(false);

      const error = await captureError(login(credentials));

      expect(error.statusCode).toBe(401);
      expect(error.message).toBe(GENERIC);
    });
  });

  describe('failed-attempt window', () => {
    it('starts a new window on the first failure', async () => {
      verifyPasswordMock.mockResolvedValue(false);

      await captureError(login(credentials));

      expect(updateLoginStateMock).toHaveBeenCalledWith('u1', {
        failedLoginCount: 1,
        windowStartedAt: NOW,
        lockedUntil: null,
      });
    });

    it('increments within the window', async () => {
      const windowStartedAt = new Date(NOW.getTime() - 30_000);
      findUserByEmailMock.mockResolvedValue(activeUser({ failedLoginCount: 2, windowStartedAt }));
      verifyPasswordMock.mockResolvedValue(false);

      await captureError(login(credentials));

      expect(updateLoginStateMock).toHaveBeenCalledWith('u1', {
        failedLoginCount: 3,
        windowStartedAt,
        lockedUntil: null,
      });
    });

    it('does not lock on the 4th failure at 59 seconds', async () => {
      const windowStartedAt = new Date(NOW.getTime() - 59_000);
      findUserByEmailMock.mockResolvedValue(activeUser({ failedLoginCount: 3, windowStartedAt }));
      verifyPasswordMock.mockResolvedValue(false);

      const error = await captureError(login(credentials));

      expect(error.statusCode).toBe(401);
      expect(updateLoginStateMock).toHaveBeenCalledWith('u1', {
        failedLoginCount: 4,
        windowStartedAt,
        lockedUntil: null,
      });
    });

    it('restarts the window when the last failure was more than 60 seconds ago', async () => {
      const windowStartedAt = new Date(NOW.getTime() - 61_000);
      findUserByEmailMock.mockResolvedValue(activeUser({ failedLoginCount: 4, windowStartedAt }));
      verifyPasswordMock.mockResolvedValue(false);

      const error = await captureError(login(credentials));

      expect(error.statusCode).toBe(401);
      expect(updateLoginStateMock).toHaveBeenCalledWith('u1', {
        failedLoginCount: 1,
        windowStartedAt: NOW,
        lockedUntil: null,
      });
    });
  });

  describe('lockout', () => {
    it('locks on the 5th failure inside the window', async () => {
      const windowStartedAt = new Date(NOW.getTime() - 30_000);
      findUserByEmailMock.mockResolvedValue(activeUser({ failedLoginCount: 4, windowStartedAt }));
      verifyPasswordMock.mockResolvedValue(false);

      await captureError(login(credentials));

      expect(updateLoginStateMock).toHaveBeenCalledWith('u1', {
        failedLoginCount: 0,
        windowStartedAt: null,
        lockedUntil: new Date(NOW.getTime() + 5 * 60_000),
      });
    });

    it('answers the locking attempt with 429 and the remaining seconds', async () => {
      const windowStartedAt = new Date(NOW.getTime() - 30_000);
      findUserByEmailMock.mockResolvedValue(activeUser({ failedLoginCount: 4, windowStartedAt }));
      verifyPasswordMock.mockResolvedValue(false);

      const error = await captureError(login(credentials));

      expect(error.statusCode).toBe(429);
      expect(error.lockedUntilSeconds).toBe(300);
    });

    it('rejects correct credentials while the lockout is active', async () => {
      const lockedUntil = new Date(NOW.getTime() + 120_000);
      findUserByEmailMock.mockResolvedValue(activeUser({ lockedUntil }));

      const error = await captureError(login(credentials));

      expect(error.statusCode).toBe(429);
      expect(error.lockedUntilSeconds).toBe(120);
      expect(verifyPasswordMock).not.toHaveBeenCalled();
    });

    it('allows login again once the lockout has expired', async () => {
      const lockedUntil = new Date(NOW.getTime() - 1_000);
      findUserByEmailMock.mockResolvedValue(activeUser({ lockedUntil }));

      await expect(login(credentials)).resolves.toBeDefined();
    });
  });
});
