---
title: "[STORY][DONOR] Donor-Initiated Donation for a Registered Recipient"
labels: user-story
---

**Traceability:** PRD `C3` (SRS `4.1.4`, revised per PRD §10) · API: `POST /listings/:id/donations` (`docs/api_design.md` §6)

## User Story
As a **Donor**,
I can **manually create a donation against my listing for a registered Recipient, quantity, and payment method**
so that **I can hand out food I've already committed to someone outside the app**.

## Acceptance Criteria

- [ ] **Scenario:** Successful donation to a free listing
  - **Given** I own an active listing with `price=0` and sufficient `quantityRemaining`
  - **When** I search for and select a registered Recipient by email and submit a quantity
  - **Then** no payment method or cash amount is required, `POST /listings/:id/donations` creates an `ORDER` (`intakePath=DONOR_INITIATED`, `paymentStatus=FREE`), and it enters the Courier queue immediately via `DeliveryService.createForOrder`

- [ ] **Scenario:** Donor selects the payment method for a priced listing
  - **Given** I own an active listing with `price > 0` and sufficient `quantityRemaining`
  - **When** I select a registered Recipient, listing, and quantity
  - **Then** I must select either `STRIPE` or `CASH` before I can submit the donation

- [ ] **Scenario:** Payment panel matches the Reservation confirmation design
  - **Given** I am creating a manual donation from a desktop-sized viewport
  - **When** I select a listing
  - **Then** the Recipient, listing, quantity, and delivery sections remain in the main column, while a sticky payment panel appears on the right using the same payment-option and total-summary pattern as the Reservation confirmation page, with Donor theme styling
  - **And** on a smaller viewport the payment panel stacks into the normal document flow without horizontal scrolling

- [ ] **Scenario:** Successful cash donation with exact money received
  - **Given** the Order total is 10,000 VND and I selected `CASH`
  - **When** I enter 10,000 VND as the money received and submit
  - **Then** the system displays 0 VND change and creates the Order with `paymentMethod=CASH`, `paymentStatus=PAID`, and the Donor cash-receipt audit fields
  - **And** the Order enters the Courier queue immediately, with no cash collection required from the Courier

- [ ] **Scenario:** Successful cash donation requiring change
  - **Given** the Order total is 10,000 VND and I selected `CASH`
  - **When** I enter 20,000 VND as the money received
  - **Then** the system displays 10,000 VND as change using `change = cashReceivedAmount - orderAmount`
  - **And** on submission the server independently recalculates the same value instead of trusting a client-supplied change

- [ ] **Scenario:** Cash received is less than the Order total
  - **Given** I selected `CASH` for a priced donation
  - **When** I enter an amount less than `listing.price * quantity`
  - **Then** I cannot submit and the money-received field shows an inline validation error
  - **And** `POST /listings/:id/donations` rejects a bypassed invalid request with `422`, without decrementing stock or creating an Order

- [ ] **Scenario:** Successful Stripe donation
  - **Given** I selected `STRIPE` for a priced donation
  - **When** I submit the completed manual-donation form
  - **Then** `POST /listings/:id/donations` creates an `ORDER` with `paymentMethod=STRIPE`, `paymentStatus=PAYMENT_PENDING`, and `orderStatus=PENDING_PAYMENT`
  - **And** the Recipient receives a `notification:payment_requested` event prompting them to complete Stripe Checkout
  - **And** no Delivery is created until the Stripe webhook confirms payment

- [ ] **Scenario:** Switching payment methods clears inapplicable cash data
  - **Given** I selected `CASH` and entered a money-received amount
  - **When** I switch to `STRIPE`
  - **Then** the cash input and any cash validation error are cleared, and no cash-receipt data is submitted

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
2. **Capture a delivery address and coordinates for this Order.** Recipient signup stores city, not a complete delivery destination, so the Donor supplies the destination for this manual donation.
3. **Reuse the Reservation payment UI pattern.** Share the existing payment selector between the Reservation and manual-donation flows. Keep the Reservation layout's desktop right-hand sticky payment panel and responsive stacked layout, but apply the Donor theme on this page rather than hard-coding Recipient colors.
4. **Calculate the Order total from trusted listing data.** Display `listing.price * quantity` using the shared VND formatter. Free listings show a Free summary and do not ask for a payment method.
5. **For priced listings, require the Donor to select `STRIPE` or `CASH`.** `CASH` reveals a whole-number VND `cashReceivedAmount` input and a live change display. Require `cashReceivedAmount >= orderAmount`; changing away from Cash clears the cash value and its errors.
6. **Submit the selected method in `POST /listings/:id/donations`.** The common fields are `recipientEmail`, `quantity`, `deliveryAddressText`, and `deliveryLocation`. A priced request also includes `paymentMethod`; a Cash request additionally includes `cashReceivedAmount`. Do not send a client-calculated change as authoritative data.
7. **Recalculate all monetary values in the Service layer.** Load the owned Listing, calculate `orderAmount = listing.price * quantity`, and calculate Cash change from `cashReceivedAmount - orderAmount`. Reject insufficient Cash with `422` before any committed stock or Order change.
8. **Apply payment-specific Order and Delivery behavior.** Free creates a `FREE` Order and Delivery immediately. Cash creates a `PAID` Order, stores `cashReceivedAmount`, `cashReceivedByDonorId`, and `cashReceivedAt`, then creates the Delivery immediately; the Courier must not collect that cash again. Stripe creates a `PAYMENT_PENDING`/`PENDING_PAYMENT` Order, notifies the Recipient to complete Checkout, and creates the Delivery only after webhook-confirmed payment.
9. **Branch the success UI on the returned payment state.** Free reports that the donation is recorded and queued. Cash confirms the received amount and calculated change. Stripe explains that the Order is recorded but still awaits Recipient Checkout.
10. **Surface errors at the relevant field.** Show `422` stock/ration/`PER_REQUEST` errors against the affected listing or quantity field, insufficient Cash against the money-received field, invalid/missing payment choice against the payment panel, and unknown Recipient errors against the email field rather than collapsing everything into a generic banner.
11. **Retire Recipient payment choice for this intake path.** `POST /orders/:id/payment-choice` must not replace a method already selected by the Donor on a `DONOR_INITIATED` Order. The Recipient's remaining Stripe action is to start/complete Checkout for the already selected Stripe method.

## Related Epic
Donor Food Donation Management (Epic C — #66)
