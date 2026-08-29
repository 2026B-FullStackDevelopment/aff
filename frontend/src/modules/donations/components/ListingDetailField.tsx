import type { ReactNode } from 'react';
import { cn } from '@/shared/utils';

export interface ListingDetailFieldProps {
  label: string;
  value: ReactNode;
  className?: string;
  valueClassName?: string;
}

// Renders a key-value description list pair for donation listings and order summaries.
export function ListingDetailField({
  label,
  value,
  className,
  valueClassName,
}: ListingDetailFieldProps) {
  return (
    <div className={cn('min-w-0', className)}>
      <dt className="text-[0.68rem] font-bold uppercase tracking-wider text-[#6B7280]">
        {label}
      </dt>

      <dd
        className={cn(
          'mt-1 break-words text-sm font-semibold text-[#1B1C1C]',
          valueClassName,
        )}
      >
        {value}
      </dd>
    </div>
  );
}

export default ListingDetailField;
