// Contains donor profile database queries so services do not call Mongoose directly.
import Donor, { type DonorDocument } from './donor.model.js';
import type { Types } from 'mongoose';

interface CreateDonorInput {
  userId: string | Types.ObjectId;
  companyName: string;
  taxCode: string;
  addressText: string;
  location: { latitude: number; longitude: number };
}

function createDonor(data: CreateDonorInput) {
  return Donor.create({
    userId: data.userId,
    companyName: data.companyName,
    taxCode: data.taxCode,
    addressText: data.addressText,
    // The client sends coordinates only; the server owns the timestamp.
    location: {
      latitude: data.location.latitude,
      longitude: data.location.longitude,
      updatedAt: new Date(),
    },
  });
}

function findDonorByUserId(userId: string | Types.ObjectId) {
  return Donor.findOne({ userId }).lean<DonorDocument>();
}

export { createDonor, findDonorByUserId };
export type { CreateDonorInput };
