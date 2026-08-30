import { API_ROUTES } from '@/config/apiRoutes';
import { httpClient } from '@/services/httpClient';
import type {
  CheckoutSessionResponseDto,
  OrderDTO,
  ReserveListingPayload,
} from '@/types/api';

export const reservationService = {
  getOrderById: (orderId: string) =>
    httpClient.get<OrderDTO>(API_ROUTES.orders.detail(orderId)),
  reserveListing: (listingId: string, payload: ReserveListingPayload) =>
    httpClient.post<OrderDTO>(API_ROUTES.listings.reserve(listingId), payload),
  createCheckoutSession: (orderId: string) =>
    httpClient.post<CheckoutSessionResponseDto>(API_ROUTES.orders.checkoutSession(orderId), {}),
  cancelOrder: (orderId: string) =>
    httpClient.delete<OrderDTO>(API_ROUTES.orders.cancel(orderId)),
};

export default reservationService;