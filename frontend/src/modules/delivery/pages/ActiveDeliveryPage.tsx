import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Truck } from 'lucide-react';
import { Button } from '@/shared/components/Button/Button';
import { buttonVariants } from '@/shared/components/ui/button';
import { EmptyState } from '@/shared/components/EmptyState/EmptyState';
import { LoadingSkeleton } from '@/shared/components/LoadingSkeleton/LoadingSkeleton';
import { LocationMap } from '@/shared/components/LocationMap/LocationMap';
import { Panel } from '@/shared/components/Panel/Panel';
import { WarningCallout } from '@/shared/components/WarningCallout/WarningCallout';
import { CashConfirmation } from '../components/CashConfirmation';
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
      <div className="min-h-screen bg-slate-50">
        <main className="mx-auto max-w-3xl px-6 py-6">
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
      <div className="min-h-screen bg-slate-50">
        <main className="mx-auto max-w-3xl px-6 py-6">
          <EmptyState
            icon={Truck}
            title="No active delivery"
            description="You don't have a delivery in progress right now. Head to the queue to claim your next one."
            action={
              <Link to="/deliveries/queue" className={buttonVariants({ variant: 'default' })}>
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
    : delivery.pickupAddressText;

  return (
    <div className="min-h-screen bg-slate-50">
      <main className="mx-auto flex max-w-3xl flex-col gap-6 px-6 py-6">
        <Panel title={isPickedUp ? 'Deliver to' : 'Collect from'}>
          <div className="flex flex-col gap-4">
            {/* The pickup address stays visible for the whole lifecycle, even
                once the map below has switched to the destination pin (E5). */}
            <p className="text-sm text-[#414844]">
              <span className="font-bold text-[#1B1C1C]">Collect from: </span>
              {delivery.pickupAddressText}
            </p>
            <p className="text-sm text-[#414844]">
              <span className="font-bold text-[#1B1C1C]">Deliver to: </span>
              {delivery.deliveryAddressText ?? '—'}
            </p>

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
          <p role="alert" className="text-sm font-medium text-[#B91C1C]">
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
          <Button
            type="button"
            disabled={active.isSubmitting}
            onClick={active.pickup}
          >
            {active.isSubmitting ? 'Confirming…' : 'Picked Up'}
          </Button>
        )}
      </main>
    </div>
  );
}
