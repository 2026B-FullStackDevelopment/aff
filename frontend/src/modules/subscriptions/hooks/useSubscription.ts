// Loads the authenticated Recipient's derived tier + latest subscription row.
import { useEffect, useState } from 'react';
import type { SubscriptionDTO } from '@/types/api';
import { subscriptionService } from '../services/subscription.service';

interface UseSubscriptionResult {
  tier: 'STANDARD' | 'PREMIUM';
  subscription: SubscriptionDTO | null;
  isLoading: boolean;
  error: string | null;
  reload: () => void;
  /** Lets useSubscriptionCheckout patch the cached row in place after a
   * PATCH /subscriptions/me mutation, without a second GET — cancelling
   * or resuming never changes `tier`, so a full reload isn't needed. */
  setSubscription: (subscription: SubscriptionDTO) => void;
}

export function useSubscription(): UseSubscriptionResult {
  const [tier, setTier] = useState<'STANDARD' | 'PREMIUM'>('STANDARD');
  const [subscription, setSubscription] = useState<SubscriptionDTO | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setError(null);

    async function load() {
      try {
        const response = await subscriptionService.getMySubscription();
        if (!isMounted) return;

        if (!response.ok || !response.data) {
          setError('Could not load your subscription. Please try again.');
          return;
        }

        setTier(response.data.tier);
        setSubscription(response.data.subscription);
      } catch {
        if (isMounted) setError('Could not load your subscription. Please try again.');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    load();
    return () => { isMounted = false; };
  }, [reloadToken]);

  function reload() {
    setReloadToken((t) => t + 1);
  }

  return { tier, subscription, isLoading, error, reload, setSubscription };
}
