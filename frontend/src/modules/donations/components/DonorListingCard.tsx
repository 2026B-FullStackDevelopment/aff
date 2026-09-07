import {
    Copy,
    Eye,
    Pause,
    Play,
    X,
} from 'lucide-react';
import { Button } from '@/shared/components/Button/Button';
import { StatusBadge } from '@/shared/components/StatusBadge/StatusBadge';
import { CATEGORY_LABELS, UNIT_LABELS, formatDate, formatPrice } from '@/shared/utils/listingFormatting';
import { ListingDetailField } from './ListingDetailField';
import type {
    DonorListingStatusUpdate,
    ManagedListingDTO,
} from '../types';

interface DonorListingCardProps {
    listing: ManagedListingDTO;
    isBusy?: boolean;
    onClone: (listing: ManagedListingDTO) => void;
    onViewOrders: (
        listing: ManagedListingDTO,
    ) => void;
    onStatusChange: (
        listing: ManagedListingDTO,
        status: DonorListingStatusUpdate,
    ) => void;
}

function formatQuantity(
    quantity: number,
    unit: ManagedListingDTO['unit'],
): string {
    if (unit === 'PER_REQUEST') {
        return 'Not tracked';
    }

    return `${quantity.toLocaleString()} ${UNIT_LABELS[unit] ?? ''}`;
}

function getStatusMessage(
    listing: ManagedListingDTO,
): string {
    switch (listing.status) {
        case 'ACTIVE':
            return 'Accepting new reservations.';
        case 'PAUSED':
            return 'Paused — no new reservations; existing reservations remain.';
        case 'SOLD_OUT':
            return 'Sold out — the tracked quantity has been fully allocated.';
        case 'CANCELLED':
            return 'Cancelled listings cannot accept reservations.';
    }
}

// Distinct from formatPrice: revenue of 0 means "0 VND earned", not "Free".
function formatRevenue(revenue: number): string {
    return `${revenue.toLocaleString('en-US')} VND`;
}

