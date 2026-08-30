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

/**
 * Loads a set of Donor profiles by user id, projecting only what a caller
 * joining against Donors needs. Used by the Courier queue (E2) so hydrating a
 * page of Deliveries costs one query rather than one per row.
 */
function findDonorsByUserIds(userIds: Array<string | Types.ObjectId>) {
  if (userIds.length === 0) return Promise.resolve([]);

  return Donor.find(
    { userId: { $in: userIds } },
    { userId: 1, companyName: 1 },
  ).lean<Array<{ userId: Types.ObjectId; companyName: string }>>();
}

export { createDonor, findDonorByUserId, updateDonor, findDonorsByUserIds };
export type { CreateDonorInput, UpdateDonorInput };
