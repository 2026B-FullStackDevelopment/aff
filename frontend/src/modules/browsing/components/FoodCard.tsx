// Presentational browse-grid card. Links through to the listing detail
// page (D8, /marketplace/:id) instead of reserving inline — reservation
// now lives entirely on ListingDetailPage (D2). See
// D1-browse-active-listings.md flow note 5 / risk #2.
import type { LucideIcon } from 'lucide-react';
import { Apple, Beef, Calendar, Droplet, Leaf, Package, UtensilsCrossed, Wheat } from 'lucide-react';
import { Link } from 'react-router-dom';
import { StatusBadge } from '@/shared/components/StatusBadge';
import {
  CATEGORY_LABELS,
  UNIT_LABELS,
  formatDate,
  formatPrice,
  shortCityLabel,
} from '@/shared/utils/listingFormatting';
import { cn } from '@/shared/utils';
import type { ListingDTO } from '@/types/api';

const CATEGORY_VISUALS: Record<string, { icon: LucideIcon; gradient: string }> = {
  FRUIT: { icon: Apple, gradient: 'from-rose-100 to-orange-100' },
  VEGETABLE: { icon: Leaf, gradient: 'from-emerald-100 to-emerald-200' },
  MEAT: { icon: Beef, gradient: 'from-orange-100 to-red-100' },
  COOKED_DISH: { icon: UtensilsCrossed, gradient: 'from-orange-100 to-orange-200' },
  BAKED_GOODS: { icon: Wheat, gradient: 'from-amber-100 to-amber-200' },
  DRINK: { icon: Droplet, gradient: 'from-yellow-100 to-amber-200' },
};

interface FoodCardProps {
  listing: ListingDTO;
}

export function FoodCard({ listing }: FoodCardProps) {
  const visual = CATEGORY_VISUALS[listing.category] ?? CATEGORY_VISUALS.VEGETABLE;
  const Icon = visual.icon;
  const isSoldOut = listing.status === 'SOLD_OUT';
  const isUnavailable = listing.status !== 'ACTIVE';

  return (
    <Link
      to={`/marketplace/${listing.id}`}
      className="flex flex-col overflow-hidden rounded-xl border border-[#E4E2E1] bg-white shadow-sm transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className={cn('relative flex h-40 items-center justify-center overflow-hidden bg-gradient-to-br', visual.gradient)}>
        {listing.imageUrl ? (
          <img
            src={listing.imageUrl}
            alt={listing.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex size-14 items-center justify-center rounded-full bg-white/70 shadow-sm">
            <Icon className="size-6 text-slate-700" strokeWidth={1.75} aria-hidden="true" />
          </div>
        )}

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
          <span
            className={cn(
              'flex h-11 w-full items-center justify-between rounded-lg border px-4 text-sm font-bold transition-all duration-200 ease-out',
              isUnavailable
                ? 'border-dashed border-slate-300 bg-slate-50 text-slate-400'
                : 'border-slate-200 bg-white text-[#3D6852]',
            )}
          >
            <span>{isUnavailable ? (isSoldOut ? 'Sold Out' : 'Unavailable') : formatPrice(listing.price)}</span>
            {!isUnavailable && <span>View Details</span>}
          </span>
        </div>
      </div>
    </Link>
  );
}

export default FoodCard;
