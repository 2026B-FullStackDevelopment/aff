// Handles reservation HTTP requests and returns reservation DTOs.
import * as reservationService from './reservation.service.js';
import { toReservationDto } from './reservation.dto.js';
import { created, ok } from '../../shared/http/response.js';

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

export { listMyReservations, createReservation };
