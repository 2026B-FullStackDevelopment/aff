import type { QueueDeliveryDTO } from '@/types/api';
import { CourierButton } from './CourierButton';
import { DeliveryDetailRow } from './DeliveryDetailRow';

interface DeliveryCardProps {
  delivery: QueueDeliveryDTO;
  isClaiming: boolean;
  errorMessage: string | null;
  onClaim: (deliveryId: string) => void;
}

/**
 * One unclaimed delivery in the Courier queue: the donor, what to carry and
 * where, plus the Claim action. Replaces the earlier unstyled `QueueRow`.
 */
export function DeliveryCard({
  delivery,
  isClaiming,
  errorMessage,
  onClaim,
}: DeliveryCardProps) {
  return (
    <article className="rounded-xl border border-courier-border bg-courier-surface p-5 transition-all duration-200 ease-out hover:shadow-md">
      <h2 className="text-base font-bold text-courier-title">
        {delivery.donor.companyName ?? 'Unknown donor'}
      </h2>

      <div className="mt-3 flex flex-col gap-2">
        <DeliveryDetailRow label="Item" value={delivery.listing.name ?? '—'} />
        <DeliveryDetailRow label="Quantity" value={delivery.order.quantity ?? '—'} />
        <DeliveryDetailRow
          label="Collect from"
          value={delivery.pickupAddressText ?? '—'}
        />
        <DeliveryDetailRow
          label="Deliver to"
          value={delivery.order.deliveryAddressText ?? '—'}
        />
      </div>

      <div className="mt-4">
        <CourierButton
          type="button"
          disabled={isClaiming}
          onClick={() => onClaim(delivery.id)}
          className="w-full sm:w-auto"
        >
          {isClaiming ? 'Claiming…' : 'Claim'}
        </CourierButton>
      </div>

      {errorMessage ? (
        <p role="status" className="mt-2 text-sm font-semibold text-shared-error-text">
          {errorMessage}
        </p>
      ) : null}
    </article>
  );
}
