import { PackagePlus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/shared/components/Button';
import { EmptyState } from '@/shared/components/EmptyState';
import { ErrorState } from '@/shared/components/ErrorState';
import { LoadingSkeleton } from '@/shared/components/LoadingSkeleton';
import { PageHeader } from '@/shared/components/PageHeader';
import { Pagination } from '@/shared/components/Pagination';
import { DonorListingCard } from './DonorListingCard';
import { DonorListingCancellationDialog } from './DonorListingCancellationDialog';
import { DonorListingFilters } from './DonorListingFilters';
import { useDonorListings } from '../hooks/useDonorListings';
import { useListingActions } from '../hooks/useListingActions';
import type { ManagedListingDTO } from '../types';

interface DonorListingResultsProps {
  onViewOrders: (listing: ManagedListingDTO) => void;
}

/** Owns the searchable listing directory shown by Donation Management. */
export function DonorListingResults({ onViewOrders }: DonorListingResultsProps) {
  const navigate = useNavigate();
  const state = useDonorListings();
  const actions = useListingActions({ onChanged: state.refetch });
  const isActive = state.group === 'ACTIVE';

  function openCloneForm(listing: ManagedListingDTO) {
    navigate(`/listing/create?cloneFrom=${encodeURIComponent(listing.id)}`);
  }

  return (
    <>
      <PageHeader
        title="Donation Management"
        description="Search, review, and manage your active and past food listings."
        actions={
          <Button
            type="button"
            onClick={() => navigate('/listing/create')}
            className="h-11 bg-[#805300] px-5 font-bold text-white transition-all duration-200 ease-out hover:bg-[#694400] hover:shadow-md active:scale-[0.98]"
          >
            <PackagePlus className="size-4" aria-hidden="true" />
            New Listing
          </Button>
        }
      />

      <div className="mt-6">
        <DonorListingFilters
          search={state.searchInput}
          group={state.group}
          category={state.category}
          from={state.from}
          to={state.to}
          sort={state.sort}
          order={state.order}
          dateError={state.dateError}
          onSearchChange={state.setSearchInput}
          onGroupChange={state.setGroup}
          onCategoryChange={state.setCategory}
          onFromChange={state.setFrom}
          onToChange={state.setTo}
          onSortChange={state.setSort}
          onOrderChange={state.setOrder}
        />
      </div>

      <section className="mt-7" aria-labelledby="listing-group-title">
        <h2 id="listing-group-title" className="text-xl font-bold text-[#5B3A00]">
          {isActive ? 'Active Donations' : 'Past Donations'}
        </h2>

        <div className="mt-4">
          {state.isLoading && <LoadingSkeleton count={3} />}
          {!state.isLoading && state.dateError && (
            <EmptyState title="Check the selected dates" description={state.dateError} />
          )}
          {!state.isLoading && !state.dateError && state.error && (
            <ErrorState
              title={state.isEndpointUnavailable ? 'Backend endpoint not implemented' : 'Unable to load listings'}
              message={state.error}
              retryLabel="Try Again"
              onRetry={state.refetch}
            />
          )}
          {!state.isLoading && !state.dateError && !state.error && state.listings.length === 0 && (
            <EmptyState
              title={isActive ? 'No active listings' : 'No past listings'}
              description={
                isActive
                  ? 'Create a food listing to begin receiving reservations.'
                  : 'Cancelled and sold-out listings will appear here.'
              }
              action={isActive ? (
                <Button
                  type="button"
                  onClick={() => navigate('/listing/create')}
                  className="h-10 bg-[#805300] px-4 text-white hover:bg-[#694400]"
                >
                  Create Listing
                </Button>
              ) : undefined}
            />
          )}
          {!state.isLoading && !state.dateError && !state.error && state.listings.length > 0 && (
            <div className="space-y-4">
              {state.listings.map((listing) => (
                <DonorListingCard
                  key={listing.id}
                  listing={listing}
                  isBusy={actions.busyListingId === listing.id}
                  onClone={openCloneForm}
                  onViewOrders={onViewOrders}
                  onStatusChange={actions.requestStatusChange}
                />
              ))}
              <Pagination
                page={state.page}
                pageSize={state.limit}
                totalItems={state.total}
                itemLabel="listings"
                isDisabled={state.isLoading}
                onPageChange={state.setPage}
                className="rounded-xl border border-[#E4E2E1]"
              />
            </div>
          )}
        </div>
      </section>

      <DonorListingCancellationDialog
        cancellation={actions.pendingCancellation}
        busyListingId={actions.busyListingId}
        onConfirm={actions.confirmCancellation}
        onClose={actions.closeCancellation}
      />
    </>
  );
}

