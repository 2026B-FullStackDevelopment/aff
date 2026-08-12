// Holds reusable auth behavior so login/register pages do not own API details.
import { authService } from '../services/auth.service';
import { storeSession, clearSession } from '../../../services/authStorage';

export function useAuth() {
  async function login(credentials: unknown) {
    const response = await authService.login(credentials);

    if (response.ok && response.data?.user && response.data?.token) {
      storeSession(response.data.user, response.data.token);
    }

    return response;
  }

  async function registerRecipient(payload: unknown) {
    return authService.registerRecipient(payload);
  }

  async function registerDonor(payload: unknown) {
    return authService.registerDonor(payload);
  }

  async function logout() {
    try {
      await authService.logout();
    } finally {
      clearSession();
    }
  }

  return { login, registerRecipient, registerDonor, logout };
}