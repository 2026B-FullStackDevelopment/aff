// Stores backend API paths in one place, grouped by AFF business domain.
export const API_ROUTES = {
  auth: {
    register: '/auth/register',
    login: '/auth/login',
  },
  users: {
    me: '/users/me',
  },
  food: {
    list: '/food',
    create: '/food',
  },
  reservations: {
    mine: '/reservations/me',
    create: '/reservations',
  },
  subscriptions: {
    premium: '/subscriptions/premium',
  },
  admin: {
    dashboard: '/admin/dashboard',
  },
};
