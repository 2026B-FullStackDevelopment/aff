// Defines internal persistence and repository types for live JWT records.
import type mongoose from 'mongoose';
import type { Types } from 'mongoose';

interface ActiveTokenAttrs { jti: string; userId: mongoose.Types.ObjectId; issuedAt: Date; expiresAt: Date }
interface ActiveTokenDocument extends ActiveTokenAttrs, mongoose.Document {}
interface RecordIssuedTokenInput { jti: string; userId: string | Types.ObjectId; expiresAt: Date }

export type { ActiveTokenAttrs, ActiveTokenDocument, RecordIssuedTokenInput };
