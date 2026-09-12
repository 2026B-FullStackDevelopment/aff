# AFF (Affordable Food Federation) Platform — Product Requirements Document


## 1. Executive Summary

AFF is a web-based food redistribution platform connecting food-insecure **Recipients** with surplus-holding **Donors**, operated by an **Admin**, and fulfilled in most cases by **Couriers**. Standard Reservations support Stripe or cash and use the Courier pipeline. A Donor-initiated manual donation records food handed directly to a registered Recipient at the Donor's premises: priced donations are cash-only, the Donor calculates change in the browser, and the resulting Order is immediately paid and delivered without a Delivery record. A third path — **Per-Request listings** — stays outside the order system entirely: the app simply shows the Donor's location and the Recipient collects in person, exactly as the base SRS originally intended.

The team is targeting **Ultimo tier across Architecture (`A.1`–`A.3`) and all 8 Functional Requirement groups**, with **Courier Delivery & Real-Time Tracking** as the team's sole Additional Feature, deployed on Render with MongoDB Atlas.

---

## 2. Problem Statement

### Who has this problem?
- **Recipients**: individuals facing financial hardship or limited access to affordable food.
- **Donors**: businesses (grocers, restaurants, producers) with surplus food.
- **Admin (platform operator)**: needs a trustworthy, auditable marketplace with minimal manual intervention.
- **Couriers**: need an unambiguous, one-job-at-a-time queue rather than an ad hoc dispatch process.

### What is the problem?
1. **Global paradox** [SRS Introduction]: ~1.05 billion tonnes of food wasted in 2022 (19% of all food available to consumers) coexists with ~783 million people affected by hunger.
2. **Discovery friction**: without a structured marketplace, Donors can't efficiently list surplus and Recipients can't efficiently find it.
3. **Physical access friction**: requiring every Recipient to travel to a Donor excludes people without transport, mobility, or spare time. Courier delivery removes that barrier for standard Reservations. Donor-initiated manual donations and Per-Request listings represent separate in-person collection flows at the Donor's premises.
4. **Payment access friction**: requiring a card excludes Recipients without one. Supporting both Stripe and cash keeps the marketplace usable regardless of banking access.

### Evidence
Academic project — evidence is the SRS's own cited rationale (UNEP Food Waste Index Report 2024) plus the internal reasoning above; there is no user-research budget for this assignment.

---

## 3. Target Users & Personas

| Persona | Role | Goals | Notes under this design |
|---|---|---|---|
| **Recipient** | Registered individual buying/receiving affordable food | Find suitable food, order it, receive it reliably | No address required at signup — a delivery address is captured for Reservations. A Stripe card is requested only for Recipient-selected Stripe checkout. Donor-initiated manual donations are completed in person and do not require an address or card. |
| **Donor** | Registered business with surplus food | Redistribute food with minimal admin overhead | Address geocoded at signup — reused for map display and as the in-person handoff location for Donor-initiated manual donations and Per-Request listings. |
| **Admin** | Platform operator | Keep the marketplace healthy: accounts, listings, and deliveries | Read-only oversight of the Courier queue in addition to existing account/listing management. |
| **Courier** | Admin-created delivery agent | Work through a shared delivery queue, one job at a time | Claim-based queue, one active delivery at a time. **Collects cash only for cash-paid Reservations still marked `PAYMENT_PENDING`** — exact cash only, no change given. Donor-initiated manual donations never enter the Courier queue. No self-registration. |

---

## 4. Strategic Context

### Grading framing
Milestone 1/2 deliverable for COSC2769. **Confirmed: target Ultimo tier across Architecture (`A.1`–`A.3`) and all 8 Functional Requirement groups.** Tiers are cumulative, so Ultimo means Simplex + Medium + Ultimo all apply — except where explicitly deviated from (§10).

