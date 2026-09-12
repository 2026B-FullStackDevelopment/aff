import { Sparkles } from 'lucide-react';
import { Button } from '@/shared/components/Button/Button';

interface PremiumUpsellPanelProps {
  onUpgrade: () => void;
}

/**
 * Bell-dropdown content shown to non-Premium Recipients. Colors mirror the
 * existing "Upgrade to Premium" promo banner on ProfilePage.tsx
 * (bg-[#2E5A47] / text-[#e9f5ee] / white pill button) so the upsell reads
 * consistently wherever it shows up.
 */
export function PremiumUpsellPanel({ onUpgrade }: PremiumUpsellPanelProps) {
  return (
    <div className="rounded-xl bg-[#2E5A47] p-5 text-white shadow-xl ring-1 ring-black/5">
      <div className="flex items-start gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white/15">
          <Sparkles className="size-4" aria-hidden="true" />
        </div>

        <div className="min-w-0 flex-1 pt-0.5">
          <h2 className="text-sm font-bold">Unlock Smart Discovery</h2>
          <p className="mt-1 text-sm leading-5 text-[#e9f5ee]">
            Premium members get real-time alerts tailored to their preferences.
          </p>
        </div>
      </div>

      <Button
        type="button"
        onClick={onUpgrade}
        className="mt-4 h-10 w-full rounded-lg bg-white text-sm font-bold text-[#2E5A47] transition-all duration-200 ease-out hover:bg-slate-50 hover:shadow-md active:scale-[0.98]"
      >
        Upgrade to Premium
      </Button>
    </div>
  );
}

export default PremiumUpsellPanel;
