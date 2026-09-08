import type { QueueDeliveryDTO } from '@/types/api';
import { formatPrice } from '@/shared/utils/listingFormatting';
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
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-bold text-courier-title">
          {delivery.donor.companyName ?? 'Unknown donor'}
        </h2>

        {delivery.order.requiresCashCollection && (
          <span className="shrink-0 rounded-full bg-courier-primary-container px-2.5 py-0.5 text-xs font-semibold text-courier-primary">
            Cash on delivery
          </span>
        )}
      </div>

      <div className="mt-3 flex flex-col gap-2">
        <DeliveryDetailRow label="Item" value={delivery.listing.name ?? '—'} />
        <DeliveryDetailRow label="Quantity" value={delivery.order.quantity ?? '—'} />
        <DeliveryDetailRow
          label="Amount"
          value={delivery.order.amount !== null ? formatPrice(delivery.order.amount) : '—'}
        />
        <DeliveryDetailRow
          label="Collect from"
          value={delivery.listing.pickupAddressText ?? '—'}
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
