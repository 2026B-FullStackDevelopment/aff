// Defines the MongoDB shape for Courier profiles (docs/database_design.md § COURIER).
import mongoose, { Schema } from 'mongoose';

interface CourierAttrs {
  userId: mongoose.Types.ObjectId;
  fullName: string;
}

interface CourierDocument extends CourierAttrs, mongoose.Document {}

const courierSchema = new Schema<CourierDocument>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  fullName: { type: String, required: true },
});

export default mongoose.model<CourierDocument>('Courier', courierSchema);
export type { CourierDocument };
