import { formatUnit } from '@/shared/constants/units';
import { formatDate, formatPrice } from '@/shared/utils/listingFormatting';
import type {
  ListingUnit,
  OrderDTO,
} from '@/types/api';
import type {
  ListingOrderDTO,
} from '../../types';

export interface DeliveryStatusDisplay {
  status: string;
  label: string;
}

export function formatOrderIntakePath(
  order: OrderDTO,
): string {
  return order.intakePath === 'RESERVATION'
    ? 'Reservation'
    : 'Donor initiated';
}

export function formatOrderDate(
  value: string,
): string {
  return formatDate(value, { withTime: true });
}

export function formatOrderQuantity(
  quantity: number,
  unit: ListingUnit,
): string {
  const formattedQuantity =
    quantity.toLocaleString(
      'en-US',
      {
        maximumFractionDigits: 2,
      },
    );

  return `${formattedQuantity} ${formatUnit(unit)}`;
}

export function formatOrderAmount(
  order: OrderDTO,
): string {
  return formatPrice(order.amount);
}

export function formatPaymentMethod(
  order: OrderDTO,
): string | null {
  if (order.paymentStatus === 'FREE') {
    return null;
  }

  if (!order.paymentMethod) {
    return 'Awaiting Recipient';
  }

  return order.paymentMethod === 'STRIPE'
    ? 'Stripe'
    : 'Cash';
}

export function getDeliveryStatusDisplay(
  order: ListingOrderDTO,
): DeliveryStatusDisplay {
  if (order.delivery) {
    return {
      status: order.delivery.stage,
      label: order.delivery.stage
        .toLowerCase()
        .split('_')
        .map(
          (word) =>
            word.charAt(0).toUpperCase()
            + word.slice(1),
        )
        .join(' '),
    };
  }

  if (order.orderStatus === 'CANCELLED') {
    return {
      status: 'cancelled',
      label: 'Cancelled',
    };
  }

  if (
    order.intakePath === 'DONOR_INITIATED'
    && order.orderStatus === 'DELIVERED'
    && order.delivery === null
  ) {
    return {
      status: 'delivered',
      label: 'Completed in person',
    };
  }

  if (order.delivery === undefined) {
    return {
      status: 'inactive',
      label: 'Unavailable',
    };
  }

  return {
    status: 'inactive',
    label: 'Not queued',
  };
}
