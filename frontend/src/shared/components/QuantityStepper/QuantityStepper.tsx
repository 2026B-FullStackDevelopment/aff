import { useEffect, useState } from 'react';
import { Minus, Plus } from 'lucide-react';
import { cn } from '@/shared/utils';
import { FormErrorAlert } from '@/shared/components/FormErrorAlert/FormErrorAlert';
import { IconField } from '@/shared/components/IconField/IconField';

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

const themeFocusRing: Record<ThemeRole, string> = {
  admin: 'focus:border-[#5b7bc0] focus:ring-[#5b7bc0]',
  recipient: 'focus:border-[#3D6852] focus:ring-[#3D6852]',
  donor: 'focus:border-[#805300] focus:ring-[#805300]',
};

export function QuantityStepper({
  value,
  min = 1,
  max,
  unitLabel,
  theme = 'recipient',
  onChange,
}: QuantityStepperProps) {
  const [inputValue, setInputValue] = useState<string>(String(value));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setInputValue(String(value));
  }, [value]);

  function decrement() {
    setError(null);
    onChange(Math.max(min, value - 1));
  }

  function increment() {
    setError(null);
    onChange(Math.min(max, value + 1));
  }

  function validateAndCommit(raw: string) {
    const trimmed = raw.trim();
    const parsed = Number(trimmed);

    if (trimmed === '' || Number.isNaN(parsed) || !Number.isInteger(parsed)) {
      setError(`Please enter a valid whole number between ${min} and ${max}.`);
      setInputValue(String(value));
      return;
    }

    if (parsed < min) {
      setError(`Quantity must be at least ${min}.`);
      setInputValue(String(value));
      return;
    }

    if (parsed > max) {
      setError(`Quantity cannot exceed ${max}${unitLabel ? ` ${unitLabel}` : ''}.`);
      setInputValue(String(value));
      return;
    }

    setError(null);
    onChange(parsed);
    setInputValue(String(parsed));
  }

  function handleInputChange(event: React.ChangeEvent<HTMLInputElement>) {
    setError(null);
    setInputValue(event.target.value);
  }

  function handleInputBlur() {
    validateAndCommit(inputValue);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') {
      event.preventDefault();
      validateAndCommit(inputValue);
    } else if (event.key === 'Escape') {
      setError(null);
      setInputValue(String(value));
      event.currentTarget.blur();
    }
  }

  return (
    <div className="space-y-2">
      <div
        className={cn(
          'flex h-11 items-center justify-between gap-2 rounded-lg border bg-slate-50 px-2 transition-colors duration-150',
          error ? 'border-red-300' : 'border-slate-200',
        )}
      >
        <button
          type="button"
          aria-label="Decrease quantity"
          onClick={decrement}
          disabled={value <= min}
          className={cn(
            'flex size-7 shrink-0 items-center justify-center rounded-md text-slate-600 transition-colors duration-150',
            'disabled:cursor-not-allowed disabled:opacity-40',
            themeButtonHover[theme],
          )}
        >
          <Minus className="size-4" aria-hidden="true" />
        </button>

        <div className="flex items-center justify-center gap-1.5 px-1">
          <IconField
            id="Quantity"
            name="quantity"
            theme={theme}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            aria-label="Quantity"
            value={inputValue}
            onChange={handleInputChange}
            onBlur={handleInputBlur}
            onKeyDown={handleKeyDown}
            className={cn(
              'h-7 w-18 px-1 text-center'
            )}
          />
          {unitLabel && (
            <span className="whitespace-nowrap text-xs font-semibold text-slate-600">
              {unitLabel}
            </span>
          )}
        </div>

        <button
          type="button"
          aria-label="Increase quantity"
          onClick={increment}
          disabled={value >= max}
          className={cn(
            'flex size-7 shrink-0 items-center justify-center rounded-md text-slate-600 transition-colors duration-150',
            'disabled:cursor-not-allowed disabled:opacity-40',
            themeButtonHover[theme],
          )}
        >
          <Plus className="size-4" aria-hidden="true" />
        </button>
      </div>

      <FormErrorAlert message={error} />
    </div>
  );
}

export default QuantityStepper;
