// Defines the MongoDB shape for Donor profiles (docs/database_design.md § DONOR).
import mongoose, { Schema } from 'mongoose';
import type { GeoLocation } from '../../shared/dtos/geo-location.dto.js';

interface DonorAttrs {
  userId: mongoose.Types.ObjectId;
  companyName: string;
  taxCode: string;
  addressText: string;
  location: GeoLocation;
}

interface DonorDocument extends DonorAttrs, mongoose.Document {}

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
export type { DonorDocument };
