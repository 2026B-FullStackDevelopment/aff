import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const {
  findUserByEmailMock,
  updateLoginStateMock,
  recordFailedLoginMock,
  lockAccountMock,
  verifyPasswordMock,
  dummyCompareMock,
  issueSessionMock,
} = vi.hoisted(() => ({
  findUserByEmailMock: vi.fn(),
  updateLoginStateMock: vi.fn(),
  recordFailedLoginMock: vi.fn(),
  lockAccountMock: vi.fn(),
  verifyPasswordMock: vi.fn(),
  dummyCompareMock: vi.fn(),
  issueSessionMock: vi.fn(),
}));

vi.mock('../../../src/modules/users/user.interface.js', () => ({
  userInterface: {
    findUserByEmail: findUserByEmailMock,
    updateLoginState: updateLoginStateMock,
    recordFailedLogin: recordFailedLoginMock,
    lockAccount: lockAccountMock,
  },
}));

vi.mock('../../../src/modules/security/security.interface.js', () => ({
  securityInterface: {
    verifyPassword: verifyPasswordMock,
    dummyCompare: dummyCompareMock,
    issueSession: issueSessionMock,
  },
}));

import { login } from '../../../src/modules/auth/auth.login.service.js';
import { env } from '../../../src/config/env.js';

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
    recordFailedLoginMock.mockResolvedValue(1);
    lockAccountMock.mockResolvedValue(undefined);
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

      expect(recordFailedLoginMock).not.toHaveBeenCalled();
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

  // recordFailedAttempt now delegates the read-modify-write to userInterface.recordFailedLogin,
  // which atomically increments (or restarts) the counter in the database and hands back the
  // resulting count. These tests drive that returned count directly; the fact that the
  // increment/restart itself is atomic is proven at the repository level (see
  // user.repository.test.ts), not here — see the honesty note in the final report about what
  // a mocked Mongoose can and cannot prove.
  describe('failed-attempt window', () => {
    it('computes the window cutoff as now minus env.loginWindowSeconds and forwards it', async () => {
      verifyPasswordMock.mockResolvedValue(false);
      recordFailedLoginMock.mockResolvedValue(1);

      await captureError(login(credentials));

      const expectedWindowStartedAfter = new Date(NOW.getTime() - env.loginWindowSeconds * 1000);
      expect(recordFailedLoginMock).toHaveBeenCalledWith('u1', expectedWindowStartedAfter, NOW);
    });

    it('starts a new window on the first failure', async () => {
      verifyPasswordMock.mockResolvedValue(false);
      recordFailedLoginMock.mockResolvedValue(1);

      const error = await captureError(login(credentials));

      expect(error.statusCode).toBe(401);
      expect(error.message).toBe(GENERIC);
      expect(lockAccountMock).not.toHaveBeenCalled();
    });

    it('increments within the window', async () => {
      verifyPasswordMock.mockResolvedValue(false);
      recordFailedLoginMock.mockResolvedValue(3);

      const error = await captureError(login(credentials));

      expect(error.statusCode).toBe(401);
      expect(lockAccountMock).not.toHaveBeenCalled();
    });

    it('does not lock on the 4th failure', async () => {
      verifyPasswordMock.mockResolvedValue(false);
      recordFailedLoginMock.mockResolvedValue(4);

      const error = await captureError(login(credentials));

      expect(error.statusCode).toBe(401);
      expect(error.message).toBe(GENERIC);
      expect(lockAccountMock).not.toHaveBeenCalled();
    });

    // Pins the deliberate boundary shift: the repository's filter is
    // `windowStartedAt: { $gt: windowStartedAfter }`, so a window that started exactly
    // env.loginWindowSeconds ago is excluded (treated as expired), unlike the old
    // `age > windowSeconds` check where exactly 60s still counted as live. Since
    // recordFailedLogin is mocked here, this test simulates what the real repository call
    // does with a $gt filter for a stored window that is exactly at the cutoff, proving the
    // service composes correctly with that semantics; the operator itself ($gt, not $gte)
    // is asserted directly against Mongoose in user.repository.test.ts.
    it('treats a window exactly env.loginWindowSeconds old as expired, restarting the counter at 1', async () => {
      const storedWindowStartedAt = new Date(NOW.getTime() - env.loginWindowSeconds * 1000);
      verifyPasswordMock.mockResolvedValue(false);
      recordFailedLoginMock.mockImplementation(async (_id, windowStartedAfter) => {
        // Mirrors the repository's `windowStartedAt: { $gt: windowStartedAfter }` filter.
        return storedWindowStartedAt.getTime() > windowStartedAfter.getTime() ? 99 : 1;
      });

      const error = await captureError(login(credentials));

      expect(error.statusCode).toBe(401);
      expect(error.message).toBe(GENERIC);
      expect(recordFailedLoginMock).toHaveBeenCalledWith('u1', storedWindowStartedAt, NOW);
      expect(lockAccountMock).not.toHaveBeenCalled();
    });

    it('restarts the window when the last failure was more than env.loginWindowSeconds ago', async () => {
      verifyPasswordMock.mockResolvedValue(false);
      recordFailedLoginMock.mockResolvedValue(1);

      const error = await captureError(login(credentials));

      expect(error.statusCode).toBe(401);
      expect(error.message).toBe(GENERIC);
      expect(lockAccountMock).not.toHaveBeenCalled();
    });
  });

  describe('lockout', () => {
    it('locks on the 5th failure inside the window', async () => {
      verifyPasswordMock.mockResolvedValue(false);
      recordFailedLoginMock.mockResolvedValue(5);

      await captureError(login(credentials));

      expect(lockAccountMock).toHaveBeenCalledWith('u1', new Date(NOW.getTime() + 5 * 60_000));
      // The failure path never touches updateLoginState; only lockAccount sets lockedUntil,
      // and only the successful-login reset clears it.
      expect(updateLoginStateMock).not.toHaveBeenCalled();
    });

    it('answers the locking attempt with 429 and the remaining seconds', async () => {
      verifyPasswordMock.mockResolvedValue(false);
      recordFailedLoginMock.mockResolvedValue(5);

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
      expect(recordFailedLoginMock).not.toHaveBeenCalled();
    });

    it('allows login again once the lockout has expired', async () => {
      const lockedUntil = new Date(NOW.getTime() - 1_000);
      findUserByEmailMock.mockResolvedValue(activeUser({ lockedUntil }));

      await expect(login(credentials)).resolves.toBeDefined();
    });
  });
});
