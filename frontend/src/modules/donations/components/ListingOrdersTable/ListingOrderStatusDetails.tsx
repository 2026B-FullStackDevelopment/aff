import { StatusBadge } from '@/shared/components/StatusBadge/StatusBadge';
import type { ListingUnit } from '@/types/api';
import type { ListingOrderDTO } from '../../types';
import {
  formatOrderAmount,
  formatOrderIntakePath,
  formatPaymentMethod,
  getDeliveryStatusDisplay,
} from './listingOrderFormatting';

export interface ListingOrderItemProps {
  order: ListingOrderDTO;
  unit: ListingUnit;
}
export function PaymentSummary({ order }: Pick<ListingOrderItemProps, 'order'>) {
  const paymentMethod = formatPaymentMethod(order);

  return (
    <div className="space-y-1">
      <p className="font-semibold text-[#1B1C1C]">{formatOrderAmount(order)}</p>
      {paymentMethod && <span className="text-xs text-[#6B7280]">{paymentMethod}</span>}
    </div>
  );
}

export function DeliveryStatus({ order }: Pick<ListingOrderItemProps, 'order'>) {
  const delivery = getDeliveryStatusDisplay(order);
  return <StatusBadge status={delivery.status} label={delivery.label} />;
}

export function OrderTypeBadge({ order }: Pick<ListingOrderItemProps, 'order'>) {
  return (
    <StatusBadge
      status={order.intakePath === 'RESERVATION' ? 'reserved' : 'default'}
      label={formatOrderIntakePath(order)}
    />
  );
}
