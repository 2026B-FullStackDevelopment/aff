---
title: "[STORY][RECIPIENT] Notification Preferences"
labels: user-story
---

**Traceability:** PRD `F2` (SRS `5.3.1`) · API: `GET/POST/PATCH/DELETE /recipients/me/preferences` (`docs/api_design.md` §10) · DTO: `NotificationPreference` (§3)

## User Story
As a **Premium Recipient**,
I can **save one or more notification preferences — a title, food categories, vegetarian status, a price range, and a city — and manage each one individually**
so that **the platform knows which new listings are worth alerting me about, and I can add, edit, pause, or remove any one of them without touching the others**.

## Acceptance Criteria

- [ ] **Scenario:** Creating a preference as a Premium Recipient
  - **Given** I am a Recipient on the `PREMIUM` tier
  - **When** I submit a `NotificationPreference` body to `POST /recipients/me/preferences`
  - **Then** the response is `201` with the stored preference, including a server-generated `id`

- [ ] **Scenario:** Multiple saved preferences are supported
  - **Given** I want alerts for both "vegetarian bakery under $5 in District 1" and "any meat in District 3"
  - **When** I `POST` both, one at a time
  - **Then** both exist as separate `NotificationPreference` rows, each with its own `id`, and `GET /recipients/me/preferences` returns both

- [ ] **Scenario:** Editing one preference doesn't touch the others
  - **Given** I have two saved preferences
  - **When** I submit a `PATCH /recipients/me/preferences/:id` with a changed field for one of them
  - **Then** only that row's fields change; the other preference is untouched

- [ ] **Scenario:** Pausing a preference without deleting it
  - **Given** I have a saved preference I want to stop matching against for now
  - **When** I `PATCH /recipients/me/preferences/:id` with `{ isActive: false }`
  - **Then** the row is still returned by `GET`, with `isActive: false`, and stops being eligible for F3's matching once F3 is built

- [ ] **Scenario:** Removing a preference
  - **Given** I have a saved preference I no longer want
  - **When** I call `DELETE /recipients/me/preferences/:id`
  - **Then** the row is permanently removed and no longer appears in `GET`

- [ ] **Scenario:** Non-Premium Recipient is rejected on write
  - **Given** I am a Recipient on the `STANDARD` tier
  - **When** I call `POST`, `PATCH`, or `DELETE /recipients/me/preferences`
  - **Then** the request is rejected with `403`

- [ ] **Scenario:** A downgraded Recipient can still see their preferences
  - **Given** I am a Recipient whose subscription lapsed to `STANDARD`
  - **When** I call `GET /recipients/me/preferences`
  - **Then** the request succeeds with `200` and returns my previously-saved rows (I just can't edit them — see above)

- [ ] **Scenario:** Invalid preference content is rejected
  - **Given** a preference with an unknown `category` value or a `priceMin` greater than `priceMax`
  - **When** I submit it via `POST` or `PATCH`
  - **Then** the request is rejected with `400` and nothing is saved

- [ ] **Scenario:** Optional fields may be null
  - **Given** a preference that sets only `categories` and leaves `vegetarian`, `priceMin`, `priceMax`, and `city` unset
  - **When** I submit it
  - **Then** it is accepted, with the unset fields stored as `null` (treated as "no constraint on that dimension" by F3's matcher)

- [ ] **Scenario:** Editing or deleting someone else's preference is rejected
  - **Given** a `:id` that belongs to a different Recipient's preference
  - **When** I call `PATCH` or `DELETE /recipients/me/preferences/:id` with that id
  - **Then** the request is rejected with `404` (never revealing that the id exists under another account)

## Implementation Flow

1. **Each endpoint is a single-row operation, not a full-list replace.** `POST` creates one row, `PATCH /:id` updates one row, `DELETE /:id` removes one row, `GET` lists all of the caller's rows. There is no bulk endpoint — the client's add/edit/remove UI calls the matching single-row endpoint per action.
2. **Store preferences in their own `NOTIFICATION_PREFERENCE` collection** (`docs/database_design.md`), owned by the `notification-preferences` backend module — not embedded on `RECIPIENT`. Each row's Mongo `_id` is the `id` F3 references as `matchedPreferenceId`.
3. **Enforce Premium at the write endpoints** (`POST`/`PATCH`/`DELETE`) — the `403` for non-Premium is checked against the derived tier (F1's `GET /subscriptions/me` logic via `subscriptionInterface.isPremiumRecipient`), not trusted from the client. `GET` has no tier gate — see the downgrade scenario above.
4. **Validate against the shared enums** — `categories` entries must be valid `FoodCategory` values (`FRUIT`/`VEGETABLE`/`MEAT`/`COOKED_DISH`/`BAKED_GOODS`/`DRINK`, per `ListingDTO`); reject a malformed price range (`priceMin > priceMax`, negatives) with `400`.
5. **Build the form to manage rows individually** — add one, edit one inline, remove one, toggle `isActive` — rather than a single "save all" submit. Reuse the category multi-select and price-range inputs from the listings search UI (D6) rather than new controls.
6. **A downgraded Recipient keeps their stored rows and can still read them**, but write endpoints return `403` — no need to delete preferences on downgrade; the tier check upstream is enough.
7. **`isActive` lets a Recipient pause a preference without losing it.** F3's matcher (once built) skips any row with `isActive: false`.
8. **Blocked on F1** — a Recipient must be able to reach Premium before these endpoints are usable (`docs/blockers.md`, F2 🟡 Partial).

## Related Epic
Premium Subscription (Epic F — #119)
