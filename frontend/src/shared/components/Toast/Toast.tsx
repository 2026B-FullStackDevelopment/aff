import {
  AlertCircle,
  AlertTriangle,
  BellRing,
  CheckCircle2,
  X,
} from 'lucide-react';
import { cva, type VariantProps } from 'class-variance-authority';
import { Button } from '@/shared/components/Button/Button';
import { cn } from '@/shared/utils';

const toastVariants = cva(
  'flex w-full max-w-sm items-start gap-3 rounded-xl border p-4 shadow-lg transition-all duration-200 ease-out',
  {
    variants: {
      variant: {
        info:
          'border-blue-200 bg-blue-50 text-blue-950',
        success:
          'border-emerald-200 bg-emerald-50 text-emerald-950',
        warning:
          'border-[#D5B77D] bg-[#FFF6E3] text-[#5B3A00]',
        error:
          'border-red-200 bg-red-50 text-red-950',
      },
    },
    defaultVariants: {
      variant: 'info',
    },
  },
);

type ToastVariant = NonNullable<
  VariantProps<typeof toastVariants>['variant']
>;

interface ToastProps {
  title: string;
  message: string;
  variant?: ToastVariant;
  imageUrl?: string | null;
  className?: string;
  onClose?: () => void;
}

const toastIcons: Record<ToastVariant, typeof BellRing> = {
  info: BellRing,
  success: CheckCircle2,
  warning: AlertTriangle,
  error: AlertCircle,
};

/**
 * Presentational notification displayed inside a toast viewport.
 *
 * Visibility and automatic dismissal are controlled by the parent.
 */
export function Toast({
  title,
  message,
  variant = 'info',
  imageUrl,
  className,
  onClose,
}: ToastProps) {
  const Icon = toastIcons[variant];
  const isError = variant === 'error';

  return (
    <section
      className={cn(
        toastVariants({ variant }),
        className,
      )}
      role={isError ? 'alert' : 'status'}
      aria-live={isError ? 'assertive' : 'polite'}
      aria-atomic="true"
    >
      {imageUrl ? (
        <img
          src={imageUrl}
          alt=""
          className="size-10 shrink-0 rounded-full object-cover"
        />
      ) : (
        <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white/70">
          <Icon className="size-5" aria-hidden="true" />
        </div>
      )}

      <div className="min-w-0 flex-1">
        <h2 className="text-sm font-bold">
          {title}
        </h2>

        <p className="mt-0.5 text-xs leading-5 opacity-80">
          {message}
        </p>
      </div>

      {onClose && (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={onClose}
          aria-label="Dismiss notification"
          className="shrink-0 text-current hover:bg-black/5"
        >
          <X className="size-4" aria-hidden="true" />
        </Button>
      )}
    </section>
  );
}

export default Toast;