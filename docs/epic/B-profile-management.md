---
title: "[EPIC] Profile Management"
labels: epic
---

**Traceability:** PRD Epic B (`docs/PRD.md` §7) · SRS `3` · API: `docs/api_design.md` §5, §5A

## Goal
Let Recipients and Donors edit their contact info and upload an avatar/logo, so profile data displayed elsewhere in the app (listings, orders, deliveries) stays accurate and personalized.

## User Stories
- [ ] #67 — Profile Edit & Avatar Upload
- [ ] B2 — Change Password & Email *(new — no GitHub issue filed yet)*

## Acceptance Criteria
- [ ] Any authenticated user can update their editable contact fields via `PATCH /users/me`
- [ ] A user can upload an avatar/logo image that is stored in Supabase Storage and reflected via `USER.avatarUrl`
- [ ] Uploaded images are resized/handled per the defined standard size before being usable as an avatar
- [ ] Any authenticated user can change their password via `PATCH /users/me/password`, which revokes their current session token and requires logging in again
- [ ] Any authenticated user can change their email via `PATCH /users/me/email`, rejected with `409` if another account already holds it

## Out of Scope
- Tax code — not editable post-signup, not specified anywhere in the PRD
- Listing image upload — Epic C (Donor Food Donation Management), shares the same `POST /media/upload-url` endpoint but is a separate story (C1)
- Forgot-password / unauthenticated password reset — not specified anywhere in the PRD; `PATCH /users/me/password` requires an active session, so it only covers a logged-in user changing a password they already know

## Notes
- Per `docs/api_design.md` §5A, the backend never receives image bytes directly — the client requests a signed Supabase upload URL via `POST /media/upload-url` (`purpose: 'AVATAR'`), uploads directly to Supabase, then persists the returned `mediaUrl` via `PATCH /users/me`.
- Per `docs/blockers.md`: B1 is Partial — depends on A1–A4, and Supabase Storage credentials are still placeholder-only in `.env.example`, not provisioned.
- No server-side image resizing happens per §5A's note — standard avatar sizing is either enforced client-side before upload or deferred to a follow-up using Supabase's on-the-fly image transforms at read time.
- B2 (password/email change) is new scope, not present in the original PRD — email was previously listed as not editable post-signup at all. It was added because `RevokedToken`'s `reason` enum already carried an unused `PASSWORD_CHANGE` value (`docs/database_design.md`), strongly implying this flow was anticipated but never specified or built. Deliberately, neither endpoint requires re-entering the current password — the active session token is treated as sufficient proof, matching every other authenticated write in this API; see `docs/user-story/B-profile-management/B2-change-password-email.md` for the full rationale.
