// Creates HTTP-aware errors used by the Listing service layer.
function createHttpError(statusCode: number, message: string): Error {
  const error: Error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

export { createHttpError };
