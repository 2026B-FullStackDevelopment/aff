// Contains user database queries so services do not call Mongoose directly.
import User, { type UserDocument, type Role } from './user.model.js';
import type { PipelineStage, Types } from 'mongoose';

/** Pagination for an Admin-facing account listing. */
interface RolePageQuery {
  page: number;
  limit: number;
}

/** One page of accounts holding a role, plus the total in that role. */
interface UserPage {
  items: UserDocument[];
  page: number;
  limit: number;
  total: number;
}

interface UserPageAggregationResult {
  items: UserDocument[];
  metadata: Array<{ total: number }>;
}

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

/**
 * Reads one page of accounts holding `role`, newest first. Used by the Admin
 * account listings (`docs/api_design.md` §11); role-specific profile fields
 * are joined by the caller, so this stays a plain `USER` query.
 */
async function findUsersByRole(role: Role, query: RolePageQuery): Promise<UserPage> {
  const skip = (query.page - 1) * query.limit;

  const pipeline: PipelineStage[] = [
    { $match: { role } },
    { $sort: { createdAt: -1, _id: -1 } },
    {
      $facet: {
        items: [{ $skip: skip }, { $limit: query.limit }],
        metadata: [{ $count: 'total' }],
      },
    },
  ];

  const [result] = await User.aggregate<UserPageAggregationResult>(pipeline);

  return {
    items: result?.items ?? [],
    page: query.page,
    limit: query.limit,
    total: result?.metadata[0]?.total ?? 0,
  };
}

export {
  createUser,
  findUserByEmail,
  searchActiveRecipientsByEmail,
  findUserById,
  updateUser,
  updateLoginState,
  incrementFailedLoginInWindow,
  startFailedLoginWindow,
  lockAccount,
  deleteUser,
  findUsersByRole,
};
export type {
  CreateUserInput,
  LoginStateUpdate,
  RecipientSearchResult,
  RolePageQuery,
  UserPage,
};
