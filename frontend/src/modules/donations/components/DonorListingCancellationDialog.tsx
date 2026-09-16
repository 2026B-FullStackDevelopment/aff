import { ConfirmationDialog } from '@/shared/components/ConfirmationDialog';
import type { PendingListingCancellation } from '../hooks/useListingActions';

interface DonorListingCancellationDialogProps {
  cancellation: PendingListingCancellation | null;
  busyListingId: string | null;
  onConfirm: () => void;
  onClose: () => void;
}

/** Presents the C5 cancellation impact before the Donor confirms. */
export function DonorListingCancellationDialog({
  cancellation,
  busyListingId,
  onConfirm,
  onClose,
}: DonorListingCancellationDialogProps) {
  return (
    <ConfirmationDialog
      open={cancellation !== null}
      title="Cancel this listing?"
      tone="danger"
      confirmLabel="Cancel Listing"
      cancelLabel="Keep Listing"
      isPending={Boolean(cancellation && busyListingId === cancellation.listing.id)}
      onConfirm={onConfirm}
      onClose={onClose}
      description={cancellation ? (
        <div className="space-y-2">
          <p>
            You are about to cancel <strong>{cancellation.listing.name}</strong>.
          </p>
          <p>
            {cancellation.pendingOrderCount} pending{' '}
            {cancellation.pendingOrderCount === 1 ? 'order' : 'orders'} will be
            automatically cancelled.
          </p>
          <p>
            Orders already assigned to a Courier or further along in delivery
            will not be cancelled.
          </p>
        </div>
      ) : null}
    />
  );
}

