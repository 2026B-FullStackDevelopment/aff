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
];
