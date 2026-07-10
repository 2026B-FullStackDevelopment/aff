// Contains frontend admin API calls and uses the shared HTTP client.
import { API_ROUTES } from '../../../config/apiRoutes.js';
import { httpClient } from '../../../services/httpClient.js';

export const adminService = {
  getDashboard: () => httpClient.get(API_ROUTES.admin.dashboard),
};
