import { API_ROUTES } from '@/config/apiRoutes';
import { httpClient } from '@/services/httpClient';
import type { NotificationDTO, PaginatedData } from '@/types/api';

// GET /notifications only supports page/limit (mirrors reservation.service.ts#buildMyOrdersPath).
function buildMyNotificationsPath(page: number, limit: number): string {
  return `${API_ROUTES.notifications.mine}?page=${page}&limit=${limit}`;
}

export const notificationService = {
  getMyNotifications: (page: number, limit: number) =>
    httpClient.get<PaginatedData<NotificationDTO>>(buildMyNotificationsPath(page, limit)),
};

export default notificationService;
