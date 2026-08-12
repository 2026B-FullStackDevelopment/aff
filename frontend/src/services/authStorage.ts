// Single source of truth for auth session reads/writes.
// All route guards and the useAuth hook import from here — never touch
// localStorage directly — so JSON.parse is guarded in exactly one place.
import type { AnyUserDTO } from '../types/api';

const USER_KEY = 'aff_user';
const TOKEN_KEY = 'aff_token';

/** Returns the stored user, or null if absent or the stored value is corrupt. */
export function getStoredUser(): AnyUserDTO | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as AnyUserDTO) : null;
  } catch {
    // Corrupt / tampered value — evict it so the app doesn't stay broken.
    localStorage.removeItem(USER_KEY);
    return null;
  }
}

/** Returns the stored JWT, or null if absent. */
export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
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
