---
title: "[STORY][PROFILE] Profile Edit & Avatar Upload"
labels: user-story
---

**Traceability:** PRD `B1` (SRS `3.1.1`, `3.2.1`) · API: `PATCH /users/me`, `POST /media/upload-url` (`docs/api_design.md` §5, §5A)

## User Story
As a **registered Recipient or Donor**,
I can **edit my contact info and upload an avatar or company logo**
so that **my profile stays accurate and personalized everywhere it's shown in the app**.

## Acceptance Criteria

- [ ] **Scenario:** Successful text field update
  - **Given** I am logged in and viewing my profile edit form
  - **When** I change one or more editable contact fields (e.g. `username`, `city`, `country`, or, if I'm a Donor, `companyName`/`addressText`) and submit
  - **Then** `PATCH /users/me` persists the changes and I see the updated values reflected immediately, with no page reload required

- [ ] **Scenario:** Successful avatar upload with live preview
  - **Given** I am on my profile edit form
  - **When** I select an image file for my avatar/logo
  - **Then** the app calls `POST /media/upload-url` with `purpose: 'AVATAR'`, `PUT`s the image bytes directly to the returned `uploadUrl`, shows a live preview of the selected image, and then persists the returned `mediaUrl` to `USER.avatarUrl` via `PATCH /users/me`

- [ ] **Scenario:** Avatar upload resizes to the standard size
  - **Given** I have selected an image larger than the platform's defined standard avatar size
  - **When** the upload completes
  - **Then** the avatar displayed across the app (profile, listings, order history) is resized/cropped to the defined standard size, not shown at its original dimensions

- [ ] **Scenario:** Invalid field values are rejected
  - **Given** I am editing my profile
  - **When** I submit a value that fails server-side validation for an editable field
  - **Then** `PATCH /users/me` responds `400`, and I see an inline error explaining what needs to change

- [ ] **Scenario:** Unsupported image type is rejected before upload
  - **Given** I select a file whose content type isn't supported for avatar upload
  - **When** the app calls `POST /media/upload-url` with that `contentType`
  - **Then** the request is rejected with `400` and I see an inline error, and no upload URL is generated

## Implementation Flow

1. **Load current state first.** Hydrate the form from `GET /users/me` on mount — never start from a blank form — so unedited fields are never accidentally wiped on save.
2. **Avatar upload is a 3-step handoff, always in this order:** request a signed URL (`POST /media/upload-url`, `purpose: 'AVATAR'`) → `PUT` the raw file bytes directly to that `uploadUrl` (not to our backend) → only then send the returned `mediaUrl` to our own server. The backend never receives image bytes; don't try to route the file through it.
3. **Preview immediately from the local file**, before the upload finishes — don't wait on the network round-trip to show the user their picture.
4. **Resizing to the standard size happens via Supabase's on-the-fly transform, at read/display time** — append the transform to how `avatarUrl` is rendered wherever it's shown (profile, listings, order history). Do not add client-side image-processing/cropping logic for this; that would duplicate the standard size in two places.
5. **One save, not two.** Text field edits and a newly uploaded avatar are committed together in a single `PATCH /users/me` call (`avatarUrl` set to the `mediaUrl` from step 2). Don't fire a separate save for the avatar.
6. **Validate client-side first, but never trust it.** Mirror the field rules in the UI for fast feedback, but the server re-validates everything on `PATCH /users/me` and is the actual source of truth — don't skip server-side checks because the form already checked.
7. **After a successful save, replace form state with the response DTO**, not with what the user typed — the server response is authoritative (e.g. it reflects any server-side normalization).
8. **On failure, keep it field-scoped.** A rejected `contentType` on upload or a `400` on save should surface as an inline error next to the relevant field/control, and must not discard the rest of the user's unsaved edits.

## Related Epic
Profile Management (Epic B — #65)
