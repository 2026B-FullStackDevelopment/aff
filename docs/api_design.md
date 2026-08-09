# AFF Platform — API Design Specification

**Schema note:** per PRD §9/§11, `ORDER` needs an additive `paymentMethod` field (`STRIPE` | `CASH`) not yet present in `docs/database_design.md`. This spec treats that field as required and defines it below — closing the PRD's flagged schema gap.

---

## 1. Overview

AFF's backend exposes a REST API (JWT-authenticated, role-based) plus one shared Socket.IO layer for live events. This section is a scannable index — full request/response detail, error cases, and business rules live in the numbered sections below.

**Jump to:** §2 Conventions · §3 Shared DTOs · §4 Auth · §5 Users · §6 Listings · §7 Orders · §8 Payments (Stripe webhook) · §9 Delivery · §10 Subscriptions · §11 Admin · §12 Real-Time Events · §13 Explicit Non-Endpoints

### 1.1 Endpoint Quick Reference

| Module | Method & Path | Auth | Story |
|---|---|---|---|
| Auth (§4) | `POST /auth/register/recipient` | public | A1 |
| Auth (§4) | `POST /auth/register/donor` | public | A2 |
| Auth (§4) | `POST /auth/login` | public | A3 |
| Auth (§4) | `POST /auth/logout` | any role | A4 |
| Users (§5) | `GET /users/me` | any role | supporting |
| Users (§5) | `PATCH /users/me` | any role | A5 |
| Users (§5) | `POST /users/me/avatar` | any role | A5 |
| Listings (§6) | `POST /listings` | DONOR | B1, B7, B8 |
| Listings (§6) | `GET /listings/mine` | DONOR | B2, B5, B10 |
| Listings (§6) | `POST /listings/:id/clone` | DONOR | B3 |
| Listings (§6) | `PATCH /listings/:id/status` | DONOR | B6 |
| Listings (§6) | `GET /listings/:id/orders` | DONOR | B9 |
| Listings (§6) | `POST /listings/:id/donations` | DONOR | B4 |
| Listings (§6) | `POST /listings/:id/reserve` | RECIPIENT | C2 |
| Listings (§6) | `GET /listings` | public | C1, C5, E4 |
| Listings (§6) | `GET /listings/:id` | public | C7 |
| Orders (§7) | `GET /orders/mine` | RECIPIENT | C4 |
| Orders (§7) | `DELETE /orders/:id` | RECIPIENT | C3 |
| Orders (§7) | `POST /orders/:id/feedback` | RECIPIENT | C6 |
| Orders (§7) | `POST /orders/:id/checkout-session` | RECIPIENT | C2, B4, A6 |
| Payments (§8) | `POST /webhooks/stripe` | Stripe signature | C2, E1 |
| Delivery (§9) | `GET /deliveries/queue` | COURIER | D2 |
| Delivery (§9) | `PATCH /deliveries/:id/claim` | COURIER | D3, D4 |
| Delivery (§9) | `GET /deliveries/:id` | COURIER, RECIPIENT, ADMIN | D5 |
| Delivery (§9) | `PATCH /deliveries/:id/pickup` | COURIER | D6 |
| Delivery (§9) | `PATCH /deliveries/:id/deliver` | COURIER | D7 |
| Subscriptions (§10) | `GET /subscriptions/me` | RECIPIENT | supporting |
| Subscriptions (§10) | `POST /subscriptions/checkout-session` | RECIPIENT | E1 |
| Subscriptions (§10) | `PUT /recipients/me/preferences` | RECIPIENT (Premium) | E2 |
| Admin (§11) | `POST /admin/couriers` | ADMIN | D1 |
| Admin (§11) | `GET /admin/couriers` | ADMIN | D11 |
| Admin (§11) | `GET /admin/deliveries` | ADMIN | D11 |
| Admin (§11) | `GET /admin/users` | ADMIN | F1 |
| Admin (§11) | `PATCH /admin/users/:id/status` | ADMIN | F2 |
| Admin (§11) | `PATCH /admin/listings/:id/cancel` | ADMIN | F3 |
| Admin (§11) | `GET /admin/listings` | ADMIN | F4 |

### 1.2 Real-Time Event Quick Reference (§12)

