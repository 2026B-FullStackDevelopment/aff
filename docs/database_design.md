# AFF Data Model Reference

MongoDB collections, fields, keys, and relationship cardinality derived from the AFF ERD.

---

## 1. Collections Overview

| Collection | Purpose |
|---|---|
| USER | Base account shared by all roles (Recipient, Donor, Admin, Courier) |
| DONOR | Role-specific profile for a User who donates/sells food |
| RECIPIENT | Role-specific profile for a User who collects food |
| COURIER | Role-specific profile for a User who delivers orders |
| REVOKED_TOKEN | Denylist of revoked JWTs (TTL-indexed) |
| SUBSCRIPTION | Append-only ledger of a Recipient's Premium billing cycles |
| LISTING | A food donation/sale posted by a Donor |
| ORDER | A Recipient's reservation/purchase of a Listing |
| NOTIFICATION | In-app notification sent to a User |
| DELIVERY | Courier fulfillment record for an Order |
| PAYMENT | Polymorphic transaction ledger for Orders and Subscriptions |

---

## 2. Collection Details

### USER

| Field | Type | Key | Description |
|---|---|---|---|
| _id | ObjectId | PK | |
| role | Role (enum) | | RECIPIENT, DONOR, ADMIN, COURIER |
| username | string | | |
| email | string | UK | Unique across all users |
| country | string | | |
| city | string | | |
| passwordHash | string | | Hashed, never encrypted |
| status | AccountStatus (enum) | | ACTIVE, DEACTIVATED |
| avatarUrl | string | | |
| failedLoginCount | number | | Brute-force lockout tracking |
| windowStartedAt | datetime | | Start of the failed-attempt window |
| lockedUntil | datetime | | Lockout expiry |
| createdAt | datetime | | |

### DONOR

| Field | Type | Key | Description |
|---|---|---|---|
| userId | ObjectId | PK, FK → USER._id | Subtype of USER |
| companyName | string | | |
| taxCode | string | | |
| addressText | string | | |
| location | GeoLocation | | Embedded value object |

### RECIPIENT

| Field | Type | Key | Description |
|---|---|---|---|
| userId | ObjectId | PK, FK → USER._id | Subtype of USER |
| tier | Tier (enum) | | STANDARD, PREMIUM |
| notificationPreferences | List\<NotificationPreference\> | | Embedded value objects |
| stripeCustomerId | string | | |

### COURIER

| Field | Type | Key | Description |
|---|---|---|---|
| userId | ObjectId | PK, FK → USER._id | Subtype of USER |
| fullName | string | | |

### REVOKED_TOKEN

| Field | Type | Key | Description |
|---|---|---|---|
| _id | ObjectId | PK | |
| jti | string | UK | JWT ID being revoked |
| userId | ObjectId | FK → USER._id | |
| reason | RevokeReason (enum) | | LOGOUT, ADMIN_DEACTIVATE, PASSWORD_CHANGE |
| revokedAt | datetime | | |
| expiresAt | datetime | | TTL index; document auto-purged after this time |

### SUBSCRIPTION

| Field | Type | Key | Description |
|---|---|---|---|
| _id | ObjectId | PK | |
| recipientId | ObjectId | FK → RECIPIENT.userId | |
| stripeSubscriptionId | string | | |
| status | SubscriptionStatus (enum) | | ACTIVE, PAST_DUE, CANCELLED |
| currentPeriodEnd | datetime | | |
| createdAt | datetime | | Append-only: new row per billing cycle |

### LISTING

| Field | Type | Key | Description |
|---|---|---|---|
| _id | ObjectId | PK | |
| donorId | ObjectId | FK → DONOR.userId | |
| name | string | | |
| description | string | | Optional |
| imageUrl | string | | |
| unit | MeasurementUnit (enum) | | KILOGRAM, GRAM, LITER, MILLILITER, UNIT, PER_REQUEST |
| category | FoodCategory (enum) | | FRUIT, VEGETABLE, MEAT, COOKED_DISH, BAKED_GOODS, DRINK |
| isVegetarian | boolean | | |
| price | number | | Free or > 1000 VND |
| city | string | | |
| status | ListingStatus (enum) | | ACTIVE, PAUSED, CANCELLED, SOLD_OUT |
| donationLimit | number | | Total quantity offered |
| rationLimitPerPerson | number | | Max quantity a single recipient can reserve |
| quantityRemaining | number | | |
| createdAt | datetime | | |
| updatedAt | datetime | | |
| closedAt | datetime | | |

