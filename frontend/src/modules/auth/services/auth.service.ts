// Contains frontend auth API calls and uses the shared HTTP client.
import { API_ROUTES } from '../../../config/apiRoutes';
import { httpClient } from '../../../services/httpClient';
import type { AuthSession } from '../../../types/api';

export const authService = {
  register: (payload: unknown) => httpClient.post<AuthSession>(API_ROUTES.auth.register, payload),
  login: (credentials: unknown) => httpClient.post<AuthSession>(API_ROUTES.auth.login, credentials),
};
