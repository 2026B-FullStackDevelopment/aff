// Contains user database queries so services do not call Mongoose directly.
import User, {
  type UserDocument,
  type Role,
  type AccountStatus,
} from './user.model.js';
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

interface RecipientSearchResult {
  _id: Types.ObjectId;
  username: string;
  email: string;
}

interface ListUsersQuery {
  page: number;
  limit: number;
  role?: Role;
  status?: AccountStatus;
  search?: string;
}

function createUser(data: CreateUserInput) {
  return User.create(data);
}

function findUserByEmail(email: string) {
  return User.findOne({ email }).lean<UserDocument>();
}

// Limit autocomplete results so the endpoint does not expose a large user list.
function searchActiveRecipientsByEmail(email: string, limit = 10) {
  return User.find({
    role: 'RECIPIENT',
    status: 'ACTIVE',
    email: {
      $regex: `^${escapeRegExp(email)}`,
      $options: 'i',
    },
  })
    .select({
      _id: 1,
      username: 1,
      email: 1,
    })
    .limit(limit)
    .lean<RecipientSearchResult[]>();
}

function findUserById(id: string | Types.ObjectId) {
  return User.findById(id).lean<UserDocument>();
}

async function listUsers(query: ListUsersQuery) {
  const filter: Record<string, unknown> = {};

  if (query.role) filter.role = query.role;
  if (query.status) filter.status = query.status;

  if (query.search) {
    const search = { $regex: escapeRegExp(query.search), $options: 'i' };
    filter.$or = [{ username: search }, { email: search }];
  }

  const [items, total] = await Promise.all([
    User.find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .skip((query.page - 1) * query.limit)
      .limit(query.limit)
      .lean<UserDocument[]>(),
    User.countDocuments(filter),
  ]);

  return { items, total };
}

function updateUserStatus(id: string | Types.ObjectId, status: AccountStatus) {
  return User.findByIdAndUpdate(id, { status }, { new: true }).lean<UserDocument>();
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
  searchActiveRecipientsByEmail,
  findUserById,
  listUsers,
  updateUserStatus,
  updateUser,
  updateLoginState,
  incrementFailedLoginInWindow,
  startFailedLoginWindow,
  lockAccount,
  deleteUser,
};
export type {
  CreateUserInput,
  LoginStateUpdate,
  RecipientSearchResult,
  ListUsersQuery,
};
