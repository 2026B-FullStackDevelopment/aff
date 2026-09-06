---
title: "[STORY][RECIPIENT] Notification Preferences"
labels: user-story
---

**Traceability:** PRD `F2` (SRS `5.3.1`) · API: `PUT /recipients/me/preferences` (`docs/api_design.md` §10) · DTO: `NotificationPreference` (§3)

## User Story
As a **Premium Recipient**,
I can **save one or more notification preferences — a title, food categories, vegetarian status, a price range, and a city**
so that **the platform knows which new listings are worth alerting me about**.

## Acceptance Criteria

- [ ] **Scenario:** Saving preferences as a Premium Recipient
  - **Given** I am a Recipient on the `PREMIUM` tier
  - **When** I submit `{ preferences: NotificationPreference[] }` to `PUT /recipients/me/preferences`
  - **Then** the response is `200` with the stored `notificationPreferences`, and the list fully replaces whatever was there before

- [ ] **Scenario:** Multiple saved preferences are supported
  - **Given** I want alerts for both "vegetarian bakery under $5 in District 1" and "any meat in District 3"
  - **When** I submit both entries in one `PUT`
  - **Then** both are stored as separate `NotificationPreference` items, each with its own `id` and `preferenceTitle`

- [ ] **Scenario:** Non-Premium Recipient is rejected
  - **Given** I am a Recipient on the `STANDARD` tier
  - **When** I call `PUT /recipients/me/preferences`
  - **Then** the request is rejected with `403`

- [ ] **Scenario:** Invalid preference content is rejected
  - **Given** a preference with an unknown `category` value or a `priceMin` greater than `priceMax`
  - **When** I submit it
  - **Then** the request is rejected with `400` and nothing is saved

- [ ] **Scenario:** Optional fields may be null
  - **Given** a preference that sets only `categories` and leaves `vegetarian`, `priceMin`, `priceMax`, and `city` unset
  - **When** I submit it
  - **Then** it is accepted, with the unset fields stored as `null` (treated as "no constraint on that dimension" by F3's matcher)

## Implementation Flow

1. **`PUT` is a full replace, not a merge** — the request body's `preferences` array becomes the entire stored list. The client sends the complete set every time; there is no per-item add/delete endpoint.
2. **Store the list embedded on the Recipient** (`RECIPIENT.notificationPreferences`, `docs/database_design.md`) — it is not its own collection. Generate a stable `id` per entry server-side so F3 can reference `matchedPreferenceId` in its alert payload.
3. **Enforce Premium at the endpoint** — the `403` for non-Premium is checked here against the derived tier (F1's `GET /subscriptions/me` logic), not trusted from the client. This is the single gate F3 builds on.
4. **Validate against the shared enums** — `categories` entries must be valid `FoodCategory` values (`FRUIT`/`VEGETABLE`/`MEAT`/`COOKED_DISH`/`BAKED_GOODS`/`DRINK`, per `ListingDTO`); reject a malformed price range (`priceMin > priceMax`, negatives) with `400`.
5. **Build the form to support several rows** — add/remove preference blocks client-side, submit them together. Reuse the category multi-select and price-range inputs from the listings search UI (D6) rather than new controls.
6. **A downgraded Recipient keeps their stored rows** but loses the ability to edit them (`403`) and stops matching in F3 — no need to delete preferences on downgrade; the tier check upstream is enough.
7. **Blocked on F1** — a Recipient must be able to reach Premium before this endpoint is usable (`docs/blockers.md`, F2 🟡 Partial).

## Related Epic
Premium Subscription (Epic F — #119)
