// Contains admin business rules and uses other modules through interfaces where possible.
async function getDashboardSummary() {
  return {
    users: 0,
    listings: 0,
    orders: 0,
    note: 'Replace these counters with repository/interface calls as admin features grow.',
  };
}

export { getDashboardSummary };
