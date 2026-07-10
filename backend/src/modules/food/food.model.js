// Defines the MongoDB shape for donor food listings.
const mongoose = require('mongoose');

const foodListingSchema = new mongoose.Schema(
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

module.exports = mongoose.model('FoodListing', foodListingSchema);
