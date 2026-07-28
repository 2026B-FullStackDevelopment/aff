// Loads recipient reservations and keeps reservation page state out of JSX.
import { useEffect, useState } from 'react';
import { reservationService } from '../services/reservation.service';

export function useReservations() {
  const [reservations, setReservations] = useState([]);

  useEffect(() => {
    async function loadReservations() {
      const response = await reservationService.listMine();

      if (response.ok) {
        setReservations(response.data || []);
      }
    }

    loadReservations();
  }, []);

  return { reservations };
}
