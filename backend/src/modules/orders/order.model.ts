// Defines the MongoDB shape for a Recipient's order on a listing (docs/database_design.md § ORDER).
import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema(
  {
    recipientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    listingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Listing', required: true },
    status: { type: String, enum: ['RESERVED', 'COLLECTED', 'CANCELLED'], default: 'RESERVED' },
  },
  { timestamps: true }
);

export default mongoose.model('Order', orderSchema);
