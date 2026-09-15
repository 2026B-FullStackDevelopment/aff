import { ArrowRight, CheckCircle2, Lock, RefreshCw } from 'lucide-react';
import { Button } from '@/shared/components/Button/Button';
import { FormErrorAlert } from '@/shared/components/FormErrorAlert/FormErrorAlert';
import { FormSectionHeader } from '@/shared/components/FormSectionHeader/FormSectionHeader';
import { formatDate } from '@/shared/utils/listingFormatting';
import type { SubscriptionDTO } from '@/types/api';

const BENEFITS = [
  'Priority Notification Preferences',
  'Automated Matching Alerts',
];

interface PaywallPanelProps {
  onSubscribe?: () => void;
  isSubmitting?: boolean;
  error?: string | null;
  /** Pass the lapsed subscription row (tier===STANDARD but subscription!==null)
   * so the panel can show "membership ended" context instead of first-time copy. */
  previousSubscription?: SubscriptionDTO | null;
}

/**
 * "Free plan" state of the Subscription page. `onSubscribe` is wired to
 * useSubscriptionCheckout.subscribe(), which POSTs
 * /subscriptions/checkout-session and redirects to the returned checkoutUrl.
 * When `previousSubscription` is provided the panel renders lapsed-member
 * copy ("membership ended on <date>") instead of first-time upgrade copy.
 */
export function PaywallPanel({
  onSubscribe,
  isSubmitting = false,
  error = null,
  previousSubscription = null,
}: PaywallPanelProps) {
  const isLapsed = previousSubscription !== null;
  const endedDate = previousSubscription ? formatDate(previousSubscription.currentPeriodEnd) : null;
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 rounded-lg border border-slate-200 bg-slate-50/70 px-4 py-3">
        {isLapsed ? (
          <span className="text-sm text-[#414844]">
            Your Premium membership ended on{' '}
            <span className="font-semibold text-[#1B1C1C]">{endedDate}</span>.
          </span>
        ) : (
          <span className="text-sm text-[#414844]">You're currently on the free plan.</span>
        )}
        <span className="shrink-0 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold uppercase tracking-wider text-slate-600">
          Standard Recipient
        </span>
      </div>

      <div>
        <FormSectionHeader
          title={isLapsed ? 'What you\'ll get back' : 'Upgrade Benefits'}
          theme="recipient"
        />
        <ul className="space-y-3">
          {BENEFITS.map((benefit) => (
            <li key={benefit} className="flex items-center gap-3 text-sm text-[#414844]">
              <CheckCircle2 className="size-5 shrink-0 text-[#3D6852]" aria-hidden="true" />
              <span>{benefit}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-xl border border-[#d1e2d8] bg-[#f0f7f3] p-6 text-center">
        <div className="flex items-baseline justify-center gap-1">
          <span className="text-4xl font-extrabold text-[#1B1C1C]">$5.00</span>
          <span className="text-sm text-[#6B7280]">/ month</span>
        </div>

        <p className="mt-1 text-sm text-[#6B7280]">Billed monthly • Cancel anytime.</p>

        {error && (
          <div className="mt-4 text-left">
            <FormErrorAlert message={error} />
          </div>
        )}

        <Button
          type="button"
          onClick={onSubscribe}
          disabled={isSubmitting}
          className="mt-4 h-12 w-full rounded-lg bg-[#3D6852] text-sm font-bold text-white transition-all duration-200 ease-out hover:bg-[#2E5A47] hover:shadow-md active:scale-[0.98]"
        >
          {isSubmitting
            ? 'Redirecting…'
            : isLapsed
              ? 'Reactivate Premium — $5.00/month'
              : 'Subscribe — $5.00/month'}
          {!isSubmitting && (
            isLapsed
              ? <RefreshCw className="size-4" aria-hidden="true" />
              : <ArrowRight className="size-4" aria-hidden="true" />
          )}
        </Button>

        <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-[#6B7280]">
          <Lock className="size-3 shrink-0" aria-hidden="true" />
          You'll be redirected to Stripe's secure checkout.
        </p>
      </div>
    </div>
  );
}

export default PaywallPanel;
