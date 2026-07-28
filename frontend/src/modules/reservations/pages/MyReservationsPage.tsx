// Reservation page screen where recipients review their reserved food.
import { useReservations } from '../hooks/useReservations.js';
import { StatusBadge } from '../../../shared/components/StatusBadge/StatusBadge.jsx';

export function MyReservationsPage() {
  const { reservations } = useReservations();

  return (
    <main>
      <h1>My Reservations</h1>
      {reservations.map((reservation) => (
        <article key={reservation.id}>
          <p>Food listing: {reservation.foodListingId}</p>
          <StatusBadge status={reservation.status} />
        </article>
      ))}
    </main>
  );
}
