import { useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Button } from '@/shared/components/Button/Button';
import { CourierTopNavigation } from '@/shared/components/CourierTopNavigation/CourierTopNavigation';
import { LoadingSkeleton } from '@/shared/components/LoadingSkeleton/LoadingSkeleton';
import { LocationMap } from '@/shared/components/LocationMap/LocationMap';
import { Panel } from '@/shared/components/Panel/Panel';
import { WarningCallout } from '@/shared/components/WarningCallout/WarningCallout';
import { getStoredUser } from '@/services/authStorage';
import { useActiveDelivery } from '../hooks/useActiveDelivery';

export function ActiveDeliveryPage() {
  const navigate = useNavigate();
  const active = useActiveDelivery();

  const storedUser = getStoredUser();
  const courier = storedUser?.role === 'COURIER' ? storedUser : null;

  useEffect(() => {
    if (active.isComplete) {
      navigate('/deliveries/queue');
    }
  }, [active.isComplete, navigate]);

  if (active.isLoading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <CourierTopNavigation
          avatarUrl={courier?.avatarUrl}
          avatarAlt={courier ? `${courier.fullName} profile` : 'Courier profile'}
        />
        <main className="mx-auto max-w-3xl px-6 py-6">
          <LoadingSkeleton count={1} />
        </main>
      </div>
    );
  }

  if (active.isGone || !active.delivery) {
    return <Navigate to="/deliveries/queue" replace />;
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
      <CourierTopNavigation
        avatarUrl={courier?.avatarUrl}
        avatarAlt={courier ? `${courier.fullName} profile` : 'Courier profile'}
      />

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
          <Button
            type="button"
            disabled={active.isSubmitting}
            onClick={() => active.deliver()}
          >
            {active.isSubmitting ? 'Completing…' : 'Delivered'}
          </Button>
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
