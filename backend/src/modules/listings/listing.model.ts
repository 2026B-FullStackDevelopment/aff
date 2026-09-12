// Defines the MongoDB shape for a Donor's food listing (docs/database_design.md § LISTING).
import mongoose, { Schema } from 'mongoose';

type MeasurementUnit = 'KILOGRAM' | 'GRAM' | 'LITER' | 'MILLILITER' | 'UNIT' | 'PER_REQUEST';
type FoodCategory = 'FRUIT' | 'VEGETABLE' | 'MEAT' | 'COOKED_DISH' | 'BAKED_GOODS' | 'DRINK';
type ListingStatus = 'ACTIVE' | 'PAUSED' | 'CANCELLED' | 'SOLD_OUT';

interface ListingAttrs {
  donorId: mongoose.Types.ObjectId;
  name: string;
  description?: string;
  imageUrl?: string;
  unit: MeasurementUnit;
  category: FoodCategory;
  isVegetarian: boolean;
  price: number;
  city?: string;
  status: ListingStatus;
  donationLimit: number;
  rationLimitPerPerson?: number;
  quantityRemaining: number;
  createdAt: Date;
  updatedAt: Date;
  closedAt?: Date;
}

interface ListingDocument extends ListingAttrs, mongoose.Document {}

const listingSchema = new Schema<ListingDocument>(
  {
    donorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true },
    description: { type: String },
    imageUrl: { type: String },
    unit: { type: String, enum: ['KILOGRAM', 'GRAM', 'LITER', 'MILLILITER', 'UNIT', 'PER_REQUEST'], required: true },
    category: { type: String, enum: ['FRUIT', 'VEGETABLE', 'MEAT', 'COOKED_DISH', 'BAKED_GOODS', 'DRINK'], required: true },
    isVegetarian: { type: Boolean, required: true, default: false },
    price: { type: Number, default: 0 },
    city: { type: String },
    status: { type: String, enum: ['ACTIVE', 'PAUSED', 'CANCELLED', 'SOLD_OUT'], default: 'ACTIVE' },
    donationLimit: { type: Number, required: true },
    rationLimitPerPerson: {
      type: Number,
      min: 1,
      validate: {
        validator: Number.isSafeInteger,
        message: 'Ration limit must be a whole number.',
      },
    },
    quantityRemaining: { type: Number, required: true },
    closedAt: { type: Date },
  },
  { timestamps: true }
);

export default mongoose.model<ListingDocument>('Listing', listingSchema);

// typescript allows export different self-defined types
export type { MeasurementUnit, FoodCategory, ListingStatus, ListingDocument };
