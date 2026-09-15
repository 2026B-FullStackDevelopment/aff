// Defines internal persistence types for Listing documents.
import type mongoose from 'mongoose';

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

export type { MeasurementUnit, FoodCategory, ListingStatus, ListingAttrs, ListingDocument };
