import { StatusBadge } from '@/shared/components/StatusBadge/StatusBadge';
import { ListingDetailField } from '../ListingDetailField';
import {
  formatOrderDate,
  formatOrderQuantity,
} from './listingOrderFormatting';
import {
  DeliveryStatus,
  OrderTypeBadge,
  PaymentSummary,
  type ListingOrderItemProps,
} from './ListingOrderStatusDetails';

/** Renders every C8 order field in a narrow-screen card. */
export function ListingOrderMobileCard({ order, unit }: ListingOrderItemProps) {
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
        <div className="shrink-0 text-right">
          <p className="mb-1 text-[0.68rem] font-bold uppercase tracking-wider text-[#6B7280]">
            Status
          </p>
          <StatusBadge status={order.orderStatus} />
        </div>
      </header>

      <dl className="mt-4 grid grid-cols-1 gap-4 border-t border-[#E4E2E1] pt-4 sm:grid-cols-2">
        <ListingDetailField label="Order type" value={<OrderTypeBadge order={order} />} />
        <ListingDetailField
          label="Created"
          value={formatOrderDate(order.createdAt)}
          valueClassName="font-normal text-[#414844]"
        />
        <ListingDetailField
          label="Quantity"
          value={formatOrderQuantity(order.quantity, unit)}
          valueClassName="text-[#414844]"
        />
        <ListingDetailField label="Payment" value={<PaymentSummary order={order} />} />
        <ListingDetailField label="Delivery" value={<DeliveryStatus order={order} />} />
      </dl>

      <section className="mt-4 border-t border-[#E4E2E1] pt-4">
        <h4 className="text-[0.68rem] font-bold uppercase tracking-wider text-[#6B7280]">
          Feedback
        </h4>
        <p className={`mt-1 break-words ${order.feedback ? 'text-sm leading-6 text-[#414844]' : 'text-xs italic text-[#6B7280]'}`}>
          {order.feedback?.comment ?? 'No feedback yet'}
        </p>
      </section>
    </article>
  );
}
