// Defines internal persistence, repository, and service types for base User accounts.
import type mongoose from 'mongoose';
import type { Types } from 'mongoose';
import type { CourierDocument } from './courier.types.js';
import type { DonorDocument } from './donor.types.js';
import type { RecipientDocument } from './recipient.types.js';

type Role = 'RECIPIENT' | 'DONOR' | 'ADMIN' | 'COURIER';
type AccountStatus = 'ACTIVE' | 'DEACTIVATED';

interface UserAttrs {
  username: string;
  email: string;
  passwordHash: string;
  role: Role;
  country?: string;
  city?: string;
  status: AccountStatus;
  avatarUrl: string | null;
  failedLoginCount: number;
  windowStartedAt: Date | null;
  lockedUntil: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

interface UserDocument extends UserAttrs, mongoose.Document {}

interface RolePageQuery { page: number; limit: number }
interface UserPage { items: UserDocument[]; page: number; limit: number; total: number }
interface AdminUsersQuery extends RolePageQuery { role?: Role; status?: AccountStatus; search?: string }
interface AdminUserDocument extends UserDocument {
  recipientProfile?: RecipientDocument;
  donorProfile?: DonorDocument;
  courierProfile?: CourierDocument;
  profileName: string;
}
interface AdminUserPage extends Omit<UserPage, 'items'> { items: AdminUserDocument[] }
interface UserPageAggregationResult<TItem = UserDocument> {
  items: TItem[];
  metadata: Array<{ total: number }>;
}
interface CreateUserInput {
  username: string;
  email: string;
  passwordHash: string;
  role: Role;
  country?: string;
  city?: string;
}
interface RecipientSearchResult { _id: Types.ObjectId; username: string; email: string }
interface LoginStateUpdate {
  failedLoginCount: number;
  windowStartedAt: Date | null;
  lockedUntil: Date | null;
}
interface RequestAuth { jti: string; expiresAt: Date }
interface CreateCourierAccountInput { username: string; email: string; password: string; fullName: string }
interface CourierAccount { user: UserDocument; courier: CourierDocument }
interface CourierAccountSummary { user: UserDocument; courier: CourierDocument | null }
interface CourierAccountPage { items: CourierAccountSummary[]; page: number; limit: number; total: number }

export type {
  Role, AccountStatus, UserAttrs, UserDocument, RolePageQuery, UserPage,
  AdminUsersQuery, AdminUserDocument, AdminUserPage, UserPageAggregationResult,
  CreateUserInput, RecipientSearchResult, LoginStateUpdate, RequestAuth,
  CreateCourierAccountInput, CourierAccount, CourierAccountSummary, CourierAccountPage,
};
