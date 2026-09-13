import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ErrorState } from '@/shared/components/ErrorState/ErrorState';
import { LoadingSkeleton } from '@/shared/components/LoadingSkeleton/LoadingSkeleton';
import { NavigationHeader } from '@/shared/components/NavigationHeader/NavigationHeader';
import { PaywallPanel } from '../components/PaywallPanel';
import { PremiumSuccessPanel } from '../components/PremiumSuccessPanel';
import { useSubscription } from '../hooks/useSubscription';
import { useSubscriptionCheckout } from '../hooks/useSubscriptionCheckout';

const CONFIRMATION_POLL_MS = 2000;
const CONFIRMATION_POLL_ATTEMPTS = 5;

export function SubscriptionPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const checkoutStatus = searchParams.get('status'); // 'success' | 'cancelled' | null

  const { tier, subscription, isLoading, error, reload, setSubscription } = useSubscription();
  const { isSubmitting, submitError, subscribe, isMutating, mutationError, cancel, resume } =
    useSubscriptionCheckout(setSubscription);

  const isPremium = tier === 'PREMIUM';

  const [isConfirming, setIsConfirming] = useState(checkoutStatus === 'success');
  const [pollExhausted, setPollExhausted] = useState(false);
  const pollAttemptsRef = useRef(0);

  // The invoice.paid webhook that flips STANDARD -> PREMIUM lands async
  // and has no matching Socket.IO event (api_design.md §12 has none for
  // subscriptions), so poll briefly rather than making the Recipient
  // manually refresh after returning from Stripe.
  useEffect(() => {
    if (checkoutStatus !== 'success') return;

    if (isPremium) {
      setIsConfirming(false);
      setPollExhausted(false);
      // Confirmed — drop ?status= so refresh/back-nav doesn't re-poll.
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.delete('status');
        return next;
      }, { replace: true });
      return;
    }

    if (isLoading) return;

    if (pollAttemptsRef.current >= CONFIRMATION_POLL_ATTEMPTS) {
      setIsConfirming(false);
      setPollExhausted(true);
      return;
    }

    const handle = window.setTimeout(() => {
      pollAttemptsRef.current += 1;
      reload();
    }, CONFIRMATION_POLL_MS);

    return () => window.clearTimeout(handle);
  }, [checkoutStatus, isPremium, isLoading, reload, setSearchParams]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f5faf7] to-[#e9f5ee]">
      <NavigationHeader backTo="/profile" backLabel="Back to Profile" />

      <main className="mx-auto max-w-2xl space-y-4 px-4 py-6 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-extrabold tracking-tight text-[#1B1C1C]">
          Premium Subscription
        </h1>

        {checkoutStatus === 'cancelled' && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
            Checkout was cancelled — you have not been charged.
          </div>
        )}

        {isLoading ? (
          <LoadingSkeleton count={1} />
        ) : error ? (
          <ErrorState message={error} onRetry={reload} />
        ) : (
          <div className="rounded-xl border border-[#e9f5ee] bg-white p-6 shadow-sm sm:p-8">
            {isConfirming ? (
              <div className="flex flex-col items-center py-10 text-center">
                <svg className="size-8 animate-spin text-[#3D6852]" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <p className="mt-4 text-sm font-semibold text-[#414844]">Confirming your payment…</p>
                <p className="mt-1 text-xs text-[#6B7280]">This usually only takes a few seconds.</p>
              </div>
            ) : pollExhausted ? (
              <div className="flex flex-col items-center py-8 text-center">
                <div className="flex size-14 items-center justify-center rounded-full bg-amber-50 text-amber-600">
                  <svg className="size-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2m6-2a10 10 0 11-20 0 10 10 0 0120 0z" />
                  </svg>
                </div>
                <h2 className="mt-4 text-base font-bold text-[#1B1C1C]">Payment received — still confirming</h2>
                <p className="mt-2 max-w-xs text-sm leading-6 text-[#6B7280]">
                  Stripe confirmed your payment but the account upgrade is still processing.
                  This can take up to a minute. Click below to check again.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setPollExhausted(false);
                    setIsConfirming(true);
                    pollAttemptsRef.current = 0;
                    reload();
                  }}
                  className="mt-5 inline-flex items-center gap-2 rounded-lg bg-[#3D6852] px-5 py-2.5 text-sm font-bold text-white transition-all duration-200 ease-out hover:bg-[#2E5A47] hover:shadow-md active:scale-[0.98]"
                >
                  Check Status
                </button>
              </div>
            ) : isPremium && subscription ? (
              <PremiumSuccessPanel
                subscription={subscription}
                onGoToPreferences={() => navigate('/profile/notification-preferences')}
                onCancel={cancel}
                onResume={resume}
                isMutating={isMutating}
                mutationError={mutationError}
              />
            ) : (
              <PaywallPanel
                onSubscribe={subscribe}
                isSubmitting={isSubmitting}
                error={submitError}
                previousSubscription={subscription}
              />
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default SubscriptionPage;
