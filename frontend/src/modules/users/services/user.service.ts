// Contains frontend user API calls without deciding how future profile updates will be submitted.
import { API_ROUTES } from '../../../config/apiRoutes';
import { httpClient } from '../../../services/httpClient';
import type { User } from '../../../types/api';

export const userService = {
  getMyProfile: () => httpClient.get<User>(API_ROUTES.users.me),
};
