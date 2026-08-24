import { useEffect } from 'react';
import { ArrowLeft, ClipboardList } from 'lucide-react';
import {
  useNavigate,
  useSearchParams,
} from 'react-router-dom';
import { Button } from '@/shared/components/Button/Button';
import { DonorTopNavigation } from '@/shared/components/DonorTopNavigation/DonorTopNavigation';
import { EmptyState } from '@/shared/components/EmptyState/EmptyState';
import { ErrorState } from '@/shared/components/ErrorState/ErrorState';
import { LoadingSkeleton } from '@/shared/components/LoadingSkeleton/LoadingSkeleton';
import { PageHeader } from '@/shared/components/PageHeader/PageHeader';
import { WarningCallout } from '@/shared/components/WarningCallout/WarningCallout';
import { getStoredUser } from '@/services/authStorage';
import { ListingOrderSummary } from '../components/ListingOrderSummary/ListingOrderSummary';
import { ListingOrdersTable } from '../components/ListingOrdersTable/ListingOrdersTable';
import { useListingOrders } from '../hooks/useListingOrders';

// Renders C8 orders for the listing selected from Donation Management.
export function DonorReservationsPage() {
  const navigate = useNavigate();
  const [searchParameters] =
    useSearchParams();

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
    listing,
    orders,
    page,
    pageSize,
    total,
    isLoading,
    error,
    isEndpointUnavailable,
    isForbidden,
    isPerRequest,
    setPage,
    retry,
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

  const pageDescription = listing
    ? `Selected listing: ${listing.name} · Food Listing ID ${listing.id}`
    : 'Review tracked orders against one of your food listings.';

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
            listing?.status === 'SOLD_OUT' ? (
              <WarningCallout
                title="Fully donated / Sold out"
                className="w-full max-w-sm sm:min-w-80"
              >
                <p>
                  {listing.name} is fully
                  donated.
                </p>
              </WarningCallout>
            ) : undefined
          }
        />

        <section
          className="mt-6"
          aria-label="Listing reservations"
        >
          {!listingId && (
            <EmptyState
              title="Select a food listing"
              description="Open Donation Management and choose View Reservations on one of your listings."
              icon={ClipboardList}
              action={
                <Button
                  type="button"
                  onClick={() =>
                    navigate(
                      '/donor/donations',
                    )
                  }
                  className="h-10 bg-[#805300] px-4 font-bold text-white transition-all duration-200 ease-out hover:bg-[#694400] hover:shadow-md active:scale-[0.98]"
                >
                  <ArrowLeft
                    className="size-4"
                    aria-hidden="true"
                  />
                  Donation Management
                </Button>
              }
            />
          )}

          {listingId
            && isLoading
            && !listing && (
              <LoadingSkeleton count={2} />
            )}

          {listingId
            && !isLoading
            && !listing
            && !isForbidden
            && error && (
              <ErrorState
                title="Unable to load listing"
                message={error}
                retryLabel="Try Again"
                onRetry={retry}
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
                page={page}
                pageSize={pageSize}
                total={total}
                isLoading={isLoading}
                error={error}
                isEndpointUnavailable={
                  isEndpointUnavailable
                }
                isPerRequest={isPerRequest}
                onPageChange={setPage}
                onRetry={retry}
              />
            </>
          )}
        </section>
      </main>
    </div>
  );
}

export default DonorReservationsPage;