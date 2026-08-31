import { useEffect, useState } from 'react';
import { Info } from 'lucide-react';
import { Modal } from '@/shared/components/Modal/Modal';
import { TextareaField } from '@/shared/components/TextareaField/TextareaField';
import { Button } from '@/shared/components/Button/Button';
import type { CollectionHistoryItem } from '../services/collectionHistory.mock';

interface LeaveFeedbackModalProps {
  item: CollectionHistoryItem;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (comment: string) => Promise<boolean>;
}

const MAX_COMMENT_LENGTH = 500;

export function LeaveFeedbackModal({
  item,
  isSubmitting,
  onClose,
  onSubmit,
}: LeaveFeedbackModalProps) {
  const [comment, setComment] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Reset local state whenever a different row's modal opens.
  useEffect(() => {
    setComment('');
    setError(null);
  }, [item.id]);

  async function handleSubmit() {
    const trimmed = comment.trim();

    if (!trimmed) {
      setError('Please share a few words before submitting.');
      return;
    }

    setError(null);
    const succeeded = await onSubmit(trimmed);
    if (succeeded) {
      onClose();
    }
  }

  return (
    <Modal title="Leave Feedback" onClose={onClose}>
      <div className="flex flex-col gap-4">
        <div className="rounded-lg border border-[#e9f5ee] bg-[#f0f7f3] px-4 py-3">
          <p className="text-[0.7rem] font-bold uppercase tracking-wider text-[#6B7280]">
            Regarding Collection
          </p>
          <p className="mt-1 text-sm font-semibold text-[#2E5A47]">
            {item.donationName} from {item.donorName}
          </p>
        </div>

        <TextareaField
          id="feedback-comment"
          name="comment"
          theme="recipient"
          rows={4}
          maxLength={MAX_COMMENT_LENGTH}
          placeholder="Tell the donor about your experience with this collection..."
          value={comment}
          onChange={(event) => {
            setComment(event.target.value);
            if (error) setError(null);
          }}
          error={error ?? undefined}
          disabled={isSubmitting}
          aria-label="Feedback comment"
        />

        <div className="flex items-center gap-1.5 text-xs text-[#6B7280]">
          <Info className="size-3.5 shrink-0" aria-hidden="true" />
          <span>Your feedback will be visible to {item.donorName}.</span>
        </div>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            disabled={isSubmitting}
            onClick={onClose}
            className="h-10 px-4 border-[#E5E7EB] text-[#1E293B] transition-all duration-200 ease-out hover:bg-slate-50 hover:shadow-md active:scale-[0.98]"
          >
            Cancel
          </Button>

          <Button
            type="button"
            disabled={isSubmitting}
            onClick={() => void handleSubmit()}
            className="h-10 px-4 bg-[#3D6852] text-white transition-all duration-200 ease-out hover:bg-[#2E5A47] hover:shadow-md active:scale-[0.98]"
          >
            {isSubmitting ? 'Submitting…' : 'Submit Feedback'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export default LeaveFeedbackModal;
