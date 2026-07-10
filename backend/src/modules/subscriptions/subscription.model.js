// Defines the MongoDB shape for premium recipient subscriptions.
const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    plan: { type: String, required: true },
    status: { type: String, enum: ['ACTIVE', 'CANCELLED', 'EXPIRED'], default: 'ACTIVE' },
    paymentReference: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Subscription', subscriptionSchema);
