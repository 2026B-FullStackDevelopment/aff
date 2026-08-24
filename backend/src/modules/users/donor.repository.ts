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

interface UpdateDonorInput {
  companyName?: string;
  addressText?: string;
  location?: { latitude: number; longitude: number };
}

function updateDonor(userId: string | Types.ObjectId, data: UpdateDonorInput) {
  const update: Record<string, unknown> = { ...data };

  // The client sends coordinates only; the server owns the timestamp.
  if (data.location) {
    update.location = {
      latitude: data.location.latitude,
      longitude: data.location.longitude,
      updatedAt: new Date(),
    };
  }

  return Donor.findOneAndUpdate({ userId }, update, { new: true }).lean<DonorDocument>();
}

export { createDonor, findDonorByUserId, updateDonor };
export type { CreateDonorInput, UpdateDonorInput };
