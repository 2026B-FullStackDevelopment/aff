interface SuccessResponse<T> {
  data: T;
}

interface PaginatedData<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
}

interface PaginatedResponse<T> {
  data: PaginatedData<T>;
}

interface ErrorResponse {
  message: string;
  // Only present on the 429 from login (docs/api_design.md §4).
  lockedUntilSeconds?: number;
}

export type { SuccessResponse, PaginatedData, PaginatedResponse, ErrorResponse };
