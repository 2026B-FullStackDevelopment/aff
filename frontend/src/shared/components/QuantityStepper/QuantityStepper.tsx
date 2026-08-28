import { Minus, Plus } from 'lucide-react';
import { cn } from '@/shared/utils';

export type ThemeRole = 'admin' | 'recipient' | 'donor';

interface QuantityStepperProps {
  value: number;
  min?: number;
  max: number;
  unitLabel?: string;
  theme?: ThemeRole;
  onChange: (next: number) => void;
}

const themeButtonHover: Record<ThemeRole, string> = {
  admin: 'hover:bg-[#5b7bc0]/10',
  recipient: 'hover:bg-[#3D6852]/10',
  donor: 'hover:bg-[#805300]/10',
};

/**
 * Reusable +/- stepper. Used by FoodCard's reserve control, but kept
 * generic (no listing-specific knowledge) so it can be reused anywhere a
 * bounded integer needs adjusting (e.g. rationLimitPerPerson elsewhere).
 */
export function QuantityStepper({
  value,
  min = 1,
  max,
  unitLabel,
  theme = 'recipient',
  onChange,
}: QuantityStepperProps) {
  function decrement() {
    onChange(Math.max(min, value - 1));
  }

  function increment() {
    onChange(Math.min(max, value + 1));
  }

  return (
    <div className="flex h-11 items-center justify-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-2">
      <button
        type="button"
        aria-label="Decrease quantity"
        onClick={decrement}
        disabled={value <= min}
        className={cn(
          'flex size-7 items-center justify-center rounded-md text-slate-600 transition-colors duration-150',
          'disabled:cursor-not-allowed disabled:opacity-40',
          themeButtonHover[theme],
        )}
      >
        <Minus className="size-4" aria-hidden="true" />
      </button>

      <span className="min-w-28 text-center text-sm font-bold text-slate-700" aria-live="polite">
        Quantity: {value}
        {unitLabel ? ` ${unitLabel}` : ''}
      </span>

      <button
        type="button"
        aria-label="Increase quantity"
        onClick={increment}
        disabled={value >= max}
        className={cn(
          'flex size-7 items-center justify-center rounded-md text-slate-600 transition-colors duration-150',
          'disabled:cursor-not-allowed disabled:opacity-40',
          themeButtonHover[theme],
        )}
      >
        <Plus className="size-4" aria-hidden="true" />
      </button>
    </div>
  );
}

export default QuantityStepper;
