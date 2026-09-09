---
title: "[STORY][ADMIN] Read-Only Courier Oversight"
labels: user-story
---

**Traceability:** PRD `G6` — **the same story as `E11`**, listed under Epic G for SRS `7`-group traceability (`7.1.1`, `7.3.1`) · API: `GET /admin/couriers`, `GET /admin/deliveries` (`docs/api_design.md` §11)

## User Story
As an **Admin**,
I can **see Couriers listed with the other accounts and a read-only table of every delivery**
so that **I have full visibility into the Courier pipeline without any ability to interfere with in-flight assignments**.

## This story is E11

G6 and **E11 are one implementation.** The authoritative user story, acceptance criteria, and implementation flow live in:

> [`docs/user-story/E-courier-delivery-real-time-tracking/E11-admin-read-only-delivery-oversight.md`](../E-courier-delivery-real-time-tracking/E11-admin-read-only-delivery-oversight.md)

This file exists only so Epic G's SRS `7`-group traceability is complete. Do **not** open a second ticket or build it twice.

## Acceptance Criteria (summary — see E11 for the full Gherkin)

- [ ] Courier accounts appear in Admin account management (`GET /admin/users?role=COURIER` / `GET /admin/couriers`) with the same fields as other roles
- [ ] `GET /admin/deliveries` returns a read-only table: assigned Courier (if any), `stage`, timestamps (`pickedUpAt`, `deliveredAt`), and the associated order's recipient reference
- [ ] `GET /admin/deliveries?stage=` filters by pipeline stage
- [ ] **No** manual assign / reassign / force-claim control exists anywhere in this view — read-only by design, per the explicit "no Admin manual dispatch" scope boundary (PRD §8)
- [ ] Both endpoints reject non-Admin roles

## Related Epic
Courier Delivery & Real-Time Tracking (Epic E — #85), story **E11 / #104** — the authoritative ticket. Cross-referenced from Admin Functionality (Epic G — #124), story G6 / #130.