| Event | Room | Story |
|---|---|---|
| `listing:sold_out` | `user:<donorId>` | B10 |
| `notification:premium_match` | `user:<recipientId>` | E3 |
| `notification:admin_cancel` | `user:<recipientId>` | F5 |
| `notification:payment_requested` | `user:<recipientId>` | B4 |
| `payment:success` | `user:<recipientId>` | C2 |
| `order:status_changed` | `user:<recipientId>` | D8 |
| `delivery:location` | `order:<orderId>` | D9 |
| `delivery:delivered` | `order:<orderId>`, `user:<recipientId>` | D10 |

---

## 2. Conventions

### 2.1 Authentication

Every protected route requires `Authorization: Bearer <JWT>`. The auth middleware (`requireAuth`) rejects missing/invalid/revoked tokens with `401`. The JWT payload carries `{ userId, role }`; the middleware attaches `req.user = { id, role }` for use by controllers/services.

Role checks use `requireRole('DONOR', 'ADMIN', ...)` and return `403` if `req.user.role` isn't in the allowed set. This is the coarse-grained RBAC layer (`A.2.3`). Endpoints below list required role(s) as **Auth:**. Where a role check alone isn't enough (e.g. "only *this* Recipient's own order"), the Service layer performs an ownership check (`A.2.2`) — noted as **Ownership:** where it applies.

### 2.2 Request / Response format

All bodies are JSON. Success responses use the existing shared envelope (`backend/src/shared/http/response.ts`):

```json
{ "data": { /* resource or list */ } }
```

`200` for reads/updates, `201` for creates. Endpoints returning a list wrap the array as `data: [...]`; paginated list endpoints (§2.4) nest it as `data: { items: [...], page, limit, total } `.

### 2.3 Errors

Errors use the existing shared envelope (`backend/src/shared/dtos/error.dto.ts`):

```json
{ "message": "Human-readable error message." }
```

HTTP status communicates the error category; there is no separate machine-readable error code today, so clients must branch on status code, not message text.

| Status | Meaning | Example |
|---|---|---|
| 400 | Malformed request / validation failure | Invalid enum value, missing required field |
| 401 | Missing, invalid, or revoked token | Expired JWT, logged-out token reused |
| 403 | Authenticated but not permitted | Recipient calling a Donor-only route |
| 404 | Resource not found | Listing/Order/Delivery ID doesn't exist |
| 409 | Conflict with current state | Claiming an already-claimed delivery, cancelling an already-assigned order, duplicate reservation on a listing |
| 422 | Semantically invalid given business rules | Reserving more than `rationLimitPerPerson`, reserving a `PER_REQUEST` listing |
| 429 | Rate limited | Login lockout window (`A3`) |
| 500 | Unhandled server error | — |

### 2.4 Pagination

List endpoints that can grow unbounded (`GET /listings`, `GET /listings/mine`, `GET /orders/mine`, `GET /admin/*`) accept `?page=<n>&limit=<n>` (defaults `page=1`, `limit=20`, max `limit=100`) and respond:

```json
{ "data": { "items": [ ... ], "page": 1, "limit": 20, "total": 137 } }
```

### 2.5 IDs, timestamps, enums

- All IDs are stringified Mongo `ObjectId`s in requests and responses.
- Timestamps are ISO 8601 strings (UTC).
- Enum values match `docs/database_design.md` §5 exactly (all-caps snake case). Sending an unrecognized enum value is a `400`.

---

## 3. Shared DTOs

Referenced by multiple endpoints below; defined once here.

**UserDTO** (base fields common to every role)
| Field | Type |
|---|---|
| id | string |
| role | `RECIPIENT` \| `DONOR` \| `ADMIN` \| `COURIER` |
| username | string |
| email | string |
| country | string |
| city | string |
| status | `ACTIVE` \| `DEACTIVATED` |
| avatarUrl | string \| null |
| createdAt | datetime |

**RecipientDTO** = UserDTO + `{ tier: 'STANDARD'|'PREMIUM', notificationPreferences: NotificationPreference[], hasStripeCard: boolean }`
(`hasStripeCard` is derived from `stripeCustomerId` presence — the raw Stripe customer ID is never sent to the client.)

**DonorDTO** = UserDTO + `{ companyName: string, taxCode: string, addressText: string, location: GeoLocation }`

**CourierDTO** = UserDTO + `{ fullName: string }`

**GeoLocation**: `{ latitude: number, longitude: number, updatedAt: datetime }`

**NotificationPreference**: `{ id: string, preferenceTitle: string, categories: FoodCategory[], vegetarian: boolean|null, priceMin: number|null, priceMax: number|null, city: string|null }`

