import { Check } from 'lucide-react';
import { Button } from '@/shared/components/Button/Button';

interface PremiumSuccessPanelProps {
  onGoToPreferences?: () => void;
}

/**
 * "Already Premium" state of the Subscription page. `onGoToPreferences` is
 * a stub — its real destination (SRS 5.3.1–5.3.3 preferences UI) doesn't
 * exist as a route yet.
 */
export function PremiumSuccessPanel({ onGoToPreferences }: PremiumSuccessPanelProps) {
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

      <Button
        type="button"
        onClick={onGoToPreferences}
        className="mt-6 h-11 w-full max-w-xs rounded-lg bg-[#3D6852] text-sm font-bold text-white transition-all duration-200 ease-out hover:bg-[#2E5A47] hover:shadow-md active:scale-[0.98] sm:w-auto sm:px-8"
      >
        Go to Notification Preferences
      </Button>
    </div>
  );
}

export default PremiumSuccessPanel;
