---
title: "[STORY][AUTH] Donor Registration"
labels: user-story
---

**Traceability:** PRD `A2` (SRS `1B.1`, `1B.2`, `1B.3.1`) · API: `POST /auth/register/donor` (`docs/api_design.md` §4)

## User Story
As a **prospective Donor (business with surplus food)**,
I can **register with a username, my company name, email, password, tax code, city, and pickup address**
so that **Couriers and Recipients have accurate location data to find and deliver from my listings**.

## Acceptance Criteria

- [ ] **Scenario:** Successful registration with a selected pickup address
  - **Given** I am on the Donor registration page
  - **and Given** I have entered a username, my company name, email, password, tax code, and city
  - **When** I type my pickup address, the app queries OSM Nominatim and shows a list of matching address candidates as I type, and I select one of the returned options before submitting
  - **Then** a new account is created with `role=DONOR` and the submitted `username`, and a `DONOR` profile is saved with `companyName`, `taxCode`, `addressText`, and the `location` coordinates from the selected candidate, and I am logged in immediately

  **Note:** Address selection is list-based only — the Donor picks from Nominatim's returned candidates. There is no map pin-drop, drag-to-adjust, or manual coordinate entry.

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

- [ ] **Scenario:** Invalid tax code format is rejected
  - **Given** I am filling out the registration form
  - **When** I enter a tax code that doesn't match the expected format
  - **Then** I see an inline field error explaining the format required, and the form does not submit

**Tax code rule**: Tax code contains from 10 to 13 digits

- [ ] **Scenario:** An address must be selected from the candidate list before submission
  - **Given** the address I typed returns no matching candidates from Nominatim, or I have not yet selected one of the returned candidates
  - **When** I try to submit the form
  - **Then** submission is blocked until I revise my search and select a valid address candidate from the list

- [ ] **Scenario:** Server mirrors client-side validation
  - **Given** a request reaches the server with an invalid username, company name, tax code, email, or password (e.g. a modified client bypassing frontend checks)
  - **When** `POST /auth/register/donor` is called
  - **Then** the server rejects the request with a `400` error rather than trusting client-side validation alone

## Related Epic
Authentication (Epic A — Account, Authentication & Profile)
