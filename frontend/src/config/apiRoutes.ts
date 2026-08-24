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
    create: '/listings',
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