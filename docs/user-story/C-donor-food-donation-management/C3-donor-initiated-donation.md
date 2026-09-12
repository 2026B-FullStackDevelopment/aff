---
title: "[STORY][DONOR] Donor-Initiated Donation for a Registered Recipient"
labels: user-story
---

**Traceability:** PRD `C3` (SRS `4.1.4`, revised per PRD §10) · API: `POST /listings/:id/donations` (`docs/api_design.md` §6)

## User Story
As a **Donor**,
I can **record food handed directly to a registered Recipient at my premises**
so that **the listing stock and completed Order accurately reflect the in-person donation**.

## Acceptance Criteria

- [ ] **Scenario:** Successful priced manual donation
  - **Given** I selected one of my active, non-`PER_REQUEST` priced listings, a registered Recipient, and a valid quantity
  - **And** I entered a whole-number VND cash amount at least equal to the Order total
  - **When** I press "Record Donation"
  - **Then** the browser submits only `recipientEmail` and `quantity` to `POST /listings/:id/donations`
  - **And** the API decrements the listing stock and creates an `ORDER` with `intakePath=DONOR_INITIATED`, `paymentMethod=CASH`, `paymentStatus=PAID`, and `orderStatus=DELIVERED`
  - **And** no `DELIVERY` or `PAYMENT` record is created

- [ ] **Scenario:** Successful free manual donation
  - **Given** I selected a free eligible listing, a registered Recipient, and a valid quantity
  - **When** I press "Record Donation"
  - **Then** the API creates an `ORDER` with `intakePath=DONOR_INITIATED`, `paymentMethod=null`, `paymentStatus=FREE`, and `orderStatus=DELIVERED`
  - **And** no cash input, `DELIVERY`, or `PAYMENT` is required

- [ ] **Scenario:** Priced listing shows a static Cash panel
  - **Given** I selected a priced listing
  - **When** the payment summary is displayed
  - **Then** it identifies Cash as the only payment method and shows cash received, total, and change
  - **And** it does not show a payment selector, Stripe option, Checkout message, or Courier-payment message
  - **And** the desktop layout follows the Reservation summary pattern while stacking on smaller screens

- [ ] **Scenario:** Change is calculated only in the frontend
  - **Given** the Order total is known from the selected listing and quantity
  - **When** I enter the cash received
  - **Then** the browser displays `change = cash received - Order total` immediately
  - **And** submission is blocked with an inline error when cash received is below the total
  - **And** neither cash received nor change is sent to the API or stored in MongoDB

- [ ] **Scenario:** Recipient must be a registered account
  - **Given** I am filling out the manual-donation form
  - **When** I enter text that has not resolved to a registered Recipient email
  - **Then** I cannot submit
  - **And** the API returns `404` if an unknown Recipient email bypasses the frontend

  **Note:** lookup uses email because `USER.email` is unique while `username` is not.

- [ ] **Scenario:** Recipient already has an Order for the listing
  - **Given** the selected Recipient already has a non-cancelled Reservation or Donor-initiated Order for the selected listing
  - **When** I choose that Recipient and listing
  - **Then** the frontend displays the standard inline donor validation error and blocks submission
  - **And** `POST /listings/:id/donations` returns `422` if the request bypasses or races the frontend check
  - **And** stock is not decremented and no additional Order is created

- [ ] **Scenario:** Quantity exceeds remaining stock or ration limit
  - **Given** I own an eligible listing
  - **When** I submit a quantity greater than `quantityRemaining`, or greater than `rationLimitPerPerson` when set
  - **Then** the API returns `422`, does not decrement stock, and creates no Order

- [ ] **Scenario:** Per-Request listings are not eligible
  - **Given** I own a listing with `unit=PER_REQUEST`
  - **When** I attempt to record a manual donation against it
  - **Then** the API returns `422`, because Per-Request listings never produce an `ORDER`

- [ ] **Scenario:** Another Donor's listing is not eligible
  - **Given** the selected listing does not belong to me
  - **When** I call `POST /listings/:id/donations`
  - **Then** the API returns `403`

- [ ] **Scenario:** Completed manual Order cannot be cancelled
  - **Given** a Donor-initiated manual Order was recorded with `orderStatus=DELIVERED` and has no Delivery
  - **When** a Recipient, Donor, or Admin cancellation path evaluates it
  - **Then** it remains unchanged because a terminal Order cannot be cancelled

## Implementation Flow

1. Build the Recipient field as an email autocomplete that stores a selected registered Recipient, not arbitrary text.
2. Let the Donor select an owned active listing and enter a quantity. Load all Order pages for the selected listing, ignore cancelled Orders, and validate the selected Recipient against the remaining Recipient IDs live. Reject `PER_REQUEST`, an existing non-cancelled Order for that Recipient, insufficient stock, and quantities above the stored ration limit.
3. Do not render Delivery Details or collect a delivery address; the handoff already occurred at the Donor's premises.
4. For a priced listing, render a static Cash summary using the established payment-panel styling. For a free listing, render the Free summary without a cash input.
5. Calculate `orderTotal = listing.price * quantity` and `change = cashReceivedAmount - orderTotal` in frontend state. Require whole-number VND and block priced submission when the amount is missing or insufficient.
6. Keep `cashReceivedAmount` and calculated change local to the frontend. Submit only `{ recipientEmail, quantity }`; do not add these transient values to a DTO, schema, model, or database record.
7. In the Service layer, reload the owned Listing and Recipient, recalculate the trusted Order amount, validate the duplicate-Order and stock/ration rules, and apply the stock decrement and Order creation in the same transaction.
8. Create priced manual Orders as `CASH`/`PAID`/`DELIVERED` and free manual Orders as `FREE`/`DELIVERED`. Never call `DeliveryService.createForOrder` for this intake path.
9. Return the created `OrderDTO`, clear the form, and show a success message that describes an in-person completed donation rather than a queued delivery.
10. Ensure Recipient, Donor listing-cancellation, and Admin listing-cancellation logic excludes terminal manual Orders even though they have no Delivery record.

## Related Epic
Donor Food Donation Management (Epic C — #66)
