// Contains User-collection listing and search queries (Admin directory, Recipient search) so services do not call Mongoose directly.
import User from './user.model.js';
import Recipient from './recipient.model.js';
import Donor from './donor.model.js';
import Courier from './courier.model.js';
import type { Role } from './user.types.js';
import type { PipelineStage } from 'mongoose';
import type {
  AdminUserDocument, AdminUserPage, AdminUsersQuery,
  RecipientSearchResult, RolePageQuery, UserPage,
  UserPageAggregationResult,
} from './user.types.js';

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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

/**
 * Reads the Admin account directory with composable role, status, text, and
 * pagination filters. Profile lookups happen before text filtering so a
 * Donor's company name and a Courier's full name are searchable alongside
 * USER.username and USER.email (G1).
 */
async function findUsersForAdmin(query: AdminUsersQuery): Promise<AdminUserPage> {
  const baseMatch: Record<string, unknown> = {};

  if (query.role) baseMatch.role = query.role;
  if (query.status) baseMatch.status = query.status;

  const pipeline: PipelineStage[] = [
    { $match: baseMatch },
    {
      $lookup: {
        from: Recipient.collection.name,
        localField: '_id',
        foreignField: 'userId',
        as: 'recipientProfiles',
      },
    },
    {
      $lookup: {
        from: Donor.collection.name,
        localField: '_id',
        foreignField: 'userId',
        as: 'donorProfiles',
      },
    },
    {
      $lookup: {
        from: Courier.collection.name,
        localField: '_id',
        foreignField: 'userId',
        as: 'courierProfiles',
      },
    },
    {
      $set: {
        recipientProfile: { $arrayElemAt: ['$recipientProfiles', 0] },
        donorProfile: { $arrayElemAt: ['$donorProfiles', 0] },
        courierProfile: { $arrayElemAt: ['$courierProfiles', 0] },
        profileName: {
          $switch: {
            branches: [
              {
                case: { $eq: ['$role', 'DONOR'] },
                then: {
                  $ifNull: [{ $arrayElemAt: ['$donorProfiles.companyName', 0] }, '$username'],
                },
              },
              {
                case: { $eq: ['$role', 'COURIER'] },
                then: {
                  $ifNull: [{ $arrayElemAt: ['$courierProfiles.fullName', 0] }, '$username'],
                },
              },
            ],
            default: '$username',
          },
        },
      },
    },
  ];

  if (query.search) {
    const search = { $regex: escapeRegExp(query.search), $options: 'i' };
    pipeline.push({
      $match: {
        $or: [{ username: search }, { email: search }, { profileName: search }],
      },
    });
  }

  pipeline.push(
    { $sort: { createdAt: -1, _id: -1 } },
    {
      $facet: {
        items: [
          { $skip: (query.page - 1) * query.limit },
          { $limit: query.limit },
          { $unset: ['passwordHash', 'recipientProfiles', 'donorProfiles', 'courierProfiles'] },
        ],
        metadata: [{ $count: 'total' }],
      },
    },
  );

  const [result] = await User.aggregate<UserPageAggregationResult<AdminUserDocument>>(
    pipeline,
  );

  return {
    items: result?.items ?? [],
    page: query.page,
    limit: query.limit,
    total: result?.metadata[0]?.total ?? 0,
  };
}

export { searchActiveRecipientsByEmail, findUsersByRole, findUsersForAdmin };
export type {
  RolePageQuery, UserPage, AdminUsersQuery, AdminUserDocument, AdminUserPage,
  RecipientSearchResult,
} from './user.types.js';
