// Exposes safe reservation operations for other modules without importing reservation.service directly.
const reservationService = require('./reservation.service');

const reservationInterface = {
  listReservationsForRecipient: reservationService.listReservationsForRecipient,
};

module.exports = { reservationInterface };
