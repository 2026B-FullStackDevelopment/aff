// Contains frontend reservation API calls and uses the shared HTTP client.
import { API_ROUTES } from '../../../config/apiRoutes.js';
import { httpClient } from '../../../services/httpClient.js';

export const reservationService = {
  listMine: () => httpClient.get(API_ROUTES.reservations.mine),
  createReservation: (foodListingId) => httpClient.post(API_ROUTES.reservations.create, { foodListingId }),
};
