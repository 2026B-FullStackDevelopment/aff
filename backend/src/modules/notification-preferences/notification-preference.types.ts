// Defines internal persistence and repository types for notification preferences.
import type mongoose from 'mongoose';
import type { FoodCategory } from '../listings/listing.types.js';

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
interface NotificationPreferenceWriteInput {
  preferenceTitle: string;
  categories: FoodCategory[];
  vegetarian: boolean | null;
  priceMin: number | null;
  priceMax: number | null;
  city: string | null;
  isActive: boolean;
}

export type { NotificationPreferenceAttrs, NotificationPreferenceDocument, NotificationPreferenceWriteInput };
