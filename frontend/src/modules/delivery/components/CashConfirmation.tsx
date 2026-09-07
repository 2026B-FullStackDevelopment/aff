import { useState } from 'react';
import { CheckboxField } from '@/shared/components/CheckboxField/CheckboxField';
import { Button } from '@/shared/components/Button/Button';

interface CashConfirmationProps {
  requiresCashCollection: boolean;
  isSubmitting: boolean;
  onDeliver: (cashConfirmed?: boolean) => void;
}

// The SRS mandates this wording exactly. It is not cosmetic: the system models
// no partial payments, change-giving or disputes, and the audit trail is only
// the Courier's id and a timestamp — so this sentence is the whole substance of
// what the Courier is confirming. Do not shorten it.
const CASH_CONFIRMATION_LABEL = 'Cash received — exact amount, no change given';

export function CashConfirmation({
  requiresCashCollection,
  isSubmitting,
  onDeliver,
}: CashConfirmationProps) {
  const [isCashConfirmed, setIsCashConfirmed] = useState(false);

  if (!requiresCashCollection) {
    return (
      <Button type="button" disabled={isSubmitting} onClick={() => onDeliver()}>
        {isSubmitting ? 'Completing…' : 'Delivered'}
      </Button>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <CheckboxField
        id="cash-confirmation"
        name="cashConfirmation"
        label={CASH_CONFIRMATION_LABEL}
        checked={isCashConfirmed}
        onChange={(e) => setIsCashConfirmed(e.currentTarget.checked)}
      />

      <Button
        type="button"
        disabled={isSubmitting || !isCashConfirmed}
        onClick={() => onDeliver(true)}
      >
        {isSubmitting ? 'Completing…' : 'Delivered'}
      </Button>
    </div>
  );
}
