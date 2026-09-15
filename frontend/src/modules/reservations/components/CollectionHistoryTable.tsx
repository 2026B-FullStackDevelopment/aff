import { PackageSearch } from 'lucide-react';
import { EmptyState } from '@/shared/components/EmptyState/EmptyState';
import { ErrorState } from '@/shared/components/ErrorState/ErrorState';
import { LoadingSkeleton } from '@/shared/components/LoadingSkeleton/LoadingSkeleton';
import { CollectionHistoryRow } from './CollectionHistoryRow';
import type { RecipientOrderDTO } from '@/types/api';

const COLUMN_HEADERS = [
  'Donation Name',
  'Donor Name',
  'Category',
  'Quantity',
  'Price',
  'Date & Time',
  'Payment',
  'Status',
] as const;

interface CollectionHistoryTableProps {
  items: RecipientOrderDTO[];
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
}

export function CollectionHistoryTable({
  items,
  isLoading,
  error,
  onRetry,
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
        title="No orders yet"
        description="Orders you place will show up here, along with their delivery status."
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
                className="px-4 py-2 text-left text-[0.7rem] font-bold uppercase tracking-wider text-[#6B7280]"
              >
                {heading}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {items.map((item) => (
            <CollectionHistoryRow key={item.id} item={item} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default CollectionHistoryTable;
