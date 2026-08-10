// Shapes error responses so the frontend receives a predictable error format.
import type { ErrorResponse } from '../http/response.types.js';

function toErrorDto(error: Error): ErrorResponse {
  return {
    message: error.message || 'Something went wrong.',
  };
}

export { toErrorDto };
