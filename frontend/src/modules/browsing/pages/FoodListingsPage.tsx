import { EmptyState } from '@/shared/components/EmptyState/EmptyState';
import { LoadingSkeleton } from '@/shared/components/LoadingSkeleton/LoadingSkeleton';
import { Pagination } from '@/shared/components/Pagination/Pagination';
import { RecipientTopNavigation } from '@/shared/components/RecipientTopNavigation/RecipientTopNavigation';
import { FoodCard } from '../components/FoodCard';
import { useFoodListings } from '../hooks/useFoodListings';
import { getStoredUser } from '@/services/authStorage';

// TODO: source from the authenticated Recipient's session/profile once
// that context exists (avatarUrl, notification state, tier) instead of
// these placeholder values — RecipientTopNavigation already takes them as
// props, this page just isn't wired to auth state yet. This page is now
// public (D1) — these placeholders render fine for an anonymous visitor.
const RECIPIENT_HAS_UNREAD_NOTIFICATIONS = false;
const RECIPIENT_IS_PREMIUM = false;

export function FoodListingsPage() {
  const user = getStoredUser();
  const { listings, total, page, limit, isLoading, error, setPage } = useFoodListings();

  return (
    <div className="min-h-screen bg-slate-50">
      <RecipientTopNavigation
        avatarUrl={user?.avatarUrl ?? null}
        onNotificationsClick={() => {}}
        hasUnreadNotifications={RECIPIENT_HAS_UNREAD_NOTIFICATIONS}
        isPremium={RECIPIENT_IS_PREMIUM}
      />

      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-6 py-6">
        <main className="min-w-0 flex-1">
          {error ? (
            <EmptyState title="Something went wrong" description={error} />
          ) : isLoading && listings.length === 0 ? (
            <LoadingSkeleton count={3} />
          ) : listings.length === 0 ? (
            <EmptyState
              title="No listings available right now"
              description="Check back soon — new surplus food is posted throughout the day."
            />
          ) : (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {listings.map((listing) => (
                <FoodCard key={listing.id} listing={listing} />
              ))}
            </div>
          )}

          {total > limit && (
            <div className="mt-6">
              <Pagination
                page={page}
                pageSize={limit}
                totalItems={total}
                itemLabel="listings"
                isDisabled={isLoading}
                onPageChange={setPage}
              />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default FoodListingsPage;
