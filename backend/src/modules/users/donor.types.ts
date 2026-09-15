// Defines internal persistence, repository, and service types for Donor profiles.
import type mongoose from 'mongoose';
import type { Types } from 'mongoose';
import type { GeoLocation } from '../../shared/dtos/geo-location.dto.js';

interface DonorAttrs {
  userId: mongoose.Types.ObjectId;
  companyName: string;
  taxCode: string;
  addressText: string;
  location: GeoLocation;
}
interface DonorDocument extends DonorAttrs, mongoose.Document {}
interface CreateDonorInput {
  userId: string | Types.ObjectId;
  companyName: string;
  taxCode: string;
  addressText: string;
  location: { latitude: number; longitude: number };
}
interface UpdateDonorInput {
  companyName?: string;
  addressText?: string;
  location?: { latitude: number; longitude: number };
}
type CreateDonorProfileInput = CreateDonorInput;

export type { DonorAttrs, DonorDocument, CreateDonorInput, UpdateDonorInput, CreateDonorProfileInput };
