// Hashes and verifies user passwords so no other module talks to bcrypt directly.
// Lives in the security module; other modules reach it via security.interface.ts.
import bcrypt from 'bcryptjs';
import { env } from '../../config/env.js';

// A hash of a value nobody can log in with, computed once at startup so it is a
// genuine hash at the configured cost. Comparing against it makes a login for a
// missing account take about as long as one for a real account, so response
// timing does not reveal whether an email is registered.
//
// This must be a real hash: bcrypt.compare against a malformed string returns
// false immediately without doing the work, which would defeat the purpose.
const DUMMY_HASH = bcrypt.hashSync('unused-placeholder-password', env.bcryptRounds);

/**
 * Hashes a plaintext password for storage. Never store or log the plaintext input.
 *
 * @param plain - The user-supplied password, already validated against the
 *   strength rules in `auth.schemas.ts` — this function does not re-check them.
 * @returns A bcrypt hash, salted at `env.bcryptRounds`, safe to persist as `USER.passwordHash`.
 */
async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, env.bcryptRounds);
}

/**
 * Checks a plaintext password against a stored bcrypt hash.
 *
 * @param plain - The password submitted at login.
 * @param hash - The user's stored `passwordHash`.
 * @returns `true` if they match. Resolves to `false` rather than throwing when
 *   `hash` is malformed or missing (e.g. a corrupted record) — that should read
 *   as "wrong password", not as a server error.
 */
async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  try {
    return await bcrypt.compare(plain, hash);
  } catch {
    // A malformed or missing hash is a failed login, not a server error.
    return false;
  }
}

/**
 * Performs a throwaway bcrypt comparison at the configured cost, without
 * checking any real credential. Call this on login's "no such account" branch
 * so a nonexistent email takes about as long to reject as a real one with a
 * wrong password — otherwise response timing alone would reveal which emails
 * are registered.
 */
async function dummyCompare(): Promise<void> {
  await bcrypt.compare('a-password-that-will-not-match', DUMMY_HASH);
}

export { hashPassword, verifyPassword, dummyCompare };
