// Creates HTTP-aware errors used by the Payment service layer.
function recipientNotFoundError(): Error {
  const error: Error = new Error('Recipient profile not found.');
  error.statusCode = 404;
  return error;
}

function paymentNotFoundError(): Error {
  const error: Error = new Error('Payment record not found for this order.');
  error.statusCode = 404;
  return error;
}

function stripeApiError(message: string): Error {
  const error: Error = new Error(message);
  error.statusCode = 502;
  return error;
}

export { recipientNotFoundError, paymentNotFoundError, stripeApiError };
