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
| NOTIFICATION_PREFERENCE | A Premium Recipient's saved alert criteria for new listings |
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
| tier | Tier (enum) | | STANDARD, PREMIUM. Default `STANDARD` (schema-level). **Denormalized cache, not authoritative** — the real tier is derived per request from the SUBSCRIPTION ledger (`ACTIVE` + `currentPeriodEnd > now`) in `subscription.service.ts#getMySubscriptionStatus`. This column is kept in sync by the subscription webhooks (`invoice.paid` → PREMIUM; `invoice.payment_failed` / `customer.subscription.deleted` → STANDARD) plus read-repair on `GET /subscriptions/me`, so it is safe to *inspect*, but no application read path consults it |
| stripeCustomerId | string | | |

### NOTIFICATION_PREFERENCE

| Field | Type | Key | Description |
|---|---|---|---|
| _id | ObjectId | PK | |
| recipientId | ObjectId | FK → RECIPIENT.userId | |
| preferenceTitle | string | | |
| categories | List\<FoodCategory\> | | |
| vegetarian | boolean | | Nullable — null means "no constraint on that dimension" |
| priceMin | number | | Nullable |
| priceMax | number | | Nullable |
| city | string | | Nullable |
| isActive | boolean | | Default true; false pauses matching without deleting the row |
| createdAt | datetime | | |
| updatedAt | datetime | | |

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
| cancelAtPeriodEnd | boolean | | Default `false`. Set by `PATCH /subscriptions/me` (F5) — `true` cancels, `false` resumes. While `true`, the subscription stays `ACTIVE` and tier stays `PREMIUM` until `currentPeriodEnd`, then `customer.subscription.deleted` flips `status` to `CANCELLED` (`docs/api_design.md` §8, §10) |
| stripeInvoiceId | string | Unique, sparse | Idempotency key for the `invoice.paid` webhook (F1) — set on the row created for that invoice, so a re-delivered event is recognized and appends nothing a second time. Conditional on Stripe webhook flow, mirroring `PAYMENT.stripeInvoiceId` |
| createdAt | datetime | | Append-only: new row per billing cycle, except `status` and `cancelAtPeriodEnd`, which are mutated in place on the latest row |

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
| price | number | | Free or >= 15000 VND |
| city | string | | |
| status | ListingStatus (enum) | | ACTIVE, PAUSED, CANCELLED, SOLD_OUT |
| donationLimit | integer | | Required positive whole-number total quantity offered |
| rationLimitPerPerson | integer | | Optional positive whole-number cap per Recipient; null/absent means no ration cap |
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
| paymentStatus | PaymentStatus (enum) | | FREE, PAYMENT_PENDING, PAID, REFUND_PENDING, REFUNDED. `REFUND_PENDING` is set synchronously when a Stripe-paid order is cancelled before Courier claim (D4); `REFUNDED` only after the `refund.updated` webhook confirms it (`docs/api_design.md` §8) |
| orderStatus | OrderStatus (enum) | | PENDING_PAYMENT, PREPARING, DELIVERED, CANCELLED. Coarse/payment-oriented only — granular delivery progress (claimed, picked up) lives on `DELIVERY.stage`, not here; see `docs/api_design.md` §9 |
| deliveryAddressText | string | | Required for `RESERVATION`; absent for an in-person `DONOR_INITIATED` Order |
| deliveryLocation | GeoLocation | | Embedded value object; required for `RESERVATION`, absent for `DONOR_INITIATED` |
| cancelledByUserId | ObjectId | FK → USER._id | Nullable; captures who cancelled (incl. admin) |
| cashConfirmedByCourierId | ObjectId | FK → COURIER.userId | Set only when a Courier completes a cash Order and confirms receipt |
| cashConfirmedAt | datetime | | Timestamp of the Courier's cash-receipt confirmation |
| feedback | Feedback | | Embedded value object, optional |
| createdAt | datetime | | |
| cancelledAt | datetime | | |

### NOTIFICATION

| Field | Type | Key | Description |
|---|---|---|---|
| _id | ObjectId | PK | |
| userId | ObjectId | FK → USER._id | Recipient of the notification |
| type | NotificationType (enum) | | SOLD_OUT, PREMIUM_MATCH, ADMIN_CANCEL, PAYMENT_SUCCESS, DELIVERY_STATUS |
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
| stripeRefundId | string | | Captured from the synchronous `stripe.refunds.create()` response at cancellation time; what the `refund.updated` webhook is matched against to confirm the refund |
| amount | number | | |
| currency | string | | |
| status | TransactionStatus (enum) | | PENDING, PAID, FAILED, EXPIRED, CANCELLED, REFUND_PENDING, REFUNDED |
| paidAt | datetime | | |
| refundedAt | datetime | | Set when the `refund.updated` webhook confirms the refund, mirroring `paidAt` |
| lastProcessedEventId | string | | Guards against duplicate Stripe webhook delivery |
| createdAt | datetime | | |

