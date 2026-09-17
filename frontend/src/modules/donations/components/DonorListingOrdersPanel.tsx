import { useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/shared/components/Button';
import { ErrorState } from '@/shared/components/ErrorState';
import { LoadingSkeleton } from '@/shared/components/LoadingSkeleton';
import { PageHeader } from '@/shared/components/PageHeader';
import { WarningCallout } from '@/shared/components/WarningCallout';
import { toast } from '@/shared/components/ui/sonner';
import { ListingOrderSummary } from './ListingOrderSummary';
import { ListingOrdersTable } from './ListingOrdersTable/ListingOrdersTable';
import { useListingOrders } from '../hooks/useListingOrders';

interface DonorListingOrdersPanelProps {
  listingId: string;
  onBack: () => void;
}

/** Embeds one listing's C8 order history inside Donation Management. */
export function DonorListingOrdersPanel({ listingId, onBack }: DonorListingOrdersPanelProps) {
  const state = useListingOrders(listingId);

  useEffect(() => {
    if (!state.isForbidden) return;
    toast.error('Action not allowed', {
      description: 'You do not have permission to view orders for this listing.',
    });
    onBack();
  }, [state.isForbidden, onBack]);

  const backButton = (
    <Button
      type="button"
      variant="outline"
      onClick={onBack}
      className="h-10 border-[#C1C8C2] bg-white px-4 font-bold text-[#805300] transition-all duration-200 ease-out hover:border-[#805300] hover:bg-[#FFF6E3]"
    >
      <ArrowLeft className="size-4" aria-hidden="true" />
      Back to listings
    </Button>
  );

  return (
    <section aria-label="Listing orders">
      <PageHeader
        title="Donations and Reservations"
        description={
          state.listing
            ? `Selected listing: ${state.listing.name} · Food Listing ID ${state.listing.id}`
            : 'Loading the selected food listing…'
        }
        actions={backButton}
      />

      {state.listing?.status === 'SOLD_OUT' && (
        <WarningCallout title="Fully donated / Sold out" className="mt-5">
          {state.listing.name} is fully donated.
        </WarningCallout>
      )}

      {state.isLoading && !state.listing && (
        <LoadingSkeleton count={2} className="mt-6" />
      )}

      {!state.isLoading && !state.listing && !state.isForbidden && state.error && (
        <ErrorState
          title="Unable to load listing"
          message={state.error}
          retryLabel="Try Again"
          onRetry={state.retry}
          className="mt-6"
        />
      )}

      {state.listing && !state.isForbidden && (
        <div className="mt-6">
          <ListingOrderSummary listing={state.listing} />
          <ListingOrdersTable
            orders={state.orders}
            unit={state.listing.unit}
            page={state.page}
            pageSize={state.pageSize}
            total={state.total}
            isLoading={state.isLoading}
            error={state.error}
            isEndpointUnavailable={state.isEndpointUnavailable}
            isPerRequest={state.isPerRequest}
            onPageChange={state.setPage}
            onRetry={state.retry}
          />
        </div>
      )}
    </section>
  );
}

