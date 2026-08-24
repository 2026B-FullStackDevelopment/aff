// Contains user database queries so services do not call Mongoose directly.
import User, { type UserDocument, type Role } from './user.model.js';
import type { Types } from 'mongoose';

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

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
// limit to searching 10 recipients
function searchActiveRecipientByEmail(email: string, limit = 10) {
  // mongoDB .find() function returns an array, return empty and not null
  return User.find({
    role: 'RECIPIENT',
    status: 'ACTIVE',
    //regex MongoDB text matching. '^...' starts with the text
    // option 'i' case sensitive
    email: {$regex: `^${escapeRegExp(email)}`, $options: 'i'},
  }).select({
    _id: 1, username: 1, email: 1, // select the fields to include
  })
    .limit(limit) // limit by the limit parameter
    .lean<UserDocument[]>(); // lean<generic>, ask to return plain JS oject
}

function findUserById(id: string | Types.ObjectId) {
  return User.findById(id).lean<UserDocument>();
}

function updateUser(id: string | Types.ObjectId, data: Partial<CreateUserInput>) {
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
  searchActiveRecipientByEmail,
  findUserById,
  updateUser,
  updateLoginState,
  incrementFailedLoginInWindow,
  startFailedLoginWindow,
  lockAccount,
  deleteUser,
};
export type { CreateUserInput, LoginStateUpdate };
