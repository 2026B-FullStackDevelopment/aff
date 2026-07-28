// Contains frontend admin API calls and uses the shared HTTP client.
import { API_ROUTES } from '../../../config/apiRoutes';
import { httpClient } from '../../../services/httpClient';
import type { AdminDashboard } from '../../../types/api';

export const adminService = {
  getDashboard: () => httpClient.get<AdminDashboard>(API_ROUTES.admin.dashboard),
};
