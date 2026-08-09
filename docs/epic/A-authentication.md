---
title: "[EPIC] Authentication"
labels: epic
---

**Traceability:** PRD Epic A (`docs/PRD.md` §7) · SRS `1A`, `1B`, `2` · API: `docs/api_design.md` §4

## Goal
Let Recipients and Donors register, and any registered user log in and out securely (with brute-force lockout and server-side session revocation), so every other epic has a working identity and session layer to build on.

## User Stories
- [ ] #47 — Recipient Registration
- [ ] #48 — Donor Registration
- [ ] #49 — Login with Brute-Force Lockout
- [ ] #50 — Logout with Server-Side Token Revocation

## Acceptance Criteria
- [ ] Recipients and Donors can each register through their own endpoint and land in an authenticated session immediately
- [ ] Login issues a session token identifying the user's ID and role, and rejects invalid credentials with a generic (non-enumerating) error
- [ ] After 5 failed login attempts within a rolling 60-second window, the account is locked for 5 minutes
- [ ] Logout inserts the token's `jti` into `REVOKED_TOKEN` server-side, and a revoked token is rejected with `401` on every subsequent protected-route call
- [ ] All four endpoints in `docs/api_design.md` §4 are implemented per spec (not just routed/stubbed)

## Out of Scope
- Profile editing and avatar upload — Epic B (Profile Management)
- Stripe card registration at first checkout — Epic D (Recipient Food Ordering), story D3
- Courier account creation — Admin-created only, Epic E (Courier Delivery), story E1
- Password reset / forgot-password flow — not specified anywhere in the PRD

## Notes
- City dropdown (A1/A2) is sourced from the `country-state-city` npm package — this was an open question, now resolved (see `docs/PRD.md` §11 history).
- Donor address capture (A2) is list-based selection from OSM Nominatim candidates, not a draggable map pin.
- Per `docs/blockers.md`: A1, A3, and A4 are currently unblocked; A2's remaining blocker is the OSM Nominatim + Leaflet integration not being built yet.
- Backend routes for this epic are scaffolded in `backend/src/modules/auth` (`POST /auth/register/recipient`, `POST /auth/register/donor`, `POST /auth/login`, `POST /auth/logout`) per `docs/api_design.md` §4 — registration and login reuse existing service logic, logout is currently a `501` stub pending the `REVOKED_TOKEN` mechanism.
