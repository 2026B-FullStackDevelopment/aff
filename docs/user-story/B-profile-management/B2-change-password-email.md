---
title: "[STORY][PROFILE] Change Password & Email"
labels: user-story
---

**Traceability:** PRD — *(new, not tied to an existing PRD story)* · API: `PATCH /users/me/password`, `PATCH /users/me/email` (`docs/api_design.md` §5)

## User Story
As a **registered user**,
I can **change my password or my email address from my account settings**
so that **I can keep my credentials and contact email current without anyone else's help**.

## Acceptance Criteria

- [ ] **Scenario:** Successful password change
  - **Given** I am logged in
  - **When** I submit a new password that meets the platform's strength rules
  - **Then** `PATCH /users/me/password` updates `USER.passwordHash`, my current session token is revoked (`REVOKED_TOKEN.reason=PASSWORD_CHANGE`), and I must log in again with the new password

- [ ] **Scenario:** Weak password is rejected
  - **Given** I am logged in
  - **When** I submit a new password that fails the strength rules (length, digit, special character, uppercase)
  - **Then** `PATCH /users/me/password` responds `400` and my session is left untouched — I am not logged out

- [ ] **Scenario:** Successful email change
  - **Given** I am logged in and the email I submit is not already registered to another account
  - **When** I submit a new email address
  - **Then** `PATCH /users/me/email` updates `USER.email`, my session stays active (no re-login required), and I see the new email reflected immediately

- [ ] **Scenario:** Duplicate email is rejected
  - **Given** another account is already registered with the email I submit
  - **When** I submit that email as my new one
  - **Then** `PATCH /users/me/email` responds `409` and `USER.email` is left unchanged

- [ ] **Scenario:** Re-submitting my own current email is not an error
  - **Given** I submit my own current email address as the "new" one
  - **When** the uniqueness check runs
  - **Then** it succeeds as a no-op `200`, not a `409` — the check excludes my own account

## Implementation Flow

1. **Two endpoints, not one.** Password and email changes are separate `PATCH` calls with separate validation, kept out of the general-purpose `PATCH /users/me` (which stays scoped to non-sensitive contact fields per this epic).
2. **No `currentPassword` re-entry is required for either call** — the active session token is treated as sufficient proof, matching how every other authenticated write in this API works. If that trust model ever changes, both endpoints change together.
3. **Password change must revoke the calling token.** Reuse `revokeToken` (`auth/revoked-token.repository.ts`) exactly as `POST /auth/logout` does, but with `reason: 'PASSWORD_CHANGE'` — that enum value already exists on `RevokedToken` specifically for this. Do not issue a new token in the response; the client re-authenticates via `POST /auth/login`.
4. **Email uniqueness must exclude the requester's own row**, or re-submitting an unchanged email would incorrectly `409` against yourself. Mirror `user.service.ts`'s `createUser` duplicate-email pattern (check-then-write, with the Mongo `11000` race caught the same way) rather than relying on the check alone.
5. **Frontend:** on a successful password change, treat the response the same as a forced logout — clear local session state and redirect to login, rather than trying to keep the UI in an authenticated state with a token the server just revoked.

## Related Epic
Profile Management (Epic B — #65)
