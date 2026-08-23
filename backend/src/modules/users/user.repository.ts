// Contains user database queries so services do not call Mongoose directly.
import User, { type UserDocument, type Role } from './user.model.js';
import type { Types } from 'mongoose';

interface CreateUserInput {
  username: string;
  email: string;
  passwordHash: string;
  role: Role;
  country?: string;
  city?: string;
}

function createUser(data: CreateUserInput) {
  return User.create(data);
}

function findUserByEmail(email: string) {
  return User.findOne({ email }).lean<UserDocument>();
}

function findUserById(id: string | Types.ObjectId) {
  return User.findById(id).lean<UserDocument>();
}

function updateUser(
  id: string | Types.ObjectId,
  data: Partial<CreateUserInput> & { avatarUrl?: string | null },
) {
  return User.findByIdAndUpdate(id, data, { new: true }).lean<UserDocument>();
}

interface LoginStateUpdate {
  failedLoginCount: number;
  windowStartedAt: Date | null;
  lockedUntil: Date | null;
}

function updateLoginState(id: string | Types.ObjectId, state: LoginStateUpdate) {
  return User.updateOne({ _id: id }, { ...state });
}

// Increments only while the current failure window is still live.
function incrementFailedLoginInWindow(id: string | Types.ObjectId, windowStartedAfter: Date) {
  return User.findOneAndUpdate(
    { _id: id, windowStartedAt: { $gt: windowStartedAfter } },
    { $inc: { failedLoginCount: 1 } },
    { new: true },
  ).lean<UserDocument>();
}

// Starts a fresh window when there is none, or the previous one has expired.
function startFailedLoginWindow(id: string | Types.ObjectId, now: Date) {
  return User.findOneAndUpdate(
    { _id: id },
    { $set: { failedLoginCount: 1, windowStartedAt: now } },
    { new: true },
  ).lean<UserDocument>();
}

// Locks the account and resets the window so it starts clean once the lock expires.
function lockAccount(id: string | Types.ObjectId, lockedUntil: Date) {
  return User.updateOne(
    { _id: id },
    { $set: { failedLoginCount: 0, windowStartedAt: null, lockedUntil } },
  );
}

function deleteUser(id: string | Types.ObjectId) {
  return User.deleteOne({ _id: id });
}

export {
  createUser,
  findUserByEmail,
  findUserById,
  updateUser,
  updateLoginState,
  incrementFailedLoginInWindow,
  startFailedLoginWindow,
  lockAccount,
  deleteUser,
};
export type { CreateUserInput, LoginStateUpdate };
