// Contains frontend user API calls without deciding how future profile updates will be submitted.
import { API_ROUTES } from '@/config/apiRoutes';
import { httpClient } from '@/services/httpClient';
import type { AnyUserDTO, UpdateProfilePayload, UpdateEmailPayload, UpdatePasswordPayload } from '@/types/api';

export const userService = {
  /** GET /users/me — retrieves the authenticated caller's profile. */
  getMyProfile: () => httpClient.get<AnyUserDTO>(API_ROUTES.users.me),
  /** PATCH /users/me — persists editable profile fields. */
  updateProfile: (patch: UpdateProfilePayload) =>
    httpClient.patch<AnyUserDTO>(API_ROUTES.users.me, patch),
    
  /** PATCH /users/me/email — persists email change request. */
  updateEmail: (payload: UpdateEmailPayload) =>
    httpClient.patch<AnyUserDTO>(API_ROUTES.users.meEmail, payload),

  /** PATCH /users/me/password — persists password change. */
  updatePassword: (payload: UpdatePasswordPayload) =>
    httpClient.patch<AnyUserDTO>(API_ROUTES.users.mePassword, payload),
};