### Confirmed technical/process decisions
- **Payment**: Stripe **and** cash. No AFF Wallet, anywhere. For a standard Reservation, the Recipient selects Stripe or cash-on-delivery; cash Reservations enter the Courier queue with `paymentStatus=PAYMENT_PENDING` and become `PAID` when the Courier confirms collection. A priced Donor-initiated manual donation is cash-only. The Donor enters the cash received during the in-person handoff, and the frontend calculates and displays `change = cashReceivedAmount - orderAmount`; the cash amount and change are transient UI values and are never sent to or stored by the backend. Successful submission creates an Order with `paymentMethod=CASH`, `paymentStatus=PAID`, and `orderStatus=DELIVERED`. A free manual donation creates an Order with `paymentStatus=FREE` and `orderStatus=DELIVERED`. *(Deviation from `4.1.4`, `5.1.3`, and `6.1.1`; see §10.)*
- **Fulfillment**: Courier delivery is mandatory only for the **Reservation** intake path. A Donor-initiated manual donation records an in-person handoff and creates no `DELIVERY`. **Per-Request listings are not tracked as Orders at all** — no payment, no Courier, no digital record; the Recipient sees the Donor's address and collects in person, matching the SRS's original `4.2.1` intent.
- **Cancellation**: a pending Reservation may be cancelled while it is still unclaimed (`DELIVERY.stage = AWAITING_COURIER`, or before its delayed Stripe Delivery is created). Once a Courier claims it (`ASSIGNED` or later), it can no longer be cancelled. Donor-initiated manual Orders are created as `DELIVERED` and are terminal, so their lack of a Delivery record must never make them cancellable.
- **Additional Feature**: Courier Delivery with Real-Time Tracking remains the team's **sole** Additional Feature (Section 8), at Ultimo tier.
- **Architecture**: Backend Modular Monolith, each bounded-context module internally layered Route → Controller → Service → Repository → Model (`A.1.2`, `A.2.1`), cross-module calls only via exposed service interfaces (`A.3.1`), DTOs on all responses (`A.3.2`), RBAC middleware as the single coarse-grained authorization enforcement point (`A.2.3`) covering all four roles, with fine-grained ownership checks in the Service layer (`A.2.2`). Delivery/Courier is its **own bounded module** with its own MongoDB collection, referenced by ID from the Order module — not embedded fields.
- **Frontend**: React, Page → Component → Hook → Service → Reusable Component hierarchy (`A.1.3`), global API route config + shared REST helper (`A.2.a`/`A.2.b`), frontend RBAC (`A.2.c`), modularized components with hooks/service-calls/styling split into separate files (`A.3.a`/`A.3.b`), responsive Profile and Admin UIs (`A.3.c`).
- **Auth**: JWT/JWS per Ultimo `2.3.1`/`2.3.2`, with a server-side `REVOKED_TOKEN` record (`jti` + TTL-indexed expiry) checked by auth middleware before the Controller layer — plain client-side token deletion doesn't satisfy the SRS's revocation requirement.
- **Real-time & notifications**: one shared Socket.IO layer delivering a **live, in-session feed** — not a persisted read/unread inbox — for listing sold out (`4.3.1`), Premium match (`5.3.2`), Admin cancellation (`7.3.3`), payment success (`6.1.2`), and Courier delivery status/location events.
- **Deployment**: Render (frontend + backend) + MongoDB Atlas — satisfies the maximum available Deployment tier (`D.2.1`, Medium; there is no Ultimo deployment tier).
- **Process constraints** (unchanged, restated for completeness): GitHub as sole project-management/storage tool, iterative delivery, mandatory sprint reviews at Weeks 2/5/11, grading penalties for weak GitHub usage [`P1`, `P2`, `P3`].
- **Manual-donation data boundary**: `cashReceivedAmount` and calculated change are frontend-only values. The Order persists its amount and final payment state, but no cash-tender or change fields.

---

## 5. Solution Overview

AFF is a role-based marketplace with four roles: **Recipient, Donor, Admin, Courier**. Standard Reservations use the Courier delivery pipeline and support Stripe or cash. Donor-initiated manual donations record a completed in-person handoff, while Per-Request listings stay entirely outside the digital order system.

**Path 1 — Standard online reservation** [`5.1.2`, revised]: Recipient browses/searches listings, reserves one, and chooses Stripe checkout (charged immediately, order enters the queue on success) or cash-on-delivery (order enters the queue immediately as `PAYMENT_PENDING`, flips to `PAID` when the Courier confirms cash collected).

**Path 2 — Donor-initiated manual donation** [`4.1.4`, revised]: At the Donor's premises, the Donor selects a listing, a *registered* Recipient, and a quantity. A priced donation is cash-only. The Donor enters the cash received, and the frontend displays the calculated change and rejects an amount below the total. Submission sends only the Recipient and quantity, then records the Order as `paymentMethod=CASH`, `paymentStatus=PAID`, and `orderStatus=DELIVERED`. A free donation is recorded as `paymentStatus=FREE` and `orderStatus=DELIVERED`. Neither case creates a Delivery.

**Path 3 — "Per Request" donation (untracked)** [`4.2.1`, unchanged from SRS intent]: Donor creates a Per-Request listing. No online reservation, no Order record, no payment, no Courier. The listing publicly shows the Donor's pickup address; Recipients self-arrange collection, and food may still be available (or not) when they arrive — matching the SRS's original warning language.

Only queue-eligible Path 1 Reservation orders call `DeliveryService.createForOrder(orderId, ...)` on the dedicated Delivery module, which runs the shared Courier lifecycle:

```
AWAITING_COURIER --[claim]--> ASSIGNED --[Picked Up]--> PICKED_UP --[Delivered + pending Reservation cash confirmed if applicable]--> DELIVERED
```

Any Courier can claim an unclaimed order from a shared, oldest-first queue; claiming is atomic (prevents double-claim races); a Courier holds one active delivery at a time. **Cancellation window**: the Recipient, the Donor (via listing cancel), or Admin may cancel an order while it sits in `AWAITING_COURIER`. Once `ASSIGNED`, cancellation is blocked. Live GPS tracking runs only during `PICKED_UP`, visible only to that order's Recipient over WebSocket; `DELIVERED` is terminal and sole-source-of-truth (no Recipient confirmation step).

**Supporting capabilities**: registration/login/profile management, with a delivery address captured per Reservation rather than at signup [`1A`, `1B`, `2`, `3`]; Donor donation lifecycle management (pause/resume/cancel, rationing, search/filter/sort, statistics) [`4`]; Premium subscription via Stripe recurring billing with preference-based notifications and location-aware ranking [`5.3`, `6`]; Admin oversight of accounts (including Couriers), listings, and deliveries [`7`].

---

## 6. Success Metrics

### Primary metric
**Requirement coverage**: % of Ultimo-tier SRS requirements (across all 8 functional groups + Architecture), as scoped by the deviations in §10, implemented and demonstrable end-to-end by the Milestone 2 demo. **Target: 100%.**

