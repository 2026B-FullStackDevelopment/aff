import { PackagePlus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/shared/components/Button/Button';
import { ConfirmationDialog } from '@/shared/components/ConfirmationDialog/ConfirmationDialog';
import { DonorTopNavigation } from '@/shared/components/DonorTopNavigation/DonorTopNavigation';
import { EmptyState } from '@/shared/components/EmptyState/EmptyState';
import { ErrorState } from '@/shared/components/ErrorState/ErrorState';
import { LoadingSkeleton } from '@/shared/components/LoadingSkeleton/LoadingSkeleton';
import { PageHeader } from '@/shared/components/PageHeader/PageHeader';
import { Pagination } from '@/shared/components/Pagination/Pagination';
import { Toast } from '@/shared/components/Toast/Toast';
import { getStoredUser } from '@/services/authStorage';
import { DonorListingCard } from '../components/DonorListingCard';
import { DonorListingFilters } from '../components/DonorListingFilters';
import { useDonorListings } from '../hooks/useDonorListings';
import { useListingActions } from '../hooks/useListingActions';
import type { ManagedListingDTO } from '../types';

// Renders the Donor listing search and management route.
export function DonorDonationsPage() {
  const navigate = useNavigate();
  const storedUser = getStoredUser();

  const donor =
    storedUser?.role === 'DONOR'
      ? storedUser
      : null;

  const {
    listings,
    searchInput,
    group,
    category,
    from,
    to,
    sort,
    order,
    page,
    limit,
    total,
    isLoading,
    error,
    dateError,
    isEndpointUnavailable,
    setSearchInput,
    setGroup,
    setCategory,
    setFrom,
    setTo,
    setSort,
    setOrder,
    setPage,
    refetch,
  } = useDonorListings();

  const {
    busyListingId,
    pendingCancellation,
    feedback,
    requestStatusChange,
    confirmCancellation,
    closeCancellation,
    dismissFeedback,
  } = useListingActions({
    onChanged: refetch,
  });

  function openCloneForm(
    listing: ManagedListingDTO,
  ) {
    navigate(
      `/listing/create?cloneFrom=${encodeURIComponent(listing.id)}`,
    );
  }

  function openListingOrders(
    listing: ManagedListingDTO,
  ) {
    navigate(
      `/donor/reservations?listingId=${encodeURIComponent(listing.id)}`,
    );
  }

  const groupTitle =
    group === 'ACTIVE'
      ? 'Active Donations'
      : 'Past Donations';

  const emptyTitle =
    group === 'ACTIVE'
      ? 'No active listings'
      : 'No past listings';

  const emptyDescription =
    group === 'ACTIVE'
      ? 'Create a food listing to begin receiving reservations.'
      : 'Cancelled and sold-out listings will appear here.';

  return (
    <div className="min-h-screen bg-[#FBF9F8]">
      <DonorTopNavigation
        avatarUrl={donor?.avatarUrl}
        avatarAlt={
          donor
            ? `${donor.companyName} profile`
            : 'Donor profile'
        }
        hasUnreadNotifications={false}
        onNotificationsClick={() => {}}
      />

      {feedback && (
        <div className="fixed right-4 top-20 z-50 w-[calc(100%-2rem)] max-w-sm">
          <Toast
            variant={feedback.variant}
            title={feedback.title}
            message={feedback.message}
            onClose={dismissFeedback}
          />
        </div>
      )}

      <main className="mx-auto w-full max-w-[1280px] px-4 py-8 sm:px-6 lg:px-10 lg:py-10">
        <PageHeader
          title="Donation Management"
          description="Search, review, and manage your active and past food listings."
          actions={
            <Button
              type="button"
              onClick={() =>
                navigate('/listing/create')
              }
              className="h-11 bg-[#805300] px-5 font-bold text-white transition-all duration-200 ease-out hover:bg-[#694400] hover:shadow-md active:scale-[0.98]"
            >
              <PackagePlus
                className="size-4"
                aria-hidden="true"
              />
              New Listing
            </Button>
          }
        />

        <div className="mt-6">
          <DonorListingFilters
            search={searchInput}
            group={group}
            category={category}
            from={from}
            to={to}
            sort={sort}
            order={order}
            dateError={dateError}
            onSearchChange={setSearchInput}
            onGroupChange={setGroup}
            onCategoryChange={setCategory}
            onFromChange={setFrom}
            onToChange={setTo}
            onSortChange={setSort}
            onOrderChange={setOrder}
          />
        </div>

        <section
          className="mt-7"
          aria-labelledby="listing-group-title"
        >
          <h2
            id="listing-group-title"
            className="text-xl font-bold text-[#5B3A00]"
          >
            {groupTitle}
          </h2>

          <div className="mt-4">
            {isLoading && (
              <LoadingSkeleton count={3} />
            )}

            {!isLoading && dateError && (
              <EmptyState
                title="Check the selected dates"
                description={dateError}
              />
            )}

            {!isLoading && !dateError && error && (
              <ErrorState
                title={
                  isEndpointUnavailable
                    ? 'Backend endpoint not implemented'
                    : 'Unable to load listings'
                }
                message={error}
                retryLabel="Try Again"
                onRetry={refetch}
              />
            )}

            {!isLoading
              && !dateError
              && !error
              && listings.length === 0 && (
                <EmptyState
                  title={emptyTitle}
                  description={emptyDescription}
                  action={
                    group === 'ACTIVE' ? (
                      <Button
                        type="button"
                        onClick={() =>
                          navigate('/listing/create')
                        }
                        className="h-10 bg-[#805300] px-4 text-white transition-all duration-200 ease-out hover:bg-[#694400] hover:shadow-md active:scale-[0.98]"
                      >
                        Create Listing
                      </Button>
                    ) : undefined
                  }
                />
              )}

            {!isLoading
              && !dateError
              && !error
              && listings.length > 0 && (
                <div className="space-y-4">
                  {listings.map((listing) => (
                    <DonorListingCard
                      key={listing.id}
                      listing={listing}
                      isBusy={
                        busyListingId
                        === listing.id
                      }
                      onClone={openCloneForm}
                      onViewOrders={
                        openListingOrders
                      }
                      onStatusChange={
                        requestStatusChange
                      }
                    />
                  ))}

                  <Pagination
                    page={page}
                    pageSize={limit}
                    totalItems={total}
                    itemLabel="listings"
                    isDisabled={isLoading}
                    onPageChange={setPage}
                    className="rounded-xl border border-[#E4E2E1]"
                  />
                </div>
              )}
          </div>
        </section>
      </main>

      <ConfirmationDialog
        open={pendingCancellation !== null}
        title="Cancel this listing?"
        tone="danger"
        confirmLabel="Cancel Listing"
        cancelLabel="Keep Listing"
        isPending={
          pendingCancellation !== null
          && busyListingId
            === pendingCancellation.listing.id
        }
        onConfirm={confirmCancellation}
        onClose={closeCancellation}
        description={
          pendingCancellation ? (
            <div className="space-y-2">
              <p>
                You are about to cancel{' '}
                <strong>
                  {pendingCancellation.listing.name}
                </strong>
                .
              </p>

              <p>
                {pendingCancellation.pendingOrderCount}{' '}
                pending{' '}
                {pendingCancellation.pendingOrderCount
                  === 1
                  ? 'order'
                  : 'orders'}{' '}
                will be automatically cancelled.
              </p>

              <p>
                Orders already assigned to a Courier or
                further along in delivery will not be
                cancelled.
              </p>
            </div>
          ) : null
        }
      />
    </div>
  );
}

export default DonorDonationsPage;