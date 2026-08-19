# Profile Management Guide — B1: Profile Edit & Avatar Upload

Step-by-step implementation guide for `docs/user-story/B-profile-management/B1-profile-edit-avatar-upload.md` (Epic B, `docs/epic/B-profile-management.md`). Traceability: PRD `B1` (SRS `3.1.1`, `3.2.1`) · API: `PATCH /users/me`, `POST /media/upload-url` (`docs/api_design.md` §5, §5A).

Written for two developers working in parallel — a **Backend dev** and a **Frontend dev** — with an explicit hand-off point between them.

## Scope check before you start

- **`POST /media/upload-url` is already fully implemented** (`backend/src/modules/media/*`, backed by `backend/src/integrations/storage/storage.provider.ts`, which already wraps `@supabase/supabase-js`). The backend dev does not need to touch it. The frontend dev just calls it.
- **`PATCH /users/me` is routed but stubbed** — `user.controller.ts`'s `updateMyProfile` currently just returns `501 notImplemented`. This is the real backend gap.
- **`GET /users/me` is also incomplete relative to its own spec.** Today it returns only base fields (`toUserResponseDto`) and never the role-specific ones (`tier`, `companyName`, `addressText`, `location`, etc.), even though `docs/api_design.md` §5 and the frontend's `AnyUserDTO` / `ProfilePage.tsx` (`profile.tier`) already assume the full role DTO. Since Implementation Flow step 1 is "hydrate the form from `GET /users/me`," this must be fixed too — otherwise a Donor's company fields have nothing to hydrate from, and Recipient tier display stays broken.
- **Frontend has a read-only `ProfilePage` and nothing else.** No update-profile service method, no upload UI, no file-input component, no way to refresh the cached session user after a save.
- **Courier/Admin:** no `courier.model.ts` exists yet (Courier account creation, Epic E1, is blocked). Role handling only needs to cover `RECIPIENT`, `DONOR`, and a plain fallback for `ADMIN`/`COURIER`.

## Order of work

**Backend first.** It changes the response shape both `GET /users/me` and `PATCH /users/me` return, and the frontend hook design depends on that shape. If both devs need to start immediately, the frontend dev can build everything up to the real `PATCH`/`POST /media/upload-url` calls against the documented shapes in `docs/api_design.md` §5/§5A and the existing `AnyUserDTO` type, then wire in the live calls once backend lands — but plan for backend to merge first since this module is small.

---

## Part 1 — Backend (`backend/src/modules/users`)

### Step 1. Extract shared field validators

Small refactor, avoids duplicating validation rules. Move `usernameSchema`, `citySchema`, `locationSchema` out of `backend/src/modules/auth/auth.schemas.ts` into a new `backend/src/shared/validation/common-fields.schemas.ts`. Update `auth.schemas.ts` to import them from there — no behavior change, same regexes/messages. This lets the new `user.schemas.ts` (Step 2) reuse the exact same rules instead of redefining them.

**Checkpoint:** `npm --workspace backend run typecheck` and `npm --workspace backend run test` still pass, no behavior change.

### Step 2. `backend/src/modules/users/user.schemas.ts` (new)

```ts
const updateUserSchema = z.object({
  username: usernameSchema.optional(),
  city: citySchema.optional(),
  country: z.string().min(1, { message: 'Country is required.' }).optional(),
  avatarUrl: z.string().url({ message: 'avatarUrl must be a valid URL.' }).nullable().optional(),
  companyName: z.string().min(1, { message: 'Company name is required.' }).optional(),
  addressText: z.string().min(1, { message: 'A pickup address is required.' }).optional(),
  location: locationSchema.optional(),
}).strict();

type UpdateUserRequestDto = z.infer<typeof updateUserSchema>;
```

`.strict()` rejects unknown keys (e.g. `taxCode`, `email`) with a `400` — matches the epic's "not editable post-signup" note and the AC's "invalid field values are rejected" scenario.

### Step 3. `donor.repository.ts` — add `updateDonor`

```ts
function updateDonor(userId, data: Partial<{ companyName; addressText; location }>) {
  const update = { ...data };
  if (data.location) update.location = { ...data.location, updatedAt: new Date() };
  return Donor.findOneAndUpdate({ userId }, update, { new: true }).lean<DonorDocument>();
}
```

