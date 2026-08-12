// Converts thrown backend errors into consistent HTTP JSON responses.
import type { Request, Response, NextFunction } from 'express';
import { toErrorDto } from '../shared/dtos/error.dto.js';

function errorMiddleware(error: Error, _req: Request, res: Response, _next: NextFunction) {
  const statusCode = error.statusCode || 500;
  res.status(statusCode).json(toErrorDto(error));
}

export { errorMiddleware };
