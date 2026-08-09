// Contains reservation database queries so services do not call Mongoose directly.
import Reservation from './reservation.model.js';

function findReservationsByRecipient(recipientId) {
  return Reservation.find({ recipientId }).lean();
}

function createReservation(data) {
  return Reservation.create(data);
}

export { findReservationsByRecipient, createReservation };
