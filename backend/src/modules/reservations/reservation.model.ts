// Defines the MongoDB shape for recipient food reservations.
import mongoose from 'mongoose';

const reservationSchema = new mongoose.Schema(
  {
    recipientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    foodListingId: { type: mongoose.Schema.Types.ObjectId, ref: 'FoodListing', required: true },
    status: { type: String, enum: ['RESERVED', 'COLLECTED', 'CANCELLED'], default: 'RESERVED' },
  },
  { timestamps: true }
);

export default mongoose.model('Reservation', reservationSchema);
