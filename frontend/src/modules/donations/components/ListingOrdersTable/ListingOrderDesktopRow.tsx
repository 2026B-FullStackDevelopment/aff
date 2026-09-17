import { StatusBadge } from '@/shared/components/StatusBadge';
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

/** Renders one C8 order as a compact desktop table row. */
export function ListingOrderDesktopRow({ order, unit }: ListingOrderItemProps) {
  const cellClassName = 'px-3 py-5 align-top';

  return (
    <tr className="border-t border-[#E4E2E1] transition-colors duration-200 hover:bg-[#FFFDF8]">
      <td className={`${cellClassName} break-words font-semibold text-[#1B1C1C]`}>
        {order.recipient.username}
      </td>
      <td className={cellClassName}><OrderTypeBadge order={order} /></td>
      <td className={`${cellClassName} break-words text-[#414844]`}>
        {formatOrderDate(order.createdAt)}
      </td>
      <td className={`${cellClassName} font-medium text-[#414844]`}>
        {formatOrderQuantity(order.quantity, unit)}
      </td>
      <td className={cellClassName}><StatusBadge status={order.orderStatus} /></td>
      <td className={cellClassName}><PaymentSummary order={order} /></td>
      <td className={cellClassName}><DeliveryStatus order={order} /></td>
      <td className={`${cellClassName} break-words text-sm leading-5 text-[#414844]`}>
        {order.feedback ? (
          <p>{order.feedback.comment}</p>
        ) : (
          <span className="text-xs italic text-[#6B7280]">No feedback yet</span>
        )}
      </td>
    </tr>
  );
}

