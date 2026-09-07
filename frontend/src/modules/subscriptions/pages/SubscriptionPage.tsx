import { NavigationHeader } from '@/shared/components/NavigationHeader/NavigationHeader';
import { getStoredUser } from '@/services/authStorage';
import { PaywallPanel } from '../components/PaywallPanel';
import { PremiumSuccessPanel } from '../components/PremiumSuccessPanel';

export function SubscriptionPage() {
  const cachedUser = getStoredUser();

  // TODO: replace with a real useSubscription() call (GET /subscriptions/me)
  // once the data layer is wired up. For now this reads the cached session
  // the same way ProfilePage.tsx does for its pre-fetch nav fallback, purely
  // so the two panels below can be previewed against a real logged-in tier.
  const isPremium = Boolean(
    cachedUser && cachedUser.role === 'RECIPIENT' && cachedUser.tier === 'PREMIUM',
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f5faf7] to-[#e9f5ee]">
      <NavigationHeader backTo="/profile" backLabel="Back to Profile" />

      <main className="mx-auto max-w-2xl space-y-4 px-4 py-6 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-extrabold tracking-tight text-[#1B1C1C]">
          Premium Subscription
        </h1>

        <div className="rounded-xl border border-[#e9f5ee] bg-white p-6 shadow-sm sm:p-8">
          {isPremium ? (
            <PremiumSuccessPanel
              onGoToPreferences={() => {
                // TODO: navigate('/notification-preferences') once that route exists (SRS 5.3.1–5.3.3)
              }}
            />
          ) : (
            <PaywallPanel
              onSubscribe={() => {
                // TODO: wire to POST /subscriptions/checkout-session + redirect
              }}
            />
          )}
        </div>
      </main>
    </div>
  );
}

export default SubscriptionPage;