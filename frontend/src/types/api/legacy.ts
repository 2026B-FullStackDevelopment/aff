// ---------------------------------------------------------------------
// LEGACY TYPES — kept for backward compatibility only.
// These predate api_design.md and do NOT match it (different status
// enums, different field names, no `paymentMethod`, etc.). They're left
// in place because FoodListingsPage, MyReservationsPage, SubscriptionPage,
// and AdminDashboardPage were not available to check for consumers of
// these exact shapes. Prefer ListingDTO / OrderDTO / SubscriptionDTO
// from their respective domain files for any new or updated code, and
// migrate these pages off the legacy types below when you touch them.
// ---------------------------------------------------------------------

export interface FoodListing {
  id: string;
  title: string;
  description?: string;
  price: number;
  status: 'AVAILABLE' | 'RESERVED' | 'COLLECTED' | 'EXPIRED';
  pickupLocation?: string;
  imageUrl?: string;
}

export interface Reservation {
  id: string;
  foodListingId: string;
  recipientId: string;
  status: 'RESERVED' | 'COLLECTED' | 'CANCELLED';
}

export interface Subscription {
  id: string;
  userId: string;
  plan: string;
  status: string;
}

export interface AdminDashboard {
  userCount: number;
  foodListingCount: number;
  reservationCount: number;
  note: string;
}
