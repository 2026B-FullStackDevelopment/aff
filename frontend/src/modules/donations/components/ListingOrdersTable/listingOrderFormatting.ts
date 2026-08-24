import type {
  ListingUnit,
  OrderDTO,
} from '@/types/api';
import type {
  ListingOrderDTO,
} from '../../types';

const UNIT_LABELS: Record<ListingUnit, string> = {
  KILOGRAM: 'kg',
  GRAM: 'g',
  LITER: 'L',
  MILLILITER: 'mL',
  UNIT: 'units',
  PER_REQUEST: 'per request',
};

export interface DeliveryStatusDisplay {
  status: string;
  label: string;
}

export function formatOrderDate(
  value: string,
): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Unknown date';
  }

  return new Intl.DateTimeFormat(
    'en-GB',
    {
      dateStyle: 'medium',
      timeStyle: 'short',
    },
  ).format(date);
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

  return (
    `${formattedQuantity} `
    + UNIT_LABELS[unit]
  );
}

export function formatOrderAmount(
  order: OrderDTO,
): string {
  if (order.paymentStatus === 'FREE') {
    return 'Free';
  }

  return `${order.amount.toLocaleString(
    'en-US',
  )} VND`;
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