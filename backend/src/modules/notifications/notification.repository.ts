// Contains Notification database queries so the service does not call Mongoose directly.
import Notification, { type NotificationDocument, type NotificationType } from './notification.model.js';
import { Types, type PipelineStage } from 'mongoose';

interface CreateNotificationInput {
  userId: string | Types.ObjectId;
  type: NotificationType;
  message: string;
  orderId?: string | Types.ObjectId | null;
  listingId?: string | Types.ObjectId | null;
}

interface NotificationPage {
  items: NotificationDocument[];
  page: number;
  limit: number;
  total: number;
}

interface NotificationAggregationResult {
  items: NotificationDocument[];
  metadata: Array<{ total: number }>;
}

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
export type { CreateNotificationInput, NotificationPage };
