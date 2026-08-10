// Contains Courier delivery business rules. See docs/api_design.md §9.

// The single convergence point Reservation/Donor-Initiated orders and the Stripe webhook call into
// once an order is ready to enter the Courier queue (docs/api_design.md §9, "Internal" entry).
// Not implemented yet — the DELIVERY schema doesn't exist.
async function createForOrder(_orderId: string): Promise<never> {
  const error: Error = new Error('DeliveryService.createForOrder is not implemented yet.');
  error.statusCode = 501;
  throw error;
}

export { createForOrder };