**ListingDTO**
| Field | Type |
|---|---|
| id | string |
| donor | `{ id, companyName, city, location }` (denormalized subset of DonorDTO) |
| name | string |
| description | string \| null |
| imageUrl | string \| null |
| unit | `KILOGRAM`\|`GRAM`\|`LITER`\|`MILLILITER`\|`UNIT`\|`PER_REQUEST` |
| category | `FRUIT`\|`VEGETABLE`\|`MEAT`\|`COOKED_DISH`\|`BAKED_GOODS`\|`DRINK` |
| isVegetarian | boolean |
| price | number (0 = free) |
| city | string |
| status | `ACTIVE`\|`PAUSED`\|`CANCELLED`\|`SOLD_OUT` |
| donationLimit | number |
| rationLimitPerPerson | number \| null |
| quantityRemaining | number |
| createdAt | datetime |

**OrderDTO**
| Field | Type |
|---|---|
| id | string |
| recipientId | string |
| listing | `{ id, name, imageUrl, unit }` (denormalized subset) |
| intakePath | `RESERVATION`\|`DONOR_INITIATED` |
| quantity | number |
| amount | number |
| paymentMethod | `STRIPE`\|`CASH` |
| paymentStatus | `FREE`\|`PAYMENT_PENDING`\|`PAID` |
| orderStatus | `PENDING_PAYMENT`\|`PREPARING`\|`PICKED_UP`\|`OUT_FOR_DELIVERY`\|`DELIVERED`\|`CANCELLED` |
| deliveryAddressText | string |
| deliveryLocation | GeoLocation |
| cancelledByUserId | string \| null |
| feedback | `{ comment, createdAt }` \| null |
| createdAt | datetime |

