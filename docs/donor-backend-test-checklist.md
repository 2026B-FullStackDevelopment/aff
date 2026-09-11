# Donor Backend Test Checklist

This checklist tracks the backend verification required for the Donor Food Donation Management user stories (#68-#76). Check an item only after the corresponding automated test passes.

## Development baseline

- [x] Backend typecheck passes
- [x] All 38 existing test files pass
- [x] All 272 existing tests pass
- [ ] Backend build passes
- [ ] No unrelated Admin, Subscription, or Courier controller stubs were changed

## Create listing (#68)

- [ ] A Donor can create a valid listing
- [ ] A non-Donor cannot create a listing
- [ ] The listing city is inherited from the Donor profile
- [ ] `quantityRemaining` is initialized from `donationLimit`
- [ ] The server ignores or rejects client-controlled `city`
- [ ] The server ignores or rejects client-controlled `quantityRemaining`
- [ ] A price of `0` is accepted
- [ ] A price greater than or equal to `15000` VND is accepted
- [ ] A price from `1` through `14999` VND is rejected with `400`
- [ ] A negative price is rejected with `400`
- [ ] Invalid unit values are rejected with `400`
- [ ] Invalid category values are rejected with `400`
- [ ] Invalid donation quantities are rejected with `400`
- [ ] Ration limits that are zero, negative, or decimal are rejected with `400`

## Clone listing (#69)

- [ ] A Donor can clone their own listing
- [ ] Attempting to clone another Donor's listing returns `403`
- [ ] Attempting to clone a missing listing returns `404`
- [ ] The clone has a new ID and fresh timestamps
- [ ] The clone status is reset to `ACTIVE`
- [ ] The clone quantity is reset to `donationLimit`
- [ ] Orders and runtime state are not copied

## Donor-initiated donation (#70)

- [ ] The listing must belong to the authenticated Donor
- [ ] A registered Recipient is resolved by email
- [ ] A nonexistent Recipient email returns `404`
- [ ] A non-Recipient account cannot be selected
- [ ] The request accepts only `recipientEmail` and `quantity`; delivery, payment-selection, cash-received, and change fields are rejected
- [ ] A free donation creates a `DONOR_INITIATED` Order with `paymentStatus=FREE` and `orderStatus=DELIVERED`
- [ ] A priced donation creates a `DONOR_INITIATED` Order with `paymentMethod=CASH`, `paymentStatus=PAID`, and `orderStatus=DELIVERED`
- [ ] Neither free nor priced manual donation creates a Delivery
- [ ] A manual donation never creates a Payment or emits `notification:payment_requested`
- [ ] Insufficient remaining stock returns `422`
- [ ] A ration-limit violation returns `422`
- [ ] A `PER_REQUEST` listing returns `422`
- [ ] Stock is decremented atomically
- [ ] A failed donation does not partially modify stock or create an Order

## Search, filter, and sort own listings (#71)

- [ ] Results contain only the authenticated Donor's listings
- [ ] Active grouping contains `ACTIVE` and `PAUSED` listings
- [ ] Past grouping contains `CANCELLED` and `SOLD_OUT` listings
- [ ] Partial-name search is case-insensitive
- [ ] Category filtering works
- [ ] Start and end date filtering works
- [ ] Created-date sorting works in both directions
- [ ] Revenue sorting works in both directions
- [ ] Pagination returns `items`, `page`, `limit`, and `total`
- [ ] `donatedQuantity` is calculated correctly
- [ ] `revenue` is calculated correctly

## Pause, resume, and cancel listing (#72)

- [ ] An `ACTIVE` listing can be paused
- [ ] A `PAUSED` listing can be resumed
- [ ] A listing can be cancelled by its owner
- [ ] Another Donor cannot update the listing status
- [ ] Invalid or stale transitions return `409`
- [ ] Cancellation affects a non-terminal Stripe Reservation with no Delivery record
- [ ] Cancellation does not affect a terminal Donor-initiated manual Order with no Delivery record
- [ ] Cancellation affects Orders whose Delivery is `AWAITING_COURIER`
- [ ] Cancellation does not affect `ASSIGNED` or later Deliveries
- [ ] Cancelled Orders store `cancelledByUserId`
- [ ] The response contains the correct `cancelledOrderCount`
- [ ] The cancellation cascade does not leave partial updates

## Ration limit (#73)

- [ ] A positive whole-number ration limit can be stored on a listing
- [ ] An omitted ration limit is stored as `null` or omitted according to the DTO contract
- [ ] A ration limit of `0` is rejected
- [ ] A negative ration limit is rejected
- [ ] A decimal ration limit is rejected without silently rounding it
- [ ] Recipient reservations enforce the ration limit
- [ ] Donor-initiated donations enforce the ration limit

## Per-request listing (#74)

- [ ] A Donor can create a listing with `unit=PER_REQUEST`
- [ ] Reservation against a `PER_REQUEST` listing returns `422`
- [ ] Donor-initiated donation against a `PER_REQUEST` listing returns `422`
- [ ] No Order is created for a `PER_REQUEST` listing
- [ ] No Payment is created for a `PER_REQUEST` listing
- [ ] No Delivery is created for a `PER_REQUEST` listing
- [ ] Listing details expose the Donor address and location required for self-collection

## View orders against a listing (#75)

- [ ] The owner can view paginated Orders for their listing
- [ ] Another Donor receives `403`
- [ ] A missing listing returns `404`
- [ ] Each row includes the Recipient ID and username
- [ ] Each row includes quantity and order status
- [ ] Each row includes payment method and payment status
- [ ] Feedback is returned when present
- [ ] Missing feedback is represented consistently
- [ ] A `PER_REQUEST` listing returns an empty paginated result

## Sold-out alert (#76)

- [ ] Reducing tracked stock to zero changes status to `SOLD_OUT`
- [ ] `listing:sold_out` is sent to the owning Donor's user room
- [ ] The payload contains `listingId` and `name`
- [ ] Other Donors do not receive the event
- [ ] The event is emitted exactly once under concurrent requests
- [ ] A sold-out listing appears in the Past grouping
- [ ] A `PER_REQUEST` listing never emits a sold-out event

## Reservation delivery and payment dependencies

- [ ] `DeliveryService.createForOrder` creates an `AWAITING_COURIER` Delivery
- [ ] Repeating `createForOrder` does not create duplicate Deliveries
- [ ] `createForOrder` rejects or ignores a `DONOR_INITIATED` manual Order
- [ ] Stripe completion updates the related Order to `PAID`
- [ ] Stripe completion changes the Order to `PREPARING`
- [ ] Stripe completion creates the Delivery
- [ ] Stripe completion emits `payment:success`
- [ ] Duplicate Stripe webhook delivery is handled idempotently

## Final verification

- [ ] All donor-specific tests pass
- [ ] All pre-existing tests still pass
- [ ] Backend typecheck passes
- [ ] Backend build passes
- [ ] API responses match `docs/api_design.md`
- [ ] No unrelated modules were modified
