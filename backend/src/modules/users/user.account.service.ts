// Contains core User account business rules (create/find/delete, login-lockout bookkeeping).
import * as userRepository from './user.account.repository.js';
import { securityInterface } from '../security/security.interface.js';
import type { CreateUserRequestDto } from './user.dto.js';
import type { LoginStateUpdate } from './user.types.js';
import type { Types } from 'mongoose';

function duplicateEmailError(): Error {
  const error: Error = new Error('This email is already registered.');
  error.statusCode = 409;
  return error;
}

async function createUser(payload: CreateUserRequestDto) {
  const existing = await userRepository.findUserByEmail(payload.email);

  if (existing) {
    throw duplicateEmailError();
  }

  try {
    return await userRepository.createUser({
      username: payload.username,
      email: payload.email,
      passwordHash: await securityInterface.hashPassword(payload.password),
      role: payload.role || 'RECIPIENT',
      // AFF operates in Vietnam; the registration forms do not ask for a country.
      country: payload.country || 'Vietnam',
      city: payload.city,
    });
  } catch (error) {
    // Two simultaneous registrations can both pass the check above; the unique
    // index is the real guard, so translate its error into the same 409.
    if (error?.code === 11000) {
      throw duplicateEmailError();
    }

    throw error;
  }
}

async function findUserByEmail(email: string) {
  return userRepository.findUserByEmail(email);
}

async function getUserById(id: string) {
  const user = await userRepository.findUserById(id);

  if (!user) {
    const error: Error = new Error('User not found.');
    error.statusCode = 404;
    throw error;
  }

  return user;
}

async function deleteUser(id: string | Types.ObjectId) {
  await userRepository.deleteUser(id);
}

async function updateLoginState(id: string | Types.ObjectId, state: LoginStateUpdate) {
  await userRepository.updateLoginState(id, state);
}

async function recordFailedLogin(
  id: string | Types.ObjectId,
  windowStartedAfter: Date,
  now: Date,
): Promise<number> {
  const updated =
    (await userRepository.incrementFailedLoginInWindow(id, windowStartedAfter)) ||
    (await userRepository.startFailedLoginWindow(id, now));

  return updated.failedLoginCount;
}

async function lockAccount(id: string | Types.ObjectId, lockedUntil: Date) {
  await userRepository.lockAccount(id, lockedUntil);
}

export {
  duplicateEmailError,
  createUser,
  findUserByEmail,
  getUserById,
  deleteUser,
  updateLoginState,
  recordFailedLogin,
  lockAccount,
};
