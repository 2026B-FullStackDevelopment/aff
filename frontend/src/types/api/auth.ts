// Auth request/response shapes.
// Corresponds to API Design §4 (Auth Module).

import type { AnyUserDTO } from './users';

export interface RegisterRecipientPayload {
  username: string;
  email: string;
  password: string;
  city: string;
}

export interface RegisterDonorPayload {
  companyName: string;
  email: string;
  password: string;
  taxCode: string;
  city: string;
  addressText: string;
  location: { latitude: number; longitude: number };
}

export interface LoginPayload {
  email: string;
  password: string;
}

// Response body for register/recipient, register/donor, and login is `{ user, token }`.
export interface AuthSession {
  user: AnyUserDTO;
  token: string;
}
