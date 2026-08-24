import { useState } from 'react';
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

function getResponseMessage(
  data: unknown,
  fallback: string,
): string {
  if (
    typeof data === 'object'
    && data !== null
    && 'message' in data
    && typeof data.message === 'string'
  ) {
    return data.message;
  }

  return fallback;
}

function isOrderAwaitingCancellation(
  order: ListingOrderDTO,
): boolean {
  if (order.orderStatus === 'CANCELLED') {
    return false;
  }

  return (
    order.delivery === null
    || order.delivery.stage === 'AWAITING_COURIER'
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

    pendingOrderCount += orders.filter(
      isOrderAwaitingCancellation,
    ).length;

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
        setFeedback({
          variant: 'error',
          title: 'Backend work required',
          message:
            'Listing status updates are not implemented by the backend yet.',
        });
        return;
      }

      if (response.status === 409) {
        setFeedback({
          variant: 'warning',
          title: 'Listing changed',
          message:
            'This listing changed elsewhere. Its latest status is being loaded.',
        });
        onChanged();
        return;
      }

      if (response.status === 403) {
        setFeedback({
          variant: 'error',
          title: 'Action not allowed',
          message:
            'You do not have permission to update this listing.',
        });
        return;
      }

      if (response.status === 404) {
        setFeedback({
          variant: 'error',
          title: 'Listing not found',
          message:
            'This listing no longer exists.',
        });
        onChanged();
        return;
      }

      if (!response.ok || !response.data) {
        setFeedback({
          variant: 'error',
          title: 'Unable to update listing',
          message: getResponseMessage(
            response.data,
            'The listing status could not be updated.',
          ),
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

      setFeedback({
        variant: 'success',
        title: `Listing ${actionLabel}`,
        message:
          status === 'CANCELLED'
            ? `${listing.name} was cancelled. ${cancelledOrderCount} pending ${cancelledOrderCount === 1 ? 'order was' : 'orders were'} also cancelled.`
            : `${listing.name} was ${actionLabel} successfully.`,
      });

      setPendingCancellation(null);
      onChanged();
    } catch {
      setFeedback({
        variant: 'error',
        title: 'Unable to reach AFF',
        message:
          'Check your connection and try the action again.',
      });
    } finally {
      setBusyListingId(null);
    }
  }

  async function prepareCancellation(
    listing: ManagedListingDTO,
  ) {
    setBusyListingId(listing.id);
    setFeedback(null);

    try {
      const result = await countPendingOrders(
        listing.id,
      );

      if (result.ok === false) {
        setFeedback({
          variant: 'error',
          title: 'Unable to prepare cancellation',
          message: result.message,
        });
        return;
      }

      setPendingCancellation({
        listing,
        pendingOrderCount: result.count,
      });
    } catch {
      setFeedback({
        variant: 'error',
        title: 'Unable to reach AFF',
        message:
          'Pending orders could not be checked. The listing was not cancelled.',
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