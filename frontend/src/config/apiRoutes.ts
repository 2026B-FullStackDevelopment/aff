// Stores backend API paths in one place, grouped by AFF business domain.
export const API_ROUTES = {
  auth: {
    registerRecipient: '/auth/register/recipient',
    registerDonor: '/auth/register/donor',
    login: '/auth/login',
    logout: '/auth/logout'
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
