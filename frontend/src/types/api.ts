export type UserRole = 'RECIPIENT' | 'DONOR' | 'ADMIN';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  isPremium?: boolean;
}

export interface AuthSession {
  accessToken: string;
  user: User;
}

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
