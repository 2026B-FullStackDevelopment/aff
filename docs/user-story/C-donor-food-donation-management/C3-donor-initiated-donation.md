---
title: "[STORY][DONOR] Donor-Initiated Donation for a Registered Recipient"
labels: user-story
---

**Traceability:** PRD `C3` (SRS `4.1.4`, revised per PRD §10) · API: `POST /listings/:id/donations` (`docs/api_design.md` §6)

## User Story
As a **Donor**,
I can **manually create a donation against my listing for a registered Recipient and quantity**
so that **I can hand out food I've already committed to someone outside the app**.

## Acceptance Criteria

- [ ] **Scenario:** Successful donation to a free listing
  - **Given** I own an active listing with `price=0` and sufficient `quantityRemaining`
  - **When** I search for and select a registered Recipient by email and submit a quantity
  - **Then** `POST /listings/:id/donations` creates an `ORDER` (`intakePath=DONOR_INITIATED`, `paymentStatus=FREE`), and it enters the Courier queue immediately via `DeliveryService.createForOrder`

- [ ] **Scenario:** Successful donation to a priced listing
  - **Given** I own an active listing with `price > 0` and sufficient `quantityRemaining`
  - **When** I search for and select a registered Recipient by email and submit a quantity
  - **Then** `POST /listings/:id/donations` creates an `ORDER` (`intakePath=DONOR_INITIATED`, `paymentStatus=PAYMENT_PENDING`), and the Recipient receives a `notification:payment_requested` event prompting them to choose Stripe checkout or cash-on-delivery before the order proceeds

- [ ] **Scenario:** Recipient must be a registered account, not free text
  - **Given** I am filling out the donor-initiated donation form
  - **When** I try to enter a name or address that isn't a registered Recipient's email
  - **Then** I cannot submit — the field only accepts a Recipient selected from an email search/lookup, and `POST /listings/:id/donations` returns `404` if a nonexistent email is somehow submitted

  **Note:** this deviates from `4.1.4`'s literal SRS text, which described a free-text recipient name at a physical handoff — see `docs/PRD.md` §10. Lookup uses **email, not username**, because `username` has no uniqueness constraint (`docs/database_design.md`'s `USER` schema marks only `email` as unique) — searching by username could match more than one account.

- [ ] **Scenario:** Quantity exceeds remaining stock or ration limit
  - **Given** I own a listing
  - **When** I submit a quantity greater than `quantityRemaining`, or greater than `rationLimitPerPerson` if one is set
  - **Then** `POST /listings/:id/donations` rejects the request with `422`, and no order is created

- [ ] **Scenario:** Per-Request listings are not eligible
  - **Given** I own a listing with `unit=PER_REQUEST`
  - **When** I attempt to create a donor-initiated donation against it
  - **Then** `POST /listings/:id/donations` rejects the request with `422`, since Per-Request listings never produce an `ORDER`

- [ ] **Scenario:** Cannot donate against another Donor's listing
  - **Given** a listing exists that does not belong to me
  - **When** I attempt `POST /listings/:id/donations` on that listing's ID
  - **Then** the request is rejected with `403`

## Implementation Flow

1. **The Recipient field must be a resolving search, never free text, and must search by email, not username.** Build it as an autocomplete/typeahead against registered emails; the form should only be submittable once a real Recipient has been selected, not just typed. Don't use username for this lookup — it isn't unique, so a username search could resolve to the wrong account.
2. **Decide whether `paymentMethod` is required by checking the listing's `price` client-side** (>0 needs it, `price=0` doesn't) purely as a UX convenience — the server is still the actual enforcement point and will reject a missing `paymentMethod` on a priced listing.
3. **Submit quantity, recipient, and (if priced) `paymentMethod` in one `POST /listings/:id/donations` call** — there's no separate confirmation step before this request.
4. **Branch the success UI on the returned `paymentStatus`.** `FREE` means the donation is already queued for delivery — show it as complete. `PAYMENT_PENDING` means the Recipient still has to act (Stripe or cash) — make clear to the Donor that the donation isn't finalized yet, don't show it as done.
5. **Surface `422` (over stock/ration limit, or listing is `PER_REQUEST`) and `404` (unknown recipient email) as distinct, field-specific inline errors** rather than one generic failure banner.

## Related Epic
Donor Food Donation Management (Epic C — #66)
