import { API_ROUTES } from '@/config/apiRoutes';
import { httpClient } from '@/services/httpClient';
import type { DeliveryDTO, PaginatedData, QueueDeliveryDTO } from '@/types/api';

// GET /deliveries/queue accepts page/limit only — the oldest-first ordering is
// fixed server-side so no Courier can cherry-pick, so there is deliberately no
// sort parameter to build (E2).
function buildQueuePath(page: number, limit: number): string {
  return `${API_ROUTES.deliveries.queue}?page=${page}&limit=${limit}`;
}

export const deliveryService = {
  getQueue: (page: number, limit: number) =>
    httpClient.get<PaginatedData<QueueDeliveryDTO>>(buildQueuePath(page, limit)),
  getActive: () => httpClient.get<DeliveryDTO>(API_ROUTES.deliveries.active),
  claim: (deliveryId: string) =>
    httpClient.patch<DeliveryDTO>(API_ROUTES.deliveries.claim(deliveryId), {}),
  pickup: (deliveryId: string) =>
    httpClient.patch<DeliveryDTO>(API_ROUTES.deliveries.pickup(deliveryId), {}),
  deliver: (deliveryId: string, cashConfirmed?: boolean) =>
    httpClient.patch<DeliveryDTO>(
      API_ROUTES.deliveries.deliver(deliveryId),
      cashConfirmed === undefined ? {} : { cashConfirmed },
    ),
};
