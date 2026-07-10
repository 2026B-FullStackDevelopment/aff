// Contains frontend auth API calls and uses the shared HTTP client.
import { API_ROUTES } from '../../../config/apiRoutes.js';
import { httpClient } from '../../../services/httpClient.js';

export const authService = {
  register: (payload) => httpClient.post(API_ROUTES.auth.register, payload),
  login: (credentials) => httpClient.post(API_ROUTES.auth.login, credentials),
};
