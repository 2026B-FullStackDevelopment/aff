---
title: "[STORY][AUTH] Login with Brute-Force Lockout"
labels: user-story
---

**Traceability:** PRD `A3` (SRS `2.2.1`) · API: `POST /auth/login` (`docs/api_design.md` §4)

## User Story
As **any registered user (Recipient, Donor, Admin, or Courier)**,
I can **log in with my username or email and password**
so that **I can access my account, and be confident brute-force attempts against my account are blocked**.

## Acceptance Criteria

- [ ] **Scenario:** Successful login
  - **Given** I have a registered, active account
  - **When** I submit my correct email and password
  - **Then** I am logged in, issued a session token identifying my user ID and role, and my `failedLoginCount` is reset to zero

- [ ] **Scenario:** Invalid credentials show a generic error
  - **Given** I am on the login page
  - **When** I submit a email and password combination that doesn't match an account, or doesn't match the password for an existing account
  - **Then** I see a single generic error message that does not reveal whether the email/username exists in the system

- [ ] **Scenario:** Account locks out after repeated failures
  - **Given** I have made 4 failed login attempts for my account within the last 60 seconds
  - **When** I submit a 5th failed attempt within that same rolling 60-second window
  - **Then** my account is locked for 5 minutes, further login attempts are rejected until the lockout expires, and I'm shown how long the lockout lasts

- [ ] **Scenario:** Locked account rejects even correct credentials
  - **Given** my account is currently locked out from repeated failed attempts
  - **When** I submit my correct password before the 5-minute lockout window expires
  - **Then** the login is still rejected until the lockout period has passed

## Related Epic
Authentication (Epic A)
