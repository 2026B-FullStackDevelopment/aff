// Defines internal persistence, repository, and service types for notifications.
import type mongoose from 'mongoose';
import type { Types } from 'mongoose';

type NotificationType = 'SOLD_OUT' | 'PREMIUM_MATCH' | 'ADMIN_CANCEL' | 'PAYMENT_SUCCESS' | 'PAYMENT_REFUNDED' | 'DELIVERY_STATUS';
interface NotificationAttrs {
  userId: mongoose.Types.ObjectId;
  type: NotificationType;
  message: string;
  orderId: mongoose.Types.ObjectId | null;
  listingId: mongoose.Types.ObjectId | null;
}
interface NotificationDocument extends NotificationAttrs, mongoose.Document { createdAt: Date }
interface CreateNotificationInput {
  userId: string | Types.ObjectId;
  type: NotificationType;
  message: string;
  orderId?: string | Types.ObjectId | null;
  listingId?: string | Types.ObjectId | null;
}
interface NotificationPage { items: NotificationDocument[]; page: number; limit: number; total: number }
interface NotificationAggregationResult { items: NotificationDocument[]; metadata: Array<{ total: number }> }
interface SendNotificationParams {
  userId: string;
  type: NotificationType;
  event?: string;
  orderId?: string;
  listingId?: string;
  payload: Record<string, unknown>;
  persist?: boolean;
}

export type { NotificationType, NotificationAttrs, NotificationDocument, CreateNotificationInput, NotificationPage, NotificationAggregationResult, SendNotificationParams };
