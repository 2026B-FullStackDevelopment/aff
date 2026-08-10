// Defines the MongoDB shape for AFF users.
import mongoose, { Schema } from 'mongoose';

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

const userSchema = new Schema<UserDocument>(
  {
    username: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['RECIPIENT', 'DONOR', 'ADMIN', 'COURIER'], default: 'RECIPIENT' },
    country: { type: String },
    city: { type: String },
    status: { type: String, enum: ['ACTIVE', 'DEACTIVATED'], default: 'ACTIVE' },
    avatarUrl: { type: String, default: null },
    failedLoginCount: { type: Number, default: 0 },
    windowStartedAt: { type: Date, default: null },
    lockedUntil: { type: Date, default: null },
  },
  { timestamps: true }
);

export default mongoose.model<UserDocument>('User', userSchema);
export type { Role, AccountStatus, UserDocument };
