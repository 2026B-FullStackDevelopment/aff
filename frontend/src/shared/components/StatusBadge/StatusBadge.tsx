// Reusable status label for AFF states such as Available, Reserved, Active, or Pending.
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/shared/utils';

const statusBadgeVariants = cva(
  'inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold select-none',
  {
    variants: {
      status: {
        // Food listing statuses
        available:  'bg-emerald-100 text-emerald-800',
        reserved:   'bg-amber-100   text-amber-800',
        collected:  'bg-blue-100    text-blue-800',
        expired:    'bg-red-100     text-red-700',
        // Account / subscription statuses
        active:     'bg-emerald-100 text-emerald-800',
        inactive:   'bg-slate-100   text-slate-600',
        pending:    'bg-amber-100   text-amber-700',
        cancelled:  'bg-red-100     text-red-700',
        // Fallback
        default:    'bg-slate-100   text-slate-600',
      },
    },
    defaultVariants: {
      status: 'default',
    },
  }
);

type StatusKey = NonNullable<VariantProps<typeof statusBadgeVariants>['status']>;

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const key = status?.toLowerCase().replace(/\s+/g, '') as StatusKey;
  return (
    <span className={cn(statusBadgeVariants({ status: key }), className)}>
      {status}
    </span>
  );
}
