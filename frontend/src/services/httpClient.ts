// Provides shared REST helpers so frontend services do not call fetch in every file.
import { getStoredToken } from './authStorage';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

export interface ApiResponse<T = unknown> {
  data: T | null;
  status: number;
  headers: Headers;
  ok: boolean;
}

async function request<T = unknown>(path: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
  const headers = new Headers(options.headers);
  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const accessToken = getStoredToken();
  if (accessToken && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => null);

  return {
    data: data?.data ?? data,
    status: response.status,
    headers: response.headers,
    ok: response.ok,
  };
}

export const httpClient = {
  get: <T = unknown>(path: string, options: RequestInit = {}) =>
    request<T>(path, { ...options, method: 'GET' }),
  post: <T = unknown>(path: string, body: unknown, options: RequestInit = {}) =>
    request<T>(path, { ...options, method: 'POST', body: JSON.stringify(body) }),
  put: <T = unknown>(path: string, body: unknown, options: RequestInit = {}) =>
    request<T>(path, { ...options, method: 'PUT', body: JSON.stringify(body) }),
  patch: <T = unknown>(path: string, body: unknown, options: RequestInit = {}) =>
    request<T>(path, { ...options, method: 'PATCH', body: JSON.stringify(body) }),
  delete: <T = unknown>(path: string, options: RequestInit = {}) =>
    request<T>(path, { ...options, method: 'DELETE' }),
};
