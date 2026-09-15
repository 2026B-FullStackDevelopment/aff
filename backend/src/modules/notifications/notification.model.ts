// Defines the MongoDB shape for a durable, fetchable notification (docs/database_design.md § NOTIFICATION).
import mongoose, { Schema } from 'mongoose';
import type { NotificationDocument } from './notification.types.js';

const notificationSchema = new Schema<NotificationDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: {
      type: String,
      enum: ['SOLD_OUT', 'PREMIUM_MATCH', 'ADMIN_CANCEL', 'PAYMENT_SUCCESS', 'PAYMENT_REFUNDED', 'DELIVERY_STATUS'],
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
export type { NotificationAttrs, NotificationDocument, NotificationType } from './notification.types.js';
