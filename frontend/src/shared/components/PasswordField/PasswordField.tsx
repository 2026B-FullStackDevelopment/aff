import { useState } from 'react';
import { Lock, Eye, EyeOff } from 'lucide-react';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { cn } from '@/shared/utils';

export type ThemeRole = 'admin' | 'recipient' | 'donor';

interface PasswordFieldProps {
  id: string;
  name: string;
  label?: string;
  required?: boolean;
  value: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  autoComplete?: string;
  error?: string;
  theme?: ThemeRole;
}

const themeFocusStyles: Record<ThemeRole, { input: string; button: string; icon: string }> = {
  admin: {
    input: 'focus-visible:border-[#5b7bc0] focus-visible:ring-[#5b7bc0]/15',
    button: 'focus-visible:ring-[#5b7bc0]/30',
    icon: 'group-focus-within/field:text-[#5b7bc0]',
  },
  recipient: {
    input: 'focus-visible:border-[#3D6852] focus-visible:ring-[#3D6852]/15',
    button: 'focus-visible:ring-[#3D6852]/30',
    icon: 'group-focus-within/field:text-[#3D6852]',
  },
  donor: {
    input: 'focus-visible:border-[#805300] focus-visible:ring-[#805300]/15',
    button: 'focus-visible:ring-[#805300]/30',
    icon: 'group-focus-within/field:text-[#805300]',
  },
};

export function PasswordField({
  id,
  name,
  label,
  required = false,
  value,
  onChange,
  placeholder = '••••••••',
  autoComplete = 'new-password',
  error,
  theme = 'admin',
}: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);
  const errorId = error ? `${id}-error` : undefined;
  const currentTheme = themeFocusStyles[theme] || themeFocusStyles.admin;

  return (
    <div className="flex flex-col gap-1.5 w-full">
      {label && (
        <Label htmlFor={id} className="text-[0.75rem] font-bold uppercase tracking-wider text-slate-700 select-none">
          {label} {required && <span className="text-red-600">*</span>}
        </Label>
      )}

      <div className="relative flex items-center group/field">
        <Lock
          className={cn(
            "absolute left-3.5 h-4 w-4 text-gray-400 pointer-events-none transition-colors duration-200 ease-out",
            currentTheme.icon
          )}
        />
        
        <Input
          id={id}
          name={name}
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          autoComplete={autoComplete}
          aria-invalid={Boolean(error)}
          aria-describedby={errorId}
          className={cn(
            "pl-10 pr-11 h-11 rounded-lg border-slate-200 bg-slate-50/50 text-slate-800 placeholder:text-gray-400 text-sm transition-all duration-200 ease-out focus-visible:bg-white focus-visible:ring-4 focus-visible:ring-offset-0",
            currentTheme.input
          )}
        />

        <button
          type="button"
          aria-label={visible ? 'Hide password' : 'Show password'}
          onClick={() => setVisible((v) => !v)}
          className={cn(
            "absolute right-3 p-1 rounded-md text-gray-400 hover:text-slate-700 hover:scale-105 active:scale-95 transition-all duration-150 ease-out outline-none focus-visible:ring-2",
            currentTheme.button
          )}
        >
          {visible ? <EyeOff className="h-4 w-4 transition-transform duration-200" /> : <Eye className="h-4 w-4 transition-transform duration-200" />}
        </button>
      </div>

      {error && (
        <p id={errorId} className="text-xs font-semibold text-red-600 animate-in fade-in-50 duration-200">
          {error}
        </p>
      )}
    </div>
  );
}

export default PasswordField;