// Defines the MongoDB shape for premium recipient subscriptions.
import mongoose from 'mongoose';

const subscriptionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    plan: { type: String, required: true },
    status: { type: String, enum: ['ACTIVE', 'CANCELLED', 'EXPIRED'], default: 'ACTIVE' },
    paymentReference: { type: String },
  },
  { timestamps: true }
);

export default mongoose.model('Subscription', subscriptionSchema);
