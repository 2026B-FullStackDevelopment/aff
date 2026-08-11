// Contains the logout business rules, revoking the presented token server-side.

interface LogoutInput {
  userId: string;
  jti: string;
  expiresAt: Date;
}

async function logout(_input: LogoutInput): Promise<void> {
  throw new Error('logout is not implemented yet.');
}

export { logout };
export type { LogoutInput };
