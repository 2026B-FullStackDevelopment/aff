// Shapes reservation data before sending it to the frontend or another module.
function toReservationDto(reservation) {
  if (!reservation) return null;

  return {
    id: String(reservation._id || reservation.id),
    foodListingId: String(reservation.foodListingId),
    recipientId: String(reservation.recipientId),
    status: reservation.status,
  };
}

module.exports = { toReservationDto };
