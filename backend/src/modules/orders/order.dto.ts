// Shapes order data before sending it to the frontend or another module.
function toOrderDto(order) {
  if (!order) return null;

  return {
    id: String(order._id || order.id),
    listingId: String(order.listingId),
    recipientId: String(order.recipientId),
    status: order.status,
  };
}

export { toOrderDto };
