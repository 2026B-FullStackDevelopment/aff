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
  // Only present on the 409 from submitFeedback when feedback was already submitted (D7).
  feedback?: {
    comment: string;
    createdAt: string;
  };
}

export type { SuccessResponse, PaginatedData, PaginatedResponse, ErrorResponse };
