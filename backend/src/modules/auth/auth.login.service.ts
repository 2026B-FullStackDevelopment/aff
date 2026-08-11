// Contains the login business rules, including brute-force lockout.
import type { AuthSession } from './auth.token.service.js';
import type { LoginRequestDto } from './auth.dto.js';

async function login(_payload: LoginRequestDto): Promise<AuthSession> {
  throw new Error('login is not implemented yet.');
}

export { login };
