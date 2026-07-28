// Shapes admin dashboard data before sending it to the frontend.
function toAdminDashboardDto(summary) {
  return {
    userCount: summary.users,
    foodListingCount: summary.foodListings,
    reservationCount: summary.reservations,
    note: summary.note,
  };
}

module.exports = { toAdminDashboardDto };
