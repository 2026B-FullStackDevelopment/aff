// Shapes Notification response data crossing the backend's external boundary.
import type { NotificationDocument } from './notification.model.js';

interface NotificationResponseDto {
  id: string;
  type: string;
  message: string;
  orderId: string | null;
  listingId: string | null;
  createdAt: Date;
}

function toNotificationResponseDto(notification: NotificationDocument): NotificationResponseDto {
  return {
    id: String(notification._id),
    type: notification.type,
    message: notification.message,
    orderId: notification.orderId ? String(notification.orderId) : null,
    listingId: notification.listingId ? String(notification.listingId) : null,
    createdAt: notification.createdAt,
  };
}

export { toNotificationResponseDto };
export type { NotificationResponseDto };
