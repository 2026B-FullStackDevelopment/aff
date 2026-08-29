// Contains frontend premium subscription API calls and uses the shared HTTP client.
import { API_ROUTES } from '../../../config/apiRoutes';
import { httpClient } from '../../../services/httpClient';
import type { Subscription } from '../../../types/api';

export const subscriptionService = {
  startPremiumSubscription: (payload?: unknown) =>
    httpClient.post<Subscription>(API_ROUTES.subscriptions.checkoutSession, payload),
};
