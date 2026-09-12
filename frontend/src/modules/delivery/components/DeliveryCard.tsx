import type { QueueDeliveryDTO } from '@/types/api';
import { formatPrice } from '@/shared/utils/listingFormatting';
import { cn } from '@/shared/utils';
import { CourierButton } from './CourierButton';

interface DeliveryCardProps {
  delivery: QueueDeliveryDTO;
  isClaiming: boolean;
  errorMessage: string | null;
  onClaim: (deliveryId: string) => void;
}

/**
 * One unclaimed delivery in the Courier queue: the donor and what to carry on
 * one scannable line, the pickup → drop-off route below it, and the Claim
 * action. Laid out as a compact route card (donor · payload · route · action)
 * so a Courier can triage a full page of deliveries without scrolling.
 */
export function DeliveryCard({
  delivery,
  isClaiming,
  errorMessage,
  onClaim,
}: DeliveryCardProps) {
  const { donor, listing, order } = delivery;

  const payload = [
    order.quantity !== null ? `Qty ${order.quantity}` : null,
    order.amount !== null ? formatPrice(order.amount) : null,
  ].filter(Boolean);

  return (
    <article className="rounded-xl border border-courier-border bg-courier-surface p-4 transition-all duration-200 ease-out hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate text-base font-bold text-courier-title">
            {donor.companyName ?? 'Unknown donor'}
          </h2>
          <p className="mt-0.5 flex items-baseline gap-1.5 text-sm text-courier-text-muted">
            <span className="truncate text-courier-text">{listing.name ?? '—'}</span>
            {payload.length > 0 ? (
              <span className="shrink-0">{`· ${payload.join(' · ')}`}</span>
            ) : null}
          </p>
        </div>

        {order.requiresCashCollection ? (
          <span className="shrink-0 rounded-full bg-courier-primary-container px-2.5 py-0.5 text-xs font-semibold text-courier-primary">
            Cash on delivery
          </span>
        ) : null}
      </div>

      <div className="mt-3 grid grid-cols-[0.625rem_auto_1fr] items-stretch gap-x-2.5">
        <RouteStop
          kind="pickup"
          label="Collect"
          address={listing.pickupAddressText ?? '—'}
        />
        <RouteStop
          kind="dropoff"
          label="Deliver"
          address={order.deliveryAddressText ?? '—'}
        />
      </div>

      <div className="mt-3 flex items-center justify-end gap-3">
        {errorMessage ? (
          <p
            role="status"
            className="mr-auto text-sm font-semibold text-shared-error-text"
          >
            {errorMessage}
          </p>
        ) : null}
        <CourierButton
          type="button"
          disabled={isClaiming}
          onClick={() => onClaim(delivery.id)}
          className="shrink-0"
        >
          {isClaiming ? 'Claiming…' : 'Claim'}
        </CourierButton>
      </div>
    </article>
  );
}

interface RouteStopProps {
  kind: 'pickup' | 'dropoff';
  label: string;
  address: string;
}

/**
 * One end of the route: a marker in the rail column, a fixed-width label, and
 * the address. `pickup` draws a hollow ring plus the connector rail that runs
 * down to `dropoff`, which draws a filled dot. Direction is carried by the
 * label and stacking order, never colour alone (`docs/design_system.md`).
 */
function RouteStop({ kind, label, address }: RouteStopProps) {
  const isPickup = kind === 'pickup';

  return (
    <>
      <span aria-hidden="true" className="flex flex-col items-center">
        <span
          className={cn(
            'mt-1 size-2.5 shrink-0 rounded-full',
            isPickup
              ? 'border-2 border-courier-primary bg-courier-surface'
              : 'bg-courier-primary',
          )}
        />
        {isPickup ? (
          <span className="mt-1 w-0.5 flex-1 rounded bg-courier-border" />
        ) : null}
      </span>
      <span
        className={cn(
          'text-[0.75rem] font-bold uppercase leading-5 tracking-wider text-courier-text-muted',
          isPickup && 'pb-2.5',
        )}
      >
        {label}
      </span>
      <span
        className={cn('text-sm leading-5 text-courier-text', isPickup && 'pb-2.5')}
      >
        {address}
      </span>
    </>
  );
}
