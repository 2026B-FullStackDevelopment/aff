import { useState } from 'react';
import { Check, Info } from 'lucide-react';
import { Button } from '@/shared/components/Button';
import { FormErrorAlert } from '@/shared/components/FormErrorAlert';
import { Panel } from '@/shared/components/Panel';
import { TextareaField } from '@/shared/components/TextareaField';
import type { OrderDTO } from '@/types/api';

const MAX_COMMENT_LENGTH = 500;

interface OrderFeedbackSectionProps {
  order: OrderDTO;
  isSubmitting: boolean;
  error: string | null;
  onSubmit: (comment: string) => void | Promise<void>;
}

function formatFeedbackDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Inline (not modal) feedback section for the order detail page (D7,
 * AC1). Adapts `LeaveFeedbackModal.tsx`'s validation (trim, non-empty,
 * 500-char max) but renders directly in the page flow rather than behind
 * a per-row button — the list page (`CollectionHistoryRow.tsx`, D5) only
 * shows a read-only indicator now and links here instead.
 *
 * Renders nothing before delivery. Once feedback exists it's shown
 * read-only — feedback is one-shot per order, there's no edit path.
 */
export function OrderFeedbackSection({
  order,
  isSubmitting,
  error,
  onSubmit,
}: OrderFeedbackSectionProps) {
  const [comment, setComment] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  if (order.orderStatus !== 'DELIVERED') {
    return null;
  }

  if (order.feedback) {
    return (
      <Panel title="Your Feedback">
        <div className="flex items-start gap-2">
          <Check
            className="mt-0.5 size-4 shrink-0 text-[#3D6852]"
            aria-hidden="true"
          />
          <div>
            <p className="text-sm leading-6 text-[#1E293B]">{order.feedback.comment}</p>
            <p className="mt-1 text-xs text-[#6B7280]">
              Submitted {formatFeedbackDate(order.feedback.createdAt)}
            </p>
          </div>
        </div>
      </Panel>
    );
  }

  function handleSubmit() {
    const trimmed = comment.trim();

    if (!trimmed) {
      setValidationError('Feedback comment is required.');
      return;
    }

    if (trimmed.length > MAX_COMMENT_LENGTH) {
      setValidationError(`Feedback comment cannot exceed ${MAX_COMMENT_LENGTH} characters.`);
      return;
    }

    setValidationError(null);
    void onSubmit(trimmed);
  }

  return (
    <Panel title="Leave Feedback" description="Let the Donor know how this order went.">
      <div className="flex flex-col gap-3">
        <TextareaField
          id="order-feedback-comment"
          name="comment"
          theme="recipient"
          rows={4}
          maxLength={MAX_COMMENT_LENGTH}
          placeholder="Tell the donor about your experience with this order..."
          value={comment}
          disabled={isSubmitting}
          onChange={(event) => {
            setComment(event.target.value);
            if (validationError) setValidationError(null);
          }}
          error={validationError ?? undefined}
          aria-label="Feedback comment"
        />

        <div className="flex items-center gap-1.5 text-xs text-[#6B7280]">
          <Info className="size-3.5 shrink-0" aria-hidden="true" />
          <span>Your feedback will be visible to the Donor.</span>
        </div>

        <FormErrorAlert message={error} />

        <div className="flex justify-end">
          <Button
            type="button"
            disabled={isSubmitting}
            onClick={handleSubmit}
            className="h-10 rounded-lg bg-[#3D6852] px-4 text-sm font-bold text-white transition-all duration-200 ease-out hover:bg-[#2E5A47] hover:shadow-md active:scale-[0.98]"
          >
            {isSubmitting ? 'Submitting…' : 'Submit Feedback'}
          </Button>
        </div>
      </div>
    </Panel>
  );
}

export default OrderFeedbackSection;