---

## 3. Embedded Value Objects

| Value Object | Field | Type | Embedded In |
|---|---|---|---|
| GeoLocation | latitude | number | DONOR.location, RESERVATION-type ORDER.deliveryLocation, DELIVERY.courierLastLocation |
| GeoLocation | longitude | number | |
| GeoLocation | updatedAt | datetime | |
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
| RECIPIENT | NOTIFICATION_PREFERENCE | 1 : N | NOTIFICATION_PREFERENCE.recipientId | saves |
| RECIPIENT | ORDER | 1 : N | ORDER.recipientId | places |
| LISTING | ORDER | 1 : N | ORDER.listingId | is ordered as |
| LISTING | NOTIFICATION | 1 : N (opt.) | NOTIFICATION.listingId | referenced by |
| ORDER | NOTIFICATION | 1 : N (opt.) | NOTIFICATION.orderId | referenced by |
| ORDER | DELIVERY | 1 : 0..1 | DELIVERY.orderId | Reservation fulfilled by; Donor-initiated manual Orders always have zero Deliveries |
| COURIER | DELIVERY | 1 : N | DELIVERY.courierId | claims (1 active at a time — business rule, not schema-enforced) |
| ORDER | PAYMENT | 1 : N (polymorphic) | PAYMENT.payableId, where payableType = ORDER | Stripe Reservation paid via; free, cash, and manual Orders have no PAYMENT row |
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
| NotificationType | SOLD_OUT, PREMIUM_MATCH, ADMIN_CANCEL, PAYMENT_SUCCESS, DELIVERY_STATUS |
| IntakePath | RESERVATION, DONOR_INITIATED |
| PaymentMethod | STRIPE, CASH |
| PaymentStatus | FREE, PAYMENT_PENDING, PAID, REFUND_PENDING, REFUNDED |
| OrderStatus | PENDING_PAYMENT, PREPARING, DELIVERED, CANCELLED |
| DeliveryStage | AWAITING_COURIER, ASSIGNED, PICKED_UP, DELIVERED, CANCELLED |
| PayableType | ORDER, SUBSCRIPTIONS |
| TransactionStatus | PENDING, PAID, FAILED, EXPIRED, CANCELLED, REFUND_PENDING, REFUNDED |

---

## 6. Indexes

Several guarantees in this system are enforced by MongoDB indexes rather than
by application code. The services rely on this: they catch duplicate-key
errors (`11000`) and translate them into `409` responses instead of doing a
read-then-write check, which would reopen the race the index exists to close.

| Collection | Index | Guarantee |
|---|---|---|
| DELIVERY | `{ courierId }` unique, partial on `stage ∈ {ASSIGNED, PICKED_UP}` | A Courier holds at most one active Delivery (E3/E4) |
| DELIVERY | `{ orderId }` unique | One Delivery per Order — makes `DeliveryService.createForOrder` idempotent against the Stripe webhook's at-least-once delivery (E12) |
| DELIVERY | `{ stage, createdAt }` | Serves the oldest-first Courier queue read (E2) |
| USER | `{ email }` unique | One account per email; the real guard behind registration's `409` |
| DONOR / RECIPIENT / COURIER | `{ userId }` unique | One profile row per User |
| NOTIFICATION_PREFERENCE | `{ recipientId }` | Supports "list my preferences" and F3's future per-recipient matching scan |
| REVOKED_TOKEN | `{ jti }` unique | One revocation row per token |
| REVOKED_TOKEN | `{ expiresAt }` TTL (`expires: 0`) | Revoked tokens are removed once expired, so the collection does not grow without bound |

The partial index on `DELIVERY.courierId` requires **MongoDB 6.1 or newer** —
`partialFilterExpression` did not accept `$in` before that version.

### How indexes reach an environment

`connectDatabase()` calls `syncIndexes()` immediately after connecting, in
**every** environment. Mongoose's own `autoIndex` option is disabled, so index
creation is one explicit, logged step rather than a silent side effect that
behaves differently in development and production.

Two consequences worth knowing:

- **`syncIndexes` drops indexes that are not declared in a schema.** An index
  created by hand in Atlas will be removed on the next deploy. Drops are logged
  with a warning naming the collection and index.
- **A failed index build fails startup.** This is deliberate: an API running
  without its uniqueness constraints corrupts data silently and permanently,
  which is worse than not booting.

`syncIndexes()` reads `mongoose.modelNames()`, so it only sees models that have
been imported. `server.ts` statically imports `app.ts`, which transitively
imports every model, so the full set is registered before startup runs.
Changing any of those to a dynamic import would silently shrink what gets
synced — the "Syncing indexes for N models" log line exists to make that
visible.
