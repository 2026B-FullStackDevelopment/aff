// DEVIATION NOTE: this replaces the earlier FoodCard, which took a plain
// `{ title, description, status, price }` FoodItem and rendered a single
// Reserve button. The Recipient Marketplace mock (design_system.md /
// screenshot) needs an image tile, city/vegetarian/category tags, a
// qty+date row, and an inline quantity stepper — none of which the old
// shape or hook supported, so both were rebuilt rather than extended.
import type { LucideIcon } from 'lucide-react';
import { Apple, Beef, Calendar, Droplet, Leaf, Package, UtensilsCrossed, Wheat } from 'lucide-react';
import { Button } from '@/shared/components/Button/Button';
import { QuantityStepper } from '@/shared/components/QuantityStepper/QuantityStepper';
import { StatusBadge } from '@/shared/components/StatusBadge/StatusBadge';
import { CATEGORY_OPTIONS } from '@/shared/constants/categories';
import { UNIT_OPTIONS } from '@/shared/constants/units';
import { cn } from '@/shared/utils';
import { useFoodCard } from '../hooks/useFoodCard';
import type { ListingSummary } from '../hooks/useFoodListings';

const CATEGORY_LABELS: Record<string, string> = Object.fromEntries(
  CATEGORY_OPTIONS.map((option) => [option.value, option.label]),
);

const UNIT_LABELS: Record<string, string> = Object.fromEntries(
  UNIT_OPTIONS.map((option) => [option.value, option.label]),
);

const CATEGORY_VISUALS: Record<string, { icon: LucideIcon; gradient: string }> = {
  FRUIT: { icon: Apple, gradient: 'from-rose-100 to-orange-100' },
  VEGETABLE: { icon: Leaf, gradient: 'from-emerald-100 to-emerald-200' },
  MEAT: { icon: Beef, gradient: 'from-orange-100 to-red-100' },
  COOKED_DISH: { icon: UtensilsCrossed, gradient: 'from-orange-100 to-orange-200' },
  BAKED_GOODS: { icon: Wheat, gradient: 'from-amber-100 to-amber-200' },
  DRINK: { icon: Droplet, gradient: 'from-yellow-100 to-amber-200' },
};

// Placeholder until the shared province-shortening util (see
// AddressAutocomplete.tsx's `resolveProvince`) exposes a short display
// label too — this just strips the "Thành phố "/"Tỉnh " prefix for the pill.
function shortCityLabel(city: string): string {
  return city.replace(/^(Thành phố|Tỉnh)\s+/i, '');
}

function formatPrice(price: number): string {
  if (price === 0) return 'Free';
  return `${price.toLocaleString('en-US')} VND`;
}

function formatDate(iso: string): string {
  const date = new Date(iso);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${day}/${month}/${date.getFullYear()}`;
}

interface FoodCardProps {
  listing: ListingSummary;
  onReserved: (listingId: string, quantity: number) => void;
}

export function FoodCard({ listing, onReserved }: FoodCardProps) {
  const { isExpanded, quantity, isSubmitting, error, maxQuantity, expand, cancel, setQuantity, confirm } =
    useFoodCard(listing, onReserved);

  const visual = CATEGORY_VISUALS[listing.category] ?? CATEGORY_VISUALS.VEGETABLE;
  const Icon = visual.icon;
  const isSoldOut = listing.status === 'SOLD_OUT';
  const isUnavailable = listing.status !== 'ACTIVE';

  return (
    <article className="flex flex-col overflow-hidden rounded-xl border border-[#E4E2E1] bg-white shadow-sm transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-md">
      <div className={cn('relative flex h-40 items-center justify-center bg-gradient-to-br', visual.gradient)}>
        <div className="flex size-14 items-center justify-center rounded-full bg-white/70 shadow-sm">
          <Icon className="size-6 text-slate-700" strokeWidth={1.75} aria-hidden="true" />
        </div>

        {isUnavailable && (
          <div className="absolute right-3 top-3">
            <StatusBadge status={listing.status} />
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div>
          <h3 className="truncate text-base font-bold text-[#1B1C1C]" title={listing.name}>
            {listing.name}
          </h3>

          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold uppercase tracking-wide text-slate-500">
              {shortCityLabel(listing.city)}
            </span>

            {listing.isVegetarian && (
              <span className="rounded-full border border-emerald-300 px-2 py-0.5 text-xs font-bold uppercase tracking-wide text-emerald-700">
                Vegetarian
              </span>
            )}

            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold uppercase tracking-wide text-emerald-800">
              {CATEGORY_LABELS[listing.category] ?? listing.category}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs text-[#6B7280]">
          <span className="flex items-center gap-1">
            <Package className="size-3.5" aria-hidden="true" />
            Qty: {listing.quantityRemaining} {UNIT_LABELS[listing.unit] ?? ''}
          </span>
          <span className="flex items-center gap-1">
            <Calendar className="size-3.5" aria-hidden="true" />
            {formatDate(listing.createdAt)}
          </span>
        </div>

        <div className="mt-auto pt-1">
          {isUnavailable ? (
            <Button
              type="button"
              disabled
              className="h-11 w-full cursor-not-allowed rounded-lg border border-dashed border-slate-300 bg-slate-50 text-sm font-semibold text-slate-400"
            >
              {isSoldOut ? 'Sold Out' : 'Unavailable'}
            </Button>
          ) : isExpanded ? (
            <div className="flex flex-col gap-2">
              <QuantityStepper
                value={quantity}
                max={maxQuantity}
                unitLabel={UNIT_LABELS[listing.unit]}
                theme="recipient"
                onChange={setQuantity}
              />

              {error && (
                <p className="text-xs font-semibold text-red-600" role="alert">
                  {error}
                </p>
              )}

              <div className="flex gap-2">
                <Button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => void confirm()}
                  className="h-10 flex-1 rounded-lg border border-[#3D6852] bg-white text-sm font-bold text-[#3D6852] transition-all duration-200 ease-out hover:bg-[#3D6852] hover:text-white hover:shadow-md active:scale-[0.98]"
                >
                  {isSubmitting ? 'Reserving…' : listing.price === 0 ? 'Free' : formatPrice(listing.price * quantity)}
                </Button>
                <Button
                  type="button"
                  disabled={isSubmitting}
                  onClick={cancel}
                  className="h-10 flex-1 rounded-lg bg-slate-100 text-sm font-semibold text-slate-500 transition-all duration-200 ease-out hover:bg-slate-200"
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <Button
              type="button"
              onClick={expand}
              className="flex h-11 w-full items-center justify-between rounded-lg border border-slate-200 bg-white px-4 text-sm font-bold text-[#3D6852] transition-all duration-200 ease-out hover:border-[#3D6852] hover:bg-[#3D6852] hover:text-white hover:shadow-md active:scale-[0.98]"
            >
              <span>{formatPrice(listing.price)}</span>
              <span>Reserve</span>
            </Button>
          )}
        </div>
      </div>
    </article>
  );
}

export default FoodCard;
