export type UserRole = 'RECIPIENT' | 'DONOR' | 'ADMIN' | 'COURIER';

export interface GeoLocation {
  latitude: number;
  longitude: number;
  updatedAt: string; // ISO 8601
}

export type FoodCategory =
  | 'FRUIT'
  | 'VEGETABLE'
  | 'MEAT'
  | 'COOKED_DISH'
  | 'BAKED_GOODS'
  | 'DRINK';

export interface NotificationPreference {
  id: string;
  preferenceTitle: string;
  categories: FoodCategory[];
  vegetarian: boolean | null;
  priceMin: number | null;
  priceMax: number | null;
  city: string | null;
}

// --- Users ---

export interface UserDTO {
  id: string;
  role: UserRole;
  username: string;
  email: string;
  country: string;
  city: string;
  status: 'ACTIVE' | 'DEACTIVATED';
  avatarUrl: string | null;
  createdAt: string;
}

export interface RecipientDTO extends UserDTO {
  role: 'RECIPIENT';
  tier: 'STANDARD' | 'PREMIUM';
  notificationPreferences: NotificationPreference[];
  hasStripeCard: boolean;
}

export interface DonorDTO extends UserDTO {
  role: 'DONOR';
  companyName: string;
  taxCode: string;
  addressText: string;
  location: GeoLocation;
}

export interface CourierDTO extends UserDTO {
  role: 'COURIER';
  fullName: string;
}

export interface AdminUserDTO extends UserDTO {
  role: 'ADMIN';
}

export type AnyUserDTO = RecipientDTO | DonorDTO | CourierDTO | AdminUserDTO;

// --- Media upload (api_design.md §5A) ---

export type UploadMediaPurpose = 'AVATAR' | 'LISTING_IMAGE';

export interface UploadUrlResponseDto {
  uploadUrl: string;
  path: string;
  token: string;
  mediaUrl: string;
  expiresIn: number;
}

// --- Profile update payload ---

export interface UpdateProfilePayload {
  username?: string;
  city?: string;
  country?: string;
  avatarUrl?: string | null;
  /** Donor only */
  companyName?: string;
  addressText?: string;
  location?: { latitude: number; longitude: number };
}

export interface UpdateEmailPayload {
  newEmail: string;
}

export interface UpdatePasswordPayload {
  newPassword: string;
}

// --- Auth request/response shapes ---

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

// Response body for register/recipient, register/donor, and login is
// `{ user, token }`
export interface AuthSession {
  user: AnyUserDTO;
  token: string;
}

// --- Listings ---

export type ListingUnit =
  | 'KILOGRAM'
  | 'GRAM'
  | 'LITER'
  | 'MILLILITER'
  | 'UNIT'
  | 'PER_REQUEST';

export type ListingStatus = 'ACTIVE' | 'PAUSED' | 'CANCELLED' | 'SOLD_OUT';

export interface ListingDTO {
  id: string;
  donor: {
    id: string;
    companyName: string;
    city: string;
    location: GeoLocation;
  };
  name: string;
  description: string | null;
  imageUrl: string | null;
  unit: ListingUnit;
  category: FoodCategory;
  isVegetarian: boolean;
  price: number;
  city: string;
  status: ListingStatus;
  donationLimit: number;
  rationLimitPerPerson: number | null;
  quantityRemaining: number;
  createdAt: string;
}

export interface ListingDetailDTO extends Omit<ListingDTO, 'donor'> {
  donor: {
    id: string;
    companyName: string;
    addressText: string;
    location: GeoLocation;
  };
}

// --- Orders ---

export type OrderIntakePath =
  | 'RESERVATION'
  | 'DONOR_INITIATED';

export type PaymentMethod =
  | 'STRIPE'
  | 'CASH';

export type PaymentStatus =
  | 'FREE'
  | 'PAYMENT_PENDING'
  | 'PAID'
  | 'REFUND_PENDING'
  | 'REFUNDED';

export type OrderStatus =
  | 'PENDING_PAYMENT'
  | 'PREPARING'
  | 'DELIVERED'
  | 'CANCELLED';

export interface OrderDTO {
  id: string;
  recipientId: string;
  listing: {
    id: string;
    name?: string;
    imageUrl?: string | null;
    unit?: ListingUnit;
    category?: FoodCategory;
  };
  intakePath: OrderIntakePath;
  quantity: number;
  amount: number;
  paymentMethod?: PaymentMethod;
  paymentStatus: PaymentStatus;
  orderStatus: OrderStatus;
  delivery: { stage: DeliveryStage } | null;
  deliveryAddressText: string;
  deliveryLocation: GeoLocation;
  cancelledByUserId: string | null;
  feedback: {
    comment: string;
    createdAt: string;
  } | null;
  createdAt: string;
}

export interface RecipientOrderDTO extends OrderDTO {
  donor: {
    id: string;
    companyName: string;
  };
}

export interface SubmitFeedbackResponseDto {
  feedback: {
    comment: string;
    createdAt: string;
  };
}

export type RefundStatus = 'NOT_APPLICABLE' | 'REFUND_PENDING' | 'FAILED';
export type CancelOrderResponseDto = OrderDTO & { refundStatus: RefundStatus };

export interface ReserveListingPayload {
  quantity: number;
  deliveryAddressText: string;
  deliveryLocation: { latitude: number; longitude: number };
  /** Required when listing.price > 0; must be omitted for a free listing. */
  paymentMethod?: PaymentMethod;
}

export interface CheckoutSessionResponseDto {
  checkoutUrl: string;
}

// --- Delivery ---

export type DeliveryStage =
  | 'AWAITING_COURIER'
  | 'ASSIGNED'
  | 'PICKED_UP'
  | 'DELIVERED'
  | 'CANCELLED';

export interface DeliveryDTO {
  id: string;
  orderId: string;
  courierId: string | null;
  stage: DeliveryStage;
  pickupAddressText: string;
  pickupAddressLocation: GeoLocation;
  pickedUpAt: string | null;
  deliveredAt: string | null;
  courierLastLocation: GeoLocation | null;
  createdAt: string;
}

// --- Subscriptions (api_design.md §3, §10) ---

export interface SubscriptionDTO {
  id: string;
  status: 'ACTIVE' | 'PAST_DUE' | 'CANCELLED';
  currentPeriodEnd: string;
  createdAt: string;
}

// --- Shared envelopes (api_design.md §2.2-2.4) ---

export interface ApiErrorBody {
  message: string;
}

export interface PaginatedData<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
}

// ---------------------------------------------------------------------
// LEGACY TYPES — kept for backward compatibility only.
// These predate api_design.md and do NOT match it (different status
// enums, different field names, no `paymentMethod`, etc.). They're left
// in place because FoodListingsPage, MyReservationsPage, SubscriptionPage,
// and AdminDashboardPage were not available to check for consumers of
// these exact shapes. Prefer ListingDTO / OrderDTO / SubscriptionDTO
// above for any new or updated code, and migrate these pages off the
// legacy types below when you touch them.
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
