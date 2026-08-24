import { ClipboardList } from 'lucide-react';
import { EmptyState } from '@/shared/components/EmptyState/EmptyState';
import { ErrorState } from '@/shared/components/ErrorState/ErrorState';
import { LoadingSkeleton } from '@/shared/components/LoadingSkeleton/LoadingSkeleton';
import { Pagination } from '@/shared/components/Pagination/Pagination';
import { Panel } from '@/shared/components/Panel/Panel';
import type { ListingUnit } from '@/types/api';
import type { ListingOrderDTO } from '../../types';
import {
  ListingOrderDesktopRow,
  ListingOrderMobileCard,
} from './ListingOrderItem';

interface ListingOrdersTableProps {
  orders: ListingOrderDTO[];
  unit: ListingUnit;
  page: number;
  pageSize: number;
  total: number;
  isLoading: boolean;
  error: string | null;
  isEndpointUnavailable: boolean;
  isPerRequest: boolean;
  onPageChange: (page: number) => void;
  onRetry: () => void;
}

// Renders the responsive, paginated C8 order collection.
export function ListingOrdersTable({
  orders,
  unit,
  page,
  pageSize,
  total,
  isLoading,
  error,
  isEndpointUnavailable,
  isPerRequest,
  onPageChange,
  onRetry,
}: ListingOrdersTableProps) {
  if (isLoading) {
    return (
      <LoadingSkeleton
        count={3}
        className="mt-5"
      />
    );
  }

  if (error) {
    return (
      <ErrorState
        title={
          isEndpointUnavailable
            ? 'Backend endpoint not implemented'
            : 'Unable to load reservations'
        }
        message={error}
        retryLabel="Try Again"
        onRetry={onRetry}
        className="mt-5"
      />
    );
  }

  if (isPerRequest) {
    return (
      <EmptyState
        title="Orders are not tracked"
        description="Per Request listings do not create reservations or tracked orders."
        icon={ClipboardList}
        className="mt-5"
      />
    );
  }

  if (orders.length === 0) {
    return (
      <EmptyState
        title="No donations or reservations"
        description="Tracked Recipient orders for this listing will appear here."
        icon={ClipboardList}
        className="mt-5"
      />
    );
  }

  return (
    <Panel
      title="All donations for this food listing"
      description="Payment details come directly from each order. Recipient feedback is shown only when it has been submitted."
      className="mt-5 overflow-hidden shadow-sm"
      contentClassName="p-0"
    >
      <div className="space-y-3 p-4 lg:hidden">
        {orders.map((order) => (
          <ListingOrderMobileCard
            key={order.id}
            order={order}
            unit={unit}
          />
        ))}
      </div>

      <div className="hidden overflow-x-auto lg:block">
        <table className="w-full min-w-[1120px] border-collapse text-left text-sm">
          <caption className="sr-only">
            Donations and reservations for the selected
            food listing
          </caption>

          <thead className="bg-[#F7F7FB] text-[#414844]">
            <tr>
              <th
                scope="col"
                className="px-5 py-4 text-xs font-bold uppercase tracking-wider"
              >
                Recipient
              </th>

              <th
                scope="col"
                className="px-5 py-4 text-xs font-bold uppercase tracking-wider"
              >
                Created
              </th>

              <th
                scope="col"
                className="px-5 py-4 text-xs font-bold uppercase tracking-wider"
              >
                Quantity
              </th>

              <th
                scope="col"
                className="px-5 py-4 text-xs font-bold uppercase tracking-wider"
              >
                Order status
              </th>

              <th
                scope="col"
                className="px-5 py-4 text-xs font-bold uppercase tracking-wider"
              >
                Payment
              </th>

              <th
                scope="col"
                className="px-5 py-4 text-xs font-bold uppercase tracking-wider"
              >
                Delivery
              </th>

              <th
                scope="col"
                className="px-5 py-4 text-xs font-bold uppercase tracking-wider"
              >
                Feedback
              </th>
            </tr>
          </thead>

          <tbody>
            {orders.map((order) => (
              <ListingOrderDesktopRow
                key={order.id}
                order={order}
                unit={unit}
              />
            ))}
          </tbody>
        </table>
      </div>

      <Pagination
        page={page}
        pageSize={pageSize}
        totalItems={total}
        itemLabel="orders"
        isDisabled={isLoading}
        onPageChange={onPageChange}
        className="rounded-none border-x-0 border-b-0"
      />
    </Panel>
  );
}

export default ListingOrdersTable;