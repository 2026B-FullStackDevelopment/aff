// Shared primitive types used across all API domains.

export interface GeoLocation {
  latitude: number;
  longitude: number;
  updatedAt: string; // ISO 8601
}

export interface ApiErrorBody {
  message: string;
}

export interface PaginatedData<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
}
