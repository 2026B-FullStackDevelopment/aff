// Central mapping from a user's role to their home route after auth
export const ROLE_HOME: Record<string, string> = {
  RECIPIENT: '/marketplace',
  DONOR: '/listing/create',
  ADMIN: '/admin/user-directory',
};