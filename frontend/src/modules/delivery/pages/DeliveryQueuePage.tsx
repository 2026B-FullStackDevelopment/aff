import { useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { EmptyState } from '@/shared/components/EmptyState/EmptyState';
import { ErrorState } from '@/shared/components/ErrorState/ErrorState';
import { LoadingSkeleton } from '@/shared/components/LoadingSkeleton/LoadingSkeleton';
import { Pagination } from '@/shared/components/Pagination/Pagination';
import { QueueRow } from '../components/QueueRow';
import { useDeliveryQueue } from '../hooks/useDeliveryQueue';

export function DeliveryQueuePage() {
  const navigate = useNavigate();
  const queue = useDeliveryQueue();

  useEffect(() => {
    if (queue.claimedId) {
      navigate('/deliveries/active');
    }
  }, [queue.claimedId, navigate]);

  // `replace` matters: without it, Back bounces between the two screens.
  if (queue.hasActiveDelivery) {
    return <Navigate to="/deliveries/active" replace />;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <main>
        {queue.hasActiveDelivery === null || queue.isLoading ? (
          <LoadingSkeleton />
        ) : queue.error ? (
          <ErrorState message={queue.error} onRetry={queue.retry} />
        ) : queue.items.length === 0 ? (
          <EmptyState
            title="No deliveries waiting"
            description="No deliveries waiting."
          />
        ) : (
          <>
            {queue.items.map((delivery) => (
              <QueueRow
                key={delivery.id}
                delivery={delivery}
                isClaiming={queue.claimingId === delivery.id}
                errorMessage={
                  queue.rowError?.id === delivery.id ? queue.rowError.message : null
                }
                onClaim={queue.claim}
              />
            ))}

            {/* E2: ordering is fixed oldest-first server-side — no sort control
                belongs here, so no Courier can cherry-pick work. */}
            <Pagination
              page={queue.page}
              pageSize={queue.pageSize}
              totalItems={queue.total}
              itemLabel="deliveries"
              onPageChange={queue.goToPage}
            />
          </>
        )}
      </main>
    </div>
  );
}
