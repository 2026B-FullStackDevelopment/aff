// Hashes and verifies user passwords so no other module talks to bcrypt directly.
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

async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, env.bcryptRounds);
}

async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  try {
    return await bcrypt.compare(plain, hash);
  } catch {
    // A malformed or missing hash is a failed login, not a server error.
    return false;
  }
}

async function dummyCompare(): Promise<void> {
  await bcrypt.compare('a-password-that-will-not-match', DUMMY_HASH);
}

export { hashPassword, verifyPassword, dummyCompare };
