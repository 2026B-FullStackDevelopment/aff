---
title: "[STORY][SYSTEM] Centralize Notification Sending"
labels: user-story
---

**Traceability:** PRD `H1` (`docs/PRD.md` §7) · Extends `docs/database_design.md`'s `NOTIFICATION` model · Replaces the direct `emitToUser(...)` calls at the trigger sites listed in `docs/api_design.md` §12's send mapping

## User Story
As **the platform**,
I can **send every notification-worthy event through one function that both emits the live Socket.IO event and writes a durable `NOTIFICATION` row**
so that **there is a single place that knows what a notification is, instead of every module re-implementing the emit+persist pairing itself**.

## Acceptance Criteria

- [ ] **Scenario:** Sold-out alert goes through the notification service
  - **Given** a Donor's listing reaches zero `quantityRemaining`
  - **When** the Listings Service calls `notificationService.send({ userId: donorId, type: 'SOLD_OUT', listingId, payload: { listingId, name } })` (C9)
  - **Then** the `listing:sold_out` event is emitted to `user:<donorId>` **and** a `NOTIFICATION` row is created with `userId=<donorId>`, `type=SOLD_OUT`, `listingId=<the listing>` — both from that one call

- [ ] **Scenario:** Payment-success, delivery-status, premium-match, and admin-cancel all use the same call shape
  - **Given** the Payments, Delivery, Subscriptions (F3), or Admin (G5) service needs to notify a user
  - **When** it calls `notificationService.send({ userId, type, orderId?, listingId?, payload })` with its own `type` and event-specific `payload`
  - **Then** it never calls `emitToUser(...)` directly and never writes to the `NOTIFICATION` collection itself — the notification service is the only place either happens

- [ ] **Scenario:** A failed persistence write never blocks the send
  - **Given** the database write for a `NOTIFICATION` row fails for any reason
  - **When** `notificationService.send(...)` is called
  - **Then** the live Socket.IO event still fires and the caller's own action (e.g. marking a listing sold out) still succeeds — the persistence failure is logged and swallowed, never surfaced as a user-facing error or a failed live event

- [ ] **Scenario:** GPS pings and refunds bypass the notification service entirely
  - **Given** a Courier sends a `delivery:location` ping, or a Stripe refund fires `payment:refunded`
  - **When** either is emitted
  - **Then** the calling module still uses `emitToUser(...)` directly for these two — they have no `NotificationType` and stay live-only, never routed through `notificationService.send(...)`

## Implementation Flow

1. **Add a `notifications` backend module** (`backend/src/modules/notifications/`) following the existing `Route -> Controller -> Service -> Repository -> Model` pattern, plus a `notification.interface.ts` exposing the one function other modules call: `sendNotification({ userId, type, orderId?, listingId?, payload })`. This is a cross-module call, so it goes through the interface, per `AGENTS.md`'s boundary rule — callers never import `notification.service.ts` directly.
2. **`sendNotification(...)` does two things internally, in order**: (a) look up the Socket.IO event name for `type` (a small internal `NotificationType -> event name` table: `SOLD_OUT -> listing:sold_out`, `PAYMENT_SUCCESS -> payment:success`, `DELIVERY_STATUS -> order:status_changed` or `delivery:delivered` per caller, `PREMIUM_MATCH -> notification:premium_match`, `ADMIN_CANCEL -> notification:admin_cancel`) and call the existing `emitToUser(userId, event, payload)`; (b) derive a `message` string from `type` + `payload` and write a `NOTIFICATION` row (`userId`, `type`, `message`, `orderId`, `listingId`).
3. **Replace every existing direct `emitToUser(...)` call for these five types with `sendNotification(...)`**: the site in `listing.service.ts` (`listing:sold_out`), `payments.service.ts` (`payment:success`), and `delivery.service.ts` (`order:status_changed`, `delivery:delivered`). Leave `payment:refunded` and `delivery:location` calling `emitToUser(...)` directly — they don't go through this path.
4. **The persistence half must never fail the send** — wrap the `NOTIFICATION` write in a caught/logged error, not a rethrow, so a DB hiccup never blocks the live emit or the caller's own state change (e.g. `LISTING.status=SOLD_OUT`).
5. **Keep message copy in one place** — `sendNotification(...)`'s internal message templating (e.g. "Your listing '{name}' just sold out.") is the single source of truth; don't let callers pass pre-built free text.
6. **F3 and G5 build against this interface from day one** — when either is implemented, it calls `sendNotification(...)` directly rather than calling `emitToUser(...)` and writing its own `NOTIFICATION` row; there's no follow-up migration needed once this story lands.

## Related Epic
Notifications (Epic H — #142)