Mirrors `createDonor`'s existing pattern of stamping `location.updatedAt` server-side. `recipient.repository.ts` needs **no** update method — Recipient has no editable fields per §5 ("Recipient — none beyond base fields"). `user.repository.ts` already has `updateUser(id, data)` — reuse it as-is for `username`/`city`/`country`/`avatarUrl`.

### Step 4. `user.dto.ts` — add role-aware response DTOs

Add `RecipientResponseDto` / `DonorResponseDto` (same shape as the ones already in `auth.dto.ts`, but owned here since `auth.dto.ts` already imports `toUserResponseDto` *from* `user.dto.ts` — keep that dependency direction one-way) plus mapper functions `toRecipientResponseDto(user, recipient)`, `toDonorResponseDto(user, donor)`, following the exact spread pattern `auth.dto.ts`'s `toRecipientAuthDto` / `toDonorAuthDto` already use.

### Step 5. `user.service.ts` — the real logic

- **`getMyProfileDto(userId)`** — fetch the user, branch on `role`:
  - `DONOR` → `donorRepository.findDonorByUserId` + `toDonorResponseDto`
  - `RECIPIENT` → `recipientRepository.findRecipientByUserId` + `toRecipientResponseDto`
  - else (`ADMIN`/`COURIER`) → `toUserResponseDto`

  Used by **both** `getMyProfile` and `updateMyProfile` so they always return the same shape.

- **`updateUserProfile(userId, role, patch: UpdateUserRequestDto)`**:
  1. Split `patch` into base fields (`username`/`city`/`country`/`avatarUrl`) and donor fields (`companyName`/`addressText`/`location`).
  2. If any donor field is present and `role !== 'DONOR'`, throw `400` ("Only Donors can edit company profile fields.") — the field-level authorization the AC's validation scenario implies.
  3. If any base field is present, call `userRepository.updateUser`.
  4. If role is `DONOR` and any donor field is present, call `donorRepository.updateDonor`.
  5. Return `getMyProfileDto(userId)` — the fresh, authoritative combined DTO (Implementation Flow step 7: "replace form state with the response DTO").

### Step 6. `user.controller.ts`

- `getMyProfile`: replace `toUserResponseDto(user)` with `await userService.getMyProfileDto(req.user!.id)`.
- `updateMyProfile`: implement for real —
  ```ts
  async function updateMyProfile(req, res, next) {
    try {
      const patch = parseBody(updateUserSchema, req.body);
      const dto = await userService.updateUserProfile(req.user!.id, req.user!.role, patch);
      return ok(res, dto);
    } catch (error) { return next(error); }
  }
  ```
  Same `parseBody` (`backend/src/shared/validation/parse-body.ts`) + `ok()`/error-forwarding pattern already used everywhere else (e.g. `media.controller.ts`).

### Step 7. Tests

Mirror the existing files under `backend/tests/modules/users/`: extend `user.dto.test.ts`, `user.service.test.ts`, `user.repository.test.ts`, `donor.repository.test.ts` for the new functions; add `user.schemas.test.ts` (style like `auth.schemas.test.ts` / `media.schemas.test.ts`) covering: valid partial update, unknown-field rejection (`.strict()`), invalid `avatarUrl`, and a Donor-only field sent by a Recipient being rejected with `400`.

### Step 8. Docs

Add `docs/openapi/users_openapi.json` (none exists yet) following `docs/openapi/media_openapi.json`'s structure — document `GET /users/me` and `PATCH /users/me` with the role-DTO response variants. No `docs/api_design.md` changes needed — its contract already matches what's being built here; this step just makes the implementation match the doc.

**Backend checkpoint before hand-off:**
```
npm --workspace backend run typecheck
npm --workspace backend run test
npm --workspace backend run build
```
Manually: `PATCH /users/me` as a Recipient with a `companyName` field → expect `400`. As a Donor with valid `companyName`/`addressText`/`location` → expect `200` with the full `DonorResponseDto`. `GET /users/me` before and after → confirm role fields now appear.

---

## Part 2 — Frontend (`frontend/src/modules/users`, plus shared additions)

