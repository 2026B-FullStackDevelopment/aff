// Holds FoodCard behavior so the JSX stays focused on presentation.
import { reservationService } from '../../../reservations/services/reservation.service';

export function useFoodCard(food) {
  async function reserveFood() {
    return reservationService.createReservation(food.id);
  }

  return { reserveFood };
}
