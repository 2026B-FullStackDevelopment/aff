// Contains the login business rules, including brute-force lockout.
import { userInterface } from '../users/user.interface.js';
import { verifyPassword, dummyCompare } from '../../shared/security/password.js';
import { issueSession } from './auth.token.service.js';
import { env } from '../../config/env.js';
import type { AuthSession } from './auth.token.service.js';
import type { LoginRequestDto } from './auth.dto.js';
import type { UserDocument } from '../users/user.model.js';

// One message for every credential failure, so nothing reveals whether the
// account exists (issue #49).
const GENERIC_FAILURE = 'Invalid email or password.';

/**
 * Builds the generic "invalid credentials" error. Used for both an unknown
 * email and a correct email with a wrong password, with byte-identical text,
 * so a caller can't use the message to enumerate registered accounts.
 */
function invalidCredentials(): Error {
  const error: Error = new Error(GENERIC_FAILURE);
  error.statusCode = 401;
  return error;
}

/**
 * Builds the "account locked" error.
 *
 * @param lockedUntil - When the lock clears.
 * @param now - The current time, passed in rather than re-read so the
 *   remaining-seconds math stays consistent with whatever check just triggered this.
 * @returns An `Error` with `statusCode = 429` and `lockedUntilSeconds` set —
 *   `docs/api_design.md` §4 requires that field in the response body.
 */
function lockedOut(lockedUntil: Date, now: Date): Error {
  const remaining = Math.ceil((lockedUntil.getTime() - now.getTime()) / 1000);
  const error: Error = new Error(
    `Too many failed attempts. Try again in ${Math.ceil(remaining / 60)} minute(s).`
  );
  error.statusCode = 429;
  // docs/api_design.md §4 requires the remaining time in the 429 body.
  error.lockedUntilSeconds = remaining;
  return error;
}

/**
 * Records one failed login attempt and locks the account if this attempt
 * pushes the count to `env.loginMaxAttempts`. See `user.service.recordFailedLogin`
 * for how the count itself is incremented atomically.
 *
 * @param user - The user who just failed to authenticate.
 * @param now - The current time.
 * @returns The error to throw — either a generic invalid-credentials error, or
 *   a lockout error if this attempt tripped the limit.
 */
async function recordFailedAttempt(user: UserDocument, now: Date): Promise<Error> {
  // The window is live if it started within the last env.loginWindowSeconds.
  const windowStartedAfter = new Date(now.getTime() - env.loginWindowSeconds * 1000);
  const failedLoginCount = await userInterface.recordFailedLogin(user._id, windowStartedAfter, now);

  if (failedLoginCount >= env.loginMaxAttempts) {
    const lockedUntil = new Date(now.getTime() + env.lockoutMinutes * 60_000);
    await userInterface.lockAccount(user._id, lockedUntil);

    return lockedOut(lockedUntil, now);
  }

  return invalidCredentials();
}

/**
 * Authenticates a user by email and password, enforcing brute-force lockout.
 * Story #49. Checks run in this order, each one placed deliberately to avoid
 * leaking information to someone who doesn't already hold valid credentials:
 * 1. Lockout — before any password work, so a locked account rejects even a
 *    correct password.
 * 2. Password — using a dummy comparison when no account matches, so response
 *    timing doesn't disclose whether the email is registered.
 * 3. Deactivation — checked only after the password verifies.
 *
 * @param payload - The submitted email and password.
 * @returns A new session on success.
 * @throws {Error} `401` for invalid credentials (identical message either
 *   way), `429` if the account is locked, `403` if the account is deactivated.
 */
async function login(payload: LoginRequestDto): Promise<AuthSession> {
  const now = new Date();
  const user = await userInterface.findUserByEmail(payload.email);

  if (!user) {
    // Spend comparable time so response timing does not disclose the account.
    await dummyCompare();
    throw invalidCredentials();
  }

  // Checked before any password work, so a locked account rejects even correct
  // credentials (issue #49).
  if (user.lockedUntil && user.lockedUntil.getTime() > now.getTime()) {
    throw lockedOut(user.lockedUntil, now);
  }

  if (!(await verifyPassword(payload.password, user.passwordHash))) {
    throw await recordFailedAttempt(user, now);
  }

  // Only disclosed to someone who already proved they hold the credentials.
  if (user.status === 'DEACTIVATED') {
    const error: Error = new Error('This account has been deactivated.');
    error.statusCode = 403;
    throw error;
  }

  await userInterface.updateLoginState(user._id, {
    failedLoginCount: 0,
    windowStartedAt: null,
    lockedUntil: null,
  });

  return issueSession(user);
}

export { login };
