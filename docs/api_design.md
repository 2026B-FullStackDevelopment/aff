# AFF Platform — API Design Specification

**Schema note:** per PRD §9/§11, `ORDER` needs an additive `paymentMethod` field (`STRIPE` | `CASH`) not yet present in `docs/database_design.md`. This spec treats that field as required and defines it below — closing the PRD's flagged schema gap.

---

## 1. Overview

AFF's backend exposes a REST API (JWT-authenticated, role-based) plus one shared Socket.IO layer for live events. This section is a scannable index — full request/response detail, error cases, and business rules live in the numbered sections below.

**Jump to:** §2 Conventions · §3 Shared DTOs · §4 Auth · §5 Users · §5A Media · §6 Listings · §7 Orders · §8 Payments (Stripe webhook) · §9 Delivery · §10 Subscriptions · §11 Admin · §12 Real-Time Events · §13 Explicit Non-Endpoints

### 1.1 Endpoint Quick Reference

| Module | Method & Path | Auth |
|---|---|---|
| Auth (§4) | `POST /auth/register/recipient` | public |
| Auth (§4) | `POST /auth/register/donor` | public |
| Auth (§4) | `POST /auth/login` | public |
| Auth (§4) | `POST /auth/logout` | any role |
| Users (§5) | `GET /users/me` | any role |
| Users (§5) | `PATCH /users/me` | any role |
| Users (§5) | `PATCH /users/me/password` | any role |
| Users (§5) | `PATCH /users/me/email` | any role |
| Media (§5A) | `POST /media/upload-url` | any role |
| Listings (§6) | `POST /listings` | DONOR |
| Listings (§6) | `GET /listings/mine` | DONOR |
| Listings (§6) | `POST /listings/:id/clone` | DONOR |
| Listings (§6) | `PATCH /listings/:id/status` | DONOR |
| Listings (§6) | `GET /listings/:id/orders` | DONOR |
| Listings (§6) | `POST /listings/:id/donations` | DONOR |
| Listings (§6) | `POST /listings/:id/reserve` | RECIPIENT |
| Listings (§6) | `GET /listings` | public |
| Listings (§6) | `GET /listings/:id` | public |
| Orders (§7) | `GET /orders/mine` | RECIPIENT |
| Orders (§7) | `GET /orders/:id` | RECIPIENT |
| Orders (§7) | `DELETE /orders/:id` | RECIPIENT |
| Orders (§7) | `POST /orders/:id/feedback` | RECIPIENT |
| Orders (§7) | `POST /orders/:id/checkout-session` | RECIPIENT |
| Payments (§8) | `POST /webhooks/stripe` | Stripe signature |
| Delivery (§9) | `GET /deliveries/queue` | COURIER |
| Delivery (§9) | `GET /deliveries/active` | COURIER |
| Delivery (§9) | `PATCH /deliveries/:id/claim` | COURIER |
| Delivery (§9) | `GET /deliveries/:id` | RECIPIENT, ADMIN |
| Delivery (§9) | `PATCH /deliveries/:id/pickup` | COURIER |
| Delivery (§9) | `PATCH /deliveries/:id/deliver` | COURIER |
| Subscriptions (§10) | `GET /subscriptions/me` | RECIPIENT |
| Subscriptions (§10) | `POST /subscriptions/checkout-session` | RECIPIENT |
| Subscriptions (§10) | `PATCH /subscriptions/me` | RECIPIENT (Premium) |
| Subscriptions (§10) | `GET /recipients/me/preferences` | RECIPIENT |
| Subscriptions (§10) | `POST /recipients/me/preferences` | RECIPIENT (Premium) |
| Subscriptions (§10) | `PATCH /recipients/me/preferences/:id` | RECIPIENT (Premium) |
| Subscriptions (§10) | `DELETE /recipients/me/preferences/:id` | RECIPIENT (Premium) |
| Admin (§11) | `POST /admin/couriers` | ADMIN |
| Admin (§11) | `GET /admin/couriers` | ADMIN |
| Admin (§11) | `GET /admin/deliveries` | ADMIN |
| Admin (§11) | `GET /admin/users` | ADMIN |
| Admin (§11) | `PATCH /admin/users/:id/status` | ADMIN |
| Admin (§11) | `PATCH /admin/listings/:id/cancel` | ADMIN |
| Admin (§11) | `GET /admin/listings` | ADMIN |
| Notifications (§14) | `GET /notifications` | any role |

### 1.2 Real-Time Event Quick Reference (§12)

| Event | Room |
|---|---|
| `listing:sold_out` | `user:<donorId>` |
| `notification:premium_match` | `user:<recipientId>` |
| `notification:admin_cancel` | `user:<recipientId>` |
| `payment:success` | `user:<recipientId>` |
| `payment:refunded` | `user:<recipientId>` |
| `order:status_changed` | `user:<recipientId>` |
| `delivery:location` | `order:<orderId>` |
| `delivery:delivered` | `order:<orderId>`, `user:<recipientId>` |

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
| 429 | Rate limited | Login lockout window |
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

**RecipientDTO** = UserDTO + `{ tier: 'STANDARD'|'PREMIUM', hasStripeCard: boolean }`
(`hasStripeCard` is derived from `stripeCustomerId` presence — the raw Stripe customer ID is never sent to the client.)

**DonorDTO** = UserDTO + `{ companyName: string, taxCode: string, addressText: string, location: GeoLocation }`

**CourierDTO** = UserDTO + `{ fullName: string }`

**GeoLocation**: `{ latitude: number, longitude: number, updatedAt: datetime }`

**NotificationPreference**: `{ id: string, preferenceTitle: string, categories: FoodCategory[], vegetarian: boolean|null, priceMin: number|null, priceMax: number|null, city: string|null, isActive: boolean }`

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
| donationLimit | positive integer |
| rationLimitPerPerson | positive integer \| null |
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
| paymentStatus | `FREE`\|`PAYMENT_PENDING`\|`PAID`\|`REFUND_PENDING`\|`REFUNDED` |
| orderStatus | `PENDING_PAYMENT`\|`PREPARING`\|`DELIVERED`\|`CANCELLED` (coarse/payment-oriented only — granular delivery progress is `DeliveryDTO.stage`, not this field; see §9) |
| deliveryAddressText | string \| null (required for `RESERVATION`; absent for `DONOR_INITIATED`) |
| deliveryLocation | GeoLocation \| null (required for `RESERVATION`; absent for `DONOR_INITIATED`) |
| cancelledByUserId | string \| null |
| feedback | `{ comment, createdAt }` \| null |
| delivery | `{ stage, id }` \| null — `id` is `null` on the list (`GET /orders/mine`) and cancel (`DELETE /orders/:id`) responses, which don't need it; only `GET /orders/:id` populates it |
| createdAt | datetime |

