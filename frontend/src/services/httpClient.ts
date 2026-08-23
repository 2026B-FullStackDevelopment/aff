// Provides shared REST helpers so frontend services do not call fetch in every file.
import { getStoredToken, clearSession } from './authStorage';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

export interface ApiResponse<T = unknown> {
  data: T | null;
  status: number;
  headers: Headers;
  ok: boolean;
}

// Per-call opt-out: set true for requests where a 401 is a normal business
// outcome (e.g. login with a bad password) rather than "your session died."
// Decided at the call site, since that's the only place that knows why the
// request is being made.
export interface RequestOptions extends RequestInit {
  skipAuthRedirect?: boolean;
}

/**
 * Runs when the server says the current session is no longer valid.
 * Clears storage and does a hard redirect to /login rather than a
 * react-router navigate — this module sits outside the component tree
 * and has no navigate() to call. A full reload also guarantees
 * GuestRoute/ProtectedRoute re-evaluate getStoredUser() from scratch.
 */
function handleSessionExpired(): void {
  clearSession();
  if (window.location.pathname !== '/login') {
    window.location.href = '/login';
  }
}

async function request<T = unknown>(path: string, options: RequestOptions = {}): Promise<ApiResponse<T>> {
  const { skipAuthRedirect, ...init } = options;

  const headers = new Headers(init.headers);
  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const accessToken = getStoredToken();
  if (accessToken && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers,
  });

  const data = await response.json().catch(() => null);

  if (response.status === 401 && !skipAuthRedirect) {
    handleSessionExpired();
  }

  return {
    data: data?.data ?? data,
    status: response.status,
    headers: response.headers,
    ok: response.ok,
  };
}

export const httpClient = {
  get: <T = unknown>(path: string, options: RequestOptions = {}) =>
    request<T>(path, { ...options, method: 'GET' }),
  post: <T = unknown>(path: string, body: unknown, options: RequestOptions = {}) =>
    request<T>(path, { ...options, method: 'POST', body: JSON.stringify(body) }),
  put: <T = unknown>(path: string, body: unknown, options: RequestOptions = {}) =>
    request<T>(path, { ...options, method: 'PUT', body: JSON.stringify(body) }),
  patch: <T = unknown>(path: string, body: unknown, options: RequestOptions = {}) =>
    request<T>(path, { ...options, method: 'PATCH', body: JSON.stringify(body) }),
  delete: <T = unknown>(path: string, options: RequestOptions = {}) =>
    request<T>(path, { ...options, method: 'DELETE' }),
};