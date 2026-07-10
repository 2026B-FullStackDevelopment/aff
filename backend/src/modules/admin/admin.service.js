// Contains admin business rules and uses other modules through interfaces where possible.
async function getDashboardSummary() {
  return {
    users: 0,
    foodListings: 0,
    reservations: 0,
    note: 'Replace these counters with repository/interface calls as admin features grow.',
  };
}

module.exports = { getDashboardSummary };
