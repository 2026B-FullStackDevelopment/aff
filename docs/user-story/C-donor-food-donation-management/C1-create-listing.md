---
title: "[STORY][DONOR] Create Listing"
labels: user-story
---

**Traceability:** PRD `C1` (SRS `4.1.1`) · API: `POST /listings` (`docs/api_design.md` §6)

## User Story
As a **Donor**,
I can **create a food listing with a name, description, unit, category, vegetarian flag, donation limit, and price**
so that **Recipients can discover and receive the surplus food I have available**.

## Acceptance Criteria

- [ ] **Scenario:** Successful listing creation
  - **Given** I am logged in as a Donor and on the listing creation form
  - **When** I submit a valid `name`, `unit`, `category`, `isVegetarian`, `price`, and `donationLimit` (with optional `description`, `imageUrl`, `rationLimitPerPerson`)
  - **Then** `POST /listings` creates a `LISTING` with `status=ACTIVE`, `quantityRemaining=donationLimit`, and `city` inherited from my Donor profile, and I'm shown the new listing

- [ ] **Scenario:** Selecting "Per Request" shows the SRS-mandated warning
  - **Given** I am filling out the listing creation form
  - **When** I select `unit=PER_REQUEST`
  - **Then** I see a warning explaining there is no online reservation, quantities are discretionary, and Recipients may arrive after stock is gone, before I can submit

- [ ] **Scenario Outline:** Invalid price is rejected
  - **Given** I am filling out the listing creation form
  - **When** I enter a price `<price>`
  - **Then** I see an inline error explaining "<reason>", and the form does not submit

  **Price rule:** a listing must be free (`price = 0`) or priced from 15000 VND upwards.

  **Examples:**
  | price | reason |
  |---|---|
  | `500` | priced but not free, and below the 15000 VND minimum |
  | `15000` | priced but not free, and not strictly above the 15000 VND minimum |
  | `-100` | negative price is invalid |

- [ ] **Scenario:** Invalid unit or category is rejected
  - **Given** I am filling out the listing creation form
  - **When** I try to submit with a `unit` or `category` value outside the supported enums (`KILOGRAM`/`GRAM`/`LITER`/`MILLILITER`/`UNIT`/`PER_REQUEST` for unit; `FRUIT`/`VEGETABLE`/`MEAT`/`COOKED_DISH`/`BAKED_GOODS`/`DRINK` for category)
  - **Then** the form does not submit and I see an inline error

- [ ] **Scenario:** Server mirrors client-side validation
  - **Given** a request reaches the server with an invalid `unit`/`category` enum or a price that fails the free-or->1000-VND rule (e.g. a modified client bypassing frontend checks)
  - **When** `POST /listings` is called
  - **Then** the server rejects the request with a `400` error rather than trusting client-side validation alone

## Implementation Flow

1. **Mirror validation client-side, but the server is authoritative.** The unit/category enums and the "free or >=15000 VND" price rule must be re-checked in `POST /listings` regardless of what the form already caught — never rely on the client alone.
2. **Gate submission on the Per-Request warning.** If `unit=PER_REQUEST` is selected, the warning must be acknowledged (e.g. shown inline, submit disabled until seen) before the form can be submitted — don't just display it as a passive banner.
3. **Image upload follows the same signed-URL handoff as avatars, with one difference:** request `POST /media/upload-url` with `purpose: 'LISTING_IMAGE'`, `PUT` the bytes to Supabase, then include the returned `mediaUrl` as `imageUrl` directly in the `POST /listings` payload — there's no listing to `PATCH` afterward, since it doesn't exist yet.
4. **Never send `city` from the client.** It's inherited server-side from the Donor's profile; don't add a city field to this form.
5. **Never send `quantityRemaining`.** The server sets it equal to `donationLimit` on creation — sending it from the client would be redundant and a spoofing risk.
6. **Treat the response as the source of truth.** Use the created `ListingDTO` (with its server-assigned `id`, `status`, `createdAt`) to show/redirect to the new listing — don't construct that view from locally-held form state.

## Related Epic
Donor Food Donation Management (Epic C — #66)
