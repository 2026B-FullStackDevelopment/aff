// Defines the MongoDB shape for recipient food reservations.
const mongoose = require('mongoose');

const reservationSchema = new mongoose.Schema(
  {
    recipientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    foodListingId: { type: mongoose.Schema.Types.ObjectId, ref: 'FoodListing', required: true },
    status: { type: String, enum: ['RESERVED', 'COLLECTED', 'CANCELLED'], default: 'RESERVED' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Reservation', reservationSchema);
