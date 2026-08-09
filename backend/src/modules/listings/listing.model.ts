// Defines the MongoDB shape for a Donor's food listing (docs/database_design.md § LISTING).
import mongoose from 'mongoose';

const listingSchema = new mongoose.Schema(
  {
    donorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    description: { type: String },
    price: { type: Number, default: 0 },
    status: { type: String, enum: ['AVAILABLE', 'RESERVED', 'COLLECTED', 'EXPIRED'], default: 'AVAILABLE' },
    pickupLocation: { type: String },
    imageUrl: { type: String },
  },
  { timestamps: true }
);

export default mongoose.model('Listing', listingSchema);
