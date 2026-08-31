import { PackageSearch } from 'lucide-react';
import { EmptyState } from '@/shared/components/EmptyState/EmptyState';
import { ErrorState } from '@/shared/components/ErrorState/ErrorState';
import { LoadingSkeleton } from '@/shared/components/LoadingSkeleton/LoadingSkeleton';
import { CollectionHistoryRow } from './CollectionHistoryRow';
import type { CollectionHistoryItem } from '../services/collectionHistory.mock';

const COLUMN_HEADERS = [
  'Donation Name',
  'Donor Name',
  'Category & Qty',
  'Price',
  'Date & Time',
  'Payment',
  'Action',
] as const;

interface CollectionHistoryTableProps {
  items: CollectionHistoryItem[];
  isLoading: boolean;
  error: string | null;
  pendingFeedbackId: string | null;
  onRetry: () => void;
  onLeaveFeedback: (item: CollectionHistoryItem) => void;
}

export function CollectionHistoryTable({
  items,
  isLoading,
  error,
  pendingFeedbackId,
  onRetry,
  onLeaveFeedback,
}: CollectionHistoryTableProps) {
  if (isLoading) {
    return <LoadingSkeleton count={4} />;
  }

  if (error) {
    return <ErrorState message={error} onRetry={onRetry} />;
  }

  if (items.length === 0) {
    return (
      <EmptyState
        icon={PackageSearch}
        title="No collections yet"
        description="Reservations you collect will show up here, along with the option to leave feedback for the donor."
      />
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-[#e9f5ee]">
      <table className="w-full min-w-[720px] border-collapse bg-white">
        <thead>
          <tr className="border-b border-[#e9f5ee] bg-[#f0f7f3]">
            {COLUMN_HEADERS.map((heading) => (
              <th
                key={heading}
                scope="col"
                className="px-4 py-3 text-left text-[0.7rem] font-bold uppercase tracking-wider text-[#6B7280]"
              >
                {heading}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {items.map((item) => (
            <CollectionHistoryRow
              key={item.id}
              item={item}
              isSubmittingFeedback={pendingFeedbackId === item.id}
              onLeaveFeedback={onLeaveFeedback}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default CollectionHistoryTable;
