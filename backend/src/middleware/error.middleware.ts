// Converts thrown backend errors into consistent HTTP JSON responses.
import { toErrorDto } from '../shared/dtos/error.dto.js';

function errorMiddleware(error, req, res, next) {
  const statusCode = error.statusCode || 500;
  res.status(statusCode).json(toErrorDto(error));
}

export { errorMiddleware };
