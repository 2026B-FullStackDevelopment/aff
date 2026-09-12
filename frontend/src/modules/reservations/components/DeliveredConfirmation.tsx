import { CircleCheckBig } from 'lucide-react';
import { Button } from '@/shared/components/Button/Button';

interface DeliveredConfirmationProps {
  deliveredAt: string | null;
}

function formatDeliveredAt(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/**
 * Scrolls the existing feedback section into view and, if it's still the
 * editable form (not yet submitted), moves focus into its textarea. The
 * wrapper id is stable regardless of which of the two the section renders as
 * (see `OrderFeedbackSection`'s own read-only-vs-form branch) — the textarea
 * id is not always present, so it can only be a focus target, never the
 * scroll target.
 */
function scrollToFeedback() {
  const section = document.getElementById('order-feedback-section');
  if (!section) return;

  section.scrollIntoView({ behavior: 'smooth', block: 'start' });

  const textarea = document.getElementById('order-feedback-comment');
  textarea?.focus();
}

/**
 * The terminal E10 state: replaces the stepper entirely once `DELIVERED`,
 * matching the letter/no-flash guarantee — a fresh page load into an
 * already-delivered order renders straight here.
 */
export function DeliveredConfirmation({ deliveredAt }: DeliveredConfirmationProps) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-[#e9f5ee] bg-white px-6 py-10 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-[#3D6852]/10 text-[#3D6852]">
        <CircleCheckBig className="size-6" aria-hidden="true" />
      </span>

      <h2 className="text-lg font-bold text-[#2E5A47]">Your order has arrived</h2>

      {deliveredAt && (
        <p className="text-sm text-[#6B7280]">Delivered {formatDeliveredAt(deliveredAt)}</p>
      )}

      <Button
        type="button"
        variant="outline"
        onClick={scrollToFeedback}
        className="mt-2 h-10 rounded-lg border-[#3D6852] px-4 text-sm font-semibold text-[#3D6852] transition-all duration-200 ease-out hover:bg-[#3D6852]/5 hover:shadow-md active:scale-[0.98]"
      >
        Leave Feedback
      </Button>
    </div>
  );
}

export default DeliveredConfirmation;
