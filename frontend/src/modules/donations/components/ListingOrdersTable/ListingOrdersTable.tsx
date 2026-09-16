import { ClipboardList } from 'lucide-react';
import { EmptyState } from '@/shared/components/EmptyState';
import { ErrorState } from '@/shared/components/ErrorState';
import { LoadingSkeleton } from '@/shared/components/LoadingSkeleton';
import { Pagination } from '@/shared/components/Pagination';
import { Panel } from '@/shared/components/Panel';
import type { ListingUnit } from '@/types/api';
import type { ListingOrderDTO } from '../../types';
import { ListingOrderDesktopRow } from './ListingOrderDesktopRow';
import { ListingOrderMobileCard } from './ListingOrderMobileCard';

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

const ORDER_TABLE_HEADINGS = [
    'Recipient',
    'Order type',
    'Created',
    'Quantity',
    'Order status',
    'Payment',
    'Delivery',
    'Feedback',
] as const;

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
                        : 'Unable to load orders'
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
            description="This table includes Recipient reservations and Donor-initiated donations. Payment and delivery states come directly from each tracked order."
            className="mt-5 overflow-hidden shadow-sm"
            contentClassName="p-0"
        >
            <div className="space-y-3 p-4 xl:hidden">
                {orders.map((order) => (
                    <ListingOrderMobileCard
                        key={order.id}
                        order={order}
                        unit={unit}
                    />
                ))}
            </div>

            <div className="hidden xl:block">
                <table className="w-full table-fixed border-collapse text-left text-sm">
                    <caption className="sr-only">
                        Donations and reservations for the selected
                        food listing
                    </caption>

                    <colgroup>
                        <col className="w-[13%]" />
                        <col className="w-[12%]" />
                        <col className="w-[15%]" />
                        <col className="w-[9%]" />
                        <col className="w-[13%]" />
                        <col className="w-[12%]" />
                        <col className="w-[13%]" />
                        <col className="w-[13%]" />
                    </colgroup>

                    <thead className="bg-[#F7F7FB] text-[#414844]">
                        <tr>
                            {ORDER_TABLE_HEADINGS.map((heading) => (
                                <th
                                    key={heading}
                                    scope="col"
                                    className="px-3 py-4 text-xs font-bold uppercase tracking-wider"
                                >
                                    {heading}
                                </th>
                            ))}
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
