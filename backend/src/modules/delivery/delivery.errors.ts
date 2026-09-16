// Shared error helpers for the delivery module's service files.
function createHttpError(statusCode: number, message: string): Error {
  const error: Error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function isDuplicateKeyError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: number }).code === 11000
  );
}

export { createHttpError, isDuplicateKeyError };