### Step 1. `frontend/src/config/apiRoutes.ts`

Add `media: { uploadUrl: '/media/upload-url' }`. (No change needed under `users` — `users.me` already exists and is reused for both `GET` and `PATCH`.)

### Step 2. `frontend/src/types/api.ts`

Add:
```ts
export type UploadMediaPurpose = 'AVATAR' | 'LISTING_IMAGE';
export interface UploadUrlResponseDto {
  uploadUrl: string;
  path: string;
  token: string;
  mediaUrl: string;
  expiresIn: number;
}
```
`AnyUserDTO` / `DonorDTO` / `RecipientDTO` already carry everything needed (`avatarUrl`, `companyName`, `addressText`, `location`, `tier`) — no changes there.

### Step 3. `frontend/src/shared/services/media.service.ts` (new — shared, not under `modules/users`)

Media upload is explicitly shared with Listings (Epic C1 will reuse it for `LISTING_IMAGE`) per the epic's Out-of-Scope note, so it belongs in `shared/`, not inside the `users` module.

```ts
export const mediaService = {
  requestUploadUrl: (purpose: UploadMediaPurpose, contentType: string) =>
    httpClient.post<UploadUrlResponseDto>(API_ROUTES.media.uploadUrl, { purpose, contentType }),
};

// Plain fetch — bypasses httpClient deliberately: it always JSON-stringifies
// the body and injects our own JWT, neither of which the Supabase signed
// upload URL wants. This PUT sends raw bytes with the file's real content type.
export async function uploadFileToSignedUrl(uploadUrl: string, file: File): Promise<boolean> {
  const response = await fetch(uploadUrl, { method: 'PUT', headers: { 'Content-Type': file.type }, body: file });
  return response.ok;
}
```

### Step 4. `frontend/src/modules/users/services/user.service.ts`

Add:
```ts
updateProfile: (patch: Partial<AnyUserDTO>) => httpClient.patch<AnyUserDTO>(API_ROUTES.users.me, patch),
```
The `patch` method already exists on `httpClient` — ready to use as-is.

### Step 5. `frontend/src/services/authStorage.ts`

Add `updateStoredUser(user: AnyUserDTO): void` — overwrites just the cached user (reuses the existing stored token), so anything reading `getStoredUser()` elsewhere (nav/header, etc.) reflects the new avatar/name without a re-login. Keep the file's existing "never touch `localStorage` directly outside this file" convention.

### Step 6. `frontend/src/shared/utils/avatar.ts` (new)

```ts
export const AVATAR_DISPLAY_SIZE = 128;

export function getAvatarDisplayUrl(avatarUrl: string | null, size = AVATAR_DISPLAY_SIZE): string | null {
  if (!avatarUrl) return null;
  // Supabase on-the-fly image transform, applied at render time (Implementation
  // Flow step 4) — no client-side resize/crop logic, per the story's explicit
  // instruction not to duplicate the standard size in two places.
  const transformed = avatarUrl.replace('/object/public/', '/render/image/public/');
  return `${transformed}?width=${size}&height=${size}&resize=cover`;
}
```
Use this wherever `avatarUrl` is rendered. Today that's only `ProfilePage`/the new edit form — Listings/order-history avatar rendering doesn't exist yet (those pages are still blocked per `docs/blockers.md`). This ticket only wires the transform in where an avatar is actually shown today; exporting it from `shared/` lets those future pages reuse it instead of re-deriving the transform.

### Step 7. `frontend/src/shared/components/AvatarUpload/AvatarUpload.tsx` (new)

Presentational component, styled like `IconField`/`AddressAutocomplete` (theme-aware via the existing `admin`/`recipient`/`donor` `ThemeRole` prop). Props: `currentAvatarUrl`, `previewUrl`, `onFileSelected(file)`, `isUploading`, `error`. Renders an `<img>` (preview if present, else `getAvatarDisplayUrl(currentAvatarUrl)`, else a placeholder) plus a native `<input type="file" accept="image/png,image/jpeg,image/webp">` built on the existing `ui/input.tsx` (it already carries `file:` Tailwind classes). Rejects unsupported types client-side before doing anything else (AC: "no upload URL is generated" for unsupported types).

