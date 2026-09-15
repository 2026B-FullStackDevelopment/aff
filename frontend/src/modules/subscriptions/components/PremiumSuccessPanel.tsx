import { useState } from 'react';
import { Check } from 'lucide-react';
import { Button } from '@/shared/components/Button/Button';
import { ConfirmationDialog } from '@/shared/components/ConfirmationDialog/ConfirmationDialog';
import { FormErrorAlert } from '@/shared/components/FormErrorAlert/FormErrorAlert';
import { WarningCallout } from '@/shared/components/WarningCallout/WarningCallout';
import { formatDate } from '@/shared/utils/listingFormatting';
import type { SubscriptionDTO } from '@/types/api';

interface PremiumSuccessPanelProps {
  subscription: SubscriptionDTO;
  onGoToPreferences?: () => void;
  onCancel: () => void | Promise<void>;
  onResume: () => void | Promise<void>;
  isMutating?: boolean;
  mutationError?: string | null;
}

/**
 * "Already Premium" state of the Subscription page. `onGoToPreferences`
 * now points at a real, shipped route (/profile/notification-preferences)
 * — the earlier "doesn't exist as a route yet" note was stale.
 *
 * F5 cancel/resume: a "Cancel Premium" link opens a confirm dialog naming
 * the access-until date; once cancelAtPeriodEnd is true, that's replaced
 * with a "won't renew" notice and a one-click "Keep My Subscription".
 * `tone="default"` on the dialog (not "danger") since cancelling doesn't
 * lose anything already paid for — access continues until currentPeriodEnd.
 */
export function PremiumSuccessPanel({
  subscription,
  onGoToPreferences,
  onCancel,
  onResume,
  isMutating = false,
  mutationError = null,
}: PremiumSuccessPanelProps) {
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const accessUntil = formatDate(subscription.currentPeriodEnd);
  const isPendingCancellation = subscription.cancelAtPeriodEnd;

  return (
    <div className="flex flex-col items-center py-6 text-center">
      <div className="flex size-16 items-center justify-center rounded-full bg-[#3D6852]/10 text-[#3D6852]">
        <Check className="size-8" aria-hidden="true" />
      </div>

      <h2 className="mt-5 text-xl font-bold text-[#1B1C1C]">
        You're now a Premium member!
      </h2>

      <p className="mt-2 max-w-sm text-sm leading-6 text-[#6B7280]">
        Welcome to the club. Your premium benefits are now active across your account.
      </p>

      {subscription.status === 'PAST_DUE' && (
        <div className="mt-4 w-full max-w-xs text-left">
          <WarningCallout
            theme="recipient"
            title="Payment failed"
          >
            Your last renewal payment could not be processed. Please update your
            payment method in Stripe to avoid losing Premium access.
          </WarningCallout>
        </div>
      )}

      {isPendingCancellation ? (
        <div className="mt-4 rounded-lg bg-[#3D6852]/20 px-4 py-2.5 text-sm font-semibold text-[#2E5A47]">
          Premium until {accessUntil} — won't renew
        </div>
      ) : (
        <div className="mt-4 text-xs font-semibold uppercase tracking-wider text-[#6B7280]">
          Renews {accessUntil}
        </div>
      )}

      {mutationError && (
        <div className="mt-4 w-full max-w-xs">
          <FormErrorAlert message={mutationError} />
        </div>
      )}

      <Button
        type="button"
        onClick={onGoToPreferences}
        className="mt-6 h-11 w-full max-w-xs rounded-lg bg-[#3D6852] text-sm font-bold text-white transition-all duration-200 ease-out hover:bg-[#2E5A47] hover:shadow-md active:scale-[0.98] sm:w-auto sm:px-8"
      >
        Go to Notification Preferences
      </Button>

      {isPendingCancellation ? (
        <Button
          type="button"
          variant="outline"
          onClick={() => void onResume()}
          disabled={isMutating}
          className="mt-3 h-10 w-full max-w-xs rounded-lg border-[#C1C8C2] text-sm font-semibold text-[#414844] transition-all duration-200 ease-out hover:bg-slate-50 hover:shadow-md active:scale-[0.98] sm:w-auto sm:px-8"
        >
          {isMutating ? 'Please wait…' : 'Keep My Subscription'}
        </Button>
      ) : (
        <button
          type="button"
          onClick={() => setIsCancelDialogOpen(true)}
          disabled={isMutating}
          className="mt-3 text-sm font-semibold text-slate-500 underline-offset-2 transition-colors hover:text-red-700 hover:underline disabled:cursor-not-allowed disabled:opacity-60"
        >
          Cancel Premium
        </button>
      )}

      <ConfirmationDialog
        open={isCancelDialogOpen}
        title="Cancel Premium?"
        description={`You'll keep Premium access until ${accessUntil}, the end of your current billing period. You won't be charged again unless you resubscribe.`}
        confirmLabel="Cancel Premium"
        cancelLabel="Keep Subscription"
        theme="recipient"
        isPending={isMutating}
        onConfirm={async () => {
          await onCancel();
          setIsCancelDialogOpen(false);
        }}
        onClose={() => setIsCancelDialogOpen(false)}
      />
    </div>
  );
}

export default PremiumSuccessPanel;
