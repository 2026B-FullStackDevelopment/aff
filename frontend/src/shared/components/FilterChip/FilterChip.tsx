import { cn } from '@/shared/utils';

export type ThemeRole = 'admin' | 'recipient' | 'donor';

interface FilterChipProps {
  label: string;
  selected: boolean;
  theme?: ThemeRole;
  onClick: () => void;
}

const themeSelectedStyles: Record<ThemeRole, string> = {
  admin: 'border-[#5b7bc0] bg-[#5b7bc0] text-white',
  recipient: 'border-[#3D6852] bg-[#3D6852] text-white',
  donor: 'border-[#805300] bg-[#805300] text-white',
};

/**
 * Deliberately NOT StatusBadge — StatusBadge's variants are fixed to the
 * order/payment/delivery status enums (see StatusBadge.tsx), so reusing it
 * for an arbitrary toggleable filter value (a city, a tag) would misuse
 * its semantics. This is a plain, theme-aware toggle pill instead.
 */
export function FilterChip({ label, selected, theme = 'recipient', onClick }: FilterChipProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cn(
        'rounded-full border px-3 py-1.5 text-xs font-semibold transition-all duration-200 ease-out',
        selected
          ? themeSelectedStyles[theme]
          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50',
      )}
    >
      {label}
    </button>
  );
}

export default FilterChip;
