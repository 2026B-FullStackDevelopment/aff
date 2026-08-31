import { useState } from 'react';
import { RecipientTopNavigation } from '@/shared/components/RecipientTopNavigation/RecipientTopNavigation';
import { PageHeader } from '@/shared/components/PageHeader/PageHeader';
import { Panel } from '@/shared/components/Panel/Panel';
import { Pagination } from '@/shared/components/Pagination/Pagination';
import { CollectionHistoryTable } from '../components/CollectionHistoryTable';
import { LeaveFeedbackModal } from '../components/LeaveFeedbackModal';
import { useCollectionHistory } from '../hooks/useCollectionHistory';
import type { CollectionHistoryItem } from '../services/collectionHistory.mock';
import { getStoredUser } from '@/services/authStorage';


export function ReservationsPage() {
  const user = getStoredUser();
  const {
    items,
    page,
    setPage,
    pageSize,
    total,
    isLoading,
    error,
    refetch,
    pendingFeedbackId,
    submitItemFeedback,
  } = useCollectionHistory();

  const [feedbackItem, setFeedbackItem] = useState<CollectionHistoryItem | null>(null);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f5faf7] to-[#e9f5ee]">
      <RecipientTopNavigation
        avatarUrl={user?.avatarUrl}
        avatarAlt={user?.username ?? 'Recipient profile'}
      />

      <main className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-8 sm:px-6 lg:px-8">
        <PageHeader
          title="Collection History"
        />

        <Panel contentClassName="p-0">
          <CollectionHistoryTable
            items={items}
            isLoading={isLoading}
            error={error}
            pendingFeedbackId={pendingFeedbackId}
            onRetry={refetch}
            onLeaveFeedback={setFeedbackItem}
          />

          {!isLoading && !error && items.length > 0 && (
            <Pagination
              page={page}
              pageSize={pageSize}
              totalItems={total}
              itemLabel="collections"
              onPageChange={setPage}
            />
          )}
        </Panel>
      </main>

      {feedbackItem && (
        <LeaveFeedbackModal
          item={feedbackItem}
          isSubmitting={pendingFeedbackId === feedbackItem.id}
          onClose={() => setFeedbackItem(null)}
          onSubmit={(comment) => submitItemFeedback(feedbackItem.id, comment)}
        />
      )}
    </div>
  );
}

export default ReservationsPage;
