// Creates HTTP-aware errors used by the Order service layer.
function createHttpError(statusCode: number, message: string): Error {
  const error: Error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

export { createHttpError };
