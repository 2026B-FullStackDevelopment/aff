// Contains frontend reservation API calls and uses the shared HTTP client.
import { API_ROUTES } from '../../../config/apiRoutes';
import { httpClient } from '../../../services/httpClient';
import type { Reservation } from '../../../types/api';

export const reservationService = {
  listMine: () => httpClient.get<Reservation[]>(API_ROUTES.reservations.mine),
  createReservation: (foodListingId: string) =>
    httpClient.post<Reservation>(API_ROUTES.reservations.create, { foodListingId }),
};