**DeliveryDTO**
| Field | Type |
|---|---|
| id | string |
| orderId | string |
| courierId | string \| null |
| stage | `AWAITING_COURIER`\|`ASSIGNED`\|`PICKED_UP`\|`DELIVERED`\|`CANCELLED` |
| pickupAddressText | string \| null (denormalized from the order's Donor; `null` only when the Listing/Donor profile could not be loaded) |
| pickupAddressLocation | GeoLocation \| null (denormalized from `DONOR.location` — static, for a map marker; not live-updating, unlike `courierLastLocation`; `null` only on a failed Donor join) |
| pickedUpAt | datetime \| null |
| deliveredAt | datetime \| null |
| courierLastLocation | GeoLocation \| null |
| createdAt | datetime |
| deliveryAddressText | string \| null (where the order is being delivered to — the Recipient's address, from `ORDER.deliveryAddressText`) |
| deliveryLocation | GeoLocation \| null (delivery destination coordinates, from `ORDER.deliveryLocation`; the Courier's map re-centres here after pickup) |
| requiresCashCollection | boolean — derived server-side from `ORDER.paymentMethod === 'CASH'`; `paymentMethod` itself is never exposed on this DTO. A Courier needs to know whether to collect money, not how the Recipient paid. |
| amount | number \| null — `ORDER.amount`; `null` only when the Order behind this Delivery could not be loaded |

**SubscriptionDTO**: `{ id, status: 'ACTIVE'|'PAST_DUE'|'CANCELLED', currentPeriodEnd: datetime, cancelAtPeriodEnd: boolean, createdAt: datetime }`
(`cancelAtPeriodEnd` is `true` after `DELETE /subscriptions/me` — the subscription stays `ACTIVE` and the tier stays `PREMIUM` until `currentPeriodEnd`, then the `customer.subscription.deleted` webhook flips `status` to `CANCELLED`.)

**NotificationDTO**: `{ id, type: 'SOLD_OUT'|'PREMIUM_MATCH'|'ADMIN_CANCEL'|'PAYMENT_SUCCESS'|'DELIVERY_STATUS', message: string, orderId: string|null, listingId: string|null, createdAt: datetime }`
(A thin, direct mapping of the `NOTIFICATION` model, §14. `orderId`/`listingId` are cross-references, not denormalized detail — the client fetches the Order/Listing itself if the user taps through.)

---

## 4. Auth Module — `/api/auth`

### `POST /auth/register/recipient` — *`1A.1`, `1A.2`, `1A.3.1`*
**Auth:** public

Request body: `{ username, email, password, city }`
Response `201`: `{ user: RecipientDTO, token: string }`
Errors: `400` invalid format; `409` email already registered

### `POST /auth/register/donor` — *`1B.1`, `1B.2`, `1B.3.1`*
**Auth:** public

Request body: `{ username, companyName, email, password, taxCode, city, addressText, location: { latitude, longitude } }` (`username` follows the same syntax rule as Recipient registration; `location` is resolved client-side via an OSM Nominatim address search-as-you-type list; the Donor selects one of the returned candidates — no pin-drop/map confirmation)
Response `201`: `{ user: DonorDTO, token: string }`
Errors: `400` invalid company/tax-code format; `409` email already registered

### `POST /auth/login` — *`2.2.1`*
**Auth:** public

Request body: `{ email, password }`
Response `200`: `{ user: UserDTO, token: string }`
Errors: `401` invalid credentials (generic message, no hint whether the account exists); `429` account locked — `5` failed attempts within a 60s window sets `USER.lockedUntil`; response body includes `{ lockedUntilSeconds: number }`

**Window semantics:** this is a fixed window anchored at the first failure of a burst, not a true rolling window. `USER.windowStartedAt` is set on the first failure and every subsequent failure counts toward the same window as long as it started less than 60s ago; once 60s have passed since that start with no qualifying failure, the next failure begins a brand-new window at count `1`. A failure can therefore fall just outside a 60s lookback from *itself* and still count, or vice versa — the boundary is relative to when the burst started, not to each individual attempt.

### `POST /auth/logout` — *`2.3.1`, `2.3.2`*
**Auth:** any authenticated role

Inserts the current token's `jti` into `REVOKED_TOKEN` (`reason=LOGOUT`).
Response `200`: `{ data: null }`
Errors: `401` if already unauthenticated

---

## 5. Users Module — `/api/users`

### `GET /users/me` *(supporting endpoint — not an explicit PRD story, but required to bootstrap the profile edit form and hydrate session state after a page load)*
**Auth:** any authenticated role
Response `200`: role-appropriate DTO (`RecipientDTO` \| `DonorDTO` \| `CourierDTO` \| `UserDTO` for Admin)

### `GET /users/recipients/search?email=` — *supports `4.1.4` Recipient resolution*
**Auth:** `DONOR`

Searches active registered Recipients by case-insensitive email prefix. At least three characters are required; shorter input returns an empty array. Results are capped at 10 and expose only `{ id, username, email }`.
Response `200`: `{ id: string, username: string, email: string }[]`

### `PATCH /users/me` — *`3.1.1`*
**Auth:** any authenticated role

Request body: subset of editable contact fields (`username`, `city`, `country`, `avatarUrl`, plus role-specific: Donor `companyName`/`addressText`/`location`, Recipient — none beyond base fields). `avatarUrl` is normally set to the `mediaUrl` returned by `POST /media/upload-url` (§5A), not typed in directly. Rejects `email`/`password` (and any other unknown key) with `400` — those go through the two dedicated endpoints below instead.
Response `200`: updated DTO
Errors: `400` invalid field values

### `PATCH /users/me/password` — *(new — not tied to a PRD story; see `docs/epic/B-profile-management.md`)*
**Auth:** any authenticated role

Request body: `{ newPassword }` (same `passwordSchema` as registration: 8–72 chars, 1 digit, 1 special char, 1 uppercase; no `currentPassword` field — the session token is treated as sufficient proof of identity).
Behavior: updates `USER.passwordHash`, then revokes the request's own token — same mechanism as `POST /auth/logout` (§4), but `reason=PASSWORD_CHANGE`. No new token is issued; client must re-`POST /auth/login`.
Response `200`: `{ data: null }`
Errors: `400` invalid password format

### `PATCH /users/me/email` — *(new — not tied to a PRD story; see `docs/epic/B-profile-management.md`)*
**Auth:** any authenticated role

Request body: `{ newEmail }` (same `emailSchema` as registration; no `currentPassword` confirmation).
Behavior: uniqueness check as at registration (excludes the requester's own id, so resubmitting the current email is not a conflict), then updates `USER.email` directly. Session token stays valid — its claims carry only `userId`/`role`, never `email`.
Response `200`: updated role DTO (`RecipientDTO` \| `DonorDTO` \| `CourierDTO` \| `UserDTO`)
Errors: `400` invalid format; `409` email already registered to another account

---

## 5A. Media Module — `/api/media`

One shared endpoint for both avatar and listing-image uploads. The backend never receives the image bytes — it only ever hands out permission to write to Supabase Storage (via its `SUPABASE_SERVICE_KEY`) and, once that's done, tells the caller where the object will end up.

### `POST /media/upload-url` *(supporting endpoint — not an explicit PRD story, but required by both Users §5 and Listings §6 to get an image into Supabase Storage before it can be referenced)*
**Auth:** any authenticated role — see per-`purpose` role check below

Request body: `{ purpose: 'AVATAR' | 'LISTING_IMAGE', contentType }` (e.g. `image/png`)
Behavior: `purpose` resolves server-side to a bucket, path prefix, and role check — the client never chooses the bucket directly:

| `purpose` | role required | bucket | path pattern |
|---|---|---|---|
| `AVATAR` | any authenticated role | `avatars` | `avatars/<userId>/<uuid>.<ext>` |
| `LISTING_IMAGE` | `DONOR` | `listings` | `listings/<donorId>/<uuid>.<ext>` |

Generates a Supabase Storage signed upload URL for that path (60s expiry) and, since Supabase's public URL is deterministic and doesn't require the object to exist yet, returns the eventual `mediaUrl` in the same response — there's no separate confirm step.
Response `200`: `{ uploadUrl: string, path: string, token: string, mediaUrl: string, expiresIn: number }`. The client `PUT`s the raw image bytes to `uploadUrl`, then persists `mediaUrl` itself via `PATCH /users/me` (`avatarUrl`, §5) or `POST /listings` (`imageUrl`, §6).
Errors: `400` invalid/unsupported `contentType`; `403` `purpose: 'LISTING_IMAGE'` requested by a non-`DONOR`

**Note:** no image resizing happens server-side — the backend never receives the bytes. Standard avatar/thumbnail sizing is either enforced client-side before upload or deferred to a follow-up using Supabase's on-the-fly image transforms at read time.

---

## 6. Listings Module — `/api/listings`

Covers Donor-side listing management and Recipient-side browsing.

### `POST /listings` — *`4.1.1`*
**Auth:** `DONOR`

Request body: `{ name, description?, imageUrl?, unit, category, isVegetarian, price, donationLimit, rationLimitPerPerson? }` (`city` is inherited from the Donor's profile). `donationLimit` must be a positive whole number; when supplied, `rationLimitPerPerson` must also be a positive whole number. Selecting `unit=PER_REQUEST` is valid here; see `POST /listings/:id/reserve` and `POST /listings/:id/donations` below for how such listings are excluded from those flows.
Response `201`: `ListingDTO`
Errors: `400` invalid unit/category enum, `price` fails the "free or >= 15000 VND" rule, or either quantity limit is zero, negative, or fractional

### `GET /listings/mine` — *`4.1.2`, `4.2.2`*
**Auth:** `DONOR`
**Ownership:** implicit — always scoped to `req.user.id` as `donorId`

Query params: `?status=ACTIVE|PAST` (`ACTIVE` matches `LISTING.status` in `ACTIVE`/`PAUSED`; `PAST` matches `CANCELLED`/`SOLD_OUT`), `search=`, `category=`, `from=`, `to=`, `sort=createdAt|revenue&order=asc|desc`, plus pagination (§2.4).
Response `200`: paginated `{ items: (ListingDTO & { donatedQuantity: number, revenue: number })[], page, limit, total }`.

### `GET /listings/analytics` — *Issue `#137`*
**Auth:** `DONOR`
**Ownership:** implicit — always scoped to `req.user.id` as `donorId`

Runs one MongoDB aggregation over the Donor's Listings and their paid, non-cancelled Orders. No Listing collection is downloaded to the client for browser-side aggregation.
Response `200`: `{ totalRevenue, totalListings, currentListings, soldOutListings, categories: { category, listingCount, revenue }[], topListings: { id, name, revenue }[] }`. `currentListings` counts `ACTIVE` and `PAUSED`; `topListings` contains at most five rows ordered by revenue, then newest creation date. All six food categories are returned, including zero-valued categories.

### `POST /listings/:id/clone` — *`4.1.3`*
**Auth:** `DONOR`
**Ownership:** the listing must belong to `req.user.id`

Request body: none (all static fields copied from the source listing; `status` resets to `ACTIVE`, `quantityRemaining` resets to `donationLimit`, `createdAt` is fresh)
Response `201`: `ListingDTO` (new listing; no reference back to the source)
Errors: `404` listing not found; `403` not the owning Donor

### `PATCH /listings/:id/status` — *`4.2.3`*
**Auth:** `DONOR`
**Ownership:** the listing must belong to `req.user.id`

Request body: `{ status: 'PAUSED'|'ACTIVE'|'CANCELLED' }`
Behavior: transitioning to `CANCELLED` cascades to each non-terminal `ORDER` whose `DELIVERY.stage=AWAITING_COURIER`, plus a Stripe Reservation still awaiting payment with no `DELIVERY`. Orders already `DELIVERED` or `CANCELLED`, including completed Donor-initiated manual Orders that intentionally have no Delivery, are untouched. `ASSIGNED`-or-later deliveries are also untouched. Each cascaded Order gets the same treatment the Recipient's own self-cancel (`DELETE /orders/:id`, §7) applies: Listing stock is restored, a dangling `STRIPE`+`PAYMENT_PENDING` row is cancelled, and a `STRIPE`+`PAID` Order is refunded — the refund call happens only after the cancellation transaction commits, mirroring `DELETE /orders/:id`, so one Order's Stripe failure can't roll back the others' cancellation.
Response `200`: `{ listing: ListingDTO, cancelledOrderCount: number, refundOutcomes: { orderId: string, refundStatus: 'REFUND_PENDING'|'FAILED' }[] }` — `refundOutcomes` has one entry per `STRIPE`+`PAID` Order caught by the cascade (empty array otherwise).
Errors: `409` invalid transition (e.g. re-cancelling an already-cancelled listing)

### `GET /listings/:id/orders` — *`4.2.5`*
**Auth:** `DONOR`
**Ownership:** the listing must belong to `req.user.id`

Only meaningful for `RESERVATION`/`DONOR_INITIATED` orders — Per-Request listings never have orders.
Response `200`: paginated `OrderDTO[]` (each including `recipient: { id, username }` — `paymentMethod`/`paymentStatus` are already on `OrderDTO`, read directly off the order, not joined from a `PAYMENT` record; see the note in §3's `OrderDTO` and §8's Payments section on why cash orders never have a `PAYMENT` row)

### `POST /listings/:id/donations` — *`4.1.4` (revised per PRD §10)*
**Auth:** `DONOR`
**Ownership:** the listing must belong to `req.user.id`

Request body: `{ recipientEmail: string, quantity: number }`. Delivery address, payment selection, cash received, and calculated change are not accepted by this endpoint.
Behavior: looks up the Recipient by email (must be a registered account — no free-text names, per the §10 deviation from `4.1.4`'s literal text; email is used because it is unique). Validates listing ownership and eligibility, remaining stock, any ration limit, and that the Recipient has no existing non-cancelled Order for the listing. The browser performs a live pre-check using the existing Donor-owned `GET /listings/:id/orders` data, but this POST remains authoritative. It decrements stock and creates an `ORDER` with `intakePath=DONOR_INITIATED` and `orderStatus=DELIVERED`. A priced listing produces `paymentMethod=CASH` and `paymentStatus=PAID`; a free listing produces `paymentMethod=null` and `paymentStatus=FREE`. This records an in-person handoff at the Donor's premises: no `DELIVERY`, `PAYMENT`, delivery address, cash-received value, or change value is created or stored.
Response `201`: `OrderDTO`
Errors: `404` recipient email not found; `422` Recipient already has a non-cancelled Order for this listing; `422` quantity exceeds `quantityRemaining` or `rationLimitPerPerson`; `422` listing is `PER_REQUEST` (donor-initiated donations aren't supported on untracked listings)

### `POST /listings/:id/reserve` — *`5.1.2`, `5.1.3`, `5.2.3` (revised per PRD §10)*
**Auth:** `RECIPIENT`

Request body: `{ quantity: number, deliveryAddressText: string, deliveryLocation: { latitude, longitude }, paymentMethod: 'STRIPE'|'CASH' }` (`paymentMethod` required only if `price > 0`)
Behavior — eligibility checks (all `422` on failure): listing `status=ACTIVE`, `unit != PER_REQUEST`, `quantity <= quantityRemaining`, `quantity <= rationLimitPerPerson` (if set), Recipient has no existing non-cancelled order on this listing. Creates `ORDER` (`intakePath=RESERVATION`), decrements `LISTING.quantityRemaining`.
- Free: `paymentStatus=FREE`, `orderStatus=PREPARING`, `DeliveryService.createForOrder` fires immediately.
- Cash: `paymentStatus=PAYMENT_PENDING`, `orderStatus=PREPARING`, `DeliveryService.createForOrder` fires immediately (queue entry doesn't wait for cash — `orderStatus` reflects that it's already in the pipeline even though payment isn't settled yet).
- Stripe: `paymentStatus=PAYMENT_PENDING`, `orderStatus=PENDING_PAYMENT`; **no** Delivery record yet — the client must immediately call `POST /orders/:id/checkout-session` (§7) to complete payment before the order enters the queue. `orderStatus` advances to `PREPARING` only once the webhook (§8) confirms payment.

Response `201`: `OrderDTO`
Errors: `422` see eligibility checks above; `400` missing `paymentMethod` on a priced listing

### `GET /listings` — *`5.1.1`, `5.2.1`, `5.2.2`*
**Auth:** public (unauthenticated browsing allowed)

Query params: `status=ACTIVE` (default, only value supported publicly), `search=` (case-insensitive partial match on `name`), `city=`, `category=`, `priceMin=`, `priceMax=`, `sort=price&order=asc|desc`, plus pagination.
Response `200`: paginated `ListingDTO[]`

*(SRS `5.3.3` location-aware ranking was dropped — see PRD §10. There is no `rank=proximity` mode.)*

### `GET /listings/:id` — *`5.3.4`*
**Auth:** public

Response `200`: `ListingDTO` with `donor` expanded to full `{ id, companyName, addressText, location }` (browsing and Reservation pickup context, and the literal in-person handoff point for Donor-initiated manual donations and Per-Request listings).
Errors: `404`

---

## 7. Orders Module — `/api/orders`

### `GET /orders/mine` — *`5.1.4`*
**Auth:** `RECIPIENT`
**Ownership:** implicit — always scoped to `req.user.id` as `recipientId`

Query params: pagination only.
Response `200`: paginated `OrderDTO[]`, each including `delivery: { stage } | null` and `donor: { id, companyName }`.

### `GET /orders/:id` — *(new — supports the Recipient's order-tracking view; not tied to a distinct PRD story beyond the general order-visibility need already covered by `5.1.4`/`5.2.3`)*
**Auth:** `RECIPIENT`
**Ownership:** the order must belong to `req.user.id`

Response `200`: `OrderDTO`
Errors: `404` order not found — also returned when the order exists but belongs to a different Recipient, so this endpoint never confirms or denies another user's order id

### `DELETE /orders/:id` — *(new, replaces v1's no-cancellation rule)*
**Auth:** `RECIPIENT`
**Ownership:** the order must belong to `req.user.id`

This is the Recipient's own self-cancel action. Donor- and Admin-initiated cancellation are separate endpoints that apply the identical rule at the listing level — `PATCH /listings/:id/status` and `PATCH /admin/listings/:id/cancel` — cascading to every affected order rather than targeting one `orderId` directly.

Behavior: first rejects any terminal Order (`orderStatus=DELIVERED` or `CANCELLED`). For a non-terminal Order, it atomically checks the associated `DELIVERY.stage`. Cancellation proceeds when `stage=AWAITING_COURIER`, or when a Stripe Reservation is still awaiting payment and has no Delivery: `ORDER.orderStatus=CANCELLED`, `cancelledByUserId=<req.user.id>`, `cancelledAt=now`; `LISTING.quantityRemaining` is restored. A completed Donor-initiated manual Order has no Delivery by design but remains non-cancellable because its status is already `DELIVERED`. If a Delivery is `ASSIGNED` or later, the update is rejected — this is the same atomic check that backs the claim endpoint's guarantee (`PATCH /deliveries/:id/claim`, §9).

**Automatic Stripe refund:** if the cancelled order has `paymentMethod=STRIPE` and `paymentStatus=PAID`, the cancellation additionally triggers a synchronous `stripe.refunds.create()` call against `PAYMENT.stripePaymentIntentId`. On success, `PAYMENT.status`/`ORDER.paymentStatus=REFUND_PENDING` and `PAYMENT.stripeRefundId` is stored — **not** `REFUNDED` yet, since Stripe's synchronous response isn't treated as final; the refund is only confirmed `REFUNDED` by the `refund.updated` webhook (§8), which also emits `payment:refunded` (§12) to push the update live. If the Stripe API call itself fails, cancellation still proceeds (never blocked on Stripe reachability) and the response reports `refundStatus=FAILED` for manual follow-up. Idempotent: a `PAYMENT` already `REFUND_PENDING` or `REFUNDED` is not refunded again. Orders that are free, cash, or Stripe-but-never-paid (`PENDING_PAYMENT`, no money taken) get `refundStatus=NOT_APPLICABLE` and no Stripe call at all.

Response `200`: `OrderDTO & { refundStatus: 'NOT_APPLICABLE' | 'REFUND_PENDING' | 'FAILED' }`
Errors: `404` order not found; `409` Order already terminal or Delivery already `ASSIGNED`/`PICKED_UP`/`DELIVERED` — "This order can no longer be cancelled."

### `POST /orders/:id/feedback` — *`5.2.4`*
**Auth:** `RECIPIENT`
**Ownership:** the order must belong to `req.user.id`

Request body: `{ comment: string }`
Precondition: `orderStatus=DELIVERED`
Response `201`: `{ feedback: { comment, createdAt } }`
Errors: `409` order not yet delivered; `409` feedback already submitted (one per order)

### `POST /orders/:id/checkout-session` — *supports card checkout for Reservation orders (`5.2.3`, `6.2.1`), including first-time Stripe card registration*
**Auth:** `RECIPIENT`
**Ownership:** the order must belong to `req.user.id`

Precondition: `ORDER.paymentMethod=STRIPE` and `paymentStatus=PAYMENT_PENDING`.
Behavior: if `RECIPIENT.stripeCustomerId` is unset, creates a Stripe Customer first and persists it. Creates a Stripe Checkout Session (one-off payment mode, amount = `ORDER.amount`) attached to that customer, tagged with `orderId` in metadata. Creates/updates a `PAYMENT` row (`payableType=ORDER`, `status=PENDING`).
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
| `checkout.session.completed` (payment mode) | Look up `ORDER` via session metadata → `ORDER.paymentStatus=PAID`, `orderStatus=PREPARING`; `PAYMENT.status=PAID`, `paidAt=now`, `stripePaymentIntentId=session.payment_intent` (captured now so a later refund doesn't need an extra Stripe lookup); **now** call `DeliveryService.createForOrder` (Stripe orders only enter the queue after payment succeeds); emit `payment:success` (§12) |
| `checkout.session.completed` (subscription mode) | No-op (logged only) — nothing to create yet at this point, since there's no invoice/period data on the Checkout Session itself. The `SUBSCRIPTION` row is created by `invoice.paid` below, which fires immediately after for both the first payment and every renewal |
| `invoice.paid` | Append a new `SUBSCRIPTION` row for the new billing cycle (append-only ledger per `docs/database_design.md`); send confirmation email (Nodemailer) |
| `invoice.payment_failed` | Latest `SUBSCRIPTION.status=PAST_DUE` |
| `customer.subscription.updated` | Reconcile `cancelAtPeriodEnd` on the latest `SUBSCRIPTION` row from `event.data.object.cancel_at_period_end` (keeps the local flag in sync if a cancellation is ever toggled outside `PATCH /subscriptions/me`). Optional — the `PATCH` response is the primary source of truth for the flag |
| `customer.subscription.deleted` | Latest `SUBSCRIPTION.status=CANCELLED` (fires at `currentPeriodEnd` for a `cancel_at_period_end` cancellation — see `PATCH /subscriptions/me`, §10) |
| `refund.updated` | Confirms a refund initiated by `DELETE /orders/:id` (§7) actually settled. Ignored unless `event.data.object.status=succeeded` (a refund can update through `pending`/`failed`/`canceled` first). Look up `PAYMENT` via `stripeRefundId=event.data.object.id` → `PAYMENT.status=REFUNDED`, `refundedAt=now`; `ORDER.paymentStatus=REFUNDED`; emit `payment:refunded` (§12). If no matching `PAYMENT` (e.g. `stripeRefundId` not yet persisted when the event arrives), safe to ignore — the event isn't retried indefinitely, but this ordering shouldn't occur since the id is stored synchronously before the webhook can fire. Chosen over the older `charge.refunded` event, which as of Stripe's 2024-10-28 API change no longer reliably carries refund id/status in its payload — `refund.updated` now fires for every refund type (not just chargeless ones) and gives both directly |

Idempotency: for order/refund events, `PAYMENT.lastProcessedEventId` (per `docs/database_design.md`) is checked before applying any event, guarding against Stripe's at-least-once webhook delivery. Subscription billing events create no `PAYMENT` row, so they dedupe separately: `invoice.paid` guards on `SUBSCRIPTION.stripeInvoiceId` (unique, sparse) — a re-delivered event finds the existing row by invoice id and appends nothing a second time.
Response: `200` (always, once the event is durably processed or recognized as a duplicate) — Stripe treats non-2xx as "retry."

---

## 9. Delivery Module — `/api/deliveries`

*Sole Additional Feature. New module — no existing scaffold.*

### `GET /deliveries/queue` — *(new)*
**Auth:** `COURIER`

Query params: pagination (default sort is fixed — oldest-first, not client-selectable).

Response `200`: paginated **`QueueDeliveryDTO[]`** where `stage=AWAITING_COURIER`, sorted by `DELIVERY.createdAt` ascending — the moment the Order became claimable; see E2's amendment note. This is a deliberately lean shape, **not** a `DeliveryDTO`: an unclaimed row has no courier, no pickup/deliver timestamps and a constant stage, so none of that is sent.

```jsonc
{
  "id": "string",                       // DELIVERY id — the value passed to /claim
  "createdAt": "datetime",              // became claimable; the sort key
  "listing": {
    "name": "string | null",
    "pickupAddressText": "string | null",
    "pickupAddressLocation": "GeoLocation | null"
  },
  "order": {
    "quantity": "number | null",
    "deliveryAddressText": "string | null",
    "deliveryLocation": "GeoLocation | null",
    "amount": "number | null",
    "requiresCashCollection": "boolean"                    // same rule as DeliveryDTO — known before claiming, not just after
  },
  "donor": { "companyName": "string | null" }
}
```

`listing.*`, `order.*`, and `donor.*` each come from one bulk join (Listing→Donor, and the Orders) — no per-row query — and each block degrades to `null` as a unit when its join fails for a row, rather than the row being dropped. A Courier can see what the load is and weigh both ends of the trip before claiming. The Donor's address is already public via `GET /listings/:id` (§6) for every listing, so surfacing it pre-claim exposes nothing new; see E5.

### `GET /deliveries/active` — *(new)*
**Auth:** `COURIER`
**Ownership:** implicit — always scoped to `req.user.id` as `courierId`

The Courier client's landing check on load/reload: is there already a delivery in progress? A Courier can have at most one delivery in `ASSIGNED`/`PICKED_UP` at a time (enforced by the claim endpoint below), so this is a singular lookup, not a paginated list.
Response `200`: `DeliveryDTO` (the Courier's delivery currently in `ASSIGNED` or `PICKED_UP`)
Errors: `404` no active delivery for this Courier — client falls through to the queue (`GET /deliveries/queue`)

### `PATCH /deliveries/:id/claim` — *(new)*
**Auth:** `COURIER`

Behavior: atomic conditional update — `stage: AWAITING_COURIER → ASSIGNED` only if still `AWAITING_COURIER`, and only if the Courier has no other `DELIVERY` in `ASSIGNED`/`PICKED_UP`. Both checks happen in the same atomic operation to prevent double-claim races.
Response `200`: `DeliveryDTO`
Errors: `409` already claimed by another Courier; `409` this Courier already has an active delivery

### `GET /deliveries/:id` — *(new)*
**Auth:** `RECIPIENT` (must be the order's recipient — powers the live status/tracking events below), or `ADMIN`

Not exposed to `COURIER` — a Courier's own in-progress delivery is always reached via `GET /deliveries/active` or the `DeliveryDTO` returned directly by `claim`/`pickup`/`deliver`, never by looking up an arbitrary ID; there's no Courier delivery-history feature that would need one.

Response `200`: `DeliveryDTO`, including `pickupAddressText` (Donor's address as text) for both allowed roles — no role gating needed here, since the Donor's address is already public via `GET /listings/:id` (§6) for every listing regardless of intake path, so withholding it on this endpoint wouldn't protect anything. `courierLastLocation` is only populated while `stage=PICKED_UP` (§12).

### `PATCH /deliveries/:id/pickup` — *(new)*
**Auth:** `COURIER`
**Ownership:** must be the Courier assigned to this delivery

Sets `stage=PICKED_UP`, `pickedUpAt=now`. From this point the Courier's client begins sending location pings over WebSocket (§12) — this REST call only flips the stage. `ORDER.orderStatus` is deliberately untouched by this call — it stays `PREPARING` throughout claim/pickup; clients drive delivery-progress UI (e.g. the Recipient's stepper) off `DeliveryDTO.stage`, not `orderStatus`.
Response `200`: `DeliveryDTO`
Errors: `409` not currently `ASSIGNED`

### `PATCH /deliveries/:id/deliver` — *(new)*
**Auth:** `COURIER`
**Ownership:** must be the Courier assigned to this delivery

Request body: `{ cashConfirmed?: boolean }` — required and must be `true` if the associated Reservation has `paymentMethod=CASH` and `paymentStatus=PAYMENT_PENDING`; ignored otherwise.
Behavior: sets `stage=DELIVERED`, `deliveredAt=now`; `ORDER.orderStatus=DELIVERED`; for a pending cash Reservation, it also flips `ORDER.paymentStatus: PAYMENT_PENDING → PAID` and logs `{ courierId, confirmedAt }` on the order for basic audit traceability. Donor-initiated manual Orders never reach this endpoint because they have no Delivery.
Response `200`: `DeliveryDTO`
Errors: `409` not currently `PICKED_UP`; `400` cash order missing `cashConfirmed: true`

### Internal: `DeliveryService.createForOrder(orderId)` — *(new)*
Not an HTTP route — a same-process service-interface call (`A.3.1`) invoked for queue-eligible Reservation Orders: immediately by `POST /listings/:id/reserve` for free/cash Reservations, or by the Stripe webhook after successful Reservation payment. It creates a `DELIVERY` row (`stage=AWAITING_COURIER`, `orderId`) and must reject or ignore `DONOR_INITIATED` Orders. Donor-initiated manual donations and Per-Request listings never call this interface.

---

## 10. Subscriptions Module — `/api/subscriptions`

*Premium subscription and preferences.*

### `GET /subscriptions/me` *(supporting endpoint — needed to render Premium/upgrade UI state; `RECIPIENT.tier` is derived from this)*
**Auth:** `RECIPIENT`
Response `200`: `{ tier: 'STANDARD'|'PREMIUM', subscription: SubscriptionDTO | null }` (`subscription` is the latest row, including its `cancelAtPeriodEnd` flag; `tier` is derived — `PREMIUM` iff the row is `ACTIVE` and `currentPeriodEnd` is in the future, unaffected by a pending `cancelAtPeriodEnd` until the period actually ends)

### `POST /subscriptions/checkout-session` — *`6.2.1`*
**Auth:** `RECIPIENT`

Behavior: creates a Stripe Checkout Session in subscription mode ($5/month), creating a Stripe Customer first if none exists (shared logic with `POST /orders/:id/checkout-session`, §7).
Response `200`: `{ checkoutUrl: string }`
Confirmation happens via the `POST /webhooks/stripe` handler (§8), which creates the `SUBSCRIPTION` row and sends the confirmation email.

### `PATCH /subscriptions/me` — *(new — not tied to an original PRD story; see `docs/user-story/F-premium-subscription/F5-cancel-subscription.md`)*
**Auth:** `RECIPIENT` (tier must be `PREMIUM` — the caller must have an `ACTIVE`, unexpired subscription)

Request body: `{ cancelAtPeriodEnd: boolean }` — one endpoint, both directions: `true` cancels, `false` resumes.

Behavior: calls `stripe.subscriptions.update(<stripeSubscriptionId>, { cancel_at_period_end })` on the caller's own latest subscription, then persists the same flag on that `SUBSCRIPTION` row. **Cancelling does not revoke access immediately** — `status` stays `ACTIVE`, `RECIPIENT.tier` stays `PREMIUM`, and Premium-gated endpoints (`POST`/`PATCH`/`DELETE /recipients/me/preferences`) keep working until `currentPeriodEnd`. At period end Stripe stops billing and fires `customer.subscription.deleted`, which the §8 handler turns into `status=CANCELLED`; the derived tier then lapses to `STANDARD`. Resuming (`cancelAtPeriodEnd: false`) while `currentPeriodEnd` is still in the future needs no new Checkout Session and triggers no second charge.
Idempotent both ways: sending the same value as the current flag is a no-op `200` with the same DTO — no second Stripe call.
Response `200`: `SubscriptionDTO`
Errors: `409` no `ACTIVE`, unexpired subscription to cancel/resume (never subscribed, or already lapsed)

### `GET /recipients/me/preferences` — *`5.3.1`*
**Auth:** `RECIPIENT`

Response `200`: `NotificationPreference[]` — the caller's own rows, regardless of tier (a downgraded Recipient can still see stored preferences, just not edit them).

### `POST /recipients/me/preferences` — *`5.3.1`*
**Auth:** `RECIPIENT` (tier must be `PREMIUM` — `403` otherwise)

Request body: `{ preferenceTitle, categories, vegetarian?, priceMin?, priceMax?, city?, isActive? }`
Response `201`: `NotificationPreference`
Errors: `403` not a Premium Recipient; `400` invalid category enum / malformed price range

### `PATCH /recipients/me/preferences/:id` — *`5.3.1`*
**Auth:** `RECIPIENT` (tier must be `PREMIUM` — `403` otherwise)

Request body: any subset of the `POST` fields (e.g. `{ isActive: false }` to pause)
Response `200`: `NotificationPreference`
Errors: `403` not a Premium Recipient; `404` `:id` doesn't belong to the caller; `400` invalid category enum / malformed price range

### `DELETE /recipients/me/preferences/:id` — *`5.3.1`*
**Auth:** `RECIPIENT` (tier must be `PREMIUM` — `403` otherwise)

Response `200`
Errors: `403` not a Premium Recipient; `404` `:id` doesn't belong to the caller

---

## 11. Admin Module — `/api/admin`

*Admin account, listing, and Courier/delivery oversight.*

### `POST /admin/couriers` — *(new)*
**Auth:** `ADMIN`

Request body: `{ username, email, tempPassword, fullName }`
Response `201`: `CourierDTO`
Errors: `409` email already registered

### `GET /admin/couriers` — *(extends `7.1.1`)*
**Auth:** `ADMIN`
Response `200`: paginated `CourierDTO[]` (also reachable via `GET /admin/users?role=COURIER` below — kept as a convenience alias since the PRD calls out Courier account listing separately from general account management)

### `GET /admin/deliveries` — *(extends `7.3.1`)*
**Auth:** `ADMIN`

Query params: `stage=`, pagination.
Response `200`: paginated `DeliveryDTO[]`, each including `courier: { id, fullName } | null` and `order: { id, recipientId }` — read-only, no assignment controls (explicit scope boundary per the PRD).

### `GET /admin/users` — *`7.1.1`*
**Auth:** `ADMIN`

Query params: `role=RECIPIENT|DONOR|COURIER|ADMIN`, `status=`, `search=`, pagination.
Response `200`: paginated role-appropriate DTOs.

### `PATCH /admin/users/:id/status` — *`7.2.1`*
**Auth:** `ADMIN`

Request body: `{ status: 'ACTIVE'|'DEACTIVATED' }`
Behavior: deactivating revokes all of that user's live tokens (inserts current-session `jti`s into `REVOKED_TOKEN`, `reason=ADMIN_DEACTIVATE`).
Response `200`: `UserDTO`

### `PATCH /admin/listings/:id/cancel` — *`7.2.2`*
**Auth:** `ADMIN`

Same cascade rule as the Donor's listing-cancel endpoint (`PATCH /listings/:id/status`, §6): only `AWAITING_COURIER`-or-no-Delivery orders on the listing are auto-cancelled; `cancelledByUserId=<admin's userId>`; same per-order stock restoration and refund handling.
Response `200`: `{ listing: ListingDTO, cancelledOrderCount: number, refundOutcomes: { orderId: string, refundStatus: 'REFUND_PENDING'|'FAILED' }[] }`

### `GET /admin/listings` — *`7.3.1`, `7.3.2`*
**Auth:** `ADMIN`

Query params: `search=` (matches Donor name/ID or listing ID), pagination.
Response `200`: paginated `ListingDTO[]` with full detail (no status filter — Admin sees all statuses, unlike the public `GET /listings`).

---

## 12. Real-Time Events (Socket.IO)

One shared Socket.IO layer (`5.3.2`/`4.3.1`/`7.3.3`/`6.1.2` + Courier tracking) delivers a **live, in-session feed**. As of Epic H, the six events that map to a `NotificationType` (marked below) are never emitted directly by their owning module — they go through one `notificationService.send(...)` call (§14) that both emits the event and persists it as a `NOTIFICATION` row (`docs/database_design.md`), so they survive a reload. There is still no read/unread state (that stays out of scope, PRD §8). `delivery:location` (GPS pings) is the one exception: it calls `emitToUser(...)` directly and is never persisted — too frequent to justify a row.

### Connection

Client connects with the JWT in the handshake (`socket.handshake.auth.token`); the server validates it the same way as HTTP requests (including the `REVOKED_TOKEN` check) and joins the socket to a personal room `user:<userId>`. An order-scoped room `order:<orderId>` is joined on demand when a Recipient opens that order's tracking view and left when they navigate away.

### Event catalog

| Event | Room | Emitted when | Payload | SRS |
|---|---|---|---|---|
| `listing:sold_out` | `user:<donorId>` | `LISTING.quantityRemaining` hits 0 | `{ listingId, name, message }` | `4.3.1` |
| `notification:premium_match` | `user:<recipientId>` | new `ACTIVE` listing matches a Premium Recipient's saved preference | `{ listingId, name, preferenceTitle, message }` | `5.3.2` |
| `notification:admin_cancel` | `user:<recipientId>` | Admin/Donor cascade cancels this Recipient's order | `{ orderId, listingName, message }` | `7.3.3` |
| `payment:success` | `user:<recipientId>` | Stripe webhook confirms `checkout.session.completed` for an order | `{ orderId, message }` | `6.1.2` |
| `payment:refunded` | `user:<recipientId>` | Stripe webhook confirms `refund.updated` (`status=succeeded`) for a cancelled order (D4) | `{ orderId, message }` | new |
| `order:status_changed` | `user:<recipientId>` | any `DELIVERY.stage` transition on that Recipient's order | `{ orderId, stage, message }` | new |
| `delivery:location` | `order:<orderId>` | Courier GPS ping, only while `stage=PICKED_UP` | `{ orderId, latitude, longitude, updatedAt }` | new |
| `delivery:delivered` | `user:<recipientId>` | `stage → DELIVERED` | `{ orderId, deliveredAt, message }` | new |
| `delivery:delivered` | `order:<orderId>` | `stage → DELIVERED` | `{ orderId, deliveredAt }` | new |

`delivery:location` is scoped strictly to `order:<orderId>` (never broadcast to `user:<recipientId>` at large) so a Recipient only ever sees a Courier's position for an order that is currently theirs and currently `PICKED_UP`.

**Send mapping (Epic H):** `listing:sold_out` → `NOTIFICATION.type=SOLD_OUT`; `notification:premium_match` → `PREMIUM_MATCH`; `notification:admin_cancel` → `ADMIN_CANCEL`; `payment:success` → `PAYMENT_SUCCESS`; `payment:refunded` → `PAYMENT_REFUNDED`; `order:status_changed`/`delivery:delivered` → `DELIVERY_STATUS`. Each of these is emitted *and* persisted from inside a single `notificationService.send(...)` call — the owning module (`listings`, `payments`, `delivery`, and eventually `subscriptions`/`admin`) never calls `emitToUser(...)` directly for these types. See §14 and `docs/epic/H-notifications.md`.

### Client → server events

| Event | Sent by | Effect | Payload |
|---|---|---|---|
| `order:join` | `RECIPIENT` | Joins `order:<orderId>` after an ownership check, so this Recipient receives `delivery:location` for that order | `orderId` |
| `order:leave` | any | Leaves `order:<orderId>` | `orderId` |
| `delivery:ping` | `COURIER` | Writes `DELIVERY.courierLastLocation` on whichever Delivery this Courier is carrying, then emits `delivery:location` to that order's room | `{ latitude, longitude }` |

`delivery:ping` deliberately carries **no delivery id**: the server resolves the
target from the authenticated socket's user id and the `PICKED_UP` stage, so a
Courier can only ever write to their own in-progress Delivery. Invalid or
unauthorized pings are ignored silently rather than answered with an error,
matching `order:join`.

---

## 13. Explicit Non-Endpoints (Out of Scope)

Per PRD §8, the following are intentionally **not** part of this API:

- Any endpoint that creates an `ORDER`, `PAYMENT`, or `DELIVERY` for a `PER_REQUEST` listing — enforced by `422` in `POST /listings/:id/reserve` and `POST /listings/:id/donations`.
- Any endpoint that creates a `DELIVERY` or `PAYMENT` for a `DONOR_INITIATED` manual Order; that path is completed in person and persisted directly as a terminal Order.
- `POST /deliveries/:id/redo` or any failure/retry endpoint — every claimed delivery is expected to complete.
- Any Courier self-registration route (`POST /auth/register/courier` does not exist) — Couriers are Admin-created only.
- Any Admin manual-assignment route (`PATCH /admin/deliveries/:id/assign` does not exist) — claim-based queue only.
- A mark-as-read/unread action, or any read-state field on `NOTIFICATION` — `GET /notifications` (§14, Epic H) returns a durable history, but there is no read/unread tracking, per §8.
- Cancellation on an `ASSIGNED`-or-later delivery — enforced by the same atomic check backing the claim/cancel endpoints above, always `409`.
- An AFF Wallet balance endpoint of any kind.

---

## 14. Notifications Module — `/api/notifications`

*New in Epic H.* Centralizes both halves of sending one of the six notification-worthy events in §12's catalog: `notificationService.send({ userId, type, orderId?, listingId?, payload })` emits the matching Socket.IO event *and* writes a `NOTIFICATION` row (`docs/database_design.md`) in one call, so a user can look it up after the live toast is gone. This module doesn't own any of the triggering business logic — the Listings, Payments, Delivery, Subscriptions, and Admin services each call `sendNotification(...)` (exposed via `notification.interface.ts`, per `AGENTS.md`'s cross-module rule) at the point they used to call `emitToUser(...)` directly (§12's send mapping); no other module calls `emitToUser(...)` or writes to `NOTIFICATION` for these six types.

### `GET /notifications` — *`H2`*
**Auth:** any authenticated role
**Ownership:** implicit — always scoped to `req.user.id` as `userId`

Query params: pagination only (§2.4).
Response `200`: paginated `NotificationDTO[]` (§3), newest (`createdAt`) first.
Errors: `401` missing/invalid/revoked token — same as every other protected route.
