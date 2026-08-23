import type { ComponentProps } from 'react';
import { Info } from 'lucide-react';
import { Label } from '@/shared/components/ui/label';
import { cn } from '@/shared/utils';

export type ThemeRole = 'admin' | 'recipient' | 'donor';

interface TextareaFieldProps
  extends Omit<ComponentProps<'textarea'>, 'id' | 'name'> {
  id: string;
  name: string;
  label?: string;
  required?: boolean;
  error?: string;
  helperText?: string;
  theme?: ThemeRole;
}

const themeFocusStyles: Record<ThemeRole, string> = {
  admin:
    'focus-visible:border-[#5b7bc0] focus-visible:ring-[#5b7bc0]/15',
  recipient:
    'focus-visible:border-[#3D6852] focus-visible:ring-[#3D6852]/15',
  donor:
    'focus-visible:border-[#805300] focus-visible:ring-[#805300]/15',
};

export function TextareaField({
  id,
  name,
  label,
  required = false,
  error,
  helperText,
  theme = 'admin',
  className,
  ...textareaProps
}: TextareaFieldProps) {
  const errorId = error ? `${id}-error` : undefined;
  const helperId = helperText ? `${id}-helper` : undefined;

  const describedBy = [helperId, errorId]
    .filter(Boolean)
    .join(' ') || undefined;

  return (
    <div className="flex w-full flex-col gap-1.5">
      {label && (
        <Label
          htmlFor={id}
          className="text-[0.75rem] font-bold uppercase tracking-wider text-slate-600 select-none"
        >
          {label}

          {required && (
            <span className="text-red-600">*</span>
          )}
        </Label>
      )}

      <textarea
        id={id}
        name={name}
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy}
        className={cn(
          'min-h-24 w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none',
          'placeholder:text-gray-400 transition-all duration-200 ease-out',
          'focus-visible:ring-4 focus-visible:ring-offset-0',
          'disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-slate-100 disabled:opacity-60',
          themeFocusStyles[theme],
          className,
        )}
        {...textareaProps}
      />

      {helperText && (
        <div
          id={helperId}
          className="mt-0.5 flex items-center gap-1 text-[0.75rem] text-slate-400"
        >
          <Info className="size-3 shrink-0" aria-hidden="true" />
          <span>{helperText}</span>
        </div>
      )}

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

export default TextareaField;