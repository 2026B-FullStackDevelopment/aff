import { httpClient } from '@/services/httpClient';
import { API_ROUTES } from '@/config/apiRoutes';
import type {
  NotificationPreference,
  CreateNotificationPreferencePayload,
  UpdateNotificationPreferencePayload,
} from '@/types/api';

export const notificationPreferenceService = {
  list: () =>
    httpClient.get<NotificationPreference[]>(API_ROUTES.recipients.preferences),

  create: (payload: CreateNotificationPreferencePayload) =>
    httpClient.post<NotificationPreference>(API_ROUTES.recipients.preferences, payload),

  update: (id: string, payload: UpdateNotificationPreferencePayload) =>
    httpClient.patch<NotificationPreference>(
      API_ROUTES.recipients.preferenceDetail(id),
      payload,
    ),

  remove: (id: string) =>
    httpClient.delete<null>(API_ROUTES.recipients.preferenceDetail(id)),
};

export default notificationPreferenceService;