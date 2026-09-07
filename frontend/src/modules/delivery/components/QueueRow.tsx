import { Button } from '@/shared/components/Button/Button';
import type { QueueDeliveryDTO } from '@/types/api';

interface QueueRowProps {
  delivery: QueueDeliveryDTO;
  isClaiming: boolean;
  errorMessage: string | null;
  onClaim: (deliveryId: string) => void;
}

export function QueueRow({ delivery, isClaiming, errorMessage, onClaim }: QueueRowProps) {
  return (
    <article className="flex flex-col gap-2 border-b p-4">
      <p className="font-medium">{delivery.donor.companyName ?? 'Unknown donor'}</p>
      <p className="text-sm">Quantity: {delivery.order.quantity ?? '—'}</p>
      <p className="text-sm">Deliver to: {delivery.order.deliveryAddressText ?? '—'}</p>

      <Button
        type="button"
        disabled={isClaiming}
        onClick={() => onClaim(delivery.id)}
      >
        {isClaiming ? 'Claiming…' : 'Claim'}
      </Button>

      {errorMessage ? (
        <p role="status" className="text-sm">
          {errorMessage}
        </p>
      ) : null}
    </article>
  );
}
