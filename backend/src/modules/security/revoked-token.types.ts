// Defines internal persistence and repository types for revoked JWT records.
import type mongoose from 'mongoose';
import type { Types } from 'mongoose';

type RevokeReason = 'LOGOUT' | 'ADMIN_DEACTIVATE' | 'PASSWORD_CHANGE';
interface RevokedTokenAttrs { jti: string; userId: mongoose.Types.ObjectId; reason: RevokeReason; revokedAt: Date; expiresAt: Date }
interface RevokedTokenDocument extends RevokedTokenAttrs, mongoose.Document {}
interface RevokeTokenInput { jti: string; userId: string | Types.ObjectId; expiresAt: Date; reason?: RevokeReason }

export type { RevokeReason, RevokedTokenAttrs, RevokedTokenDocument, RevokeTokenInput };
