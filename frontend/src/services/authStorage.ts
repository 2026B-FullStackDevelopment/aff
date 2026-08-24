// Single source of truth for auth session reads/writes.
// All route guards and the useAuth hook import from here — never touch
// localStorage directly — so JSON.parse is guarded in exactly one place.
import type { AnyUserDTO } from '../types/api';

const USER_KEY = 'aff_user';
const TOKEN_KEY = 'aff_token';

/** Decodes a JWT's payload and checks `exp` against the current time. */
function isTokenExpired(token: string): boolean {
  try {
    const payload = token.split('.')[1];
    const decoded = JSON.parse(
      atob(payload.replace(/-/g, '+').replace(/_/g, '/'))
    );
    if (typeof decoded.exp !== 'number') return false; // no exp claim → don't force-expire
    return Date.now() >= decoded.exp * 1000;
  } catch {
    return true; // malformed/unreadable token → treat as invalid
  }
}

/** Returns the stored user, or null if absent, corrupt, or the token has expired. */
export function getStoredUser(): AnyUserDTO | null {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token && isTokenExpired(token)) {
    clearSession();
    return null;
  }

  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as AnyUserDTO) : null;
  } catch {
    localStorage.removeItem(USER_KEY);
    return null;
  }
}

/** Returns the stored JWT, or null if absent or expired. */
export function getStoredToken(): string | null {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token && isTokenExpired(token)) {
    clearSession();
    return null;
  }
  return token;
}

/** Persists both halves of a successful auth session. */
export function storeSession(user: AnyUserDTO, token: string): void {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  localStorage.setItem(TOKEN_KEY, token);
}

/** Removes both halves of the session (logout / token eviction). */
export function clearSession(): void {
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(TOKEN_KEY);
}

/**
 * Overwrites only the stored user object (token is left unchanged).
 * Call this after a successful PATCH /users/me so any component reading
 * getStoredUser() (nav, guards) sees the new username/avatar immediately.
 */
export function updateStoredUser(user: AnyUserDTO): void {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

