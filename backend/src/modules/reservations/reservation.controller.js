// Handles reservation HTTP requests and returns reservation DTOs.
const reservationService = require('./reservation.service');
const { toReservationDto } = require('./reservation.dto');
const { created, ok } = require('../../shared/http/response');

async function listMyReservations(req, res, next) {
  try {
    const reservations = await reservationService.listReservationsForRecipient(req.user.id);
    return ok(res, reservations.map(toReservationDto));
  } catch (error) {
    return next(error);
  }
}

async function createReservation(req, res, next) {
  try {
    const reservation = await reservationService.createReservation(req.user.id, req.body.foodListingId);
    return created(res, toReservationDto(reservation));
  } catch (error) {
    return next(error);
  }
}

module.exports = { listMyReservations, createReservation };
