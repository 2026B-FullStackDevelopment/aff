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
  notifications: {
    mine: '/notifications',
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
    mine: '/orders/mine',
    detail: (orderId: string) => 
      `/orders/${orderId}`,
    checkoutSession: (orderId: string) => 
      `/orders/${orderId}/checkout-session`,
    cancel: (orderId: string) => 
      `/orders/${orderId}`,
    feedback: (orderId: string) => 
      `/orders/${orderId}/feedback`,
  },
  recipients: {
    preferences: '/recipients/me/preferences',
    preferenceDetail: (id: string) => `/recipients/me/preferences/${id}`,
  },
  reservations: {
    mine: '/reservations/me',
    create: '/reservations',
  },
  subscriptions: {
    me: '/subscriptions/me',
    checkoutSession: '/subscriptions/checkout-session',
  },
  deliveries: {
    queue: '/deliveries/queue',
    active: '/deliveries/active',
    detail: (deliveryId: string) => `/deliveries/${deliveryId}`,
    claim: (deliveryId: string) => `/deliveries/${deliveryId}/claim`,
    pickup: (deliveryId: string) => `/deliveries/${deliveryId}/pickup`,
    deliver: (deliveryId: string) => `/deliveries/${deliveryId}/deliver`,
  },
  admin: {
    dashboard: '/admin/dashboard',
    listings: '/admin/listings',
    cancelListing: (listingId: string) =>
      `/admin/listings/${listingId}/cancel`,
    deliveries: '/admin/deliveries',
  },
};
