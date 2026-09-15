// Defines the MongoDB shape for Courier profiles (docs/database_design.md § COURIER).
import mongoose, { Schema } from 'mongoose';
import type { CourierDocument } from './courier.types.js';

const courierSchema = new Schema<CourierDocument>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  fullName: { type: String, required: true },
});

export default mongoose.model<CourierDocument>('Courier', courierSchema);
export type { CourierDocument } from './courier.types.js';
