// Defines the MongoDB shape for AFF users.
import mongoose, { Schema } from 'mongoose';
import type { UserDocument } from './user.types.js';

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
export type { Role, AccountStatus, UserDocument } from './user.types.js';
