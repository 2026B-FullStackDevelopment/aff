// Maps each authenticated role to its default home route.
export const ROLE_HOME: Record<string, string> = {
  RECIPIENT: '/marketplace',
  DONOR: '/donor/donations',
  ADMIN: '/admin/user-directory',
  COURIER: '/deliveries/queue',
};