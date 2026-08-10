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
}

export type { SuccessResponse, PaginatedData, PaginatedResponse, ErrorResponse };
