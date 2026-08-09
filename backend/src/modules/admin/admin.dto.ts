// Shapes admin dashboard data before sending it to the frontend.
function toAdminDashboardDto(summary) {
  return {
    userCount: summary.users,
    listingCount: summary.listings,
    orderCount: summary.orders,
    note: summary.note,
  };
}

export { toAdminDashboardDto };
