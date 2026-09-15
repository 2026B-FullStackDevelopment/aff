// Defines the MongoDB shape for Donor profiles (docs/database_design.md § DONOR).
import mongoose, { Schema } from 'mongoose';
import type { DonorDocument } from './donor.types.js';

const donorSchema = new Schema<DonorDocument>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  companyName: { type: String, required: true },
  taxCode: { type: String, required: true },
  addressText: { type: String, required: true },
  location: {
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    updatedAt: { type: Date, default: Date.now },
  },
});

export default mongoose.model<DonorDocument>('Donor', donorSchema);
export type { DonorDocument } from './donor.types.js';