### ORDER

| Field | Type | Key | Description |
|---|---|---|---|
| _id | ObjectId | PK | |
| recipientId | ObjectId | FK → RECIPIENT.userId | |
| listingId | ObjectId | FK → LISTING._id | |
| intakePath | IntakePath (enum) | | RESERVATION, DONOR_INITIATED |
| quantity | number | | |
| amount | number | | |
| paymentMethod | PaymentMethod (enum) | | STRIPE, CASH; absent/null when `amount` is 0 (free order) |
| paymentStatus | PaymentStatus (enum) | | FREE, PAYMENT_PENDING, PAID, REFUND_PENDING, REFUNDED. `REFUND_PENDING` is set synchronously when a Stripe-paid order is cancelled before Courier claim (D4); `REFUNDED` only after the `charge.refunded` webhook confirms it (`docs/api_design.md` §8) |
| orderStatus | OrderStatus (enum) | | PENDING_PAYMENT, PREPARING, DELIVERED, CANCELLED. Coarse/payment-oriented only — granular delivery progress (claimed, picked up) lives on `DELIVERY.stage`, not here; see `docs/api_design.md` §9 |
| deliveryAddressText | string | | |
| deliveryLocation | GeoLocation | | Embedded value object |
| cancelledByUserId | ObjectId | FK → USER._id | Nullable; captures who cancelled (incl. admin) |
| feedback | Feedback | | Embedded value object, optional |
| createdAt | datetime | | |
| cancelledAt | datetime | | |

### NOTIFICATION

| Field | Type | Key | Description |
|---|---|---|---|
| _id | ObjectId | PK | |
| userId | ObjectId | FK → USER._id | Recipient of the notification |
| type | NotificationType (enum) | | SOLD_OUT, PREMIUM_MATCH, ADMIN_CANCEL, PAYMENT_SUCCESS, PAYMENT_REQUESTED, DELIVERY_STATUS |
| message | string | | |
| orderId | ObjectId | FK → ORDER._id | Optional cross-reference |
| listingId | ObjectId | FK → LISTING._id | Optional cross-reference |
| createdAt | datetime | | |

### DELIVERY

| Field | Type | Key | Description |
|---|---|---|---|
| _id | ObjectId | PK | |
| orderId | ObjectId | FK → ORDER._id | |
| courierId | ObjectId | FK → COURIER.userId | |
| stage | DeliveryStage (enum) | | AWAITING_COURIER, ASSIGNED, PICKED_UP, DELIVERED, CANCELLLED |
| pickedUpAt | datetime | | |
| deliveredAt | datetime | | |
| courierLastLocation | GeoLocation | | Embedded value object |
| createdAt | datetime | | |
| cancelledAt | datetime | | |

### PAYMENT

| Field | Type | Key | Description |
|---|---|---|---|
| _id | ObjectId | PK | |
| payableType | PayableType (enum) | | ORDER, SUBSCRIPTIONS |
| payableId | ObjectId | Polymorphic FK → ORDER._id or SUBSCRIPTION._id | Resolved using payableType |
| stripeSessionId | string | | |
| stripeInvoiceId | string | | Conditional on Stripe webhook flow |
| stripePaymentIntentId | string | | Captured from the `checkout.session.completed` webhook payload; what a later refund is issued against (Stripe refunds a PaymentIntent, not a Checkout Session) |
| stripeRefundId | string | | Captured from the synchronous `stripe.refunds.create()` response at cancellation time; what the `charge.refunded` webhook is matched against to confirm the refund |
| amount | number | | |
| currency | string | | |
| status | TransactionStatus (enum) | | PENDING, PAID, FAILED, EXPIRED, CANCELLED, REFUND_PENDING, REFUNDED |
| paidAt | datetime | | |
| refundedAt | datetime | | Set when the `charge.refunded` webhook confirms the refund, mirroring `paidAt` |
| lastProcessedEventId | string | | Guards against duplicate Stripe webhook delivery |
| createdAt | datetime | | |

---

## 3. Embedded Value Objects

