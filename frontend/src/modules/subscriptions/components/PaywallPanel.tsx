import { ArrowRight, CheckCircle2, Lock } from 'lucide-react';
import { Button } from '@/shared/components/Button/Button';
import { FormSectionHeader } from '@/shared/components/FormSectionHeader/FormSectionHeader';

const BENEFITS = [
  'Priority Notification Preferences',
  'Automated Matching Alerts',
  'Location-based Ordering',
];

interface PaywallPanelProps {
  onSubscribe?: () => void;
  isSubmitting?: boolean;
}

/**
 * "Free plan" state of the Subscription page. `onSubscribe` is a stub for
 * now — wiring it to POST /subscriptions/checkout-session + redirect is a
 * separate pass once the UI is signed off.
 */
export function PaywallPanel({ onSubscribe, isSubmitting = false }: PaywallPanelProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 rounded-lg border border-slate-200 bg-slate-50/70 px-4 py-3">
        <span className="text-sm text-[#414844]">You're currently on the free plan.</span>
        <span className="shrink-0 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold uppercase tracking-wider text-slate-600">
          Standard Recipient
        </span>
      </div>

      <div>
        <FormSectionHeader title="Upgrade Benefits" theme="recipient" />

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

        <Button
          type="button"
          onClick={onSubscribe}
          disabled={isSubmitting}
          className="mt-4 h-12 w-full rounded-lg bg-[#3D6852] text-sm font-bold text-white transition-all duration-200 ease-out hover:bg-[#2E5A47] hover:shadow-md active:scale-[0.98]"
        >
          {isSubmitting ? 'Redirecting…' : 'Subscribe — $5.00/month'}
          {!isSubmitting && <ArrowRight className="size-4" aria-hidden="true" />}
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
