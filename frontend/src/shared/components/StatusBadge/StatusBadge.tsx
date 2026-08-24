import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/shared/utils';

const statusBadgeVariants = cva(
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold select-none',
  {
    variants: {
      status: {
        available:
          'bg-emerald-100 text-emerald-800',
        active:
          'bg-emerald-100 text-emerald-800',
        collected:
          'bg-emerald-100 text-emerald-800',
        delivered:
          'bg-emerald-100 text-emerald-800',
        paid:
          'bg-emerald-100 text-emerald-800',
        free:
          'bg-emerald-100 text-emerald-800',

        reserved:
          'bg-amber-100 text-amber-800',
        paused:
          'bg-[#FFF6E3] text-[#805300]',
        pending:
          'bg-amber-100 text-amber-800',
        paymentpending:
          'bg-amber-100 text-amber-800',
        refundpending:
          'bg-blue-100 text-blue-800',
        refunded:
          'bg-slate-100 text-slate-700',
        pendingpayment:
          'bg-amber-100 text-amber-800',
        awaitingcourier:
          'bg-amber-100 text-amber-800',
        preparing:
          'bg-amber-100 text-amber-800',
        assigned:
          'bg-amber-100 text-amber-800',

        pickedup:
          'bg-blue-100 text-blue-800',
        outfordelivery:
          'bg-blue-100 text-blue-800',
        cancelledbydonor:
          'bg-blue-100 text-blue-800',

        cancelled:
          'bg-red-100 text-red-700',
        cancelledbyrecipient:
          'bg-red-100 text-red-700',
        expired:
          'bg-red-100 text-red-700',

        soldout:
          'bg-[#FFF6E3] text-[#805300]',
        inactive:
          'bg-slate-100 text-slate-600',

        default:
          'bg-slate-100 text-slate-600',
      },
    },
    defaultVariants: {
      status: 'default',
    },
  },
);

type StatusKey = NonNullable<
  VariantProps<typeof statusBadgeVariants>['status']
>;

const STATUS_KEYS: readonly StatusKey[] = [
  'available',
  'active',
  'collected',
  'delivered',
  'paid',
  'free',
  'reserved',
  'paused',
  'pending',
  'paymentpending',
  'refundpending',
  'refunded',
  'pendingpayment',
  'awaitingcourier',
  'preparing',
  'assigned',
  'pickedup',
  'outfordelivery',
  'cancelledbydonor',
  'cancelled',
  'cancelledbyrecipient',
  'expired',
  'soldout',
  'inactive',
  'default',
];

interface StatusBadgeProps {
  status: string;
  label?: string;
  className?: string;
}

function normalizeStatus(status: string): string {
  return status
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, '');
}

function resolveStatusKey(status: string): StatusKey {
  const normalized = normalizeStatus(status);

  return STATUS_KEYS.includes(normalized as StatusKey)
    ? (normalized as StatusKey)
    : 'default';
}

function formatStatusLabel(status: string): string {
  return status
    .trim()
    .toLowerCase()
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map(
      (word) =>
        word.charAt(0).toUpperCase() + word.slice(1),
    )
    .join(' ');
}

/**
 * Displays listing, order, payment, and delivery statuses consistently.
 */
export function StatusBadge({
  status,
  label,
  className,
}: StatusBadgeProps) {
  const statusKey = resolveStatusKey(status);
  const displayLabel = label ?? formatStatusLabel(status);

  return (
    <span
      className={cn(
        statusBadgeVariants({ status: statusKey }),
        className,
      )}
    >
      {displayLabel}
    </span>
  );
}

export default StatusBadge;