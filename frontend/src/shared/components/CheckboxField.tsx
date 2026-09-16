import type { ComponentProps, ReactNode } from 'react';
import { cn } from '@/shared/utils';

export type ThemeRole = 'admin' | 'recipient' | 'donor';

interface CheckboxFieldProps
  extends Omit<ComponentProps<'input'>, 'type' | 'id' | 'name'> {
  id: string;
  name: string;
  label: ReactNode;
  description?: string;
  error?: string;
  theme?: ThemeRole;
}

const themeStyles: Record<ThemeRole, string> = {
  admin:
    'accent-[#5b7bc0] focus-visible:ring-[#5b7bc0]/20',
  recipient:
    'accent-[#3D6852] focus-visible:ring-[#3D6852]/20',
  donor:
    'accent-[#805300] focus-visible:ring-[#805300]/20',
};

export function CheckboxField({
  id,
  name,
  label,
  description,
  error,
  theme = 'admin',
  className,
  disabled,
  ...inputProps
}: CheckboxFieldProps) {
  const descriptionId = description
    ? `${id}-description`
    : undefined;

  const errorId = error ? `${id}-error` : undefined;

  const describedBy = [descriptionId, errorId]
    .filter(Boolean)
    .join(' ') || undefined;

  return (
    <div className="flex w-full flex-col gap-1.5">
      <label
        htmlFor={id}
        className={cn(
          'flex items-start gap-3 rounded-lg border border-slate-200 bg-white p-3',
          'transition-all duration-200 ease-out',
          disabled
            ? 'cursor-not-allowed opacity-60'
            : 'cursor-pointer hover:border-slate-300',
          error && 'border-red-300',
        )}
      >
        <input
          id={id}
          name={name}
          type="checkbox"
          disabled={disabled}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
          className={cn(
            'mt-0.5 size-4 shrink-0 cursor-pointer rounded border-slate-300',
            'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-offset-0',
            'disabled:cursor-not-allowed',
            themeStyles[theme],
            className,
          )}
          {...inputProps}
        />

        <span className="flex min-w-0 flex-col gap-1">
          <span className="text-sm font-semibold text-[#414844]">
            {label}
          </span>

          {description && (
            <span
              id={descriptionId}
              className="text-xs leading-5 text-[#6B7280]"
            >
              {description}
            </span>
          )}
        </span>
      </label>

      {error && (
        <p
          id={errorId}
          className="text-xs font-semibold text-red-600 animate-in fade-in-50 duration-200"
        >
          {error}
        </p>
      )}
    </div>
  );
}

export default CheckboxField;
