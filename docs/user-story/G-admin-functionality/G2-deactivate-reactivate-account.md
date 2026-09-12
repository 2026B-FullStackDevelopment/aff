---
title: "[STORY][ADMIN] Deactivate / Reactivate Account"
labels: user-story
---

**Traceability:** PRD `G2` (SRS `7.2.1`) · API: `PATCH /admin/users/:id/status` (`docs/api_design.md` §11) · reuses A4's `REVOKED_TOKEN` mechanism

## User Story
As an **Admin**,
I can **set any account's status to deactivated or active**
so that **I can immediately cut off a misbehaving user and later restore them without deleting anything**.

## Acceptance Criteria

- [ ] **Scenario:** Deactivating an account
  - **Given** an `ACTIVE` account of any role
  - **When** I submit `{ status: 'DEACTIVATED' }` to `PATCH /admin/users/:id/status`
  - **Then** `USER.status` becomes `DEACTIVATED` and the response returns the updated `UserDTO`

- [ ] **Scenario:** Deactivation revokes live sessions immediately
  - **Given** the target user currently has a valid session token
  - **When** I deactivate their account
  - **Then** their current-session `jti`(s) are inserted into `REVOKED_TOKEN` with `reason=ADMIN_DEACTIVATE`, and their next authenticated request is rejected

- [ ] **Scenario:** Reactivating an account
  - **Given** a `DEACTIVATED` account
  - **When** I submit `{ status: 'ACTIVE' }`
  - **Then** `USER.status` becomes `ACTIVE`; the user can log in again and obtain a fresh token (previously revoked tokens stay revoked)

- [ ] **Scenario:** Works uniformly across roles
  - **Given** the target is a Courier (or Recipient, or Donor)
  - **When** I toggle their status
  - **Then** the same behavior applies with no role-specific branch

- [ ] **Scenario:** Non-Admin is rejected
  - **Given** I am not an Admin
  - **When** I call `PATCH /admin/users/:id/status`
  - **Then** the request is rejected

## Implementation Flow

1. **Reuse A4's revocation path verbatim** — the only new piece is passing `reason=ADMIN_DEACTIVATE` when inserting the user's live `jti`(s) into `REVOKED_TOKEN`. The auth middleware's existing `REVOKED_TOKEN` check does the rest on the user's next request.
2. **Deactivation does not cascade to the user's data** — their listings, orders, and deliveries are untouched. This is an access cut, not a cleanup. (Listing cancellation is a separate, explicit Admin action — G3.)
3. **Reactivation only flips `status`** — it does not un-revoke old tokens. The user simply logs in fresh.
4. **Render as a per-row toggle in G1's account table**, with a confirm step for deactivation. Optimistically reflect the new status, then reconcile with the returned `UserDTO`.
5. **Body is a strict two-value enum** (`ACTIVE` | `DEACTIVATED`); reject anything else with `400`.
6. **Depends on G1** (the table this lives in) **and A4** (the `REVOKED_TOKEN` revocation path) — `docs/blockers.md`, G2 🟡 Partial.

## Related Epic
Admin Functionality (Epic G — #124)