**DeliveryDTO**
| Field | Type |
|---|---|
| id | string |
| orderId | string |
| courierId | string \| null |
| stage | `AWAITING_COURIER`\|`ASSIGNED`\|`PICKED_UP`\|`DELIVERED`\|`CANCELLED` |
| pickupAddressText | string (denormalized from the order's Donor) |
| pickedUpAt | datetime \| null |
| deliveredAt | datetime \| null |
| courierLastLocation | GeoLocation \| null |
| createdAt | datetime |

**SubscriptionDTO**: `{ id, status: 'ACTIVE'|'PAST_DUE'|'CANCELLED', currentPeriodEnd: datetime, createdAt: datetime }`

---

## 4. Auth Module — `/api/auth`

### `POST /auth/register/recipient` — *A1 (`1A.1`, `1A.2`, `1A.3.1`)*
**Auth:** public

Request body: `{ username, email, password, city }`
Response `201`: `{ user: RecipientDTO, token: string }`
Errors: `400` invalid format; `409` email already registered

### `POST /auth/register/donor` — *A2 (`1B.1`, `1B.2`, `1B.3.1`)*
**Auth:** public

Request body: `{ companyName, email, password, taxCode, city, addressText, location: { latitude, longitude } }` (`location` is resolved client-side via OSM Nominatim before submit, per A2's UI)
Response `201`: `{ user: DonorDTO, token: string }`
Errors: `400` invalid company/tax-code format; `409` email already registered

### `POST /auth/login` — *A3 (`2.2.1`)*
**Auth:** public

Request body: `{ identifier, password }` (`identifier` = username or email)
Response `200`: `{ user: UserDTO, token: string }`
Errors: `401` invalid credentials (generic message, no hint whether the account exists); `429` account locked — `5` failed attempts within a rolling 60s window sets `USER.lockedUntil`; response body includes `{ lockedUntilSeconds: number }`

### `POST /auth/logout` — *A4 (`2.3.1`, `2.3.2`)*
**Auth:** any authenticated role

Inserts the current token's `jti` into `REVOKED_TOKEN` (`reason=LOGOUT`).
Response `200`: `{ data: null }`
Errors: `401` if already unauthenticated

---

## 5. Users Module — `/api/users`

### `GET /users/me` *(supporting endpoint — not an explicit PRD story, but required to bootstrap the profile edit form in A5 and hydrate session state after a page load)*
**Auth:** any authenticated role
Response `200`: role-appropriate DTO (`RecipientDTO` \| `DonorDTO` \| `CourierDTO` \| `UserDTO` for Admin)

### `PATCH /users/me` — *A5 (`3.1.1`)*
**Auth:** any authenticated role

Request body: subset of editable contact fields (`username`, `city`, `country`, plus role-specific: Donor `companyName`/`addressText`/`location`, Recipient — none beyond base fields).
Response `200`: updated DTO
Errors: `400` invalid field values

### `POST /users/me/avatar` — *A5 (`3.2.1`)*
**Auth:** any authenticated role

Request: `multipart/form-data`, field `avatar` (image file)
Behavior: uploads to Supabase Storage, resizes to the platform's standard avatar size, sets `USER.avatarUrl`.
Response `200`: `{ avatarUrl: string }`
Errors: `400` invalid file type/size

---

## 6. Listings Module — `/api/listings`

Covers Donor-side management (Epic B) and Recipient-side browsing (Epic C1/C5/C7).

### `POST /listings` — *B1 (`4.1.1`)*
**Auth:** `DONOR`

Request body: `{ name, description?, imageUrl?, unit, category, isVegetarian, price, donationLimit, rationLimitPerPerson? }` (`city` is inherited from the Donor's profile). Selecting `unit=PER_REQUEST` is valid here — see B8 below for how it behaves downstream.
Response `201`: `ListingDTO`
Errors: `400` invalid unit/category enum or `price` fails the "free or > 1000 VND" rule

### `GET /listings/mine` — *B2 (`4.1.2`), B5 (`4.2.2`)*
**Auth:** `DONOR`
**Ownership:** implicit — always scoped to `req.user.id` as `donorId`

Query params: `?status=ACTIVE|PAST` (server maps `PAST` to `CANCELLED`/`SOLD_OUT`/closed-`ACTIVE`-with-zero-remaining), `search=`, `category=`, `from=`, `to=`, `sort=createdAt|revenue&order=asc|desc`, plus pagination (§2.4).
Response `200`: paginated `{ items: (ListingDTO & { donatedQuantity: number, revenue: number })[], page, limit, total }`, additionally including an `aggregate: { byCategory: {...}, byUnit: {...} }` block for the B10 stats charts.

### `POST /listings/:id/clone` — *B3 (`4.1.3`)*
**Auth:** `DONOR`
**Ownership:** the listing must belong to `req.user.id`

Request body: none (all static fields copied from the source listing; `status` resets to `ACTIVE`, `quantityRemaining` resets to `donationLimit`, `createdAt` is fresh)
Response `201`: `ListingDTO` (new listing; no reference back to the source)
Errors: `404` listing not found; `403` not the owning Donor

### `PATCH /listings/:id/status` — *B6 (`4.2.3`)*
**Auth:** `DONOR`
**Ownership:** the listing must belong to `req.user.id`

Request body: `{ status: 'PAUSED'|'ACTIVE'|'CANCELLED' }`
Behavior: transitioning to `CANCELLED` cascades — every `ORDER` on this listing still in `DELIVERY.stage=AWAITING_COURIER` (or with no `DELIVERY` yet) is set to `orderStatus=CANCELLED`, `cancelledByUserId=<donor's userId>`; `ASSIGNED`-or-later orders are untouched.
Response `200`: `{ listing: ListingDTO, cancelledOrderCount: number }`
Errors: `409` invalid transition (e.g. re-cancelling an already-cancelled listing)

### `GET /listings/:id/orders` — *B9 (`4.2.5`)*
**Auth:** `DONOR`
**Ownership:** the listing must belong to `req.user.id`

Only meaningful for `RESERVATION`/`DONOR_INITIATED` orders — Per-Request listings never have orders.
Response `200`: paginated `OrderDTO[]` (each including `recipient: { id, username }` — `paymentMethod`/`paymentStatus` are already on `OrderDTO`, read directly off the order, not joined from a `PAYMENT` record; see the note in §3's `OrderDTO` and §8's Payments section on why cash orders never have a `PAYMENT` row)

### `POST /listings/:id/donations` — *B4 (`4.1.4`, revised per PRD §10)*
**Auth:** `DONOR`
**Ownership:** the listing must belong to `req.user.id`

Request body: `{ recipientUsername: string, quantity: number, paymentMethod?: 'STRIPE'|'CASH' }` (`paymentMethod` required only if the listing's `price > 0`; omitted/ignored for free listings)
Behavior: looks up the Recipient by username (must be a registered account — no free-text names, per the §10 deviation from `4.1.4`'s literal text). Creates an `ORDER` (`intakePath=DONOR_INITIATED`). If priced, `paymentStatus=PAYMENT_PENDING` and a `notification:payment_requested` event (§12) prompts the Recipient to complete payment; if free, `paymentStatus=FREE` and `DeliveryService.createForOrder` fires immediately.
Response `201`: `OrderDTO`
Errors: `404` recipient username not found; `422` quantity exceeds `quantityRemaining` or `rationLimitPerPerson`; `422` listing is `PER_REQUEST` (donor-initiated donations aren't supported on untracked listings)

### `POST /listings/:id/reserve` — *C2 (`5.1.2`, `5.1.3`, `5.2.3`, revised per §10)*
**Auth:** `RECIPIENT`

Request body: `{ quantity: number, deliveryAddressText: string, deliveryLocation: { latitude, longitude }, paymentMethod: 'STRIPE'|'CASH' }` (`paymentMethod` required only if `price > 0`)
Behavior — eligibility checks (all `422` on failure): listing `status=ACTIVE`, `unit != PER_REQUEST`, `quantity <= quantityRemaining`, `quantity <= rationLimitPerPerson` (if set), Recipient has no existing non-cancelled order on this listing. Creates `ORDER` (`intakePath=RESERVATION`), decrements `LISTING.quantityRemaining`.
- Free: `paymentStatus=FREE`, `DeliveryService.createForOrder` fires immediately.
- Cash: `paymentStatus=PAYMENT_PENDING`, `DeliveryService.createForOrder` fires immediately (queue entry doesn't wait for cash).
- Stripe: `paymentStatus=PAYMENT_PENDING`, `orderStatus=PENDING_PAYMENT`; **no** Delivery record yet — the client must immediately call `POST /orders/:id/checkout-session` (§7) to complete payment before the order enters the queue.

Response `201`: `OrderDTO`
Errors: `422` see eligibility checks above; `400` missing `paymentMethod` on a priced listing

### `GET /listings` — *C1 (`5.1.1`), C5 (`5.2.1`, `5.2.2`), E4 (`5.3.3`)*
**Auth:** public (unauthenticated browsing allowed; ranking/preferences require auth)

Query params: `status=ACTIVE` (default, only value supported publicly), `search=` (case-insensitive partial match on `name`), `city=`, `category=`, `priceMin=`, `priceMax=`, `sort=price&order=asc|desc`, `rank=proximity` (Premium only — see E4), plus pagination.
Behavior for `rank=proximity` (**Auth:** `RECIPIENT`, tier must be `PREMIUM`, else `403`): if the request includes `?lat=&lng=` (browser geolocation was granted), rank by distance from those coordinates; otherwise fall back to ranking by match against `RECIPIENT.city`.
Response `200`: paginated `ListingDTO[]`

### `GET /listings/:id` — *C7 (`5.3.4`)*
**Auth:** public

Response `200`: `ListingDTO` with `donor` expanded to full `{ id, companyName, addressText, location }` (needed both as browsing context for Reservation/Donor-initiated listings, and as the literal meetup point for Per-Request listings, per C7's UI note).
Errors: `404`

---

## 7. Orders Module — `/api/orders`

### `GET /orders/mine` — *C4 (`5.1.4`)*
**Auth:** `RECIPIENT`
**Ownership:** implicit — always scoped to `req.user.id` as `recipientId`

Query params: pagination only.
Response `200`: paginated `OrderDTO[]`, each including `delivery: { stage } | null` and `donor: { id, companyName }`.

### `DELETE /orders/:id` — *C3 (new, replaces v1's no-cancellation rule)*
**Auth:** `RECIPIENT`
**Ownership:** the order must belong to `req.user.id`

This is the Recipient's own self-cancel action. Donor- and Admin-initiated cancellation are separate endpoints that apply the identical rule at the listing level — `PATCH /listings/:id/status` (B6) and `PATCH /admin/listings/:id/cancel` (F3) — cascading to every affected order rather than targeting one `orderId` directly.

Behavior: atomically checks the associated `DELIVERY.stage`. If no Delivery exists yet, or `stage=AWAITING_COURIER`, cancellation proceeds: `ORDER.orderStatus=CANCELLED`, `cancelledByUserId=<req.user.id>`, `cancelledAt=now`; `LISTING.quantityRemaining` is restored. If `stage=ASSIGNED` or later, the update is rejected — this is the same atomic check that backs D3's claim guarantee, so a claim racing a cancellation can never leave both operations believing they won.
Response `200`: `OrderDTO`
Errors: `404` order not found; `409` delivery already `ASSIGNED`/`PICKED_UP`/`DELIVERED` — "This order can no longer be cancelled."

*(Stripe refund on cancellation is explicitly an open question per PRD §11 — not implemented in this pass; a cancelled Stripe-paid order is flagged in the response as `refundRequired: true` for manual Admin handling until that's resolved.)*

### `POST /orders/:id/feedback` — *C6 (`5.2.4`)*
**Auth:** `RECIPIENT`
**Ownership:** the order must belong to `req.user.id`

Request body: `{ comment: string }`
Precondition: `orderStatus=DELIVERED`
Response `201`: `{ feedback: { comment, createdAt } }`
Errors: `409` order not yet delivered; `409` feedback already submitted (one per order)

### `POST /orders/:id/checkout-session` — *supports C2/B4 (`5.2.3`, `6.2.1`), and A6 (Stripe card registration)*
**Auth:** `RECIPIENT`
**Ownership:** the order must belong to `req.user.id`

Precondition: `ORDER.paymentMethod=STRIPE` and `paymentStatus=PAYMENT_PENDING`.
Behavior: if `RECIPIENT.stripeCustomerId` is unset, creates a Stripe Customer first (A6) and persists it. Creates a Stripe Checkout Session (one-off payment mode, amount = `ORDER.amount`) attached to that customer, tagged with `orderId` in metadata. Creates/updates a `PAYMENT` row (`payableType=ORDER`, `status=PENDING`).
Response `200`: `{ checkoutUrl: string }` (frontend redirects the browser here)
Errors: `409` order not in a payable state; `502` Stripe API error

Payment confirmation happens asynchronously via the Stripe webhook (§8), **not** as this endpoint's response — Stripe Checkout is a redirect flow.

---

## 8. Payments — Stripe Webhook (cross-cutting)

### `POST /webhooks/stripe`
**Auth:** none (Stripe signature verification via `Stripe-Signature` header replaces JWT auth on this route)

Single endpoint handling both one-off order payments and subscription billing, disambiguated by event type:

| Stripe event | Effect |
|---|---|
| `checkout.session.completed` (payment mode) | Look up `ORDER` via session metadata → `ORDER.paymentStatus=PAID`, `orderStatus=PREPARING`; `PAYMENT.status=PAID`, `paidAt=now`; **now** call `DeliveryService.createForOrder` (Stripe orders only enter the queue after payment succeeds); emit `payment:success` (§12) |
| `checkout.session.completed` (subscription mode) | Create initial `SUBSCRIPTION` row, `status=ACTIVE` |
| `invoice.paid` | Append a new `SUBSCRIPTION` row for the new billing cycle (append-only ledger per `docs/database_design.md`); send confirmation email (Nodemailer, per E1) |
| `invoice.payment_failed` | Latest `SUBSCRIPTION.status=PAST_DUE` |
| `customer.subscription.deleted` | Latest `SUBSCRIPTION.status=CANCELLED` |

Idempotency: `PAYMENT.lastProcessedEventId` (per `docs/database_design.md`) is checked before applying any event, guarding against Stripe's at-least-once webhook delivery.
Response: `200` (always, once the event is durably processed or recognized as a duplicate) — Stripe treats non-2xx as "retry."

---

## 9. Delivery Module — `/api/deliveries`

*Sole Additional Feature, Epic D. New module — no existing scaffold.*

### `GET /deliveries/queue` — *D2 (new)*
**Auth:** `COURIER`

Query params: pagination (default sort is fixed — oldest-first, not client-selectable, per D2's spec).
Response `200`: paginated `DeliveryDTO[]` where `stage=AWAITING_COURIER`, sorted by the underlying `ORDER.createdAt` ascending, each entry including `order: { id, quantity, deliveryAddressText }` and `donor: { companyName }`.

### `PATCH /deliveries/:id/claim` — *D3 (new)*
**Auth:** `COURIER`

Behavior: atomic conditional update — `stage: AWAITING_COURIER → ASSIGNED` only if still `AWAITING_COURIER`, and only if the Courier has no other `DELIVERY` in `ASSIGNED`/`PICKED_UP` (D4). Both checks happen in the same atomic operation to prevent double-claim races.
Response `200`: `DeliveryDTO`
Errors: `409` already claimed by another Courier; `409` this Courier already has an active delivery (D4)

### `GET /deliveries/:id` — *D5 (new)*
**Auth:** `COURIER` (must be the assigned courier), `RECIPIENT` (must be the order's recipient — powers D8/D9/D10), or `ADMIN`

Response `200`: `DeliveryDTO`. For a Courier, includes `pickupAddressText` (Donor's address as text only — no map, per D5). For a Recipient, `courierLastLocation` is only populated while `stage=PICKED_UP` (§12).

### `PATCH /deliveries/:id/pickup` — *D6 (new)*
**Auth:** `COURIER`
**Ownership:** must be the Courier assigned to this delivery

Sets `stage=PICKED_UP`, `pickedUpAt=now`. From this point the Courier's client begins sending location pings over WebSocket (§12) — this REST call only flips the stage.
Response `200`: `DeliveryDTO`
Errors: `409` not currently `ASSIGNED`

### `PATCH /deliveries/:id/deliver` — *D7 (new)*
**Auth:** `COURIER`
**Ownership:** must be the Courier assigned to this delivery

Request body: `{ cashConfirmed?: boolean }` — required and must be `true` if the order's `paymentMethod=CASH`; ignored otherwise.
Behavior: sets `stage=DELIVERED`, `deliveredAt=now`; `ORDER.orderStatus=DELIVERED`; if cash, also flips `ORDER.paymentStatus: PAYMENT_PENDING → PAID` and logs `{ courierId, confirmedAt }` on the order for basic audit traceability (per PRD §9 risk mitigation — no deeper reconciliation than this).
Response `200`: `DeliveryDTO`
Errors: `409` not currently `PICKED_UP`; `400` cash order missing `cashConfirmed: true`

### Internal: `DeliveryService.createForOrder(orderId)` — *D12 (new)*
Not an HTTP route — a same-process service-interface call (`A.3.1`) invoked by the Listings/Orders module (from `POST /listings/:id/reserve`, `POST /listings/:id/donations`, and the Stripe webhook's `checkout.session.completed` handler) and by nothing else. Creates a `DELIVERY` row (`stage=AWAITING_COURIER`, `orderId`). Documented here for completeness since it's the single convergence point the PRD calls out (§5).

---

## 10. Subscriptions Module — `/api/subscriptions`

*Epic E, Premium.*

### `GET /subscriptions/me` *(supporting endpoint — needed to render Premium/upgrade UI state; `RECIPIENT.tier` is derived from this)*
**Auth:** `RECIPIENT`
Response `200`: `{ tier: 'STANDARD'|'PREMIUM', subscription: SubscriptionDTO | null }` (`subscription` is the latest row; `PREMIUM` iff it's `ACTIVE` and `currentPeriodEnd` is in the future)

### `POST /subscriptions/checkout-session` — *E1 (`6.2.1`)*
**Auth:** `RECIPIENT`

Behavior: creates a Stripe Checkout Session in subscription mode ($5/month), creating a Stripe Customer first if none exists (shared logic with A6/§7).
Response `200`: `{ checkoutUrl: string }`
Confirmation happens via the `POST /webhooks/stripe` handler (§8), which creates the `SUBSCRIPTION` row and sends the confirmation email.

### `PUT /recipients/me/preferences` — *E2 (`5.3.1`)*
**Auth:** `RECIPIENT` (tier must be `PREMIUM` — `403` otherwise)

Request body: `{ preferences: NotificationPreference[] }` (full replace of the list, supports multiple saved preferences per E2)
Response `200`: `{ notificationPreferences: NotificationPreference[] }`
Errors: `403` not a Premium Recipient; `400` invalid category enum / malformed price range

---

## 11. Admin Module — `/api/admin`

*Epic F, plus D1/D11.*

### `POST /admin/couriers` — *D1 (new)*
**Auth:** `ADMIN`

Request body: `{ username, email, tempPassword, fullName }`
Response `201`: `CourierDTO`
Errors: `409` email already registered

### `GET /admin/couriers` — *D11 (extends `7.1.1`)*
**Auth:** `ADMIN`
Response `200`: paginated `CourierDTO[]` (also reachable via `GET /admin/users?role=COURIER`, F1 below — kept as a convenience alias since D11 calls it out separately)

### `GET /admin/deliveries` — *D11 (extends `7.3.1`)*
**Auth:** `ADMIN`

Query params: `stage=`, pagination.
Response `200`: paginated `DeliveryDTO[]`, each including `courier: { id, fullName } | null` and `order: { id, recipientId }` — read-only, no assignment controls (explicit scope boundary, PRD §7 Epic D).

### `GET /admin/users` — *F1 (`7.1.1`)*
**Auth:** `ADMIN`

Query params: `role=RECIPIENT|DONOR|COURIER|ADMIN`, `status=`, `search=`, pagination.
Response `200`: paginated role-appropriate DTOs.

### `PATCH /admin/users/:id/status` — *F2 (`7.2.1`)*
**Auth:** `ADMIN`

Request body: `{ status: 'ACTIVE'|'DEACTIVATED' }`
Behavior: deactivating revokes all of that user's live tokens (inserts current-session `jti`s into `REVOKED_TOKEN`, `reason=ADMIN_DEACTIVATE`).
Response `200`: `UserDTO`

### `PATCH /admin/listings/:id/cancel` — *F3 (`7.2.2`)*
**Auth:** `ADMIN`

Same cascade rule as B6: only `AWAITING_COURIER`-or-no-Delivery orders on the listing are auto-cancelled; `cancelledByUserId=<admin's userId>`.
Response `200`: `{ listing: ListingDTO, cancelledOrderCount: number }`

### `GET /admin/listings` — *F4 (`7.3.1`, `7.3.2`)*
**Auth:** `ADMIN`

Query params: `search=` (matches Donor name/ID or listing ID), pagination.
Response `200`: paginated `ListingDTO[]` with full detail (no status filter — Admin sees all statuses, unlike the public `GET /listings`).

---

## 12. Real-Time Events (Socket.IO)

One shared Socket.IO layer (`5.3.2`/`4.3.1`/`7.3.3`/`6.1.2` + Courier tracking) delivers a **live, in-session feed only** — nothing is persisted with read/unread state (explicit Out-of-Scope item, PRD §8).

### Connection

Client connects with the JWT in the handshake (`socket.handshake.auth.token`); the server validates it the same way as HTTP requests (including the `REVOKED_TOKEN` check) and joins the socket to a personal room `user:<userId>`. An order-scoped room `order:<orderId>` is joined on demand when a Recipient opens that order's tracking view (D9) and left when they navigate away.

### Event catalog

| Event | Room | Emitted when | Payload | Story |
|---|---|---|---|---|
| `listing:sold_out` | `user:<donorId>` | `LISTING.quantityRemaining` hits 0 | `{ listingId, name }` | B10 (`4.3.1`) |
| `notification:premium_match` | `user:<recipientId>` | new `ACTIVE` listing matches a Premium Recipient's saved preference | `{ listingId, name, matchedPreferenceId }` | E3 (`5.3.2`) |
| `notification:admin_cancel` | `user:<recipientId>` | F3/B6 cascade cancels this Recipient's order | `{ orderId, listingName }` | F5 (`7.3.3`) |
| `notification:payment_requested` | `user:<recipientId>` | B4 creates a priced Donor-initiated order awaiting the Recipient's payment choice | `{ orderId, listingName, amount }` | B4 (`4.1.4`) |
| `payment:success` | `user:<recipientId>` | Stripe webhook confirms `checkout.session.completed` for an order | `{ orderId }` | C2 (`6.1.2`) |
| `order:status_changed` | `user:<recipientId>` | any `DELIVERY.stage` transition on that Recipient's order | `{ orderId, stage }` | D8 (new) |
| `delivery:location` | `order:<orderId>` | Courier GPS ping, only while `stage=PICKED_UP` | `{ orderId, latitude, longitude, updatedAt }` | D9 (new) |
| `delivery:delivered` | `order:<orderId>`, `user:<recipientId>` | `stage → DELIVERED` | `{ orderId, deliveredAt }` | D10 (new) |

`delivery:location` is scoped strictly to `order:<orderId>` (never broadcast to `user:<recipientId>` at large) so a Recipient only ever sees a Courier's position for an order that is currently theirs and currently `PICKED_UP` — matching D9's visibility rule.

---

## 13. Explicit Non-Endpoints (Out of Scope)

Per PRD §8, the following are intentionally **not** part of this API:

- Any endpoint that creates an `ORDER`, `PAYMENT`, or `DELIVERY` for a `PER_REQUEST` listing — enforced by `422` in `POST /listings/:id/reserve` and `POST /listings/:id/donations`.
- `POST /deliveries/:id/redo` or any failure/retry endpoint — every claimed delivery is expected to complete.
- Any Courier self-registration route (`POST /auth/register/courier` does not exist) — Couriers are Admin-created only (D1).
- Any Admin manual-assignment route (`PATCH /admin/deliveries/:id/assign` does not exist) — claim-based queue only.
- `GET /notifications` or any persisted-notification route — live feed only, per §8.
- Cancellation on an `ASSIGNED`-or-later delivery — enforced by the same atomic check backing D3/C3, always `409`.
- An AFF Wallet balance endpoint of any kind.
