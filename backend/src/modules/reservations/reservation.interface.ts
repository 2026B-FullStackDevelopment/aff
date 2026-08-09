// Exposes safe reservation operations for other modules without importing reservation.service directly.
import * as reservationService from './reservation.service.js';

const reservationInterface = {
  listReservationsForRecipient: reservationService.listReservationsForRecipient,
};

export { reservationInterface };
