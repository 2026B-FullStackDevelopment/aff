import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Truck } from 'lucide-react';
import { buttonVariants } from '@/shared/components/ui/button';
import { EmptyState } from '@/shared/components/EmptyState/EmptyState';
import { ErrorState } from '@/shared/components/ErrorState/ErrorState';
import { LoadingSkeleton } from '@/shared/components/LoadingSkeleton/LoadingSkeleton';
import { Pagination } from '@/shared/components/Pagination/Pagination';
import { cn } from '@/shared/utils';
import { DeliveryCard } from '../components/DeliveryCard';
import { useDeliveryQueue } from '../hooks/useDeliveryQueue';

export function DeliveryQueuePage() {
  const navigate = useNavigate();
  const queue = useDeliveryQueue();

  useEffect(() => {
    if (queue.claimedId) {
      navigate('/deliveries/active');
    }
  }, [queue.claimedId, navigate]);

  // Shown in place rather than a silent redirect, so a Courier who lands
  // here mid-job sees why, instead of bouncing straight to /deliveries/active.
  if (queue.hasActiveDelivery) {
    return (
      <div className="min-h-screen bg-courier-bg">
        <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 lg:py-10">
          <EmptyState
            icon={Truck}
            title="You have an active delivery"
            description="Finish your current delivery before claiming another one from the queue."
            action={
              <Link
                to="/deliveries/active"
                className={cn(
                  buttonVariants({ variant: 'default' }),
                  'bg-courier-primary text-courier-on-primary hover:bg-courier-primary-hover transition-all duration-200 ease-out hover:shadow-md active:scale-[0.98] focus-visible:ring-courier-primary/40',
                )}
              >
                Go to Active Delivery
              </Link>
            }
          />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-courier-bg">
      <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 lg:py-10">
        <header className="mb-6">
          <h1 className="text-3xl font-extrabold tracking-tight text-courier-title">
            Delivery Queue
          </h1>
          <p className="mt-1 text-sm text-courier-text-muted">
            Unclaimed deliveries, oldest first. Claim one to begin.
          </p>
        </header>

        {queue.hasActiveDelivery === null || queue.isLoading ? (
          <LoadingSkeleton />
        ) : queue.error ? (
          <ErrorState message={queue.error} onRetry={queue.retry} />
        ) : queue.items.length === 0 ? (
          <EmptyState
            title="No deliveries waiting"
            description="New deliveries will show up here as soon as they're ready to be claimed. Check back shortly."
          />
        ) : (
          <>
            <ul role="list" className="flex flex-col gap-4">
              {queue.items.map((delivery) => (
                <li key={delivery.id}>
                  <DeliveryCard
                    delivery={delivery}
                    isClaiming={queue.claimingId === delivery.id}
                    errorMessage={
                      queue.rowError?.id === delivery.id ? queue.rowError.message : null
                    }
                    onClaim={queue.claim}
                  />
                </li>
              ))}
            </ul>

            {/* E2: ordering is fixed oldest-first server-side — no sort control
                belongs here, so no Courier can cherry-pick work. */}
            <Pagination
              page={queue.page}
              pageSize={queue.pageSize}
              totalItems={queue.total}
              itemLabel="deliveries"
              onPageChange={queue.goToPage}
              className="mt-4 rounded-xl border border-courier-border"
            />
          </>
        )}
      </main>
    </div>
  );
}
