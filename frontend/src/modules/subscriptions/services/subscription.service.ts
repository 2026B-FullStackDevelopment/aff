// Contains frontend premium subscription API calls and uses the shared HTTP client.
import { API_ROUTES } from '../../../config/apiRoutes.js';
import { httpClient } from '../../../services/httpClient.js';

export const subscriptionService = {
  startPremiumSubscription: (payload) => httpClient.post(API_ROUTES.subscriptions.premium, payload),
};
