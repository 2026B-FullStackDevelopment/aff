import type { LucideIcon } from 'lucide-react';
import { Banknote, CreditCard } from 'lucide-react';
import { cn } from '@/shared/utils';
import type { PaymentMethod } from '@/types/api';

interface Option {
  value: PaymentMethod;
  label: string;
  icon: LucideIcon;
}

const OPTIONS: Option[] = [
  { value: 'STRIPE', label: 'Credit Card', icon: CreditCard },
  { value: 'CASH', label: 'Cash', icon: Banknote },
];

interface PaymentMethodSelectorProps {
  value: PaymentMethod | null;
  isFree: boolean;
  onChange: (method: PaymentMethod) => void;
  className?: string;
}

export function PaymentMethodSelector({
  value,
  isFree,
  onChange,
  className,
}: PaymentMethodSelectorProps) {
  return (
    <div className={cn('flex flex-col gap-3', className)} role="radiogroup" aria-label="Payment method">
      {OPTIONS.map((option) => {
        // Free listings never take a payment: Credit Card has nothing to
        // charge, so it's disabled rather than hidden (keeps the layout
        // stable and explains *why* it's unavailable).
        const isDisabled = isFree && option.value === 'STRIPE';
        const isSelected = value === option.value;
        const Icon = option.icon;

        return (
          <label
            key={option.value}
            className={cn(
              'flex items-start gap-3 rounded-lg border bg-white p-3 transition-all duration-200 ease-out',
              isDisabled
                ? 'cursor-not-allowed border-slate-200 opacity-60'
                : 'cursor-pointer border-slate-200 hover:border-[#3D6852]/40',
              isSelected && !isDisabled && 'border-[#3D6852] ring-1 ring-[#3D6852]/20',
            )}
          >
            <input
              type="radio"
              name="paymentMethod"
              value={option.value}
              checked={isSelected}
              disabled={isDisabled}
              onChange={() => onChange(option.value)}
              className="mt-0.5 size-4 shrink-0 accent-[#3D6852] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#3D6852]/20 disabled:cursor-not-allowed"
            />

            <span className="flex min-w-0 flex-col gap-0.5">
              <span className="flex items-center gap-2 text-sm font-semibold text-[#414844]">
                <Icon className="size-4 shrink-0" aria-hidden="true" />
                {option.label}
              </span>

              {isDisabled && (
                <span className="text-xs font-semibold text-red-600">
                  Not applicable for free items
                </span>
              )}
            </span>
          </label>
        );
      })}
    </div>
  );
}

export default PaymentMethodSelector;
