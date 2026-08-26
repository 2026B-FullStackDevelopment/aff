import { useMemo, useState } from 'react';
import { EmptyState } from '@/shared/components/EmptyState/EmptyState';
import { Pagination } from '@/shared/components/Pagination/Pagination';
import { RecipientTopNavigation } from '@/shared/components/RecipientTopNavigation/RecipientTopNavigation';
import { Toast } from '@/shared/components/Toast/Toast';
import { VIETNAM_PROVINCES } from '@/shared/constants/locations';
import { cn } from '@/shared/utils';
import { FoodCard } from '../components/FoodCard';
import { FoodFilter } from '../components/FoodFilter';
import { FoodFilterPanel } from '../components/FoodFilterPanel';
import { useFoodListings } from '../hooks/useFoodListings';

// TODO: source from the authenticated Recipient's session/profile once
// that context exists (avatarUrl, notification state, tier) instead of
// these placeholder values — RecipientTopNavigation already takes them as
// props, this page just isn't wired to auth state yet.
const RECIPIENT_HAS_UNREAD_NOTIFICATIONS = false;
const RECIPIENT_IS_PREMIUM = false;

export function FoodListingsPage() {
  const { listings, total, filters, updateFilters, setPage, isLoading, error, markReserved } = useFoodListings();
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Cities with active listings surface first as chips, matching the
  // original mock's CITIES_IN_LISTINGS / OTHER_PROVINCES split — every
  // other province is still reachable behind "More" in FoodFilterPanel.
  const cities = useMemo(() => {
    const used = Array.from(new Set(listings.map((listing) => listing.city))).sort((a, b) => a.localeCompare(b, 'vi'));
    const rest = VIETNAM_PROVINCES.filter((province) => !used.includes(province));
    return [...used, ...rest];
  }, [listings]);

  function handleReserved(listingId: string, quantity: number) {
    const listing = listings.find((item) => item.id === listingId);
    markReserved(listingId, quantity);
    setToastMessage(listing ? `Reserved ${quantity} of ${listing.name}` : 'Reservation confirmed');
    window.setTimeout(() => setToastMessage(null), 3200);
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <RecipientTopNavigation
        avatarUrl={null}
        onNotificationsClick={() => {}}
        hasUnreadNotifications={RECIPIENT_HAS_UNREAD_NOTIFICATIONS}
        isPremium={RECIPIENT_IS_PREMIUM}
      />

      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-6 py-6">
        <FoodFilter
          search={filters.search}
          onSearchChange={(search) => updateFilters({ search })}
          isPanelOpen={isPanelOpen}
          onTogglePanel={() => setIsPanelOpen((prev) => !prev)}
        />

        <div className="flex gap-6">
          <main className="min-w-0 flex-1">
            {error ? (
              <EmptyState title="Something went wrong" description={error} />
            ) : !isLoading && listings.length === 0 ? (
              <EmptyState
                title="No listings match your filters"
                description="Try widening your price range, clearing a category, or checking a different city."
              />
            ) : (
              <div
                className={cn(
                  'grid gap-5',
                  isPanelOpen ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
                )}
              >
                {listings.map((listing) => (
                  <FoodCard key={listing.id} listing={listing} onReserved={handleReserved} />
                ))}
              </div>
            )}

            {total > filters.limit && (
              <div className="mt-6">
                <Pagination
                  page={filters.page}
                  pageSize={filters.limit}
                  totalItems={total}
                  itemLabel="listings"
                  isDisabled={isLoading}
                  onPageChange={setPage}
                />
              </div>
            )}
          </main>

          {isPanelOpen && (
            <FoodFilterPanel
              filters={filters}
              onFiltersChange={updateFilters}
              onClose={() => setIsPanelOpen(false)}
              cities={cities}
            />
          )}
        </div>
      </div>

      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50">
          <Toast title="Reservation confirmed" message={toastMessage} variant="success" />
        </div>
      )}
    </div>
  );
}

export default FoodListingsPage;