// Displays one owned listing and its available Donor actions.
export function DonorListingCard({
    listing,
    isBusy = false,
    onClone,
    onViewOrders,
    onStatusChange,
}: DonorListingCardProps) {
    const isTracked =
        listing.unit !== 'PER_REQUEST';

    const canChangeStatus =
        listing.status === 'ACTIVE'
        || listing.status === 'PAUSED';

    return (
        <article className="rounded-xl border border-[#E4E2E1] bg-white p-5 sm:p-6">
            <header className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                    <h3 className="truncate text-lg font-bold text-[#5B3A00]">
                        {listing.name}
                    </h3>

                    <p className="mt-1 text-xs text-[#6B7280]">
                        Listing ID: {listing.id}
                    </p>
                </div>

                <StatusBadge
                    status={listing.status}
                    className="shrink-0"
                />
            </header>

            <dl className="mt-6 grid grid-cols-2 gap-x-5 gap-y-5 sm:grid-cols-4 lg:grid-cols-4 xl:grid-cols-8">
                <ListingDetailField
                    label="Measurement unit"
                    value={
                        listing.unit === 'PER_REQUEST'
                            ? 'Per Request'
                            : UNIT_LABELS[listing.unit] ?? listing.unit
                    }
                    valueClassName="font-medium"
                />

                <ListingDetailField
                    label="Food category"
                    value={CATEGORY_LABELS[listing.category] ?? listing.category}
                    valueClassName="font-medium"
                />

                <ListingDetailField
                    label="Vegetarian"
                    value={listing.isVegetarian ? 'Yes' : 'No'}
                    valueClassName="font-medium"
                />

                <ListingDetailField
                    label="Donation limit"
                    value={formatQuantity(
                        listing.donationLimit,
                        listing.unit,
                    )}
                    valueClassName="font-medium"
                />

                <ListingDetailField
                    label="Ration per person"
                    value={
                        listing.rationLimitPerPerson === null
                            ? 'No limit'
                            : formatQuantity(
                                listing.rationLimitPerPerson,
                                listing.unit,
                            )
                    }
                    valueClassName="font-medium"
                />

                <ListingDetailField
                    label="Price"
                    value={formatPrice(listing.price)}
                    valueClassName="font-medium"
                />

                <ListingDetailField
                    label="Donated quantity"
                    value={
                        isTracked
                            ? formatQuantity(
                                listing.donatedQuantity,
                                listing.unit,
                            )
                            : 'Not tracked'
                    }
                    valueClassName="font-medium"
                />

                <ListingDetailField
                    label="Revenue"
                    value={
                        isTracked
                            ? formatRevenue(listing.revenue)
                            : 'Not tracked'
                    }
                    valueClassName="font-medium"
                />
            </dl>

            <div className="mt-5 flex flex-col gap-4 border-t border-[#E4E2E1] pt-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <p
                        className={
                            listing.status === 'CANCELLED'
                                ? 'text-xs font-medium text-red-700'
                                : 'text-xs font-medium text-[#805300]'
                        }
                    >
                        {getStatusMessage(listing)}
                    </p>

                    <p className="mt-1 text-xs text-[#6B7280]">
                        Created {formatDate(listing.createdAt, { withTime: true })}
                    </p>
                </div>

                <div className="flex flex-wrap justify-start gap-2 sm:justify-end">
                    <Button
                        type="button"
                        variant="outline"
                        disabled={isBusy}
                        onClick={() => onClone(listing)}
                        className="h-10 border-[#E4E2E1] bg-white px-4 text-[#805300] transition-all duration-200 ease-out hover:border-[#805300] hover:bg-[#FFF6E3] hover:shadow-md active:scale-[0.98]"
                    >
                        <Copy className="size-4" aria-hidden="true" />
                        Reuse Configuration
                    </Button>

                    {isTracked && (
                        <Button
                            type="button"
                            variant="outline"
                            disabled={isBusy}
                            onClick={() => onViewOrders(listing)}
                            className="h-10 border-[#E4E2E1] bg-white px-4 text-[#414844] transition-all duration-200 ease-out hover:border-[#805300] hover:bg-[#FFF6E3] hover:shadow-md active:scale-[0.98]"
                        >
                            <Eye className="size-4" aria-hidden="true" />
                            View Orders
                        </Button>
                    )}

                    {listing.status === 'ACTIVE' && (
                        <Button
                            type="button"
                            variant="outline"
                            disabled={isBusy}
                            onClick={() =>
                                onStatusChange(listing, 'PAUSED')
                            }
                            className="h-10 border-[#E4E2E1] bg-white px-4 text-[#805300] transition-all duration-200 ease-out hover:border-[#805300] hover:bg-[#FFF6E3] hover:shadow-md active:scale-[0.98]"
                        >
                            <Pause className="size-4" aria-hidden="true" />
                            Pause
                        </Button>
                    )}

                    {listing.status === 'PAUSED' && (
                        <Button
                            type="button"
                            variant="outline"
                            disabled={isBusy}
                            onClick={() =>
                                onStatusChange(listing, 'ACTIVE')
                            }
                            className="h-10 border-[#E4E2E1] bg-white px-4 text-[#805300] transition-all duration-200 ease-out hover:border-[#805300] hover:bg-[#FFF6E3] hover:shadow-md active:scale-[0.98]"
                        >
                            <Play className="size-4" aria-hidden="true" />
                            Resume
                        </Button>
                    )}

                    {canChangeStatus && (
                        <Button
                            type="button"
                            variant="outline"
                            disabled={isBusy}
                            onClick={() =>
                                onStatusChange(
                                    listing,
                                    'CANCELLED',
                                )
                            }
                            className="h-10 border-red-200 bg-red-50 px-4 text-red-700 transition-all duration-200 ease-out hover:border-red-300 hover:bg-red-100 hover:text-red-800 hover:shadow-md active:scale-[0.98]"
                        >
                            <X className="size-4" aria-hidden="true" />
                            Cancel
                        </Button>
                    )}
                </div>
            </div>
        </article>
    );
}

export default DonorListingCard;
