import { Check, FileText } from 'lucide-react';
import { Link } from 'react-router-dom';
import { StatusBadge } from '@/shared/components/StatusBadge';
import { formatPrice, UNIT_LABELS, formatCategory } from '@/shared/utils/listingFormatting';
import type { RecipientOrderDTO } from '@/types/api';

const PAYMENT_METHOD_CONFIG: Record<string, { label: string; emoji: string }> = {
  STRIPE: { label: 'Credit Card', emoji: '💳' },
  CASH: { label: 'Cash', emoji: '💵' },
};

function formatCollectedAt(iso: string): { date: string; time: string } {
  const parsed = new Date(iso);
  return {
    date: parsed.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    time: parsed.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
  };
}

/**
 * A cancelled order always shows "Cancelled" regardless of any stale
 * Delivery row. Otherwise the live Delivery stage is authoritative when
 * one exists (D5 Implementation Flow point 2) — orderStatus alone can't
 * distinguish e.g. ASSIGNED from PICKED_UP. No Delivery yet (e.g. a
 * Stripe order still PENDING_PAYMENT) falls back to orderStatus itself.
 */
function resolveStatusKey(item: RecipientOrderDTO): string {
  if (item.orderStatus === 'CANCELLED') return 'cancelled';
  if (item.delivery) return item.delivery.stage;
  return item.orderStatus;
}

interface CollectionHistoryRowProps {
  item: RecipientOrderDTO;
}

export function CollectionHistoryRow({ item }: CollectionHistoryRowProps) {
  const { date, time } = formatCollectedAt(item.createdAt);
  const statusKey = resolveStatusKey(item);
  const isDelivered = item.delivery?.stage === 'DELIVERED' || item.orderStatus === 'DELIVERED';

  return (
    <tr className="border-b border-[#e9f5ee] last:border-b-0 hover:bg-[#f5faf7]/60 transition-colors duration-150">
      <td className="px-4 py-2 align-middle">
        <Link
          to={`/orders/${item.id}`}
          className="flex items-center gap-3 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3D6852]/40"
        >
          <div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[#f0f7f3]">
            {item.listing.imageUrl ? (
              <img
                src={item.listing.imageUrl}
                alt=""
                className="size-full object-cover"
              />
            ) : (
              <span className="text-lg" aria-hidden="true">
                🍽️
              </span>
            )}
          </div>
          <span className="text-sm font-semibold text-[#1E293B]">
            {item.listing.name ?? 'Listing'}
          </span>
        </Link>
      </td>

      <td className="px-4 py-2 align-middle text-sm text-[#1E293B]">
        {item.donor.companyName}
      </td>

      <td className="px-4 py-2 align-middle text-sm text-[#1E293B]">
        {formatCategory(item.listing.category)}
      </td>

      <td className="px-4 py-2 align-middle text-sm text-[#1E293B]">
        {item.quantity}
        {item.listing.unit ? ` ${UNIT_LABELS[item.listing.unit] ?? ''}` : ''}
      </td>

      <td className="px-4 py-2 align-middle text-sm font-semibold text-[#1E293B]">
        {formatPrice(item.amount)}
      </td>

      <td className="px-4 py-2 align-middle text-sm text-[#1E293B]">
        <div className="flex flex-col">
          <span>{date}</span>
          <span className="text-xs text-[#6B7280]">{time}</span>
        </div>
      </td>

      <td className="px-4 py-2 align-middle text-sm text-[#1E293B]">
        {item.paymentMethod ? (
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden="true">
              {PAYMENT_METHOD_CONFIG[item.paymentMethod]?.emoji ?? ''}
            </span>
            {PAYMENT_METHOD_CONFIG[item.paymentMethod]?.label ?? item.paymentMethod}
          </span>
        ) : (
          <span className="text-[#6B7280]">Free</span>
        )}
      </td>

      <td className="px-4 py-2 align-middle">
        <div className="flex flex-col items-start gap-1 w-max">
          <StatusBadge status={statusKey} />

          {/* Read-only feedback indicator — feedback form lives on the order detail page. */}
          {isDelivered && (
            item.feedback ? (
              <span
                className="inline-flex items-center gap-1 text-xs font-semibold text-[#3D6852]"
                aria-label="Feedback submitted"
              >
                <Check className="size-3.5" aria-hidden="true" />
                Feedback submitted
              </span>
            ) : (
              <span
                className="inline-flex items-center gap-1 text-xs text-[#9CA3AF]"
                aria-label="No feedback submitted yet"
              >
                <FileText className="size-4" aria-hidden="true" />
                No feedback yet
              </span>
            )
          )}
        </div>
      </td>
    </tr>
  );
}

export default CollectionHistoryRow;
