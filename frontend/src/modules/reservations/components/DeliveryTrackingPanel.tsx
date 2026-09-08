import type { DeliveryStage, GeoLocation, OrderDTO } from '@/types/api';
import { LocationMap } from '@/shared/components/LocationMap/LocationMap';
import { DeliveryStepper } from './DeliveryStepper';
import { DeliveredConfirmation } from './DeliveredConfirmation';

interface DeliveryTrackingPanelProps {
  order: OrderDTO;
  isAwaitingPayment: boolean;
  stage: DeliveryStage | null;
  courierPosition: GeoLocation | null;
  deliveredAt: string | null;
}

/**
 * The single branching tree for E8 (stepper), E9 (live map), and E10
 * (delivered confirmation) — one component switching mode on `stage`, not
 * three independently-built screens that could drift out of sync.
 *
 * Renders nothing while awaiting Stripe payment or once cancelled — both
 * already have their own `WarningCallout` elsewhere on this page, and a
 * "preparing" stepper underneath either would read as contradictory.
 */
export function DeliveryTrackingPanel({
  order,
  isAwaitingPayment,
  stage,
  courierPosition,
  deliveredAt,
}: DeliveryTrackingPanelProps) {
  if (isAwaitingPayment || order.orderStatus === 'CANCELLED') {
    return null;
  }

  if (stage === 'DELIVERED') {
    return (
      <div aria-live="polite">
        <DeliveredConfirmation deliveredAt={deliveredAt} />
      </div>
    );
  }

  const currentStep = stage === 'PICKED_UP' ? 'OUT_FOR_DELIVERY' : 'PREPARING';

  return (
    <div
      aria-live="polite"
      className="flex flex-col gap-4 rounded-xl border border-[#e9f5ee] bg-white p-5"
    >
      <h2 className="text-[0.85rem] font-bold uppercase tracking-[0.05em] text-[#2E5A47]">
        Delivery Status
      </h2>

      <DeliveryStepper currentStep={currentStep} />

      {stage === 'PICKED_UP' && (
        courierPosition ? (
          <LocationMap
            latitude={courierPosition.latitude}
            longitude={courierPosition.longitude}
            addressText="Your courier is on the way"
            recenter
          />
        ) : (
          <p className="text-sm text-[#6B7280]">Waiting for the courier's position…</p>
        )
      )}
    </div>
  );
}

export default DeliveryTrackingPanel;