### Step 8. `frontend/src/modules/users/hooks/useAvatarUpload.ts` (new)

Owns the 3-step handoff from the Implementation Flow:

1. On file select: validate `file.type` against `['image/png', 'image/jpeg', 'image/webp']` client-side; if invalid, set a field-scoped error and stop (mirrors the backend's `media.schemas.ts` allow-list, so the UI never even calls the API for a bad type).
2. Set `previewUrl = URL.createObjectURL(file)` immediately, before any network call (AC: "shows a live preview").
3. Call `mediaService.requestUploadUrl('AVATAR', file.type)` → `uploadFileToSignedUrl(uploadUrl, file)` → on success, store `mediaUrl` in hook state (not yet saved to the server).

Returns `{ previewUrl, mediaUrl, isUploading, error, selectFile }`. The pending `mediaUrl` is **not** persisted here — the parent form includes it in the single combined `PATCH /users/me` call (Implementation Flow step 5: "one save, not two").

### Step 9. `frontend/src/modules/users/hooks/useProfileEditForm.ts` (new)

Follows the existing `useRegistrationForm.ts` shape/conventions (manual validation via `frontend/src/shared/utils/validation.ts`, `FieldErrors<T>`, `isSubmitting`/`submitError` state) rather than introducing a form library:

- Seeds `form` from the loaded `profile` (via `useEffect` once `useProfile()` resolves) — never starts blank.
- Exposes `updateField`, plus the role-gated field set: base fields for everyone, `companyName`/`addressText`/`location` only rendered/submitted when `profile.role === 'DONOR'`.
- Wires in `useAvatarUpload`; on submit, builds the patch body with only the fields that changed, plus `avatarUrl: mediaUrl` if a new avatar was uploaded.
- `handleSubmit`: client-side validates (reuse `validateUsername`; require non-empty `city`/`country`), then calls `userService.updateProfile(patch)`.
  - **Success:** replace `form` with the response DTO (server-authoritative, step 7), call `authStorage.updateStoredUser(response.data)`.
  - **Failure (`400`):** set `submitError` from `response.data.message` and render it via the existing `FormErrorAlert` component near the section the error most likely belongs to (contact fields vs. company fields) — the backend's error envelope (`docs/api_design.md` §2.3) is a single message with no field code, so exact per-field placement isn't possible. Keep all unsaved edits in place regardless (AC: must not discard the rest of the user's edits).

### Step 10. `frontend/src/modules/users/pages/ProfilePage.tsx`

Add an edit-mode toggle (view ⇄ edit) *within the existing page* rather than a new route — there's no `/profile/edit` route today and the PRD doesn't call for a separate page, so this keeps the change minimal and avoids new router wiring. Edit mode renders the fields from `useProfileEditForm`, the `AvatarUpload` component, and a Save/Cancel pair; view mode keeps rendering the current read-only `<dl>` (now using `getAvatarDisplayUrl` for the avatar image, and a fixed `profile.tier` display now that `GET /users/me` actually returns it). Apply the role's design-system theme (`docs/design_system.md`) — green for Recipient, amber for Donor.

### Step 11. Frontend verification

No test suite exists on the frontend (per `AGENTS.md`) — verify with:
```
npm --workspace frontend run typecheck
npm --workspace frontend run build
```
Then manually exercise the flow in the browser: log in as a seeded Recipient and a seeded Donor, edit fields, upload an avatar, confirm the live preview, confirm the save round-trip, confirm an invalid file type and an invalid field value both surface inline without wiping the rest of the form.

---

## End-to-end verification

**Backend:**
```
npm --workspace backend run typecheck
npm --workspace backend run test
npm --workspace backend run build
```

**Frontend:**
```
npm --workspace frontend run typecheck
npm --workspace frontend run build
```

Then run both dev servers and walk the golden path in-browser for both a Recipient and a Donor account, per Step 11 above.

**Known environment limitation:** actually completing an avatar upload end-to-end also requires real Supabase credentials, which `docs/blockers.md` flags as still placeholder-only. If unavailable, verify up through the `POST /media/upload-url` call and the client-side preview/validation, and treat the Supabase `PUT` itself as untestable until real credentials are provisioned.
