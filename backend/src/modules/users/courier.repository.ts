// Create 1 account, find 1 account, find all

import Courier, {
  type CourierDocument,
} from './courier.model.js';
import type { Types } from 'mongoose';

interface CreateCourierInput {
    userId: string | Types.ObjectId;
    fullName: string;
}

function createCourier(data: CreateCourierInput) {
    return Courier.create({ userId: data.userId, fullName: data.fullName});
}

function findCourierByUserId(userId: string | Types.ObjectId) {
    return Courier.findOne({ userId }).lean<CourierDocument>();
}

// find multiple for admin
function findCouriersByUserIds(userIds: Array<string | Types.ObjectId>,) {
  return Courier.find({ userId: { $in: userIds,},})
    .lean<CourierDocument[]>();
}

export {
  createCourier,
  findCourierByUserId,
  findCouriersByUserIds,
};

export type { CreateCourierInput };