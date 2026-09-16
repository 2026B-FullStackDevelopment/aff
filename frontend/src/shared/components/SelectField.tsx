import React, { ComponentProps } from 'react';
import { Label } from '@/shared/components/ui/label';
import { cn } from '@/shared/utils';

export type ThemeRole = 'admin' | 'recipient' | 'donor';

interface OptionItem {
  label: string;
  value: string;
}

interface SelectFieldProps extends Omit<ComponentProps<'select'>, 'id' | 'name'> {
  id: string;
  name: string;
  label?: string;
  required?: boolean;
  options: (string | OptionItem)[];
  placeholder?: string;
  error?: string;
  theme?: ThemeRole;
}

const themeFocusStyles: Record<ThemeRole, string> = {
  admin: 'focus-visible:border-[#5b7bc0] focus-visible:ring-[#5b7bc0]/15',
  recipient: 'focus-visible:border-[#3D6852] focus-visible:ring-[#3D6852]/15',
  donor: 'focus-visible:border-[#805300] focus-visible:ring-[#805300]/15',
};

export function SelectField({
  id,
  name,
  label,
  required = false,
  options,
  placeholder = 'Select option',
  error,
  theme = 'admin',
  className,
  value,
  onChange,
  ...selectProps
}: SelectFieldProps) {
  const errorId = error ? `${id}-error` : undefined;
  const currentFocus = themeFocusStyles[theme] || themeFocusStyles.admin;

  return (
    <div className="flex flex-col gap-1.5 w-full">
      {label && (
        <Label htmlFor={id} className="text-[0.75rem] font-bold uppercase tracking-wider text-slate-600 select-none">
          {label} {required && <span className="text-red-600">*</span>}
        </Label>
      )}

      <select
        id={id}
        name={name}
        value={value}
        onChange={onChange}
        aria-invalid={Boolean(error)}
        aria-describedby={errorId}
        className={cn(
          "h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-slate-800 text-sm outline-none transition-all duration-200 ease-out focus-visible:ring-4 focus-visible:ring-offset-0",
          currentFocus,
          className
        )}
        {...selectProps}
      >
        <option value="">{placeholder}</option>
        {options.map((opt) => {
          const val = typeof opt === 'string' ? opt : opt.value;
          const text = typeof opt === 'string' ? opt : opt.label;
          return (
            <option key={val} value={val}>
              {text}
            </option>
          );
        })}
      </select>

      {error && (
        <p id={errorId} className="text-xs font-semibold text-red-600 animate-in fade-in-50 duration-200">
          {error}
        </p>
      )}
    </div>
  );
}

export default SelectField;
