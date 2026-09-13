import { API_ROUTES } from '@/config/apiRoutes';
import { httpClient } from '@/services/httpClient';
import type {
  CheckoutSessionResponseDto,
  SubscriptionStatusResponse,
  UpdateSubscriptionResponse,
} from '@/types/api';

export const subscriptionService = {
  /** GET /subscriptions/me — derived tier + latest subscription row. */
  getMySubscription: () =>
    httpClient.get<SubscriptionStatusResponse>(API_ROUTES.subscriptions.me),

  /** POST /subscriptions/checkout-session — starts Stripe subscription-mode Checkout. */
  startPremiumSubscription: () =>
    httpClient.post<CheckoutSessionResponseDto>(API_ROUTES.subscriptions.checkoutSession, {}),

  /** PATCH /subscriptions/me — cancels (true) or resumes (false) at period end. */
  updateSubscription: (cancelAtPeriodEnd: boolean) =>
    httpClient.patch<UpdateSubscriptionResponse>(API_ROUTES.subscriptions.me, { cancelAtPeriodEnd }),
};

export default subscriptionService;
