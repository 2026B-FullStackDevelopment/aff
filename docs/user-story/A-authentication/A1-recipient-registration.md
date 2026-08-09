---
title: "[STORY][AUTH] Recipient Registration"
labels: user-story
---

**Traceability:** PRD `A1` (SRS `1A.1`, `1A.2`, `1A.3.1`) · API: `POST /auth/register/recipient` (`docs/api_design.md` §4)

## User Story
As a **prospective Recipient**,
I can **register with a username, email, password, and city**
so that **I can access the marketplace and start browsing and reserving food listings**.

## Acceptance Criteria

- [ ] **Scenario:** Successful registration
  - **Given** I am on the registration page
  - **and Given** I have not registered an account with this email before
  - **When** I submit a valid username, email, password, and city (selected from the Vietnamese province/municipality dropdown)
  - **Then** a new account is created with `role=RECIPIENT`, `status=ACTIVE`, and `tier=STANDARD`, and I am logged in immediately with no address required at this stage

- [ ] **Scenario:** Duplicate email is rejected
  - **Given** an account already exists with a given email
  - **When** I try to register using that same email
  - **Then** I see an inline error stating the email is already registered, and no new account is created

- [ ] **Scenario Outline:** Invalid password is rejected with a helpful example
  - **Given** I am filling out the registration form
  - **When** I enter a password `<password>`
  - **Then** I see an inline field error explaining "<reason>" and a valid-format example, and the form does not submit

  **Password strength rules:** at least 8 characters (a), at least 1 number (b), at least 1 special character e.g. `$#@!` (c), at least 1 capitalized letter (d).

  **Examples:**
  | password | reason |
  |---|---|
  | `abc123!` | fewer than 8 characters |
  | `abcdefgh!` | missing a number |
  | `abcdefgh1` | missing a special character |
  | `abcdefg1!` | missing a capitalized letter |

- [ ] **Scenario Outline:** Invalid email syntax is rejected
  - **Given** I am filling out the registration form
  - **When** I enter an email `<email>`
  - **Then** I see an inline field error explaining "<reason>", and the form does not submit

  **Email syntax rules:** exactly one `@` symbol (a), at least one `.` after the `@` symbol (b), total length under 255 characters (c), no spaces or prohibited characters e.g. `( ) ; :` (d).

  **Examples:**
  | email | reason |
  |---|---|
  | `nameexample.com` | missing the `@` symbol |
  | `name@@example.com` | more than one `@` symbol |
  | `name@examplecom` | no `.` after the `@` symbol |
  | `name @example.com` | contains a space |
  | `name(1)@example.com` | contains a prohibited character |
  | *(a 255+ character address)* | total length is not under 255 characters |

- [ ] **Scenario Outline:** Invalid username syntax is rejected
  - **Given** I am filling out the registration form
  - **When** I enter a username `<username>`
  - **Then** I see an inline field error explaining only English letters, numbers, underscores, and hyphens are allowed, and the form does not submit

  **Username syntax rule:** English alphabet characters, numbers, underscore (`_`), and hyphen (`-`) only.

  **Examples:**
  | username | reason |
  |---|---|
  | `john doe` | contains a space |
  | `john.doe` | contains a `.`, which isn't allowed |
  | `jöhn` | contains a non-English-alphabet character |
  | `john@doe` | contains a prohibited symbol |

- [ ] **Scenario:** City must come from the supported list
  - **Given** I am filling out the registration form
  - **When** I try to submit without selecting a city from the province/municipality dropdown
  - **Then** I see an inline error and the form does not submit

- [ ] **Scenario:** Server mirrors client-side validation
  - **Given** a request reaches the server with an invalid username, email, or password (e.g. a modified client bypassing frontend checks)
  - **When** `POST /auth/register/recipient` is called
  - **Then** the server rejects the request with a `400` error rather than trusting client-side validation alone

## Related Epic
Authentication (Epic A — Account, Authentication & Profile)
