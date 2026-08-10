// Keeps common success response shapes consistent across controllers.
import type { Response } from 'express';
import type { SuccessResponse, PaginatedResponse } from './response.types.js';

function ok<T>(res: Response, data: T, statusCode = 200): Response<SuccessResponse<T>> {
  return res.status(statusCode).json({ data });
}

function created<T>(res: Response, data: T): Response<SuccessResponse<T>> {
  return ok(res, data, 201);
}

function paginated<T>(
  res: Response,
  items: T[],
  page: number,
  limit: number,
  total: number,
): Response<PaginatedResponse<T>> {
  return res.status(200).json({ data: { items, page, limit, total } });
}

// Marks routes that exist per docs/api_design.md but have no business logic behind them yet.
function notImplemented(res: Response) {
  return res.status(501).json({ message: 'Not implemented yet.' });
}

export { ok, created, paginated, notImplemented };
