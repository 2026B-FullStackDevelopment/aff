// Defines the MongoDB shape for a Recipient's saved notification preference (docs/database_design.md § NOTIFICATION_PREFERENCE).
import mongoose, { Schema } from 'mongoose';
import type { NotificationPreferenceDocument } from './notification-preference.types.js';

const notificationPreferenceSchema = new Schema<NotificationPreferenceDocument>(
  {
    recipientId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    preferenceTitle: { type: String, required: true },
    categories: {
      type: [String],
      enum: ['FRUIT', 'VEGETABLE', 'MEAT', 'COOKED_DISH', 'BAKED_GOODS', 'DRINK'],
      default: [],
    },
    vegetarian: { type: Boolean, default: null },
    priceMin: { type: Number, default: null },
    priceMax: { type: Number, default: null },
    city: { type: String, default: null },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

notificationPreferenceSchema.index({ recipientId: 1 });

export default mongoose.model<NotificationPreferenceDocument>('NotificationPreference', notificationPreferenceSchema);
export type { NotificationPreferenceAttrs, NotificationPreferenceDocument } from './notification-preference.types.js';
