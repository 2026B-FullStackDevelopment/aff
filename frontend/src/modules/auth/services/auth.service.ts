// Contains frontend auth API calls and uses the shared HTTP client.
import { API_ROUTES } from '@/config/apiRoutes';
import { httpClient } from '@/services/httpClient';
import type { AuthSession, RegisterRecipientPayload, RegisterDonorPayload, LoginPayload } from '@/types/api';

export const authService = {
  registerRecipient: (payload: RegisterRecipientPayload) =>
    httpClient.post<AuthSession>(API_ROUTES.auth.registerRecipient, payload),

  registerDonor: (payload: RegisterDonorPayload) =>
    httpClient.post<AuthSession>(API_ROUTES.auth.registerDonor, payload),

  login: (credentials: LoginPayload) =>
    httpClient.post<AuthSession>(API_ROUTES.auth.login, credentials),

  logout: () =>
    httpClient.post<null>(API_ROUTES.auth.logout, null),
};