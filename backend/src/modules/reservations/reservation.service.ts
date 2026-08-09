// Contains reservation rules and uses other modules through interfaces only.
import * as reservationRepository from './reservation.repository.js';
import { foodInterface } from '../food/food.interface.js';

async function listReservationsForRecipient(recipientId) {
  return reservationRepository.findReservationsByRecipient(recipientId);
}

async function createReservation(recipientId, foodListingId) {
  const food = await foodInterface.getFoodListingById(foodListingId);

  if (!food || food.status !== 'AVAILABLE') {
    const error = new Error('This food listing is not available for reservation.');
    error.statusCode = 400;
    throw error;
  }

  const reservation = await reservationRepository.createReservation({
    recipientId,
    foodListingId,
    status: 'RESERVED',
  });

  await foodInterface.markFoodReserved(foodListingId);
  return reservation;
}

export { listReservationsForRecipient, createReservation };
