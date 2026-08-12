// Contains frontend auth API calls and uses the shared HTTP client.
import { API_ROUTES } from '../../../config/apiRoutes';
import { httpClient } from '../../../services/httpClient';
import type { AuthSession } from '../../../types/api';

export const authService = {
  registerRecipient: (payload: unknown) => 
    httpClient.post<AuthSession>(API_ROUTES.auth.registerRecipient, payload),
  
  registerDonor: (payload: unknown) => 
    httpClient.post<AuthSession>(API_ROUTES.auth.registerDonor, payload),
  
  login: (credentials: unknown) => 
    httpClient.post<AuthSession>(API_ROUTES.auth.login, credentials),

  logout: () => 
    httpClient.post<void>(API_ROUTES.auth.logout, null),
};