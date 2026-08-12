// Holds reusable auth behavior so login/register pages do not own API details.
import { authService } from '../services/auth.service';

export function useAuth() {
  async function login(credentials: unknown) {
    const response = await authService.login(credentials);

    if (response.ok && response.data?.user) {
      localStorage.setItem('aff_user', JSON.stringify(response.data.user));
      localStorage.setItem('aff_token', response.data.token);
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
      localStorage.removeItem('aff_user');
      localStorage.removeItem('aff_token');
    }
  }

  return { login, registerRecipient, registerDonor, logout };
}