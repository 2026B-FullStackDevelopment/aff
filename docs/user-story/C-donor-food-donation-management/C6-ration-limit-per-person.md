---
title: "[STORY][DONOR] Ration Limit Per Person"
labels: user-story
---

**Traceability:** PRD `C6` (SRS `4.2.4`) · API: `POST /listings` (`rationLimitPerPerson`), enforced at `POST /listings/:id/reserve` and `POST /listings/:id/donations` (`docs/api_design.md` §6)

## User Story
As a **Donor**,
I can **cap how much a single Recipient may reserve from one of my listings**
so that **my surplus food is distributed fairly across more Recipients rather than claimed entirely by one**.

## Acceptance Criteria

- [ ] **Scenario:** Setting a ration limit at listing creation
  - **Given** I am on the listing creation form
  - **When** I fill in an optional "ration per person" value alongside the other listing fields and submit
  - **Then** the created `LISTING` has `rationLimitPerPerson` set to that value

- [ ] **Scenario:** Listing without a ration limit has no cap
  - **Given** I create a listing without setting "ration per person"
  - **When** the listing is saved
  - **Then** `LISTING.rationLimitPerPerson` is `null`, and no per-Recipient cap is enforced beyond overall `quantityRemaining`

- [ ] **Scenario:** Reservation above the ration limit is rejected
  - **Given** my listing has `rationLimitPerPerson` set
  - **When** a Recipient attempts `POST /listings/:id/reserve` with a `quantity` greater than `rationLimitPerPerson`
  - **Then** the request is rejected with `422`, even if `quantityRemaining` on the listing would otherwise allow it

- [ ] **Scenario:** Donor-initiated donation above the ration limit is rejected
  - **Given** my listing has `rationLimitPerPerson` set
  - **When** I attempt `POST /listings/:id/donations` with a `quantity` greater than `rationLimitPerPerson` for a given Recipient
  - **Then** the request is rejected with `422`

## Implementation Flow

1. **This is an optional field on the C1 creation form** — leaving it blank must send it as omitted/`null`, never `0` (a `0` ration limit would mean no Recipient could ever order anything).
2. **This story only covers setting and storing the field.** Do not build the reservation/donation-quantity check here — that enforcement belongs to `POST /listings/:id/reserve` (Epic D, story D2) and `POST /listings/:id/donations` (C3). Cross-check against those stories rather than duplicating the check in this one.
3. **If C6 ships before D2/C3 exist**, treat this story as done once the field is captured and persisted — flag enforcement as a dependency on those stories rather than assuming it's covered here.

## Related Epic
Donor Food Donation Management (Epic C — #66)
