# AFF Platform — User Story Blockers Assessment

Based on `docs/PRD.md` (all 45 stories across Epics A–G), cross-checked against the current codebase state (`backend/src/modules/` — `listings`/`orders` exist but still use the pre-PRD-v2 schema; no `delivery` module exists yet; `.env.example` has placeholder-only Stripe/Supabase/Nodemailer credentials) and the PRD's own §9 Risks / §11 Open Questions.

---

## Blockers Assessment — All User Stories

| Epic | Story | Blocker(s) | Status |
|---|---|---|---|
| A — Authentication | A1. Recipient Registration | None — city list now sourced from the `country-state-city` npm package | 🟢 Ready |
| A — Authentication | A2. Donor Registration | OSM Nominatim + Leaflet geocoding integration not yet built | 🟡 Partial |
| A — Authentication | A3. Login with Lockout | None | 🟢 Ready |
| A — Authentication | A4. JWT Issuance & Revocation | None — but is itself a prerequisite for every protected route in every other epic | 🟢 Ready |
| B — Profile Management | B1. Profile Edit & Avatar Upload | Depends on A1–A4; Supabase Storage credentials are placeholder-only in `.env.example`, not provisioned | 🟡 Partial |
| C — Donor Food Donation Mgmt | C1. Create Listing | `listing.model.ts` still uses the pre-PRD-v2 schema (`title`, `pickupLocation`, no `category`/`unit`/`price` rule) — needs rebuild | 🔴 Blocked |
| C — Donor Food Donation Mgmt | C2. Clone Listing | Depends on C1 rebuild | 🔴 Blocked |
| C — Donor Food Donation Mgmt | C3. Donor-Initiated Donation | Depends on C1 rebuild, A1, and `DeliveryService.createForOrder` (Epic E — module doesn't exist yet) | 🔴 Blocked |
| C — Donor Food Donation Mgmt | C4. Search/Filter/Sort Own Listings, with Active/Past Grouping (absorbs the original Active/Past donations dashboard story) | Depends on C1 rebuild and on Orders existing (D2/C3) to compute stats | 🔴 Blocked |
| C — Donor Food Donation Mgmt | C5. Pause/Resume/Cancel Listing | Depends on C1 rebuild; cascade cancel needs `DELIVERY.stage` — Delivery module missing | 🔴 Blocked |
| C — Donor Food Donation Mgmt | C6. Ration Limit Per Person | Depends on C1 rebuild; enforcement point lives in D2 (cross-epic) | 🔴 Blocked |
| C — Donor Food Donation Mgmt | C7. Per-Request Listing | Depends on C1 rebuild | 🔴 Blocked |
| C — Donor Food Donation Mgmt | C8. View Orders Against a Listing | Depends on C1 rebuild + D2/C3 (orders must exist) + `order.model.ts` rebuild (see D2) | 🔴 Blocked |
| C — Donor Food Donation Mgmt | C9. Sold-Out Alert | Depends on C1 rebuild; Socket.IO layer not yet built | 🔴 Blocked |
| D — Recipient Food Ordering | D1. Browse Active Listings | Depends on C1 rebuild (nothing to browse until Listing schema is fixed) | 🔴 Blocked |
| D — Recipient Food Ordering | D2. Reserve & Pay | `order.model.ts` still uses the pre-PRD-v2 schema (no `intakePath`/`paymentMethod`/`paymentStatus`/`amount`); Stripe sandbox keys are placeholder-only; `DeliveryService.createForOrder` doesn't exist | 🔴 Blocked |
| D — Recipient Food Ordering | D3. Stripe Card Registration | Depends on D2 rebuild + real Stripe test-mode keys | 🔴 Blocked |
| D — Recipient Food Ordering | D4. Cancel Order Before Courier Claim | Depends on D2 rebuild + Delivery module (`DELIVERY.stage` check); Stripe-refund-on-cancel policy still undecided (§11, non-blocking but incomplete without it) | 🔴 Blocked |
| D — Recipient Food Ordering | D5. Order/Delivery History | Depends on D2 rebuild | 🔴 Blocked |
| D — Recipient Food Ordering | D6. Search/Filter/Sort Listings | Depends on C1/D1 | 🔴 Blocked |
| D — Recipient Food Ordering | D7. Feedback on Delivered Order | Depends on D2 rebuild + full Epic E delivery flow reaching `DELIVERED` | 🔴 Blocked |
| D — Recipient Food Ordering | D8. View Donor Location | Depends on C1 rebuild + A2 (Donor location) | 🔴 Blocked |
| E — Courier Delivery & Tracking | E1. Admin Creates Courier Accounts | No `delivery`/`courier` module exists in `backend/src/modules/` yet — ground-up build | 🔴 Blocked |
| E — Courier Delivery & Tracking | E2. Shared Oldest-First Queue | Depends on E1 + `DELIVERY` collection/schema (doesn't exist) + orders existing (D2/C3) | 🔴 Blocked |
| E — Courier Delivery & Tracking | E3. Atomic Claim | Depends on E2; flagged in §9 as a specific concurrency risk requiring explicit unit testing | 🔴 Blocked |
| E — Courier Delivery & Tracking | E4. One Active Delivery at a Time | Depends on E3 | 🔴 Blocked |
| E — Courier Delivery & Tracking | E5. Pickup Address as Text | Depends on E3 + A2 (Donor address) | 🔴 Blocked |
| E — Courier Delivery & Tracking | E6. Start Live Tracking | Depends on E3; Socket.IO layer not yet built; Browser Geolocation requires HTTPS — full testing needs the Render deployment, not just localhost (§9) | 🔴 Blocked |
| E — Courier Delivery & Tracking | E7. Complete Delivery (Cash Confirmation) | Depends on E6 + D2 (cash payment method) | 🔴 Blocked |
| E — Courier Delivery & Tracking | E8. Live Order Status for Recipient | Depends on E3–E7 + Socket.IO layer | 🔴 Blocked |
| E — Courier Delivery & Tracking | E9. Live Courier Position | Depends on E6; same HTTPS/Geolocation constraint as E6 | 🔴 Blocked |
| E — Courier Delivery & Tracking | E10. Delivered State | Depends on E7 | 🔴 Blocked |
| E — Courier Delivery & Tracking | E11. Admin Read-Only Delivery Oversight | Depends on E1–E7 | 🔴 Blocked |
| E — Courier Delivery & Tracking | E12. Single Delivery Entry Point (`createForOrder`) | Root blocker for the whole epic — building this (and the `DELIVERY` schema) is the prerequisite everything else in E, plus C3/D2, sits behind | 🔴 Blocked |
| F — Premium Subscription | F1. Stripe Recurring Subscription | Real Stripe keys not provisioned; transactional email provider unfinalized (§11); Stripe webhook event/idempotency handling unspecified (§11); flagged in §9 as likely to take longer than expected | 🟡 Partial |
| F — Premium Subscription | F2. Notification Preferences | Depends on F1 (must reach Premium tier first) | 🟡 Partial |
| F — Premium Subscription | F3. Real-Time Match Alerts | Depends on F2, C1 rebuild (listing creation trigger), Socket.IO layer | 🔴 Blocked |
| F — Premium Subscription | F4. Location-Aware Ranking | Depends on F1, D1/D6, Browser Geolocation API | 🔴 Blocked |
| G — Admin Functionality | G1. View All Accounts | Depends on A1/A2/E1 (Courier accounts need E1 to exist first) | 🟡 Partial |
| G — Admin Functionality | G2. Deactivate/Reactivate Account | Depends on G1 + A4 (`REVOKED_TOKEN` revocation on deactivate) | 🟡 Partial |
| G — Admin Functionality | G3. Cancel Any Active Listing | Depends on C1 rebuild, C5, Delivery module (cascade needs `DELIVERY.stage`) | 🔴 Blocked |
| G — Admin Functionality | G4. Searchable Listing Directory | Depends on C1 rebuild | 🔴 Blocked |
| G — Admin Functionality | G5. Real-Time Cancellation Notice | Depends on G3 + Socket.IO layer | 🔴 Blocked |
| G — Admin Functionality | G6. Read-Only Courier Oversight | Depends on E1/E11 | 🔴 Blocked |

---

## Cross-Cutting Blockers (affect multiple stories above)

| Blocker | Affects | Resolution needed |
|---|---|---|
| `listing.model.ts` / `order.model.ts` still on pre-PRD-v2 schema | All of Epic C, D | Rebuild per `docs/database_design.md` + `docs/api_design.md` (category/unit/price rule, intakePath/paymentMethod/paymentStatus/orderStatus, etc.) |
| No `delivery` module in codebase | All of Epic E, plus C3/C5/D2/D4/D7/G3 | Build the module from scratch (own MongoDB collection, `DeliveryService.createForOrder`) |
| Socket.IO real-time layer not yet implemented | C9, E6, E8, E9, F3, G5 | Stand up the shared layer before any of these can be demoed |
| Stripe/Supabase/SMTP credentials are placeholders in `.env.example` | B1, D2, D3, F1 | Provision real sandbox/test-mode credentials |
| Open PRD questions (§11) not yet decided | D4 (refund policy), F1 (email provider, webhook event set) | Team decision — PRD marks these as non-blocking for starting work, but each story is incomplete without a decision |

**Summary:** 3 of 45 stories are fully unblocked today (A1, A3, A4). A2, B1, F1, F2, G1, and G2 are partially blocked (each has one remaining gap — see rows above). Everything in Donor/Recipient ordering and Courier Delivery is blocked on two structural gaps: the `listings`/`orders` schema rebuild and the not-yet-built `delivery` module — both are prerequisites the team should tackle first, since nearly every other story in Epics C–G transitively depends on one or both.
