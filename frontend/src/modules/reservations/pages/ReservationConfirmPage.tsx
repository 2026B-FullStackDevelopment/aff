import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { AddressAutocomplete } from '@/shared/components/AddressAutocomplete/AddressAutocomplete';
import { Button } from '@/shared/components/Button/Button';
import { EmptyState } from '@/shared/components/EmptyState/EmptyState';
import { ErrorState } from '@/shared/components/ErrorState/ErrorState';
import { FormErrorAlert } from '@/shared/components/FormErrorAlert/FormErrorAlert';
import { NavigationHeader } from '@/shared/components/NavigationHeader/NavigationHeader';
import { LoadingSkeleton } from '@/shared/components/LoadingSkeleton/LoadingSkeleton';
import { Panel } from '@/shared/components/Panel/Panel';
import { WarningCallout } from '@/shared/components/WarningCallout/WarningCallout';
import { formatPrice, UNIT_LABELS } from '@/shared/utils/listingFormatting';
import { useListingDetail } from '@/modules/browsing/hooks/useListingDetail';
import type { ListingDetailDTO } from '@/types/api';
import { OrderItemSummary } from '../components/OrderItemSummary';
import { PaymentMethodSelector } from '../components/PaymentMethodSelector';
import { useReservationCheckout } from '../hooks/useReservationCheckout';

function parseQuantityParam(raw: string | null): number | null {
  if (!raw) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : null;
}

export function ReservationConfirmPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const requestedQuantity = parseQuantityParam(searchParams.get('qty'));

  const { data: listing, isLoading, isNotFound, error, reload } = useListingDetail(id);

  useEffect(() => {
    // No (valid) qty param means this page was opened without going
    // through the Reserve button — refresh, bookmark, shared link, or
    // browser back/forward all land here with an empty param since qty
    // now lives in the URL (survives reload) rather than router state
    // (didn't). Send the Recipient back to pick a quantity.
    if (!requestedQuantity && id) {
      navigate(`/marketplace/${id}`, { replace: true });
    }
  }, [id, navigate, requestedQuantity]);

  return (
    <div className="min-h-screen bg-slate-50">
      <NavigationHeader
        backTo={id ? `/marketplace/${id}` : '/marketplace'}
        backLabel="Back to Listing"
      />

      <div className="mx-auto max-w-5xl px-6 py-6">
        {isLoading && <LoadingSkeleton count={1} />}

        {!isLoading && isNotFound && (
          <EmptyState
            title="Listing not found"
            description="This listing may have been removed, or the link is incorrect."
          />
        )}

        {!isLoading && !isNotFound && error && <ErrorState message={error} onRetry={reload} />}

        {!isLoading && !isNotFound && !error && listing && requestedQuantity && (
          <ReservationConfirmContent
            listing={listing}
            requestedQuantity={requestedQuantity}
            reloadListing={reload}
          />
        )}
      </div>
    </div>
  );
}

function ReservationConfirmContent({
  listing,
  requestedQuantity,
  reloadListing,
}: {
  listing: ListingDetailDTO;
  requestedQuantity: number;
  reloadListing: () => void;
}) {
  const isFree = listing.price === 0;

  // Stock/ration limits can shift between picking a quantity on the
  // listing page and arriving here, so re-derive the ceiling from the
  // freshly-fetched listing rather than trusting the URL param blindly.
  const currentMax = Math.max(
    0,
    listing.rationLimitPerPerson
      ? Math.min(listing.quantityRemaining, listing.rationLimitPerPerson)
      : listing.quantityRemaining,
  );

  const clampedInitialQuantity =
    currentMax === 0 ? 0 : Math.max(1, Math.min(requestedQuantity, currentMax));

  const [quantity, setQuantity] = useState(clampedInitialQuantity);
  const wasAdjusted = clampedInitialQuantity !== requestedQuantity;
  const outOfStock = currentMax === 0;

  const {
    deliveryAddressText,
    addressError,
    setDeliveryAddressInput,
    setDeliveryLocation,
    paymentMethod,
    setPaymentMethod,
    isSubmitting,
    submitError,
    submit,
  } = useReservationCheckout(listing, quantity, reloadListing);

  const submitLabel = isSubmitting
    ? 'Please wait…'
    : !isFree && paymentMethod === 'STRIPE'
      ? 'Proceed to Payment'
      : 'Confirm Reservation';

  return (
    <>
      <div className="mb-6">
        <h1 className="text-3xl font-extrabold tracking-tight text-[#1B1C1C]">
          Complete Your Reservation
        </h1>
        <p className="mt-1 text-sm text-[#6B7280]">
          Review the details below and confirm to secure your items.
        </p>
      </div>

      {outOfStock ? (
        <div className="mb-6">
          <WarningCallout title="No longer available">
            This listing sold out while you were reviewing it. Head back to the{' '}
            <Link
              to="/marketplace"
              className="text-[#3D6852] hover:text-[#3D6852]/80"
            >
              marketplace
            </Link> to find something else.
          </WarningCallout>
        </div>
      ) : wasAdjusted ? (
        <div className="mb-6">
          <WarningCallout title="Quantity adjusted">
            Only {currentMax} {UNIT_LABELS[listing.unit] ?? ''} left since you opened this
            listing — we've updated your quantity to match.
          </WarningCallout>
        </div>
      ) : null}

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <div className="flex min-w-0 flex-1 flex-col gap-6">
          <Panel>
            <OrderItemSummary
              listing={listing}
              quantity={quantity}
              maxQuantity={currentMax}
              onQuantityChange={setQuantity}
            />
          </Panel>

          <Panel title="Delivery Location" description="Where should this order be delivered?">
            <AddressAutocomplete
              id="delivery-address"
              label="Address"
              placeholder="Start typing a street address..."
              value={deliveryAddressText}
              onInputChange={setDeliveryAddressInput}
              onSelect={setDeliveryLocation}
              error={addressError ?? undefined}
              theme="recipient"
            />
          </Panel>
        </div>

        <div className="flex w-full shrink-0 flex-col gap-6 lg:sticky lg:top-6 lg:w-96">
          <Panel title="Payment Method">
            <div className="flex flex-col gap-4">
              <PaymentMethodSelector
                value={paymentMethod}
                isFree={isFree}
                onChange={setPaymentMethod}
              />

              <div className="flex items-center justify-between border-t border-slate-100 pt-4 text-sm">
                <span className="font-semibold text-[#414844]">Total</span>
                <span className="text-base font-extrabold text-[#1B1C1C]">
                  {formatPrice(listing.price * quantity)}
                </span>
              </div>

              <FormErrorAlert message={submitError} />

              <Button
                type="button"
                disabled={isSubmitting || outOfStock}
                onClick={() => void submit()}
                className="h-11 w-full rounded-lg bg-[#3D6852] text-sm font-bold text-white transition-all duration-200 ease-out hover:bg-[#2E5A47] hover:shadow-md active:scale-[0.98]"
              >
                {submitLabel}
              </Button>
            </div>
          </Panel>
        </div>
      </div>
    </>
  );
}

export default ReservationConfirmPage;
