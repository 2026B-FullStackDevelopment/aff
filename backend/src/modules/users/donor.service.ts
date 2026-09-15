// Contains Donor profile business rules and calls the donor repository for database work.
import * as donorRepository from './donor.repository.js';
import type { Types } from 'mongoose';
import type { CreateDonorProfileInput } from './donor.types.js';

async function createDonorProfile(input: CreateDonorProfileInput) {
  return donorRepository.createDonor(input);
}

/**
 * Loads a set of Donor profiles by user id, for a caller joining against
 * Donors — currently the Courier queue (E2), which needs each Donor's
 * company name and pickup address/location.
 */
async function findDonorsByUserIds(userIds: string[]) {
  if (userIds.length === 0) return [];

  return donorRepository.findDonorsByUserIds(userIds);
}

async function getDonorByUserId(userId: string | Types.ObjectId) {
  const donor = await donorRepository.findDonorByUserId(userId);
  if (!donor) {
    const error: Error = new Error('Donor profile not found');
    error.statusCode = 404;
    throw error;
  }
  return donor;
}

export { createDonorProfile, findDonorsByUserIds, getDonorByUserId };
export type { CreateDonorProfileInput } from './donor.types.js';
