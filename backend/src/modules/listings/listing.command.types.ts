// Defines internal types used by Listing command repositories and services.
import type { ClientSession, Types } from 'mongoose';
import type { ListingDtoSource, UpdateListingStatusResponseDto } from './listing.response.dto.js';
import type { UpdateListingStatusRequestDto } from './listing.request.dto.js';
import type { FoodCategory, ListingStatus, MeasurementUnit } from './listing.types.js';

interface CreateListingInput {
  donorId: string | Types.ObjectId;
  name: string;
  description?: string;
  imageUrl?: string;
  unit: MeasurementUnit;
  category: FoodCategory;
  isVegetarian: boolean;
  price: number;
  city?: string;
  status?: ListingStatus;
  donationLimit: number;
  rationLimitPerPerson?: number;
  quantityRemaining: number;
}

interface UpdateListingStatusOptions {
  session?: ClientSession;
  closedAt?: Date;
}

interface UpdateListingStatusServiceResult {
  listing: ListingDtoSource;
  cancelledOrderCount: number;
  refundOutcomes: UpdateListingStatusResponseDto['refundOutcomes'];
}

type RequestedListingStatus = UpdateListingStatusRequestDto['status'];

export type {
  CreateListingInput,
  UpdateListingStatusOptions,
  UpdateListingStatusServiceResult,
  RequestedListingStatus,
};
