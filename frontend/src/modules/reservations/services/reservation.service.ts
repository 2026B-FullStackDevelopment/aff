import { API_ROUTES } from '@/config/apiRoutes';
import { httpClient } from '@/services/httpClient';
import type {
  CheckoutSessionResponseDto,
  DeliveryDTO,
  OrderDTO,
  ReserveListingPayload,
  CancelOrderResponseDto,
  PaginatedData,
  RecipientOrderDTO,
  SubmitFeedbackResponseDto,
} from '@/types/api';

// GET /orders/mine only supports page/limit — no search/filter/sort, so
// this stays a plain query-string builder rather than a generic param
// serializer (mirrors listing.service.ts#getListingOrders' local helper).
function buildMyOrdersPath(page: number, limit: number): string {
  return `${API_ROUTES.orders.mine}?page=${page}&limit=${limit}`;
}

export const reservationService = {
  getOrderById: (orderId: string) =>
    httpClient.get<OrderDTO>(API_ROUTES.orders.detail(orderId)),
  reserveListing: (listingId: string, payload: ReserveListingPayload) =>
    httpClient.post<OrderDTO>(API_ROUTES.listings.reserve(listingId), payload),
  createCheckoutSession: (orderId: string) =>
    httpClient.post<CheckoutSessionResponseDto>(API_ROUTES.orders.checkoutSession(orderId), {}),
  cancelOrder: (orderId: string) =>
    httpClient.delete<CancelOrderResponseDto>(API_ROUTES.orders.cancel(orderId)),
  getMyOrders: (page: number, limit: number) =>
    httpClient.get<PaginatedData<RecipientOrderDTO>>(buildMyOrdersPath(page, limit)),
  getDeliveryById: (deliveryId: string) =>
    httpClient.get<DeliveryDTO>(API_ROUTES.deliveries.detail(deliveryId)),
  submitFeedback: (orderId: string, comment: string) =>
    httpClient.post<SubmitFeedbackResponseDto>(API_ROUTES.orders.feedback(orderId), { comment }),
};

export default reservationService;