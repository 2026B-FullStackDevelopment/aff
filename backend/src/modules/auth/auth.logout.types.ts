// Defines the internal input used by the logout service.
interface LogoutInput { userId: string; jti: string; expiresAt: Date }

export type { LogoutInput };
