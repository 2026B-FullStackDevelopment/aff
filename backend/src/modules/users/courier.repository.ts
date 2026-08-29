// Contains Courier profile database queries so services do not call Mongoose directly.
import Courier, { type CourierDocument } from './courier.model.js';
import type { Types } from 'mongoose';

interface CreateCourierInput {
  userId: string | Types.ObjectId;
  fullName: string;
}

function createCourier(data: CreateCourierInput) {
  return Courier.create(data);
}

function findCourierByUserId(userId: string | Types.ObjectId) {
  return Courier.findOne({ userId }).lean<CourierDocument>();
}

/**
 * Loads the Courier profiles for a page of Courier accounts in one query, so
 * listing N Couriers costs two round trips rather than N + 1.
 */
function findCouriersByUserIds(userIds: Array<string | Types.ObjectId>) {
  return Courier.find({ userId: { $in: userIds } }).lean<CourierDocument[]>();
}

export { createCourier, findCourierByUserId, findCouriersByUserIds };
export type { CreateCourierInput };
