// Stores backend API paths in one place, grouped by AFF business domain.
export const API_ROUTES = {
  auth: {
    registerRecipient: '/auth/register/recipient',
    registerDonor: '/auth/register/donor',
    login: '/auth/login',
    logout: '/auth/logout',
  },
  users: {
    me: '/users/me',
    meEmail: '/users/me/email',
    mePassword: '/users/me/password',
    recipientSearch: '/users/recipients/search',
  },
  media: {
    uploadUrl: '/media/upload-url',
  },
  listings: {
    create: '/listings',          // POST — donor creates a listing
    available: '/listings',       // GET  — public browse
    mine: '/listings/mine',
    detail: (listingId: string) =>
      `/listings/${listingId}`,
    clone: (listingId: string) =>
      `/listings/${listingId}/clone`,
    status: (listingId: string) =>
      `/listings/${listingId}/status`,
    orders: (listingId: string) =>
      `/listings/${listingId}/orders`,
    donations: (listingId: string) =>
      `/listings/${listingId}/donations`,
    reserve: (listingId: string) =>
      `/listings/${listingId}/reserve`,
  },
  orders: {
    checkoutSession: (orderId: string) =>
      `/orders/${orderId}/checkout-session`,
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
    me: '/subscriptions/me',
    checkoutSession: '/subscriptions/checkout-session',
  },
  admin: {
    dashboard: '/admin/dashboard',
  },
};