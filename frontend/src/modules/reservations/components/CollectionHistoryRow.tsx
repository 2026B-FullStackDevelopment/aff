import { MessageSquareText, Check, FileText } from 'lucide-react';
import { cn } from '@/shared/utils';
import type { CollectionHistoryItem } from '../services/collectionHistory.mock';

// Human-facing labels for each FoodCategory enum value. Move to
// listingFormatting.ts if/when this needs to be shared more widely.
const CATEGORY_LABELS: Record<CollectionHistoryItem['category'], string> = {
  FRUIT: 'Fruit',
  VEGETABLE: 'Vegetable',
  MEAT: 'Meat',
  COOKED_DISH: 'Cooked Dish',
  BAKED_GOODS: 'Baked Goods',
  DRINK: 'Drink',
};

const UNIT_LABELS: Record<CollectionHistoryItem['unit'], string> = {
  KILOGRAM: 'kg',
  GRAM: 'g',
  LITER: 'liter',
  MILLILITER: 'ml',
  UNIT: 'unit',
  PER_REQUEST: 'request',
};

function formatQuantity(quantity: number, unit: CollectionHistoryItem['unit']): string {
  const unitLabel = UNIT_LABELS[unit];
  const plural = quantity !== 1 && (unit === 'UNIT' || unit === 'LITER');
  return `${quantity} ${unitLabel}${plural ? 's' : ''}`;
}

function formatPrice(price: number): string {
  if (price === 0) return 'Free';
  return `${price.toLocaleString('en-US')} VND`;
}

function formatCollectedAt(iso: string): { date: string; time: string } {
  const parsed = new Date(iso);
  return {
    date: parsed.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    time: parsed.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
  };
}

interface CollectionHistoryRowProps {
  item: CollectionHistoryItem;
  isSubmittingFeedback: boolean;
  onLeaveFeedback: (item: CollectionHistoryItem) => void;
}

export function CollectionHistoryRow({
  item,
  isSubmittingFeedback,
  onLeaveFeedback,
}: CollectionHistoryRowProps) {
  const { date, time } = formatCollectedAt(item.collectedAt);

  return (
    <tr className="border-b border-[#e9f5ee] last:border-b-0 hover:bg-[#f5faf7]/60 transition-colors duration-150">
      <td className="px-4 py-3 align-middle">
        <div className="flex items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[#f0f7f3]">
            {item.imageUrl ? (
              <img
                src={item.imageUrl}
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
            {item.donationName}
          </span>
        </div>
      </td>

      <td className="px-4 py-3 align-middle text-sm text-[#1E293B]">
        {item.donorName}
      </td>

      <td className="px-4 py-3 align-middle">
        <div className="flex flex-col gap-1">
          <span className="inline-flex w-fit items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-[0.65rem] font-bold uppercase tracking-wide text-emerald-800">
            {CATEGORY_LABELS[item.category]}
          </span>
          <span className="text-xs text-[#6B7280]">
            {formatQuantity(item.quantity, item.unit)}
          </span>
        </div>
      </td>

      <td className="px-4 py-3 align-middle text-sm font-semibold text-[#1E293B]">
        {formatPrice(item.price)}
      </td>

      <td className="px-4 py-3 align-middle text-sm text-[#1E293B]">
        <div className="flex flex-col">
          <span>{date}</span>
          <span className="text-xs text-[#6B7280]">{time}</span>
        </div>
      </td>

      <td className="px-4 py-3 align-middle text-sm text-[#1E293B]">
        {item.paymentLast4 ? (
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden="true">💳</span>
            •••• {item.paymentLast4}
          </span>
        ) : (
          <span className="text-[#6B7280]">N/A</span>
        )}
      </td>

      <td className="px-4 py-3 align-middle">
        {!item.canLeaveFeedback ? (
          <span
            className="inline-flex items-center gap-1 text-xs text-[#9CA3AF]"
            aria-label="Feedback not available for this collection"
          >
            <FileText className="size-4" aria-hidden="true" />
            {item.paymentLast4 ? 'Still on delivery...' : 'Not paid yet'}
          </span>
        ) : item.feedbackSubmitted ? (
          <span
            className="inline-flex items-center gap-1 text-xs font-semibold text-[#3D6852]"
            aria-label="Feedback submitted"
          >
            <Check className="size-3.5" aria-hidden="true" />
            Submitted
          </span>
        ) : (
          <button
            type="button"
            disabled={isSubmittingFeedback}
            onClick={() => onLeaveFeedback(item)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-lg bg-[#3D6852] px-3 py-1.5 text-xs font-bold text-white',
              'transition-all duration-200 ease-out hover:bg-[#2E5A47] hover:shadow-md active:scale-[0.98]',
              'disabled:cursor-not-allowed disabled:opacity-60',
            )}
          >
            <MessageSquareText className="size-3.5" aria-hidden="true" />
            Leave Feedback
          </button>
        )}
      </td>
    </tr>
  );
}

export default CollectionHistoryRow;