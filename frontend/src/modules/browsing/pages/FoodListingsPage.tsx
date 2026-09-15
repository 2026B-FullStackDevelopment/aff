import { useState } from 'react';
import { EmptyState } from '@/shared/components/EmptyState/EmptyState';
import { LoadingSkeleton } from '@/shared/components/LoadingSkeleton/LoadingSkeleton';
import { Pagination } from '@/shared/components/Pagination/Pagination';
import { RecipientTopNavigation } from '@/shared/components/RecipientTopNavigation/RecipientTopNavigation';
import { Button } from '@/shared/components/Button/Button';
import { VIETNAM_PROVINCES } from '@/shared/constants/locations';
import { FoodCard } from '../components/FoodCard';
import { FoodFilter } from '../components/FoodFilter';
import { FoodFilterPanel } from '../components/FoodFilterPanel';
import { useFoodListings } from '../hooks/useFoodListings';
import { DEFAULT_FILTERS, type ListingFilters } from '../hooks/useFoodFilter';
import { useSubscription } from '@/modules/subscriptions/hooks/useSubscription';
import { getStoredUser } from '@/services/authStorage';

// TO-DO: (SRS 5.3.2) implement the notification bell panel
// and premium upsell panel in the top nav once
// the notification:premium_match and subscription:premium endpoints
// are implemented, respectively.
// Until then, the bell will be a no-op and the upsell panel
// will not be rendered.
const RECIPIENT_HAS_UNREAD_NOTIFICATIONS = false;
const CITY_OPTIONS = VIETNAM_PROVINCES;

function hasActiveFilters(filters: ListingFilters): boolean {
  return Boolean(
    filters.search || filters.city || filters.category || filters.priceMin || filters.priceMax || filters.sortOrder,
  );
}

export function FoodListingsPage() {
  const user = getStoredUser();
  const [filters, setFilters] = useState<ListingFilters>(DEFAULT_FILTERS);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const { listings, total, isLoading, error } = useFoodListings(filters);
  const { tier } = useSubscription();

  function updateFilters(patch: Partial<ListingFilters>) {
    setFilters((prev) => ({
      ...prev,
      ...patch,
      page: 'page' in patch ? (patch.page as number) : 1,
    }));
  }

  function resetFilters() {
    setFilters(DEFAULT_FILTERS);
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <RecipientTopNavigation
        avatarUrl={user?.avatarUrl ?? null}
        onNotificationsClick={() => {}}
        hasUnreadNotifications={RECIPIENT_HAS_UNREAD_NOTIFICATIONS}
        isPremium={tier === 'PREMIUM'}
      />

      <div className="mx-auto max-w-7xl px-6 py-6">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
          <div className="flex min-w-0 flex-1 flex-col gap-4">
            <FoodFilter
              search={filters.search}
              onSearchChange={(value) => updateFilters({ search: value })}
              isPanelOpen={isPanelOpen}
              onTogglePanel={() => setIsPanelOpen((open) => !open)}
            />

            <main>
              {error ? (
                <EmptyState title="Something went wrong" description={error} />
              ) : isLoading && listings.length === 0 ? (
                <LoadingSkeleton count={3} />
              ) : listings.length === 0 ? (
                <EmptyState
                  title={hasActiveFilters(filters) ? 'No listings match your filters' : 'No listings available right now'}
                  description={
                    hasActiveFilters(filters)
                      ? 'Try widening your filters, or clear them to see everything available.'
                      : 'Check back soon — new surplus food is posted throughout the day.'
                  }
                  action={
                    hasActiveFilters(filters) ? (
                      <Button type="button" variant="outline" onClick={resetFilters}>
                        Clear Filters
                      </Button>
                    ) : undefined
                  }
                />
              ) : (
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {listings.map((listing) => (
                    <FoodCard key={listing.id} listing={listing} />
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
                    onPageChange={(page) => updateFilters({ page })}
                  />
                </div>
              )}
            </main>
          </div>

          {isPanelOpen && (
            <FoodFilterPanel
              filters={filters}
              onFiltersChange={updateFilters}
              onClose={() => setIsPanelOpen(false)}
              cities={CITY_OPTIONS}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default FoodListingsPage;
