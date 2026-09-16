import { Store } from 'lucide-react';
import { QuantityStepper } from '@/shared/components/QuantityStepper';
import { UNIT_LABELS, shortCityLabel } from '@/shared/utils/listingFormatting';
import type { ListingDetailDTO } from '@/types/api';

interface OrderItemSummaryProps {
  listing: ListingDetailDTO;
  quantity: number;
  maxQuantity?: number;
  onQuantityChange?: (next: number) => void;
}

export function OrderItemSummary({
  listing,
  quantity,
  maxQuantity,
  onQuantityChange,
}: OrderItemSummaryProps) {
  const isEditable = typeof maxQuantity === 'number' && Boolean(onQuantityChange);

  return (
    <div className="flex gap-4">
      <div className="size-24 shrink-0 overflow-hidden rounded-lg bg-slate-100">
        {listing.imageUrl ? (
          <img src={listing.imageUrl} alt={listing.name} className="size-full object-cover" />
        ) : (
          <div className="flex size-full items-center justify-center text-xs text-slate-400">
            No image
          </div>
        )}
      </div>

      <div className="flex min-w-0 flex-col gap-2">
        <div>
          <h2 className="truncate text-lg font-bold text-[#1B1C1C]">{listing.name}</h2>
          <p className="mt-0.5 flex items-center gap-1.5 text-sm text-[#414844]">
            <Store className="size-3.5 shrink-0" aria-hidden="true" />
            Donated by {listing.donor.companyName} {shortCityLabel(listing.city)}
          </p>
        </div>

        {isEditable ? (
          <div>
            <p className="mb-1 text-[0.65rem] font-bold uppercase tracking-wider text-[#6B7280]">
              Quantity
            </p>
            <QuantityStepper
              value={quantity}
              max={maxQuantity as number}
              unitLabel={UNIT_LABELS[listing.unit]}
              theme="recipient"
              onChange={onQuantityChange as (next: number) => void}
            />
          </div>
        ) : (
          <span className="inline-flex w-fit flex-col rounded-lg bg-[#f0f7f3] px-3 py-1.5">
            <span className="text-[0.65rem] font-bold uppercase tracking-wider text-[#6B7280]">
              Quantity
            </span>
            <span className="text-sm font-bold text-[#2E5A47]">
              {quantity} {UNIT_LABELS[listing.unit] ?? ''}
            </span>
          </span>
        )}
      </div>
    </div>
  );
}

export default OrderItemSummary;
