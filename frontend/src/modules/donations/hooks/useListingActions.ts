import { useState } from 'react';
import { toast } from '@/shared/components/ui/sonner';
import { getResponseMessage } from '@/shared/utils/apiError';
import { listingService } from '../services/listing.service';
import type {
    DonorListingStatusUpdate,
    ListingOrderDTO,
    ManagedListingDTO,
} from '../types';

export type ListingActionFeedback = {
    variant: 'success' | 'warning' | 'error';
    title: string;
    message: string;
};

export interface PendingListingCancellation {
    listing: ManagedListingDTO;
    pendingOrderCount: number;
}

interface UseListingActionsOptions {
    onChanged: () => void;
}

type PendingOrderCountResult =
    | {
        ok: true;
        count: number;
    }
    | {
        ok: false;
        message: string;
    };


function isOrderAwaitingCancellation(
    order: ListingOrderDTO,
): boolean | null {
    if (order.orderStatus === 'CANCELLED') {
        return false;
    }

    if (order.delivery === undefined) {
        return null;
    }

    if (order.delivery === null) {
        return true;
    }

    return (
        order.delivery.stage
        === 'AWAITING_COURIER'
    );
}

async function countPendingOrders(
    listingId: string,
): Promise<PendingOrderCountResult> {
    const limit = 100;
    let page = 1;
    let loadedOrderCount = 0;
    let totalOrderCount = 0;
    let pendingOrderCount = 0;

    do {
        const response =
            await listingService.getListingOrders(
                listingId,
                page,
                limit,
            );

        if (response.status === 501) {
            return {
                ok: false,
                message:
                    'Cancellation cannot be prepared because listing orders are not implemented by the backend yet.',
            };
        }

        if (response.status === 403) {
            return {
                ok: false,
                message:
                    'You no longer have permission to manage this listing.',
            };
        }

        if (response.status === 404) {
            return {
                ok: false,
                message:
                    'This listing no longer exists.',
            };
        }

        if (!response.ok || !response.data) {
            return {
                ok: false,
                message: getResponseMessage(
                    response.data,
                    'Unable to inspect pending orders for this listing.',
                ),
            };
        }

        const orders = response.data.items;

        for (const order of orders) {
            const isAwaitingCancellation =
                isOrderAwaitingCancellation(
                    order,
                );

            if (
                isAwaitingCancellation === null
            ) {
                return {
                    ok: false,
                    message:
                        'AFF could not verify which orders are still awaiting a Courier. The listing was not cancelled.',
                };
            }

            if (isAwaitingCancellation) {
                pendingOrderCount += 1;
            }
        }

        loadedOrderCount += orders.length;
        totalOrderCount = response.data.total;
        page += 1;

        if (orders.length === 0) {
            break;
        }
    } while (loadedOrderCount < totalOrderCount);

    return {
        ok: true,
        count: pendingOrderCount,
    };
}

// Owns C5 status mutations and cancellation preparation.
export function useListingActions({
    onChanged,
}: UseListingActionsOptions) {
    const [busyListingId, setBusyListingId] =
        useState<string | null>(null);

    const [
        pendingCancellation,
        setPendingCancellation,
    ] = useState<PendingListingCancellation | null>(
        null,
    );

    const [feedback, setFeedback] =
        useState<ListingActionFeedback | null>(null);

    async function applyStatusChange(
        listing: ManagedListingDTO,
        status: DonorListingStatusUpdate,
    ) {
        setBusyListingId(listing.id);
        setFeedback(null);

        try {
            const response =
                await listingService.updateListingStatus(
                    listing.id,
                    { status },
                );

            if (response.status === 501) {
                toast.error('Backend work required', {
                    description: 'Listing status updates are not implemented by the backend yet.',
                });
                return;
            }

            if (response.status === 409) {
                toast.warning('Listing changed', {
                    description: 'This listing changed elsewhere. Its latest status is being loaded.',
                });
                onChanged();
                return;
            }

            if (response.status === 403) {
                toast.error('Action not allowed', {
                    description: 'You do not have permission to update this listing.',
                });
                return;
            }

            if (response.status === 404) {
                toast.error('Listing not found', {
                    description: 'This listing no longer exists.',
                });
                onChanged();
                return;
            }

            if (!response.ok || !response.data) {
                const message = getResponseMessage(
                    response.data,
                    'The listing status could not be updated.',
                );
                toast.error('Unable to update listing', {
                    description: message,
                });
                return;
            }

            const actionLabel =
                status === 'PAUSED'
                    ? 'paused'
                    : status === 'ACTIVE'
                        ? 'resumed'
                        : 'cancelled';

            const cancelledOrderCount =
                response.data.cancelledOrderCount;

            const successMsg =
                status === 'CANCELLED'
                    ? `${listing.name} was cancelled. ${cancelledOrderCount} pending ${cancelledOrderCount === 1 ? 'order was' : 'orders were'} also cancelled.`
                    : `${listing.name} was ${actionLabel} successfully.`;

            toast.success(`Listing ${actionLabel}`, {
                description: successMsg,
            });

            setPendingCancellation(null);
            onChanged();
        } catch {
            toast.error('Unable to reach AFF', {
                description: 'Check your connection and try the action again.',
            });
        } finally {
            setBusyListingId(null);
        }
    }

    async function prepareCancellation(
        listing: ManagedListingDTO,
    ) {
        setBusyListingId(listing.id);

        try {
            const result = await countPendingOrders(
                listing.id,
            );

            if (result.ok === false) {
                toast.error('Unable to prepare cancellation', {
                    description: result.message,
                });
                return;
            }

            setPendingCancellation({
                listing,
                pendingOrderCount: result.count,
            });
        } catch {
            toast.error('Unable to reach AFF', {
                description: 'Pending orders could not be checked. The listing was not cancelled.',
            });
        } finally {
            setBusyListingId(null);
        }
    }

    function requestStatusChange(
        listing: ManagedListingDTO,
        status: DonorListingStatusUpdate,
    ) {
        if (status === 'CANCELLED') {
            void prepareCancellation(listing);
            return;
        }

        void applyStatusChange(listing, status);
    }

    async function confirmCancellation() {
        if (!pendingCancellation) {
            return;
        }

        await applyStatusChange(
            pendingCancellation.listing,
            'CANCELLED',
        );
    }

    function closeCancellation() {
        if (busyListingId) {
            return;
        }

        setPendingCancellation(null);
    }

    function dismissFeedback() {
        setFeedback(null);
    }

    return {
        busyListingId,
        pendingCancellation,
        feedback,
        requestStatusChange,
        confirmCancellation,
        closeCancellation,
        dismissFeedback,
    };
}

export default useListingActions;