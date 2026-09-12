// Contains the sole place that both emits a live notification event and persists it (Epic H, H1).
import * as notificationRepository from './notification.repository.js';
import { emitToUser } from '../../realtime/socket.js';
import type { NotificationType } from './notification.model.js';

interface SendNotificationParams {
  userId: string;
  type: NotificationType;
  event?: string;
  orderId?: string;
  listingId?: string;
  payload: Record<string, unknown>;
  persist?: boolean;
}

// DELIVERY_STATUS has no single default event — it covers both
// `order:status_changed` and `delivery:delivered` — so callers must pass
// `event` explicitly for that type.
const DEFAULT_EVENT_BY_TYPE: Partial<Record<NotificationType, string>> = {
  SOLD_OUT: 'listing:sold_out',
  PAYMENT_SUCCESS: 'payment:success',
  PAYMENT_REFUNDED: 'payment:refunded',
  PREMIUM_MATCH: 'notification:premium_match',
  ADMIN_CANCEL: 'notification:admin_cancel',
};

const DELIVERY_STAGE_LABELS: Record<string, string> = {
  AWAITING_COURIER: 'awaiting a courier',
  ASSIGNED: 'assigned to a courier',
  PICKED_UP: 'picked up by your courier',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled',
};

function resolveEventName(type: NotificationType, event?: string): string {
  const resolved = event ?? DEFAULT_EVENT_BY_TYPE[type];

  if (!resolved) {
    throw new Error(`sendNotification requires an explicit "event" for type ${type}.`);
  }

  return resolved;
}

function buildMessage(type: NotificationType, event: string, payload: Record<string, unknown>): string {
  switch (type) {
    case 'SOLD_OUT':
      return `Your listing "${String(payload.name)}" just sold out.`;
    case 'PAYMENT_SUCCESS':
      return 'Your payment was successful.';
    case 'PAYMENT_REFUNDED':
      return 'Your payment was refunded.';
    case 'DELIVERY_STATUS':
      return event === 'delivery:delivered'
        ? 'Your order has been delivered.'
        : `Your order's delivery status is now ${DELIVERY_STAGE_LABELS[String(payload.stage)] ?? String(payload.stage).toLowerCase()}.`;
    case 'PREMIUM_MATCH':
      return 'A new listing matches your notification preferences.';
    case 'ADMIN_CANCEL':
      return 'Your order was cancelled by an admin.';
    default:
      return 'You have a new notification.';
  }
}

/**
 * Emits the live Socket.IO event for `type`, then persists a matching
 * NOTIFICATION row. Never throws or rejects: a failure to resolve/emit is
 * logged and the persistence step is skipped; a failure to persist is
 * logged separately. Either way the caller's own action is never blocked
 * or failed by this call (H1).
 */
async function sendNotification(params: SendNotificationParams): Promise<void> {
  const { userId, type, event, orderId, listingId, payload, persist = true } = params;

  let resolvedEvent: string;
  let message: string;
  try {
    resolvedEvent = resolveEventName(type, event);
    message = buildMessage(type, resolvedEvent, payload);
    emitToUser(userId, resolvedEvent, { ...payload, message });
  } catch (error) {
    console.error('Failed to emit a realtime notification event:', error);
    return;
  }

  if (!persist) {
    return;
  }

  try {
    await notificationRepository.create({ userId, type, message, orderId, listingId });
  } catch (error) {
    console.error('Failed to persist a notification:', error);
  }
}

function listMyNotifications(userId: string, page: number, limit: number) {
  return notificationRepository.findByUserId(userId, page, limit);
}

export { sendNotification, listMyNotifications };
export type { SendNotificationParams };
