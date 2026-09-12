// Declarative event -> toast table. Adding a new live-toast notification
// type for any role means adding one row here — no new service file, no
// hand-written listener plumbing.
import type { UserRole } from '@/types/api';

export type ToastVariant = 'success' | 'warning' | 'error' | 'info';

export interface NotificationRegistryEntry<P = Record<string, unknown>> {
  event: string;
  roles: UserRole[];
  sound?: boolean;
  toast: (payload: P) => {
    variant: ToastVariant;
    title: string;
    description?: string;
    duration?: number;
  };
}

export const NOTIFICATION_REGISTRY: NotificationRegistryEntry[] = [
  {
    event: 'listing:sold_out',
    roles: ['DONOR'],
    sound: true,
    toast: (payload) => ({
      variant: 'warning',
      title: 'Listing sold out',
      description: String(payload.message),
      duration: 8000,
    }),
  },
  {
    event: 'payment:success',
    roles: ['RECIPIENT'],
    toast: () => ({
      variant: 'success',
      title: 'Payment confirmed',
      description: 'Your order is now in the queue.',
    }),
  },
  {
    event: 'payment:refunded',
    roles: ['RECIPIENT'],
    toast: () => ({
      variant: 'success',
      title: 'Refund confirmed',
      description: 'Your payment has been refunded.',
    }),
  },
  {
    event: 'notification:admin_cancel',
    roles: ['RECIPIENT'],
    toast: (payload) => ({
      variant: 'error',
      title: 'Order cancelled',
      description:
        typeof payload.message === 'string'
          ? payload.message
          : 'An Admin cancelled a listing in your order.',
      duration: 8000,
    }),
  },
  {
    // Handles the DELIVERED stage itself too, with its own copy, rather
    // than relying on the separate delivery:delivered event — that event
    // is emitted to both the user's personal room and the order room, and
    // a Recipient viewing the tracking page is in both simultaneously, so
    // it arrives twice (once with no `message`, per a documented backend
    // gap). order:status_changed has no such duplicate-room emission, so
    // it's the reliable single-fire source for this transition too.
    event: 'order:status_changed',
    roles: ['RECIPIENT'],
    toast: (payload) =>
      payload.stage === 'DELIVERED'
        ? {
            variant: 'success',
            title: 'Order delivered',
            description: 'Your order has been delivered.',
          }
        : {
            variant: 'info',
            title: 'Order update',
            description: String(payload.message),
          },
  },
];
