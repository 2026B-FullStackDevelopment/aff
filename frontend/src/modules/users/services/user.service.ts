// Contains frontend user API calls without deciding how future profile updates will be submitted.
import { API_ROUTES } from '@/config/apiRoutes';
import { httpClient } from '@/services/httpClient';
import type { AnyUserDTO, UpdateProfilePayload } from '@/types/api';

export const userService = {
  getMyProfile: () => httpClient.get<AnyUserDTO>(API_ROUTES.users.me),
  /**
   * PATCH /users/me — persists editable profile fields.
   * NOTE: Backend is not yet implemented (returns 501). Wire this call
   * into useProfileEditForm.handleSubmit once the backend lands.
   */
  updateProfile: (patch: UpdateProfilePayload) =>
    httpClient.patch<AnyUserDTO>(API_ROUTES.users.me, patch),
};

