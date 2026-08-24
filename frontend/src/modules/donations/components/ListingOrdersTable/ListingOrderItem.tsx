import { StatusBadge } from '@/shared/components/StatusBadge/StatusBadge';
import type { ListingUnit } from '@/types/api';
import type { ListingOrderDTO } from '../../types';
import {
  formatOrderAmount,
  formatOrderDate,
  formatOrderIntakePath,
  formatOrderQuantity,
  formatPaymentMethod,
  getDeliveryStatusDisplay,
} from './listingOrderFormatting';

interface ListingOrderItemProps {
  order: ListingOrderDTO;
  unit: ListingUnit;
}

function PaymentSummary({
  order,
}: Pick<ListingOrderItemProps, 'order'>) {
  const paymentMethod =
    formatPaymentMethod(order);

  return (
    <div className="space-y-1.5">
      <p className="font-semibold text-[#1B1C1C]">
        {formatOrderAmount(order)}
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge
          status={order.paymentStatus}
        />

        {paymentMethod && (
          <span className="text-xs text-[#6B7280]">
            {paymentMethod}
          </span>
        )}
      </div>
    </div>
  );
}

function DeliveryStatus({
  order,
}: Pick<ListingOrderItemProps, 'order'>) {
  const delivery =
    getDeliveryStatusDisplay(order);

  return (
    <StatusBadge
      status={delivery.status}
      label={delivery.label}
    />
  );
}

function OrderTypeBadge({
  order,
}: Pick<ListingOrderItemProps, 'order'>) {
  return (
    <StatusBadge
      status={
        order.intakePath === 'RESERVATION'
          ? 'reserved'
          : 'default'
      }
      label={formatOrderIntakePath(order)}
    />
  );
}

// Renders one C8 order as a desktop table row.
export function ListingOrderDesktopRow({
  order,
  unit,
}: ListingOrderItemProps) {
  return (
    <tr className="border-t border-[#E4E2E1] align-top transition-colors duration-200 hover:bg-[#FFFDF8]">
      <td className="px-5 py-5 font-semibold text-[#1B1C1C]">
        {order.recipient.username}
      </td>

      <td className="px-5 py-5">
        <OrderTypeBadge order={order} />
      </td>

      <td className="px-5 py-5 text-[#414844]">
        {formatOrderDate(
          order.createdAt,
        )}
      </td>

      <td className="px-5 py-5 font-medium text-[#414844]">
        {formatOrderQuantity(
          order.quantity,
          unit,
        )}
      </td>

      <td className="px-5 py-5">
        <StatusBadge
          status={order.orderStatus}
        />
      </td>

      <td className="px-5 py-5">
        <PaymentSummary order={order} />
      </td>

      <td className="px-5 py-5">
        <DeliveryStatus order={order} />
      </td>

      <td className="max-w-72 px-5 py-5 text-sm leading-6 text-[#414844]">
        {order.feedback ? (
          <p>
            {order.feedback.comment}
          </p>
        ) : (
          <span className="text-xs italic text-[#6B7280]">
            No feedback yet
          </span>
        )}
      </td>
    </tr>
  );
}

// Renders one C8 order as a mobile-friendly card.
export function ListingOrderMobileCard({
  order,
  unit,
}: ListingOrderItemProps) {
  return (
    <article
      aria-label={`Order for ${order.recipient.username}`}
      className="rounded-xl border border-[#E4E2E1] bg-white p-4 shadow-sm"
    >
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[0.68rem] font-bold uppercase tracking-wider text-[#6B7280]">
            Recipient
          </p>

          <h3 className="mt-1 break-words text-base font-bold text-[#1B1C1C]">
            {order.recipient.username}
          </h3>
        </div>

        <StatusBadge
          status={order.orderStatus}
          className="shrink-0"
        />
      </header>

      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-5 border-t border-[#E4E2E1] pt-4">
        <div>
          <div>
            <dt className="text-[0.68rem] font-bold uppercase tracking-wider text-[#6B7280]">
              Order type
            </dt>

            <dd className="mt-1">
              <OrderTypeBadge order={order} />
            </dd>
          </div>
          <dt className="text-[0.68rem] font-bold uppercase tracking-wider text-[#6B7280]">
            Created
          </dt>

          <dd className="mt-1 text-sm text-[#414844]">
            {formatOrderDate(
              order.createdAt,
            )}
          </dd>
        </div>

        <div>
          <dt className="text-[0.68rem] font-bold uppercase tracking-wider text-[#6B7280]">
            Quantity
          </dt>

          <dd className="mt-1 text-sm font-semibold text-[#414844]">
            {formatOrderQuantity(
              order.quantity,
              unit,
            )}
          </dd>
        </div>

        <div>
          <dt className="text-[0.68rem] font-bold uppercase tracking-wider text-[#6B7280]">
            Payment
          </dt>

          <dd className="mt-1">
            <PaymentSummary order={order} />
          </dd>
        </div>

        <div>
          <dt className="text-[0.68rem] font-bold uppercase tracking-wider text-[#6B7280]">
            Delivery
          </dt>

          <dd className="mt-1">
            <DeliveryStatus order={order} />
          </dd>
        </div>
      </dl>

      <section className="mt-4 border-t border-[#E4E2E1] pt-4">
        <h4 className="text-[0.68rem] font-bold uppercase tracking-wider text-[#6B7280]">
          Feedback
        </h4>

        {order.feedback ? (
          <p className="mt-1 text-sm leading-6 text-[#414844]">
            {order.feedback.comment}
          </p>
        ) : (
          <p className="mt-1 text-xs italic text-[#6B7280]">
            No feedback yet
          </p>
        )}
      </section>
    </article>
  );
}