import { useState } from 'react';
import { getResponseMessage } from '@/shared/utils/apiError';
import type { SubscriptionDTO } from '@/types/api';
import { subscriptionService } from '../services/subscription.service';

interface UseSubscriptionCheckoutResult {
  isSubmitting: boolean;
  submitError: string | null;
  subscribe: () => Promise<void>;
  isMutating: boolean;
  mutationError: string | null;
  cancel: () => Promise<void>;
  resume: () => Promise<void>;
}

/**
 * Owns the two subscription mutations: starting a new Stripe Checkout
 * (F1) and toggling `cancelAtPeriodEnd` on an existing subscription (F5).
 * `onSubscriptionUpdate` is typically `useSubscription().setSubscription`,
 * so the caller's cached row stays in sync without a refetch.
 */
export function useSubscriptionCheckout(
  onSubscriptionUpdate?: (subscription: SubscriptionDTO) => void,
): UseSubscriptionCheckoutResult {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [isMutating, setIsMutating] = useState(false);
  const [mutationError, setMutationError] = useState<string | null>(null);

  async function subscribe() {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const response = await subscriptionService.startPremiumSubscription();

      if (!response.ok || !response.data) {
        setSubmitError(getResponseMessage(response.data, 'Could not start checkout. Please try again.'));
        setIsSubmitting(false);
        return;
      }

      // Hosted redirect — leaves the app, same pattern as order/reservation checkout.
      window.location.href = response.data.checkoutUrl;
    } catch {
      setSubmitError('Could not start checkout. Please try again.');
      setIsSubmitting(false);
    }
  }

  async function updateSubscription(cancelAtPeriodEnd: boolean, fallbackMessage: string) {
    setIsMutating(true);
    setMutationError(null);

    try {
      const response = await subscriptionService.updateSubscription(cancelAtPeriodEnd);

      if (!response.ok || !response.data) {
        setMutationError(getResponseMessage(response.data, fallbackMessage));
        return;
      }

      onSubscriptionUpdate?.(response.data.subscription);
    } catch {
      setMutationError(fallbackMessage);
    } finally {
      setIsMutating(false);
    }
  }

  const cancel = () => updateSubscription(true, 'Could not cancel your subscription. Please try again.');
  const resume = () => updateSubscription(false, 'Could not resume your subscription. Please try again.');

  return { isSubmitting, submitError, subscribe, isMutating, mutationError, cancel, resume };
}