| Value Object | Field | Type | Embedded In |
|---|---|---|---|
| GeoLocation | latitude | number | DONOR.location, ORDER.deliveryLocation, DELIVERY.courierLastLocation |
| GeoLocation | longitude | number | |
| GeoLocation | updatedAt | datetime | |
| NotificationPreference | preferenceTitle | string | RECIPIENT.notificationPreferences (list) |
| NotificationPreference | categories | List\<FoodCategory\> | |
| NotificationPreference | vegetarian | boolean | |
| NotificationPreference | priceMin | number | |
| NotificationPreference | priceMax | number | |
| NotificationPreference | city | string | |
| Feedback | comment | string | ORDER.feedback |
| Feedback | createdAt | datetime | |

---

## 4. Relationships & Cardinality

| Parent | Child | Cardinality | FK Field | Relationship |
|---|---|---|---|---|
| USER | DONOR | 1 : 1 | DONOR.userId | is a (subtype) |
| USER | RECIPIENT | 1 : 1 | RECIPIENT.userId | is a (subtype) |
| USER | COURIER | 1 : 1 | COURIER.userId | is a (subtype) |
| USER | REVOKED_TOKEN | 1 : N | REVOKED_TOKEN.userId | revokes access |
| USER | NOTIFICATION | 1 : N | NOTIFICATION.userId | receives |
| USER | ORDER | 0..1 : N | ORDER.cancelledByUserId | cancelled by (optional) |
| DONOR | LISTING | 1 : N | LISTING.donorId | creates |
| RECIPIENT | SUBSCRIPTION | 1 : N | SUBSCRIPTION.recipientId | subscribes |
| RECIPIENT | ORDER | 1 : N | ORDER.recipientId | places |
| LISTING | ORDER | 1 : N | ORDER.listingId | is ordered as |
| LISTING | NOTIFICATION | 1 : N (opt.) | NOTIFICATION.listingId | referenced by |
| ORDER | NOTIFICATION | 1 : N (opt.) | NOTIFICATION.orderId | referenced by |
| ORDER | DELIVERY | 1 : 0..1 | DELIVERY.orderId | fulfilled by |
| COURIER | DELIVERY | 1 : N | DELIVERY.courierId | claims (1 active at a time — business rule, not schema-enforced) |
| ORDER | PAYMENT | 1 : N (polymorphic) | PAYMENT.payableId, where payableType = ORDER | paid via |
| SUBSCRIPTION | PAYMENT | 1 : N (polymorphic) | PAYMENT.payableId, where payableType = SUBSCRIPTIONS | paid via |

---

## 5. Enumerations

| Enum | Values |
|---|---|
| Role | RECIPIENT, DONOR, ADMIN, COURIER |
| AccountStatus | ACTIVE, DEACTIVATED |
| RevokeReason | LOGOUT, ADMIN_DEACTIVATE, PASSWORD_CHANGE |
| SubscriptionStatus | ACTIVE, PAST_DUE, CANCELLED |
| Tier | STANDARD, PREMIUM |
| MeasurementUnit | KILOGRAM, GRAM, LITER, MILLILITER, UNIT, PER_REQUEST |
| FoodCategory | FRUIT, VEGETABLE, MEAT, COOKED_DISH, BAKED_GOODS, DRINK |
| ListingStatus | ACTIVE, PAUSED, CANCELLED, SOLD_OUT |
| NotificationType | SOLD_OUT, PREMIUM_MATCH, ADMIN_CANCEL, PAYMENT_SUCCESS, PAYMENT_REQUESTED, DELIVERY_STATUS |
| IntakePath | RESERVATION, DONOR_INITIATED |
| PaymentMethod | STRIPE, CASH |
| PaymentStatus | FREE, PAYMENT_PENDING, PAID, REFUND_PENDING, REFUNDED |
| OrderStatus | PENDING_PAYMENT, PREPARING, DELIVERED, CANCELLED |
| DeliveryStage | AWAITING_COURIER, ASSIGNED, PICKED_UP, DELIVERED, CANCELLED |
| PayableType | ORDER, SUBSCRIPTIONS |
| TransactionStatus | PENDING, PAID, FAILED, EXPIRED, CANCELLED, REFUND_PENDING, REFUNDED |
