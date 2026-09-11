// Defines the MongoDB shape for a Recipient's saved notification preference (docs/database_design.md § NOTIFICATION_PREFERENCE).
import mongoose, { Schema } from 'mongoose';
import type { FoodCategory } from '../listings/listing.model.js';

interface NotificationPreferenceAttrs {
  recipientId: mongoose.Types.ObjectId;
  preferenceTitle: string;
  categories: FoodCategory[];
  vegetarian: boolean | null;
  priceMin: number | null;
  priceMax: number | null;
  city: string | null;
  isActive: boolean;
}

interface NotificationPreferenceDocument extends NotificationPreferenceAttrs, mongoose.Document {
  createdAt: Date;
  updatedAt: Date;
}

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
export type { NotificationPreferenceAttrs, NotificationPreferenceDocument };
