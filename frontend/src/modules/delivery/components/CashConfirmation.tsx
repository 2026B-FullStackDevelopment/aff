import { useState } from 'react';
import { CheckboxField } from '@/shared/components/CheckboxField';
import { CourierButton } from './CourierButton';

interface CashConfirmationProps {
  requiresCashCollection: boolean;
  isSubmitting: boolean;
  onDeliver: (cashConfirmed?: boolean) => void;
}

const CASH_CONFIRMATION_LABEL = 'Cash received';

export function CashConfirmation({
  requiresCashCollection,
  isSubmitting,
  onDeliver,
}: CashConfirmationProps) {
  const [isCashConfirmed, setIsCashConfirmed] = useState(false);

  if (!requiresCashCollection) {
    return (
      <CourierButton type="button" disabled={isSubmitting} onClick={() => onDeliver()}>
        {isSubmitting ? 'Completing…' : 'Delivered'}
      </CourierButton>
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

      <CourierButton
        type="button"
        disabled={isSubmitting || !isCashConfirmed}
        onClick={() => onDeliver(true)}
      >
        {isSubmitting ? 'Completing…' : 'Delivered'}
      </CourierButton>
    </div>
  );
}
