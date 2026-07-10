// Holds reusable auth behavior so login/register pages do not own API details.
import { authService } from '../services/auth.service.js';

export function useAuth() {
  async function login(credentials) {
    const response = await authService.login(credentials);

    if (response.ok && response.data?.user) {
      localStorage.setItem('aff_user', JSON.stringify(response.data.user));
      localStorage.setItem('aff_token', response.data.accessToken);
    }

    return response;
  }

  async function register(payload) {
    return authService.register(payload);
  }

  return { login, register };
}
