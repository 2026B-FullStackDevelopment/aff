---
title: "[STORY][ADMIN] Admin Creates Courier Accounts"
labels: user-story
---

**Traceability:** PRD `E1` (new) · API: `POST /admin/couriers` (`docs/api_design.md` §11)

## User Story
As an **Admin**,
I can **create Courier accounts**
so that **delivery staff can log in and work the queue without any public self-registration path existing**.

## Acceptance Criteria

- [ ] **Scenario:** Successful Courier account creation
  - **Given** I am logged in as Admin
  - **When** I submit `{ username, email, tempPassword, fullName }` to `POST /admin/couriers`
  - **Then** a `USER` (role=COURIER) and a `COURIER` (fullName) are created, and the account appears in E11/G1's account listings

- [ ] **Scenario:** Duplicate email rejected
  - **Given** an account already exists with a given email
  - **When** I submit a new Courier with that same email
  - **Then** `POST /admin/couriers` rejects with `409`, and no account is created

- [ ] **Scenario:** No public registration route exists for Couriers
  - **Given** the auth module's registration endpoints (`docs/api_design.md` §4)
  - **When** I inspect them
  - **Then** neither accepts `role=COURIER` — `POST /admin/couriers` is the only way a Courier account is ever created

- [ ] **Scenario:** Only Admin can create Courier accounts
  - **Given** I am logged in as a non-Admin role
  - **When** I attempt `POST /admin/couriers`
  - **Then** the request is rejected — this endpoint is Admin-only

## Implementation Flow

1. **Build this as an Admin-only form, not a public one** — reuse the Admin account-management surface (G1) rather than adjoining it to the public login/register pages.
2. **`tempPassword` is set by the Admin at creation time, not auto-generated or emailed** per the current API contract — the form should treat it as a required field the Admin fills in, same validation rules as any other password field.
3. **After successful creation, the new Courier account should show up immediately in `GET /admin/couriers`/`GET /admin/users?role=COURIER` (E11/G1)** without a page reload — refetch or optimistically insert into that list's local state.
4. **Surface the `409` duplicate-email case as a field-specific inline error** on the email input, not a generic failure banner — same pattern as registration forms elsewhere in the app.
5. **This story doesn't touch login.** Once created, the Courier logs in through the existing `POST /auth/login` (A3) like any other role — no separate Courier login flow to build.

## Related Epic
Courier Delivery & Real-Time Tracking (Epic E)
