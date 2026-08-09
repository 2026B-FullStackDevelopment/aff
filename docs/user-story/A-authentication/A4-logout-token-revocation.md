---
title: "[STORY][AUTH] Logout with Server-Side Token Revocation"
labels: user-story
---

**Traceability:** PRD `A4` (SRS `2.3.1`, `2.3.2`) · API: `POST /auth/logout` (`docs/api_design.md` §4)

## User Story
As a **logged-in user**,
I can **log out and have my session token properly invalidated on the server**,
so that **a token I no longer trust (or that leaks after logout) can't still be used to access my account**.

## Acceptance Criteria

- [ ] **Scenario:** Logging out revokes the token server-side
  - **Given** I am logged in with a valid session token
  - **When** I click "Log out"
  - **Then** the token's `jti` is inserted into the server's revoked-token list before my local session state is cleared, and I am returned to a logged-out state

- [ ] **Scenario:** A revoked token can no longer access protected routes
  - **Given** I have logged out and my token's `jti` has been revoked
  - **When** that same token is used to call any protected API route
  - **Then** the request is rejected with a `401 Unauthorized`, forcing re-authentication

- [ ] **Scenario:** Client-side deletion alone is not sufficient
  - **Given** the logout flow completes
  - **When** I inspect the request sequence
  - **Then** the server-side revocation call happens as part of logout, not merely a local token deletion in the browser

## Related Epic
Authentication (Epic A — Account, Authentication & Profile)
