// Defines the MongoDB shape for a durable, fetchable notification (docs/database_design.md § NOTIFICATION).
import mongoose, { Schema } from 'mongoose';

type NotificationType =
  | 'SOLD_OUT'
  | 'PREMIUM_MATCH'
  | 'ADMIN_CANCEL'
  | 'PAYMENT_SUCCESS'
  | 'DELIVERY_STATUS';

interface NotificationAttrs {
  userId: mongoose.Types.ObjectId;
  type: NotificationType;
  message: string;
  orderId: mongoose.Types.ObjectId | null;
  listingId: mongoose.Types.ObjectId | null;
}

interface NotificationDocument extends NotificationAttrs, mongoose.Document {
  createdAt: Date;
}

const notificationSchema = new Schema<NotificationDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: {
      type: String,
      enum: ['SOLD_OUT', 'PREMIUM_MATCH', 'ADMIN_CANCEL', 'PAYMENT_SUCCESS', 'DELIVERY_STATUS'],
      required: true,
    },
    message: { type: String, required: true },
    orderId: { type: Schema.Types.ObjectId, ref: 'Order', default: null },
    listingId: { type: Schema.Types.ObjectId, ref: 'Listing', default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

notificationSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.model<NotificationDocument>('Notification', notificationSchema);
export type { NotificationAttrs, NotificationDocument, NotificationType };