### Secondary metrics
- **Real-time tracking latency**: Courier GPS ping → visible on Recipient's live map, target consistently under ~10 seconds.
- **Claim-race correctness**: zero double-claimed deliveries under concurrent test.
- **Payment correctness**: zero priced Reservations enter the Courier queue without a payment method assigned. Stripe Reservations enter only after successful Checkout; cash Reservations enter with cash collection pending. Priced manual donations are recorded immediately as cash-paid and delivered, while their tender and change stay frontend-only. Free orders remain explicitly `FREE`. Zero manual donations create a Delivery, and zero Per-Request listings produce an Order.
- **Cancellation correctness**: zero orders cancelled after a Courier has already claimed them, enforced atomically alongside the claim check.
- **Gold Data Set completeness**: all SRS-mandated seeded accounts present and working, plus at least one seeded Courier account with an in-flight (`PICKED_UP`) delivery, one cash Reservation awaiting Courier collection, one completed Donor-initiated cash Order with no Delivery, and one Stripe Reservation so every persisted payment path can be demonstrated without live setup.
- **Architecture rubric alignment**: layered/modular backend structure, RBAC middleware, DTOs, and the Delivery module's service-interface boundary demonstrably in place and explainable by every team member [Project Interviews].

### Guardrail metrics
- No GitHub process penalties — frequent, attributable commits/issues throughout [`P1`, `P2`].
- No regression to core Donor/Recipient/Admin flows from the Courier/payment changes — the marketplace must remain fully functional end-to-end.

---

## 7. User Stories & Requirements

Each story below is a **full vertical slice** — UI, API, and data model behavior are specified together so a single story is independently implementable and demonstrable, rather than split across frontend/backend tickets. SRS requirement IDs are in parentheses for traceability.

### Epic A — Authentication
*Traceability: `1A`, `1B`, `2`. Ultimo throughout.*

**A1. Recipient Registration** (`1A.1`, `1A.2`, `1A.3.1`)
> As a Recipient, I want to register with username, email, password, and city, so I can access the marketplace.
- UI: dropdown-based city selector (VN provinces/municipalities only, sourced from the `country-state-city` npm package); inline field errors with cause + valid-format example. No address field at this stage.
- API: `POST /auth/register/recipient` enforces unique email, validates username/email/password rules server-side (mirroring frontend rules), hashes the password before persisting.
- Data: creates `USER` (role=RECIPIENT, status=ACTIVE) + `RECIPIENT` (tier=STANDARD, empty `notificationPreferences`).

**A2. Donor Registration** (`1B.1`, `1B.2`, `1B.3.1`)
> As a Donor, I want to register with a username, company name, email, password, tax code, city, and pickup address, so Couriers and Recipients have accurate location data.
- UI: same validation pattern as A1 (including the same username syntax rule), plus an address field that queries OSM Nominatim for matching candidates as the Donor types; the Donor must select one of the returned options before submission completes (no pin-drop/map interaction).
- API: `POST /auth/register/donor` validates username/company name/tax code format server-side alongside the shared email/password rules.
- Data: creates `USER` (role=DONOR, with the submitted `username`) + `DONOR` (companyName, taxCode, addressText, location).

**A3. Login with Lockout** (`2.2.1`)
> As any user, I want to log in with username/email + password, and be protected from brute-force attempts.
- UI: login form; generic error after a failed attempt (no hint about whether email exists).
- API: `POST /auth/login` blocks authentication for an account after 5 failed attempts within 60 seconds, locking it for 5 minutes, tracked via `USER.failedLoginCount`/`windowStartedAt`/`lockedUntil`.
- Data: updates `USER.failedLoginCount` and lockout fields on each attempt; resets on success.

**A4. JWT Issuance & Server-Side Revocation** (`2.3.1`, `2.3.2`)
> As a logged-in user, I want a token identifying my ID and role on every request, properly invalidated on logout or expiry.
- UI: token stored in memory/secure storage; logout button triggers server-side revocation before clearing local state.
- API: successful login issues a JWS containing user ID + role; `POST /auth/logout` inserts the token's `jti` into `REVOKED_TOKEN`; auth middleware checks `REVOKED_TOKEN` before every protected route.
- Data: `REVOKED_TOKEN` (jti, userId, reason, revokedAt, expiresAt) with a TTL index for auto-purge.

---

### Epic B — Profile Management
*Traceability: `3`. Ultimo throughout.*

**B1. Profile Edit & Avatar Upload** (`3.1.1`, `3.2.1`)
> As a Recipient or Donor, I want to edit my contact info and upload an avatar/logo.
- UI: profile form with image upload control and live preview.
- API: `PATCH /users/me` for text fields; `POST /users/me/avatar` uploads to Supabase Storage and auto-resizes to a defined standard size.
- Data: updates `USER.avatarUrl` and relevant contact fields.

