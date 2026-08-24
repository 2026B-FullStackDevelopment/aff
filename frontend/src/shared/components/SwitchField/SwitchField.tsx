import { cn } from '@/shared/utils';

export type ThemeRole = 'admin' | 'recipient' | 'donor';

interface SwitchFieldProps {
  id: string;
  label: string;
  checked: boolean;
  description?: string;
  disabled?: boolean;
  theme?: ThemeRole;
  className?: string;
  onCheckedChange: (checked: boolean) => void;
}

const themeCheckedStyles: Record<ThemeRole, string> = {
  admin: 'bg-[#5b7bc0]',
  recipient: 'bg-[#3D6852]',
  donor: 'bg-[#805300]',
};

const themeFocusStyles: Record<ThemeRole, string> = {
  admin: 'focus-visible:ring-[#5b7bc0]/25',
  recipient: 'focus-visible:ring-[#3D6852]/25',
  donor: 'focus-visible:ring-[#805300]/25',
};

export function SwitchField({
  id,
  label,
  checked,
  description,
  disabled = false,
  theme = 'admin',
  className,
  onCheckedChange,
}: SwitchFieldProps) {
  const descriptionId = description
    ? `${id}-description`
    : undefined;

  return (
    <div
      className={cn(
        'flex items-center justify-between gap-4 rounded-lg border border-slate-200 bg-white p-3',
        className,
      )}
    >
      <label
        htmlFor={id}
        className={cn(
          'flex min-w-0 flex-1 flex-col gap-1',
          disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer',
        )}
      >
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
      </label>

      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-describedby={descriptionId}
        disabled={disabled}
        onClick={() => onCheckedChange(!checked)}
        className={cn(
          'relative h-6 w-11 shrink-0 rounded-full transition-all duration-200 ease-out',
          'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-offset-0',
          'disabled:cursor-not-allowed disabled:opacity-60',
          checked ? themeCheckedStyles[theme] : 'bg-slate-300',
          themeFocusStyles[theme],
        )}
      >
        <span
          aria-hidden="true"
          className={cn(
            'absolute left-0.5 top-0.5 size-5 rounded-full bg-white shadow-sm',
            'transition-transform duration-200 ease-out',
            checked && 'translate-x-5',
          )}
        />
      </button>
    </div>
  );
}

export default SwitchField;