// Shapes error responses so the frontend receives a predictable error format.
import type { ErrorResponse } from '../http/response.types.js';

function toErrorDto(error: Error): ErrorResponse {
  const dto: ErrorResponse = {
    message: error.message || 'Something went wrong.',
  };

  // Added only when present, so every other endpoint's error body stays { message }.
  if (error.lockedUntilSeconds !== undefined) {
    dto.lockedUntilSeconds = error.lockedUntilSeconds;
  }

  return dto;
}

export { toErrorDto };
