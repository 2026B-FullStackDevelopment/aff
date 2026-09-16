import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Truck } from 'lucide-react';
import { buttonVariants } from '@/shared/components/ui/button';
import { EmptyState } from '@/shared/components/EmptyState';
import { LoadingSkeleton } from '@/shared/components/LoadingSkeleton';
import { LocationMap } from '@/shared/components/LocationMap';
import { Panel } from '@/shared/components/Panel';
import { WarningCallout } from '@/shared/components/WarningCallout';
import { formatPrice } from '@/shared/utils/listingFormatting';
import { cn } from '@/shared/utils';
import { CashConfirmation } from '../components/CashConfirmation';
import { CourierButton } from '../components/CourierButton';
import { DeliveryDetailRow } from '../components/DeliveryDetailRow';
import { DeliveryProgressStepper } from '../components/DeliveryProgressStepper';
import { useActiveDelivery } from '../hooks/useActiveDelivery';

export function ActiveDeliveryPage() {
  const navigate = useNavigate();
  const active = useActiveDelivery();

  useEffect(() => {
    if (active.isComplete) {
      navigate('/deliveries/queue');
    }
  }, [active.isComplete, navigate]);

  if (active.isLoading) {
    return (
      <div className="min-h-screen bg-courier-bg">
        <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:py-10">
          <LoadingSkeleton count={1} />
        </main>
      </div>
    );
  }

  // No active delivery: show this in place rather than bouncing the Courier
  // straight to the queue, so they see why they landed here (job completed,
  // claimed elsewhere, or none yet) instead of a silent redirect.
  if (active.isGone || !active.delivery) {
    return (
      <div className="min-h-screen bg-courier-bg">
        <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:py-10">
          <EmptyState
            icon={Truck}
            title="No active delivery"
            description="You don't have a delivery in progress right now. Head to the queue to claim your next one."
            action={
              <Link
                to="/deliveries/queue"
                className={cn(
                  buttonVariants({ variant: 'default' }),
                  'bg-courier-primary text-courier-on-primary hover:bg-courier-primary-hover transition-all duration-200 ease-out hover:shadow-md active:scale-[0.98] focus-visible:ring-courier-primary/40',
                )}
              >
                Go to Queue
              </Link>
            }
          />
        </main>
      </div>
    );
  }

  const { delivery } = active;
  const isPickedUp = delivery.stage === 'PICKED_UP';

  const mapLatitude = isPickedUp
    ? delivery.deliveryLocation?.latitude
    : delivery.pickupAddressLocation?.latitude;
  const mapLongitude = isPickedUp
    ? delivery.deliveryLocation?.longitude
    : delivery.pickupAddressLocation?.longitude;
  const mapLabel = isPickedUp
    ? (delivery.deliveryAddressText ?? 'Delivery destination')
    : (delivery.pickupAddressText ?? 'Pickup location');

  return (
    <div className="min-h-screen bg-courier-bg">
      <main className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-8 sm:px-6 lg:py-10">
        <h1 className="text-3xl font-extrabold tracking-tight text-courier-title">
          Active Delivery
        </h1>

        <DeliveryProgressStepper stage={delivery.stage} />

        <Panel
          title={isPickedUp ? 'Deliver to' : 'Collect from'}
          className="border-courier-border"
        >
          <div className="flex flex-col gap-4">
            {/* The pickup address stays visible for the whole lifecycle, even
                once the map below has switched to the destination pin (E5). */}
            <DeliveryDetailRow
              label="Collect from"
              value={delivery.pickupAddressText ?? '—'}
            />
            <DeliveryDetailRow
              label="Deliver to"
              value={delivery.deliveryAddressText ?? '—'}
            />
            <DeliveryDetailRow
              label="Amount"
              value={delivery.amount !== null ? formatPrice(delivery.amount) : '—'}
            />

            {mapLatitude !== undefined && mapLongitude !== undefined ? (
              // Keyed on stage so react-leaflet remounts and re-centres on the
              // Recipient's location after pickup, instead of two stacked maps.
              <LocationMap
                key={isPickedUp ? 'delivery' : 'pickup'}
                latitude={mapLatitude}
                longitude={mapLongitude}
                addressText={mapLabel}
              />
            ) : null}
          </div>
        </Panel>

        {active.isLocationDenied ? (
          <WarningCallout title="Location sharing is off">
            The Recipient cannot see your position. You can still complete this
            delivery.
          </WarningCallout>
        ) : null}

        {active.actionError ? (
          <p role="alert" className="text-sm font-semibold text-shared-error-text">
            {active.actionError}
          </p>
        ) : null}

        {isPickedUp ? (
          <CashConfirmation
            requiresCashCollection={delivery.requiresCashCollection}
            isSubmitting={active.isSubmitting}
            onDeliver={active.deliver}
          />
        ) : (
          <CourierButton
            type="button"
            disabled={active.isSubmitting}
            onClick={active.pickup}
          >
            {active.isSubmitting ? 'Confirming…' : 'Picked Up'}
          </CourierButton>
        )}
      </main>
    </div>
  );
}
