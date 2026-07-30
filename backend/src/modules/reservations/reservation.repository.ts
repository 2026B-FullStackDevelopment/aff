// Contains reservation database queries so services do not call Mongoose directly.
const Reservation = require('./reservation.model');

function findReservationsByRecipient(recipientId) {
  return Reservation.find({ recipientId }).lean();
}

function createReservation(data) {
  return Reservation.create(data);
}

module.exports = { findReservationsByRecipient, createReservation };