**B2. Change Password & Email** *(new — not specified anywhere in the SRS/original PRD; see `docs/epic/B-profile-management.md`)*
> As a registered user, I want to change my password or email address from my account settings, without needing anyone else's help.
- UI: account-security section on the profile page, separate from the B1 contact-info form — password change takes only a new password (no current-password confirmation; the active session is treated as the trust boundary, matching every other authenticated write in this API); email change takes only the new email.
- API: `PATCH /users/me/password` (revokes the caller's own session token with `reason=PASSWORD_CHANGE`, forcing re-login with the new password); `PATCH /users/me/email` (`409` if the email is already registered to another account; the caller's own session stays active since a JWT's claims never carry email).
- Data: updates `USER.passwordHash` or `USER.email`; password change also inserts a `REVOKED_TOKEN` row.

---

### Epic C — Donor Food Donation Management
*Traceability: `4`. Ultimo throughout, with §10 deviations on `4.1.4`/`4.2.1`.*

**C1. Create Listing** (`4.1.1`)
> As a Donor, I want to create a food listing with name, description, unit, category, vegetarian flag, donation limit, and price.
- UI: creation form with live inline validation; required `donationLimit` and optional `rationLimitPerPerson` accept positive whole numbers only. Selecting "Per Request" as the unit shows the SRS-mandated warning (no online reservation, discretionary quantities, Recipients may arrive after stock is gone).
- API: `POST /listings` validates unit/category enums, the price rule (free or >= 15000 VND), and both quantity-limit fields as positive whole numbers.
- Data: creates `LISTING` (`status=ACTIVE`, `quantityRemaining=donationLimit`); `donationLimit` is a positive integer.

**C2. Clone Listing** (`4.1.3`)
> As a Donor, I want to create a new listing pre-filled from a previous one.
- UI: "Duplicate" action on any past listing opens the creation form pre-populated.
- API: `POST /listings/:id/clone` copies static fields, resets quantity/status/dates.
- Data: new `LISTING` document; no reference back to the original.

**C3. Donor-Initiated Donation for a Registered Recipient** (`4.1.4`, revised per §10)
> As a Donor, I want to record food handed directly to a registered Recipient at my premises, so stock and the completed Order are accurately recorded.
- UI: Donor searches by Recipient email, selects a listing and quantity, and does not enter a delivery address. The form checks the selected listing's Orders live and blocks a Recipient who already has a non-cancelled Order on it. A priced listing shows a static Cash panel, a cash-received input, the Order total, and live `change = cash received - total`; insufficient cash blocks submission. Free listings show a Free summary. The layout follows the Reservation payment-summary pattern and stacks responsively, but offers no payment selector or Stripe action.
- API: `POST /listings/:id/donations` accepts only `recipientEmail` and `quantity`. It validates ownership, Recipient, listing eligibility, stock, ration limit, and that the Recipient has no existing non-cancelled Order for the listing before decrementing stock and creating a terminal Order. Priced Orders use `paymentMethod=CASH`, `paymentStatus=PAID`, and `orderStatus=DELIVERED`; free Orders use `paymentStatus=FREE` and `orderStatus=DELIVERED`. No Delivery is created.
- Data: `ORDER` stores the transaction outcome and `intakePath=DONOR_INITIATED`. It has no delivery address or location for this path, and it does not persist cash received or calculated change.

**C4. Search/Filter/Sort Own Listings, with Active/Past Grouping** (`4.1.2`, `4.2.2` — absorbs the standalone dashboard story, see §10)
> As a Donor, I want to filter my listings into Active and Past, and search/filter/sort within them by name, category, date range, and revenue, so I can track my impact and manage my listings from one view.
- UI: search bar + filter panel (including an Active/Past toggle) + sort toggle (asc/desc); each listing shows its donated quantity and revenue.
- API: `GET /listings/mine?status=ACTIVE|PAST&search=&category=&from=&to=&sort=`. `status=ACTIVE` matches `LISTING.status` in `ACTIVE`/`PAUSED`; `status=PAST` matches `CANCELLED`/`SOLD_OUT`.
- Data: query against `LISTING` indexed on `donorId`, `status`, `name`, `category`, `createdAt`; stats computed from associated `ORDER`s.

**C5. Pause / Resume / Cancel Listing** (`4.2.3`)
> As a Donor, I want to pause, resume, or cancel an active listing.
- UI: status controls on each listing; cancel shows a confirmation naming how many pending orders will be auto-cancelled.
- API: `PATCH /listings/:id/status`; cancel cascades to auto-cancel all associated `ORDER`s still in `AWAITING_COURIER` (not ones already `ASSIGNED` or later).
- Data: `LISTING.status`; cascaded `ORDER.orderStatus=CANCELLED`, `cancelledByUserId=<donor's userId>`.

**C6. Ration Limit Per Person** (`4.2.4`)
> As a Donor, I want to cap how much a single Recipient can reserve from a listing.
- UI: optional "ration per person" field on listing creation accepts positive whole numbers only (`1`, `2`, `3`, ...).
- API: listing creation rejects zero, negative, or decimal ration limits; reservation and manual-donation endpoints reject quantities above the stored limit.
- Data: `LISTING.rationLimitPerPerson` is nullable and, when present, a positive whole number.

**C7. Per-Request Listing (Untracked, Self-Collection)** (`4.2.1`, unchanged SRS intent)
> As a Donor, I want to post a "Per Request" listing so Recipients can come collect food in person without me managing individual orders.
- UI: listing displays the Donor's address prominently instead of a "Reserve" button; the SRS warning is shown on both the Donor's creation form and the Recipient-facing listing page.
- API: no reservation endpoint accepts this listing's ID; no `ORDER` is ever created for it.
- Data: `LISTING` with `unit=PER_REQUEST`; no `ORDER`, no `PAYMENT`, no `DELIVERY` ever reference it.

**C8. View Orders Against a Listing** (`4.2.5`, status vocabulary aligned to schema)
> As a Donor, I want to see every tracked order against a listing — Recipient, quantity, fulfillment status, payment info, and feedback.
- UI: table per listing, showing Recipient username, quantity, `orderStatus`, payment method + status, and any feedback. A terminal Donor-initiated Order with no Delivery is labelled "Completed in person" rather than "Not queued".
- API: `GET /listings/:id/orders` (Reservation + Donor-initiated only — Per-Request has nothing to show here).
- Data: reads `ORDER` filtered by `listingId`; payment fields and optional feedback come from the Order, while Delivery data is joined only when present.

**C9. Sold-Out Alert** (`4.3.1`)
> As a Donor, I want a real-time alert when a listing sells out, so I know without having to check manually.
- UI: in-app toast + audible alert on sell-out.
- API: Socket.IO event emitted from the Service layer when `quantityRemaining` hits zero.
- Data: `LISTING.status=SOLD_OUT`.

---

### Epic D — Recipient Food Ordering
*Traceability: `5.1`, `5.2`, `5.3.4`. Ultimo throughout, with §10 payment/cancellation deviations.*

**D1. Browse Active Listings** (`5.1.1`)
> As a Recipient, I want to browse active listings with key details.
- UI: listing grid/list with name, category, vegetarian flag, quantity, unit, price, Donor municipality, created date.
- API: `GET /listings?status=ACTIVE`.
- Data: reads `LISTING`.

**D2. Reserve & Pay** (`5.1.2`, `5.1.3`, `5.2.3`, revised per §10)
> As a Recipient, I want to reserve a listing and choose how to pay, so my order enters the delivery queue.
- UI: reserve action enforces all SRS eligibility checks (active, not paused/cancelled, not Per-Request, sufficient quantity, one reservation per listing per Recipient); payment step offers "Pay by card" (Stripe checkout) or "Pay cash on delivery."
- API: `POST /listings/:id/reserve` creates `ORDER` (intakePath=RESERVATION); Stripe path sets `paymentStatus=PAID` on webhook success before entering the queue; cash path sets `paymentStatus=PAYMENT_PENDING` and enters the queue immediately.
- Data: `ORDER`, decrements `LISTING.quantityRemaining`; triggers `DeliveryService.createForOrder`.

**D3. Stripe Card Registration at First Card Checkout** (new, supports `5.2.3`/`6.2.1`)
> As a Recipient, the first time I choose to pay by card, I want to register a Stripe payment method, so I don't need to re-enter card details on future card purchases.
- UI: card capture only appears inside the checkout flow when "Pay by card" is selected (D2) — never at signup, never forced on cash-only users.
- API: creates a Stripe Customer + attaches the payment method on first use; reused on subsequent card checkouts, including Premium subscription checkout (F1).
- Data: sets `RECIPIENT.stripeCustomerId` on first successful card registration.

**D4. Cancel Order Before Courier Claim** (revised — Stripe refund on cancellation is now automatic, resolving the earlier open question)
> As a Recipient, I want to cancel my order before a Courier claims it, so I'm not locked into a mistaken purchase — and get my money back automatically if I paid by card.
- UI: "Cancel Order" button visible only while the order's delivery is still `AWAITING_COURIER`, set from the page's own data load (no live update needed for this part). If the cancelled order was Stripe-paid, the response shows a refund-pending state; a live update (`payment:refunded`) flips it to refunded once Stripe confirms.
- API: `DELETE /orders/:id` atomically checks the Delivery record's stage; rejects with a conflict error if already `ASSIGNED` or later. For a Stripe-paid order, also triggers a synchronous Stripe refund call.
- Data: `ORDER.orderStatus=CANCELLED`, `cancelledByUserId=<recipient's own userId>`, `cancelledAt`; restores `LISTING.quantityRemaining`. For Stripe-paid orders: `ORDER.paymentStatus`/`PAYMENT.status=REFUND_PENDING` immediately, `PAYMENT.stripeRefundId` stored; both flip to `REFUNDED` (`PAYMENT.refundedAt` set) once the `charge.refunded` webhook confirms. Cancellation itself is never blocked on Stripe's reachability — a failed refund attempt doesn't prevent the order from being cancelled.

**D5. Order/Delivery History** (`5.1.4`, relabeled)
> As a Recipient, I want to view my past orders and their delivery status.
- UI: history list — donation, Donor, quantity, price paid, payment method, delivery status, date.
- API: `GET /orders/mine`.
- Data: reads `ORDER` filtered by `recipientId`.

**D6. Search/Filter/Sort Listings** (`5.2.1`, `5.2.2`)
> As a Recipient, I want case-insensitive partial-match search and filters for municipality/category/price, with sortable price.
- UI: search bar + filter panel + price sort toggle.
- API: `GET /listings?search=&city=&category=&priceMin=&priceMax=&sort=price`.
- Data: query against `LISTING`.

**D7. Feedback on Delivered Order** (`5.2.4`)
> As a Recipient, I want to leave feedback on a delivered order, visible to the Donor.
- UI: feedback form appears once `orderStatus=DELIVERED`.
- API: `POST /orders/:id/feedback`.
- Data: `ORDER.feedback` (comment, createdAt).

**D8. View Donor Location** (`5.3.4`)
> As a Recipient, I want to see a Donor's location on a map from a listing page.
- UI: map marker on the listing page. It provides pickup context for Reservations and is the actual in-person handoff point for Donor-initiated manual donations and Per-Request listings.
- API: `GET /listings/:id` includes `donorId` → `DONOR.location`.
- Data: reads `DONOR.location` (GeoLocation embedded value object).

---

### Epic E — Courier Delivery & Real-Time Tracking *(sole Additional Feature, Ultimo tier)*

**E1. Admin Creates Courier Accounts** (new)
> As an Admin, I want to create Courier accounts, so delivery staff can log in without public self-registration.
- UI: Admin "Create Courier" form (username, email, temp password, full name).
- API: `POST /admin/couriers`.
- Data: creates `USER` (role=COURIER) + `COURIER`.

**E2. Shared Oldest-First Queue** (new)
> As a Courier, I want a shared, oldest-first queue of unclaimed orders from both tracked intake paths, so I always work the longest-waiting order first.
- UI: queue list sorted by `ORDER.createdAt` ascending.
- API: `GET /deliveries/queue?stage=AWAITING_COURIER`.
- Data: reads `DELIVERY` where `stage=AWAITING_COURIER`, joined with `ORDER`.

**E3. Atomic Claim** (new)
> As a Courier, I want to claim an order atomically, so there's no double-claim race under concurrent access.
- UI: "Claim" button per queue row.
- API: `PATCH /deliveries/:id/claim` uses an atomic conditional update (`stage=AWAITING_COURIER` → `ASSIGNED` only if still unclaimed); returns a conflict if another Courier claimed it first.
- Data: `DELIVERY.stage=ASSIGNED`, `courierId=<self>`. This same atomicity check is what enforces D4's cancellation cutoff.

**E4. One Active Delivery at a Time** (new)
> As a Courier, I want to be blocked from claiming a second order while one is in progress.
- UI: claim button disabled/hidden while an active delivery exists.
- API: claim endpoint rejects if the Courier already has a `DELIVERY` in `ASSIGNED` or `PICKED_UP`.
- Data: query on `DELIVERY.courierId` + `stage`.

**E5. Pickup Location** (revised — was text-only; now includes a map)
> As a Courier, I want the Donor's pickup address and a map after claiming, so I can actually navigate there.
- UI: address text plus a static map marker (reusing D8's Leaflet marker pattern) shown on the claimed-order screen, centered on the Donor's pinned location. Not live tracking — the Donor doesn't move, unlike the Courier during `PICKED_UP` (E6/E9).
- API: `GET /deliveries/active` and the `claim`/`pickup`/`deliver` responses include `DONOR.addressText` and `DONOR.location` as `pickupAddressText`/`pickupAddressLocation`.
- Data: reads `DONOR.addressText`, `DONOR.location`.

**E6. Start Live Tracking** (new)
> As a Courier, I want to tap "Picked Up" to start live GPS broadcasting.
- UI: "Picked Up" button; map centers on the Recipient's delivery address.
- API: `PATCH /deliveries/:id/pickup` sets `stage=PICKED_UP`, `pickedUpAt`; opens a WebSocket channel for location pings.
- Data: `DELIVERY.stage=PICKED_UP`, `pickedUpAt`; `courierLastLocation` updated on each ping.

**E7. Complete Delivery (with Cash Confirmation)** (new)
> As a Courier, I want to tap "Delivered" as the final action — confirming cash received if applicable.
- UI: "Delivered" button; if a cash Reservation is still `PAYMENT_PENDING`, a confirmation step ("Cash received — exact amount, no change given") must be checked first. Donor-initiated manual Orders never appear in the Courier flow.
- API: `PATCH /deliveries/:id/deliver` sets `stage=DELIVERED`, `deliveredAt`; for a cash Reservation still awaiting collection, it also flips `ORDER.paymentStatus` from `PAYMENT_PENDING` to `PAID`.
- Data: `DELIVERY.stage=DELIVERED`; `ORDER.orderStatus=DELIVERED`; a pending cash Reservation additionally becomes `paymentStatus=PAID` and records the Courier confirmation fields.

**E8. Live Order Status for Recipient** (new)
> As a Recipient, I want my order's status to update live without refreshing.
- UI: status stepper (preparing → picked up → out for delivery → delivered) updates over WebSocket.
- API: Socket.IO events emitted on each `DELIVERY.stage` transition.
- Data: driven by `DELIVERY.stage`.

**E9. Live Courier Position** (new)
> As a Recipient, while out for delivery, I want to see the Courier's live position on a map.
- UI: map visible only during `PICKED_UP`, updates from WebSocket pings.
- API: Socket.IO room scoped to that order's Recipient only.
- Data: `DELIVERY.courierLastLocation`.

**E10. Delivered State** (new)
> As a Recipient, once delivered, I want the map replaced with a permanent "Your order has arrived" state.
- UI: static confirmation screen, no further live updates.
- API: n/a (client renders based on `DELIVERY.stage=DELIVERED`).
- Data: n/a.

**E11. Admin Read-Only Delivery Oversight** (extends `7.1.1`/`7.3.1`)
> As an Admin, I want Couriers listed alongside Recipients/Donors, plus a read-only view of all deliveries.
- UI: Courier accounts appear in account management; a deliveries table shows Courier, status, timestamps — no assignment controls.
- API: `GET /admin/couriers`, `GET /admin/deliveries`.
- Data: reads `COURIER`, `DELIVERY`.

**E12. Single Delivery Entry Point** (new)
> As the Delivery module, I want one `createForOrder(orderId, ...)` entry point for queue-eligible Reservation Orders, so every Courier delivery enters one consistent pipeline.
- UI: n/a.
- API: internal service interface, not exposed to the frontend.
- Data: creates `DELIVERY` (stage=AWAITING_COURIER) referencing an eligible Reservation `orderId`. Donor-initiated manual Orders never call it.

*Explicit scope boundaries: no delivery-failure/redo path, no Courier self-registration, no post-claim cancellation, no Admin manual dispatch. Couriers now do handle cash (see §0) — this replaces the prior "no cash handling" boundary. Donor pickup-leg mapping is now in scope (E5, revised) — this replaces the prior "no Donor-pickup-leg mapping" boundary; it's still a static marker, not live tracking, since the Donor doesn't move.*

---

### Epic F — Premium Subscription
*Traceability: `5.3.1`–`5.3.3`, `6`. Ultimo, with §10 deviation on `6.1.1`.*

**F1. Stripe Recurring Subscription** (`6.2.1`; `6.1.1`'s wallet path not implemented)
> As a Recipient, I want to subscribe to Premium for $5/month via Stripe recurring billing, and get an email confirmation on success.
- UI: "Upgrade to Premium" flow, Stripe subscription checkout.
- API: Stripe webhook on `invoice.paid` triggers confirmation email (Nodemailer) and creates a new `SUBSCRIPTION` row.
- Data: `SUBSCRIPTION` (append-only, new row per billing cycle); `RECIPIENT.tier` derived from an unexpired subscription's existence.

**F2. Notification Preferences** (`5.3.1`)
> As a Premium Recipient, I want to set notification preferences (categories, vegetarian status, price range, city).
- UI: preference form, supports multiple saved preferences.
- API: `PUT /recipients/me/preferences`.
- Data: `RECIPIENT.notificationPreferences` (embedded list).

**F3. Real-Time Match Alerts** (`5.3.2`)
> As a Premium Recipient, I want a live alert when a new listing matches my preferences.
- UI: in-app toast (live feed, not persisted) linking to the matching listing.
- API: on listing creation, Service layer compares against all Premium preferences and emits a Socket.IO event to matches.
- Data: reads `RECIPIENT.notificationPreferences`; creates a transient `NOTIFICATION` (type=PREMIUM_MATCH) for the feed, no read-state tracking.

**F4. Location-Aware Ranking** (`5.3.3`)
> As a Premium Recipient, I want matching listings ranked by my location (if granted) or my city (if not).
- UI: browser geolocation permission prompt.
- API: `GET /listings?rank=proximity` uses granted coordinates, else falls back to `RECIPIENT`'s selected city.
- Data: n/a beyond existing `LISTING.city`/`DONOR.location`.

---

### Epic G — Admin Functionality
*Traceability: `7`. Ultimo, extended per Epic E.*

**G1. View All Accounts** (`7.1.1`, extended)
> As an Admin, I want to see all Recipients, Donors, and Couriers with ID, name, email, role, and status.
- UI: filterable account table.
- API: `GET /admin/users`.
- Data: reads `USER` joined with role-specific collection.

**G2. Deactivate/Reactivate Account** (`7.2.1`)
> As an Admin, I want to deactivate or reactivate any account.
- UI: toggle per account row.
- API: `PATCH /admin/users/:id/status`.
- Data: `USER.status`.

**G3. Cancel Any Active Listing** (`7.2.2`)
> As an Admin, I want to cancel any active listing, hiding it and blocking new orders.
- UI: cancel action in the admin listings table, same cascade confirmation as C5.
- API: `PATCH /admin/listings/:id/cancel` — same cascade rule as C5 (only `AWAITING_COURIER` orders auto-cancel).
- Data: `LISTING.status=CANCELLED`; cascaded `ORDER.cancelledByUserId=<admin's userId>`.

**G4. Searchable Listing Directory** (`7.3.1`, `7.3.2`)
> As an Admin, I want a searchable list of all active listings by Donor name/ID or listing ID, with full detail.
- UI: admin listings table with search.
- API: `GET /admin/listings?search=`.
- Data: reads `LISTING`.

**G5. Real-Time Cancellation Notice** (`7.3.3`)
> As a Recipient whose order's listing gets Admin-cancelled, I want a live notification without refreshing.
- UI: in-app toast (live feed).
- API: Socket.IO event emitted on the G3 cascade.
- Data: transient `NOTIFICATION` (type=ADMIN_CANCEL).

**G6. Read-Only Courier Oversight** (see E11)
> As an Admin, I want visibility into the Courier delivery queue and history.
- (Same as E11 — listed here for `7`-group traceability.)

---

## 8. Out of Scope

- **AFF Wallet, anywhere** — no stored balance concept exists. *Deviates from `5.1.3`/`6.1.1`'s wallet component; cash and Stripe cover the payment need instead.*
- **Per-Request order tracking** — no `ORDER`, `PAYMENT`, or `DELIVERY` record is ever created for Per-Request listings; it's a static location display, not a digital transaction.
- **Cancellation after Courier claim** — once `ASSIGNED` or later, an order cannot be cancelled by anyone.
- **Delivery-failure/redo flow** — every claimed delivery is expected to complete.
- **Live tracking on the pickup leg** — E5 now shows a static map marker on the Donor's location (revised from text-only), but it's not live-updating; the Donor doesn't move, so there's nothing to track. Live GPS tracking (E6/E9) is still delivery-leg only, once `PICKED_UP`.
- **Courier self-registration** — Admin-created only.
- **Admin manual delivery assignment** — claim-based queue only.
- **A second Additional Feature** — Courier Delivery is the sole one.
- **Off-session/merchant-initiated Stripe charges** — all Stripe charges are Recipient-initiated checkout sessions, never a Donor or Admin charging a card without the Recipient present at that moment.
- **Persisted notification read/unread state** — notifications are a live, in-session feed only.
- **Mandatory Stripe card at signup** — card capture is deferred to the first card-based checkout.
- **Real customer discovery / TAM-SAM-SOM** — not applicable to a course assignment.

**Future consideration (not this milestone):** multi-item cart/consolidated deliveries, Courier ratings, native mobile push notifications, and formal cash reconciliation beyond the lightweight Donor/Courier actor-and-timestamp audit.

---

## 9. Dependencies & Risks

### Dependencies
- **Tech stack**: React frontend, Node/Express/MongoDB backend — fixed by the SRS.
- **Stripe**: two integration surfaces — (1) one-off Checkout Sessions for card-paid Reservations, and (2) Stripe Subscriptions for recurring Premium billing (Epic F1). Manual donations and cash Reservations never touch Stripe. Sandbox/test-mode keys needed early.
- **Real-time layer**: Socket.IO, shared by the base SRS's notification requirements and Courier tracking.
- **Geocoding/mapping**: OSM Nominatim (geocoding, rate-limited ~1 req/sec) + Leaflet (rendering) — free, no API key, matches the SRS's "no paid Map SDK" note [`5.3.4`]. Used for Donor addresses only now (Recipient addresses are per-order, not geocoded at signup).
- **Browser Geolocation API** for Courier tracking — requires HTTPS in production (satisfied by Render) and explicit permission; test on the deployed origin, not just localhost.
- **Deployment**: Render (frontend + backend) + MongoDB Atlas.

### Risks & Mitigations
- **Risk**: a user may mistake the manual-donation cash input for persisted accounting data. **Mitigation**: label it as an in-person change aid, keep it only in component state, and send only Recipient email and quantity to the API.
- **Risk**: concurrent claim races double-assign a delivery. **Mitigation**: atomic conditional DB update, explicitly unit-tested — the same check also enforces the cancellation cutoff (D4/E3).
- **Risk**: a completed manual Order has no Delivery record, which could make generic cancellation logic treat it as pending. **Mitigation**: require `orderStatus != DELIVERED` before any no-Delivery cancellation path proceeds.
- **Risk**: Stripe integration (checkout + subscriptions) takes longer than expected. **Mitigation**: build the Reservation Checkout Session path first (D2, highest-traffic), then treat Subscriptions (F1) as a separable second increment.
- **Risk**: weak/late GitHub usage costs graded points independent of code quality [`P1`, `P2`]. **Mitigation**: slice the epics above into small, frequently-committed issues.
- **Risk**: a manual Order could accidentally enter the Courier queue. **Mitigation**: restrict `DeliveryService.createForOrder` to eligible Reservation Orders and test that `DONOR_INITIATED` Orders never produce a Delivery.
- **Risk**: "Ultimo everywhere" is a large scope commitment. **Mitigation**: the Gold Data Set requirement (§6) forces early, incremental proof that each path — including both payment methods — works end-to-end before the demo.

---

## 10. Explicit Deviations from the Base SRS

Everything else in the SRS is implemented literally at Ultimo tier. These are the confirmed, deliberate exceptions:

| SRS Requirement | Literal text | Resolved behavior |
|---|---|---|
| `5.1.3` | Cash upon collection or wallet | For Reservations, cash upon **delivery** (Courier collects exact cash, no change) or Stripe Checkout; no wallet |
| `5.2.3` | Card via third-party (implied alongside cash/wallet) | Stripe implemented as specified; cash-on-delivery available as the alternative, no wallet |
| `6.1.1` | Wallet-funded subscription | Not implemented — superseded entirely by `6.2.1` (Stripe recurring) |
| `4.1.4` | Cash + change display at physical Donor-Recipient handoff; recipient by free-text name; AFF Wallet alternative | Recipient must be a registered account selected by email. The handoff remains in person at the Donor's premises. A priced donation is cash-only; the browser calculates change, but neither cash received nor change is sent or stored. Submission creates a `PAID`/`DELIVERED` Order and no Delivery. Free donations create a `FREE`/`DELIVERED` Order. AFF Wallet and Stripe are not offered in this flow. |
| `4.2.1` | Recipient may visit pickup location; quantity given in person; no online reservation | Implemented as originally specified — this is intentionally the one path that stays self-service and untracked |
| Base pickup model (`5.1.2` / general marketplace assumption) | Recipient collects in person from Donor | Reservations are Courier-delivered; Donor-initiated manual donations and Per-Request remain in-person collection flows |
| `4.1.2` | Separate Active/Past donations dashboard (originally its own story) | Retired as a standalone story; folded into C4 as an `?status=ACTIVE\|PAST` filter on the same listings endpoint. `ACTIVE` = `LISTING.status` in `ACTIVE`/`PAUSED`; `PAST` = `CANCELLED`/`SOLD_OUT` |
| `4.3.2` | Visual stats/charts on the Donor donation dashboard | Dropped from C9 — C9 is alert-only. C4 still surfaces per-listing `donatedQuantity`/`revenue` inline (carried over from the retired `4.1.2` dashboard), but no aggregate charts are built |

---

## 11. Open Questions (implementation-level — nothing here blocks starting work)

- **Transactional email provider** for `6.1.2`/payment-confirmation emails — e.g. Nodemailer + a free SMTP sandbox for development; finalize before the Gold Data Set is built.
- **Stripe webhook handling** specifics (which events, retry/idempotency handling) — standard integration work, detailed in the implementation plan rather than here.
