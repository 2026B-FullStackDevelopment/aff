---
title: "[STORY][ADMIN] View All Accounts"
labels: user-story
---

**Traceability:** PRD `G1` (SRS `7.1.1`, extended per Epic E) · API: `GET /admin/users`, `GET /admin/couriers` (`docs/api_design.md` §11)

## User Story
As an **Admin**,
I can **see every account — Recipients, Donors, and Couriers — with ID, name, email, role, and status, in one filterable table**
so that **I have a single place to find and act on any user of the platform**.

## Acceptance Criteria

- [ ] **Scenario:** Listing all accounts
  - **Given** I am logged in as Admin
  - **When** I call `GET /admin/users`
  - **Then** I get a paginated list of role-appropriate DTOs, each showing at least `id`, name, `email`, `role`, and `status`

- [ ] **Scenario:** Filtering by role
  - **Given** I want to see only delivery staff
  - **When** I call `GET /admin/users?role=COURIER`
  - **Then** only Courier accounts are returned

- [ ] **Scenario:** Filtering by status and search
  - **Given** I am looking for a specific deactivated user
  - **When** I call `GET /admin/users?status=DEACTIVATED&search=<term>`
  - **Then** results are narrowed to deactivated accounts matching the search term

- [ ] **Scenario:** Couriers appear alongside other roles
  - **Given** Courier accounts have been created via E1
  - **When** I view the unfiltered account table
  - **Then** Couriers are listed together with Recipients and Donors; `GET /admin/couriers` returns the same Courier data as a convenience alias

- [ ] **Scenario:** Non-Admin is rejected
  - **Given** I am logged in as a Recipient, Donor, or Courier
  - **When** I call `GET /admin/users` or `GET /admin/couriers`
  - **Then** the request is rejected

## Implementation Flow

1. **One backing query, role-shaped projection** — `GET /admin/users` reads `USER` joined with the role-specific collection and returns the DTO for that role (`RecipientDTO`/`DonorDTO`/`CourierDTO`). `GET /admin/couriers` is the same query pinned to `role=COURIER`, kept because the PRD calls out Courier listing separately.
2. **Support `role`, `status`, `search`, and pagination as query params** (`page`/`limit`/`total`, per `docs/api_design.md` §2.4). `search` matches username/email/name.
3. **Build the UI as one filterable table** with a role tab/dropdown — not separate screens per role. This same shell is what G2 hangs its status toggle on and what E11 slots Courier accounts into.
4. **This is read-only.** No create, edit, or delete controls here — account creation is A1/A2 (public) and E1 (Courier); the only mutation on an account is G2's status toggle.
5. **Depends on A1/A2** (accounts to list) and on **E1** existing before Couriers can appear in the table (`docs/blockers.md`, G1 🟡 Partial).

## Related Epic
Admin Functionality (Epic G — #124)
