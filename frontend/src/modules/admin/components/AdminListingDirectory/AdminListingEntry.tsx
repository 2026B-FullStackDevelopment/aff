import { Ban, ImageOff, Leaf, MapPin } from 'lucide-react';
import { Button } from '@/shared/components/Button/Button';
import { StatusBadge } from '@/shared/components/StatusBadge/StatusBadge';
import { formatUnit } from '@/shared/constants/units';
import { formatCategory, formatDate, formatPrice } from '@/shared/utils/listingFormatting';
import type { AdminListingDTO } from '@/types/api';

interface ListingEntryProps {
  listing: AdminListingDTO;
  onCancel: (listing: AdminListingDTO) => void;
}

function ListingActions({ listing, onCancel }: ListingEntryProps) {
  const canCancel = listing.status === 'ACTIVE' || listing.status === 'PAUSED';

  if (!canCancel) return <span className="text-xs text-slate-400">No actions</span>;

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={() => onCancel(listing)}
      className="border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800"
    >
      <Ban className="size-4" aria-hidden="true" />
      Cancel
    </Button>
  );
}

function ListingImage({ listing }: { listing: AdminListingDTO }) {
  return listing.imageUrl ? (
    <img
      src={listing.imageUrl}
      alt={`${listing.name} listing`}
      className="size-16 shrink-0 rounded-lg border border-slate-200 object-cover"
    />
  ) : (
    <div className="flex size-16 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-400">
      <ImageOff className="size-5" aria-hidden="true" />
      <span className="sr-only">No listing image</span>
    </div>
  );
}

/** One desktop table row containing the complete Admin listing detail. */
export function AdminListingRow({ listing, onCancel }: ListingEntryProps) {
  return (
    <tr className="align-top hover:bg-slate-50/70">
      <td className="px-4 py-4">
        <div className="flex min-w-64 gap-3">
          <ListingImage listing={listing} />
          <div>
            <p className="font-semibold text-[#1e3a5f]">{listing.name}</p>
            <p className="mt-0.5 break-all font-mono text-xs text-slate-500">{listing.id}</p>
            <p className="mt-2 max-w-72 text-xs leading-5 text-slate-600">{listing.description || 'No description provided.'}</p>
          </div>
        </div>
      </td>
      <td className="px-4 py-4">
        <p className="font-medium text-slate-800">{listing.donor.companyName}</p>
        <p className="mt-0.5 max-w-48 break-all font-mono text-xs text-slate-500">{listing.donor.id}</p>
        <p className="mt-2 text-xs text-slate-600">{listing.donor.city}</p>
        <p className="mt-0.5 text-xs text-slate-500">
          {listing.donor.location.latitude.toFixed(5)}, {listing.donor.location.longitude.toFixed(5)}
        </p>
      </td>
      <td className="px-4 py-4 text-slate-700">
        <p>{formatCategory(listing.category)}</p>
        <p className="mt-1 flex items-center gap-1 text-xs text-slate-500">
          <MapPin className="size-3" aria-hidden="true" /> {listing.city}
        </p>
        <p className="mt-1 flex items-center gap-1 text-xs text-slate-500">
          <Leaf className="size-3" aria-hidden="true" /> {listing.isVegetarian ? 'Vegetarian' : 'Not vegetarian'}
        </p>
      </td>
      <td className="px-4 py-4 text-slate-700">
        <p>{listing.quantityRemaining} / {listing.donationLimit} {formatUnit(listing.unit)}</p>
        <p className="mt-1 text-xs text-slate-500">Limit: {listing.rationLimitPerPerson ?? 'None'} per Recipient</p>
        <p className="mt-1 font-medium text-[#1e3a5f]">{formatPrice(listing.price)}</p>
      </td>
      <td className="px-4 py-4">
        <StatusBadge status={listing.status} />
        <p className="mt-2 text-xs text-slate-500"><strong className="text-slate-800">{listing.pendingOrderCount}</strong> pending orders</p>
      </td>
      <td className="px-4 py-4 text-slate-600">{formatDate(listing.createdAt, { withTime: true })}</td>
      <td className="px-4 py-4 text-right"><ListingActions listing={listing} onCancel={onCancel} /></td>
    </tr>
  );
}

/** One compact mobile card containing the complete Admin listing detail. */
export function AdminListingCard({ listing, onCancel }: ListingEntryProps) {
  return (
    <article className="space-y-4 p-4">
      <div className="flex items-start gap-3">
        <ListingImage listing={listing} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h2 className="font-bold text-[#1e3a5f]">{listing.name}</h2>
            <StatusBadge status={listing.status} />
          </div>
          <p className="mt-1 break-all font-mono text-xs text-slate-500">{listing.id}</p>
          <p className="mt-2 text-xs leading-5 text-slate-600">{listing.description || 'No description provided.'}</p>
        </div>
      </div>
      <dl className="grid grid-cols-2 gap-x-3 gap-y-4 text-sm">
        <div className="col-span-2"><dt className="text-xs text-slate-500">Donor</dt><dd className="font-medium text-slate-800">{listing.donor.companyName}</dd><dd className="break-all font-mono text-xs text-slate-500">{listing.donor.id}</dd></div>
        <div><dt className="text-xs text-slate-500">Donor location</dt><dd>{listing.donor.city}</dd><dd className="text-xs text-slate-500">{listing.donor.location.latitude.toFixed(5)}, {listing.donor.location.longitude.toFixed(5)}</dd></div>
        <div><dt className="text-xs text-slate-500">Listing city</dt><dd>{listing.city}</dd></div>
        <div><dt className="text-xs text-slate-500">Category</dt><dd>{formatCategory(listing.category)}</dd><dd className="text-xs text-slate-500">{listing.isVegetarian ? 'Vegetarian' : 'Not vegetarian'}</dd></div>
        <div><dt className="text-xs text-slate-500">Available / donated</dt><dd>{listing.quantityRemaining} / {listing.donationLimit} {formatUnit(listing.unit)}</dd></div>
        <div><dt className="text-xs text-slate-500">Price</dt><dd>{formatPrice(listing.price)}</dd></div>
        <div><dt className="text-xs text-slate-500">Ration limit</dt><dd>{listing.rationLimitPerPerson ?? 'None'} per Recipient</dd></div>
        <div><dt className="text-xs text-slate-500">Pending orders</dt><dd className="font-semibold">{listing.pendingOrderCount}</dd></div>
        <div><dt className="text-xs text-slate-500">Created</dt><dd>{formatDate(listing.createdAt, { withTime: true })}</dd></div>
      </dl>
      <div className="flex justify-end"><ListingActions listing={listing} onCancel={onCancel} /></div>
    </article>
  );
}
