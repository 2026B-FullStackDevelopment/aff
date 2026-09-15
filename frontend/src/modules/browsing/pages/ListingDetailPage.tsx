import { useNavigate, useParams } from 'react-router-dom';
import { Calendar, Store } from 'lucide-react';
import { Button } from '@/shared/components/Button/Button';
import { LocationMap } from '@/shared/components/LocationMap/LocationMap';
import { EmptyState } from '@/shared/components/EmptyState/EmptyState';
import { ErrorState } from '@/shared/components/ErrorState/ErrorState';
import { LoadingSkeleton } from '@/shared/components/LoadingSkeleton/LoadingSkeleton';
import { Panel } from '@/shared/components/Panel/Panel';
import { QuantityStepper } from '@/shared/components/QuantityStepper/QuantityStepper';
import { CATEGORY_LABELS, UNIT_LABELS, formatDate, formatPrice, shortCityLabel } from '@/shared/utils/listingFormatting';
import { getStoredUser } from '@/services/authStorage';
import type { ListingDetailDTO } from '@/types/api';
import { NavigationHeader } from '@/shared/components/NavigationHeader/NavigationHeader';
import { useListingDetail } from '../hooks/useListingDetail';
import { useReserveListing } from '../hooks/useReserveListing';

export function ListingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: listing, isLoading, isNotFound, error, reload } = useListingDetail(id);

  return (
    <div className="min-h-screen bg-slate-50">
      <NavigationHeader />

      <div className="mx-auto max-w-5xl px-6 py-6">
        {isLoading && <LoadingSkeleton count={1} />}

        {!isLoading && isNotFound && (
          <EmptyState
            title="Listing not found"
            description="This listing may have been removed, or the link is incorrect."
          />
        )}

        {!isLoading && !isNotFound && error && <ErrorState message={error} onRetry={reload} />}

        {!isLoading && !isNotFound && !error && listing && <ListingDetailContent listing={listing} />}
      </div>
    </div>
  );
}

function ListingDetailContent({ listing }: { listing: ListingDetailDTO }) {
  const user = getStoredUser();
  const navigate = useNavigate();
  const { quantity, setQuantity, maxQuantity } = useReserveListing(listing);

  const isPerRequest = listing.unit === 'PER_REQUEST';
  const isActive = listing.status === 'ACTIVE';
  const isSoldOut = listing.status === 'SOLD_OUT';
  const isWrongRole = Boolean(user) && user!.role !== 'RECIPIENT';

  function handleReserveClick() {
    if (!user) {
      navigate('/login');
      return;
    }
    navigate(`/marketplace/${listing.id}/confirm?qty=${quantity}`);
  }

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
      <div className="flex min-w-0 flex-1 flex-col gap-6">
        <div className="overflow-hidden rounded-xl border border-[#E4E2E1] bg-white">
          {listing.imageUrl ? (
            <img src={listing.imageUrl} alt={listing.name} className="h-64 w-full object-cover" />
          ) : (
            <div className="flex h-64 w-full items-center justify-center bg-slate-100 text-sm text-slate-400">
              No image provided
            </div>
          )}
        </div>

        {listing.description && (
          <Panel contentClassName="p-5" >
            <h3 className="text-lg font-bold tracking-tight text-[#1B1C1C] pb-3">Description</h3>
            <p className="text-sm leading-6 text-[#414844]">{listing.description}</p>
          </Panel>
        )}

        <Panel title="Donor's Location">
          <div className="flex flex-col gap-4 sm:flex-row">
            <LocationMap
              latitude={listing.donor.location.latitude}
              longitude={listing.donor.location.longitude}
              addressText={listing.donor.addressText}
              className="h-37 w-full overflow-hidden rounded-lg sm:w-64"
            />
            <div className="text-sm text-[#414844]">
              <p className="mb-1 text-xs font-bold uppercase tracking-wider text-slate-500">Address</p>
              <p>{listing.donor.addressText}</p>
            </div>
          </div>
        </Panel>
      </div>

      <div className="w-full shrink-0 lg:sticky lg:top-6 lg:w-80">
        <div className='my-3'>
          <h1 className="text-3xl font-extrabold tracking-tight text-[#1B1C1C] py-1.5">{listing.name}</h1>

          <div className="mt-2 flex flex-wrap items-center gap-2 py-1.5">
            {listing.isVegetarian && (
              <span className="rounded-full border border-emerald-300 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide text-emerald-700">
                Vegetarian
              </span>
            )}
            <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide text-emerald-800">
              {CATEGORY_LABELS[listing.category] ?? listing.category}
            </span>
          </div>

          <span className="mt-1.5 flex items-center text-[#414844] gap-1.5 py-1.5">
            <Store className="size-4 shrink-0" aria-hidden="true" />
            Donated by {listing.donor.companyName}, {shortCityLabel(listing.city)}
          </span>

          <span className="mt-1.5 flex items-center text-[#414844] gap-1.5 py-1.5">
            <Calendar className="size-4 shrink-0" aria-hidden="true" />
            Posted {formatDate(listing.createdAt)}
          </span>
        </div>

        <Panel>
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 text-sm">
            <span className="text-slate-500">Available</span>
            <span className="font-bold text-emerald-700">
              {listing.quantityRemaining} {UNIT_LABELS[listing.unit] ?? ''}
            </span>
          </div>

          {listing.rationLimitPerPerson !== null && (
            <div className="flex items-center justify-between border-b border-slate-100 py-3 text-sm">
              <span className="text-slate-500">Limit per person</span>
              <span className="font-semibold text-[#414844]">
                {listing.rationLimitPerPerson} {UNIT_LABELS[listing.unit] ?? ''}
              </span>
            </div>
          )}

          <p className="mt-4 text-3xl font-extrabold text-[#1B1C1C]">
            {formatPrice(listing.price)}
            {listing.price > 0 && (
              <span className="ml-1 text-sm font-medium text-slate-400">/ {UNIT_LABELS[listing.unit]}</span>
            )}
          </p>

          {isPerRequest ? (
            <p className="mt-4 text-sm text-[#414844]">
              This is a Per-Request item. Visit the Donor's address above to collect it directly — no reservation
              needed here.
            </p>
          ) : !isActive ? (
            <Button
              type="button"
              disabled
              className="mt-4 h-11 w-full cursor-not-allowed rounded-lg border border-dashed border-slate-300 bg-slate-50 text-sm font-semibold text-slate-400"
            >
              {isSoldOut ? 'Sold Out' : 'Unavailable'}
            </Button>
            ) : isWrongRole ? (
              <p className="mt-4 text-sm text-[#6B7280]">Only Recipients can reserve items.</p>
            ) : (
              <div className="mt-4 flex flex-col gap-3">
                <div>
                  <p className="mb-1.5 text-xs font-bold uppercase tracking-wider text-slate-500">Select Quantity</p>
                  <QuantityStepper
                    value={quantity}
                    max={maxQuantity}
                    unitLabel={UNIT_LABELS[listing.unit]}
                    theme="recipient"
                    onChange={setQuantity}
                  />
                </div>

                <Button
                  type="button"
                  onClick={handleReserveClick}
                  className="h-11 w-full rounded-lg bg-[#3D6852] text-sm font-bold text-white transition-all duration-200 ease-out hover:bg-[#2E5A47] hover:shadow-md active:scale-[0.98]"
                >
                  Reserve
                </Button>
              </div>
            )}
        </Panel>
      </div>
    </div>
  );
}

export default ListingDetailPage;
