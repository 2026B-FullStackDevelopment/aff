import { useEffect } from 'react';
import { ListFilter } from 'lucide-react';
import {
  useNavigate,
  useSearchParams,
} from 'react-router-dom';
import { Button } from '@/shared/components/Button/Button';
import { DonorTopNavigation } from '@/shared/components/DonorTopNavigation/DonorTopNavigation';
import { ErrorState } from '@/shared/components/ErrorState/ErrorState';
import { LoadingSkeleton } from '@/shared/components/LoadingSkeleton/LoadingSkeleton';
import { PageHeader } from '@/shared/components/PageHeader/PageHeader';
import { WarningCallout } from '@/shared/components/WarningCallout/WarningCallout';
import { getStoredUser } from '@/services/authStorage';
import { ListingOrderSummary } from '../components/ListingOrderSummary/ListingOrderSummary';
import { ListingOrdersTable } from '../components/ListingOrdersTable/ListingOrdersTable';
import { ReservationListingPicker } from '../components/ReservationListingPicker/ReservationListingPicker';
import { useDonorListings } from '../hooks/useDonorListings';
import { useListingOrders } from '../hooks/useListingOrders';
import type { ManagedListingDTO } from '../types';

// Renders C8 listing selection and tracked Donor orders.
export function DonorReservationsPage() {
  const navigate = useNavigate();

  const [
    searchParameters,
    setSearchParameters,
  ] = useSearchParams();

  const storedUser = getStoredUser();

  const donor =
    storedUser?.role === 'DONOR'
      ? storedUser
      : null;

  const listingId =
    searchParameters
      .get('listingId')
      ?.trim() || null;

  const {
    listings,
    searchInput,
    group,
    page: listingPage,
    limit: listingPageSize,
    total: listingTotal,
    isLoading: areListingsLoading,
    error: listingsError,
    dateError,
    setSearchInput,
    setGroup,
    setPage: setListingPage,
    refetch: retryListings,
  } = useDonorListings();

  const {
    listing,
    orders,
    page: orderPage,
    pageSize: orderPageSize,
    total: orderTotal,
    isLoading: areOrdersLoading,
    error: ordersError,
    isEndpointUnavailable,
    isForbidden,
    isPerRequest,
    setPage: setOrderPage,
    retry: retryOrders,
  } = useListingOrders(listingId);

  useEffect(() => {
    if (isForbidden) {
      navigate(
        '/donor/donations',
        {
          replace: true,
        },
      );
    }
  }, [
    isForbidden,
    navigate,
  ]);

  function selectListing(
    selectedListing: ManagedListingDTO,
  ) {
    setSearchParameters((current) => {
      const next =
        new URLSearchParams(current);

      next.set(
        'listingId',
        selectedListing.id,
      );

      return next;
    });
  }

  function clearListingSelection() {
    setSearchParameters((current) => {
      const next =
        new URLSearchParams(current);

      next.delete('listingId');

      return next;
    });
  }

  const pageDescription = listing
    ? `Selected listing: ${listing.name} · Food Listing ID ${listing.id}`
    : listingId
      ? 'Loading the selected food listing...'
      : 'Choose one of your listings and review its tracked Recipient orders.';

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

      <main className="mx-auto w-full max-w-[1280px] px-4 py-8 sm:px-6 lg:px-10 lg:py-10">
        <PageHeader
          title="Donations and Reservations"
          description={pageDescription}
          actions={
            listingId ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={
                    clearListingSelection
                  }
                  className="h-10 border-[#C1C8C2] bg-white px-4 font-bold text-[#805300] transition-all duration-200 ease-out hover:border-[#805300] hover:bg-[#FFF6E3] hover:shadow-md active:scale-[0.98]"
                >
                  <ListFilter
                    className="size-4"
                    aria-hidden="true"
                  />
                  Change listing
                </Button>

                {listing?.status === 'SOLD_OUT' && (
                  <WarningCallout
                    title="Fully donated / Sold out"
                    className="w-full max-w-sm sm:min-w-80"
                  >
                    <p>
                      {listing.name} is fully
                      donated.
                    </p>
                  </WarningCallout>
                )}
              </>
            ) : undefined
          }
        />

        {!listingId && (
          <section
            className="mt-6"
            aria-label="Choose a listing"
          >
            <ReservationListingPicker
              listings={listings}
              selectedListingId={null}
              search={searchInput}
              group={group}
              page={listingPage}
              pageSize={listingPageSize}
              total={listingTotal}
              isLoading={
                areListingsLoading
              }
              error={
                dateError ?? listingsError
              }
              onSearchChange={
                setSearchInput
              }
              onGroupChange={setGroup}
              onPageChange={
                setListingPage
              }
              onSelect={selectListing}
              onRetry={retryListings}
            />
          </section>
        )}

        {listingId && (
          <section
            className="mt-6"
            aria-label="Listing orders"
          >
            {areOrdersLoading
              && !listing && (
                <LoadingSkeleton count={2} />
              )}

            {!areOrdersLoading
              && !listing
              && !isForbidden
              && ordersError && (
                <ErrorState
                  title="Unable to load listing"
                  message={ordersError}
                  retryLabel="Try Again"
                  onRetry={retryOrders}
                />
              )}

            {listing && !isForbidden && (
              <>
                <ListingOrderSummary
                  listing={listing}
                />

                <ListingOrdersTable
                  orders={orders}
                  unit={listing.unit}
                  page={orderPage}
                  pageSize={orderPageSize}
                  total={orderTotal}
                  isLoading={
                    areOrdersLoading
                  }
                  error={ordersError}
                  isEndpointUnavailable={
                    isEndpointUnavailable
                  }
                  isPerRequest={
                    isPerRequest
                  }
                  onPageChange={
                    setOrderPage
                  }
                  onRetry={retryOrders}
                />
              </>
            )}
          </section>
        )}
      </main>
    </div>
  );
}

export default DonorReservationsPage;