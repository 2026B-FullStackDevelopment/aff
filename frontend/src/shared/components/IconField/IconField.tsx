import React, { ComponentProps } from 'react';
import { LucideIcon, Info } from 'lucide-react';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { cn } from '@/shared/utils';

export type ThemeRole = 'admin' | 'recipient' | 'donor';

interface IconFieldProps extends Omit<ComponentProps<typeof Input>, 'id' | 'name'> {
  id: string;
  name: string;
  label?: string;
  required?: boolean;
  icon?: LucideIcon;
  error?: string;
  helperText?: string;
  theme?: ThemeRole;
}

const themeFocusStyles: Record<ThemeRole, { input: string; icon: string }> = {
  admin: {
    input: 'focus-visible:border-admin-primary focus-visible:ring-admin-primary/15',
    icon: 'group-focus-within/field:text-admin-primary',
  },
  recipient: {
    input: 'focus-visible:border-[#3D6852] focus-visible:ring-[#3D6852]/15',
    icon: 'group-focus-within/field:text-[#3D6852]',
  },
  donor: {
    input: 'focus-visible:border-[#805300] focus-visible:ring-[#805300]/15',
    icon: 'group-focus-within/field:text-[#805300]',
  },
};

export function IconField({
  id,
  name,
  label,
  required = false,
  icon: IconComponent,
  error,
  helperText,
  theme = 'admin',
  className,
  ...inputProps
}: IconFieldProps) {
  const errorId = error ? `${id}-error` : undefined;
  const currentTheme = themeFocusStyles[theme] || themeFocusStyles.admin;

  return (
    <div className="flex flex-col gap-1.5 w-full">
      {label && (
        <Label htmlFor={id} className="text-[0.75rem] font-bold uppercase tracking-wider text-slate-600 select-none">
          {label} {required && <span className="text-red-600">*</span>}
        </Label>
      )}

      <div className="relative flex items-center group/field">
        {IconComponent && (
          <IconComponent
            className={cn(
              "absolute left-3.5 h-4 w-4 text-gray-400 pointer-events-none transition-colors duration-200 ease-out",
              currentTheme.icon
            )}
          />
        )}

        <Input
          id={id}
          name={name}
          aria-invalid={Boolean(error)}
          aria-describedby={errorId}
          className={cn(
            "h-11 rounded-lg border-slate-200 text-slate-800 placeholder:text-gray-400 text-sm transition-all duration-200 ease-out focus-visible:ring-4 focus-visible:ring-offset-0",
            IconComponent ? "pl-10" : "px-3",
            currentTheme.input,
            className
          )}
          {...inputProps}
        />
      </div>

      {helperText && (
        <div className="flex items-center gap-1 text-[0.75rem] text-slate-400 mt-0.5">
          <Info className="h-3 w-3 shrink-0" />
          <span>{helperText}</span>
        </div>
      )}

      {error && (
        <p id={errorId} className="text-xs font-semibold text-red-600 animate-in fade-in-50 duration-200">
          {error}
        </p>
      )}
    </div>
  );
}

export default IconField;
