// Contains Notification database queries so the service does not call Mongoose directly.
import Notification from './notification.model.js';
import type { NotificationDocument } from './notification.types.js';
import { Types, type PipelineStage } from 'mongoose';
import type { CreateNotificationInput, NotificationAggregationResult, NotificationPage } from './notification.types.js';

function create(data: CreateNotificationInput) {
  return Notification.create({
    userId: data.userId,
    type: data.type,
    message: data.message,
    orderId: data.orderId ?? null,
    listingId: data.listingId ?? null,
  });
}

async function findByUserId(
  userId: string | Types.ObjectId,
  page: number,
  limit: number,
): Promise<NotificationPage> {
  const userObjectId = typeof userId === 'string' ? new Types.ObjectId(userId) : userId;
  const skip = (page - 1) * limit;

  const pipeline: PipelineStage[] = [
    { $match: { userId: userObjectId } },
    { $sort: { createdAt: -1, _id: -1 } },
    {
      $facet: {
        items: [{ $skip: skip }, { $limit: limit }],
        metadata: [{ $count: 'total' }],
      },
    },
  ];

  const [result] = await Notification.aggregate<NotificationAggregationResult>(pipeline);

  return {
    items: result?.items ?? [],
    page,
    limit,
    total: result?.metadata[0]?.total ?? 0,
  };
}

export { create, findByUserId };
export type { CreateNotificationInput, NotificationPage } from './notification.types.js';
