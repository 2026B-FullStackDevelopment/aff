// Contains frontend admin API calls and uses the shared HTTP client.
import { API_ROUTES } from '../../../config/apiRoutes';
import { httpClient } from '../../../services/httpClient';
import type {
  AdminUsersQuery,
  AnyUserDTO,
  CourierDTO,
  CreateCourierPayload,
  PaginatedData,
  UpdateUserStatusPayload,
  UserDTO,
} from '../../../types/api';

function buildQueryString(query: AdminUsersQuery): string {
  const params = new URLSearchParams();

  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== '') {
      params.set(key, String(value));
    }
  });

  const queryString = params.toString();
  return queryString ? `?${queryString}` : '';
}

export const adminService = {
  /** Retrieves one page of role-aware user DTOs for the Admin directory. */
  listUsers: (query: AdminUsersQuery = {}) =>
    httpClient.get<PaginatedData<AnyUserDTO>>(
      `${API_ROUTES.admin.users}${buildQueryString(query)}`,
    ),

  /** Deactivates or reactivates one account. */
  updateUserStatus: (userId: string, payload: UpdateUserStatusPayload) =>
    httpClient.patch<UserDTO>(API_ROUTES.admin.userStatus(userId), payload),

  /** Creates the USER and COURIER records through the Admin-only endpoint. */
  createCourier: (payload: CreateCourierPayload) =>
    httpClient.post<CourierDTO>(API_ROUTES.admin.couriers, payload),
};
