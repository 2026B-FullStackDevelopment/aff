# AI Agent Instructions for AFF Full-Stack Project

Welcome to the Affordable Food Federation (AFF) project. When assisting with this repository, please adhere to the following project guidelines and architecture details.

## Core Documentation References

Before making any changes or answering questions, always refer to the following documentation files:

- **Project Specifications & Requirements:** `docs/PRD.md` for project specifications and requirements.
- **Database Design:** `docs/database_design.md` for database design and schema structure.
- **API Design:** `docs/api_design.md` for API design contracts and endpoint details.
- **User Stories:** `docs/user-story/` for per-epic acceptance criteria behind each PRD story.
- **OpenAPI Specs:** `docs/openapi/` for machine-readable, per-module request/response schemas.

## Overall Architecture

This is a TypeScript full-stack monorepo (npm workspaces) consisting of a React/Vite frontend (`frontend/`) and a Node.js/Express backend (`backend/`). The backend follows a modular monolith pattern; the frontend follows a layered page/component/hook/service pattern.

### Backend Architecture (Domain & Module-Based)

The backend is a **Modular Monolith** built on Express and Mongoose. Each folder in `backend/src/modules` is a business module with its own bounded context.

**Current modules:**

| Module | Responsibility |
|---|---|
| `auth` | Registration, login (with brute-force lockout), logout, and session issuance; delegates JWT signing/verification and token revocation to `security` |
| `security` | JWT signing/verification, the revoked-token denylist, and password hashing. Infrastructure module: no HTTP surface — other modules call it through `security.interface.ts` |
| `users` | User profile management; Recipient and Donor profile subtypes |
| `listings` | Donor food listing creation, lifecycle (pause/resume/cancel), search, and donation flows |
| `orders` | Recipient order and reservation lifecycle, cancellation, feedback |
| `delivery` | Courier delivery queue, claim, pickup, and delivery completion |
| `subscriptions` | Premium Recipient subscription (billing cycles, tier derivation) |
| `notification-preferences` | A Premium Recipient's saved notification-preference lifecycle (create/update/delete/list) |
| `notifications` | Centralized notification sending (`notificationService.send`) and a User's own durable notification history |
| `payments` | Stripe webhook handling for one-off checkouts and subscription billing |
| `admin` | Admin account, listing, and delivery oversight |

**Backend flow:**
`Route -> Controller -> Service -> Repository -> Model -> MongoDB`

- **Routes (`*.routes.ts`):** Connect URL and HTTP method to a controller.
- **Controllers (`*.controller.ts`):** Handle HTTP request/response, read `req`, call services, send JSON/DTO. No direct database queries.
- **Services (`*.service.ts`):** Contain domain business logic and rules.
- **Repositories (`*.repository.ts`):** Contain Mongoose database query methods.
- **Models (`*.model.ts`):** Define MongoDB/Mongoose schemas.
- **DTOs (`*.dto.ts`):** Shape data crossing the backend's external boundary. Response DTOs (`<Entity>ResponseDto`, built by a `to<Entity>ResponseDto()` mapper) shape outbound data; request DTOs (`<Verb><Entity>RequestDto`) shape inbound HTTP request bodies. Both live in the same module's `*.dto.ts` file.
- **Interfaces (`*.interface.ts`):** Expose safe public APIs for other modules to call. Cross-module communication must happen via interfaces (e.g. `orders.service -> users.interface`), not directly via services.

Not every module owns an HTTP route. `security` is an infrastructure module — it exposes only `security.interface.ts` (JWT and password primitives) and registers no routes or controllers.

### Frontend Architecture

The frontend is built with React 19 and Vite. Styling is **Tailwind CSS v4** plus **shadcn/ui** components (Base UI primitives) — shared UI primitives live under `frontend/src/shared/components/ui`, configured in `frontend/components.json`.

**Current modules** (`frontend/src/modules/`):

| Module | Responsibility |
|---|---|
| `auth` | Login and registration pages, session management |
| `users` | Profile management |
| `browsing` | Recipient-facing listing browse, search, and filter |
| `donations` | Donor listing creation and management |
| `reservations` | Recipient order and reservation history |
| `delivery` | Courier delivery queue, claim, active delivery with pickup and destination maps, real-time GPS broadcasting, and delivery completion with cash confirmation |
| `subscriptions` | Premium subscription UI |
| `notifications` | Notification bell dropdown UI (Premium upsell today; reads from `GET /notifications` once Epic H's persisted feed ships) |
| `admin` | Admin oversight UI |

**Frontend flow:**
`Page -> Component -> Hook -> Service -> Backend API`

- **Pages (`*Page.tsx`):** Full screens connected to routes (`frontend/src/app/router.tsx`).
- **Components (`*.tsx`):** Reusable UI pieces. Complex components are grouped in packages with their JSX, hook, service (if specific), and styles.
- **Hooks (`use*.ts`):** Reusable state and behavior.
- **Services (`*.service.ts`):** Frontend API calls using a shared `httpClient.ts`.
- **Config:** Backend API paths are centralized in `apiRoutes.ts`.

When building new features, respect the module boundaries in both the backend and frontend. Place new features in the module that owns the business idea.

## Development Workflow

The checks below are required before any change is considered complete, and are enforced by CI (`.github/workflows/ci.yml`) on every pull request and push to `main`. Run them locally before pushing — a red CI run should never be the first place a failure is discovered.

**Backend** (from the repository root):

```bash
npm --workspace backend run typecheck   # TypeScript, no emit
npm --workspace backend run test        # Vitest
npm --workspace backend run build       # Full build, verifies the compiled output too
```

**Frontend** (from the repository root):

```bash
npm --workspace frontend run typecheck  # TypeScript project build in --noEmit mode
npm --workspace frontend run build      # Full production build
```

The frontend currently has no automated test suite — do not assume test coverage exists there.

A convenience shortcut runs both workspaces' type checks together: `npm run typecheck` (root `package.json`).

**Documentation:** after completing a feature, use the `code-documentation` skill (see below) to document the code — this includes TSDoc/JSDoc on new exported functions and types, and any README or API documentation the change warrants. When the change adds or modifies a backend endpoint, also update the corresponding OpenAPI spec under `docs/openapi/` and, if the contract itself changed, `docs/api_design.md`. Documentation is part of finishing a feature, not an optional follow-up.

## Agent Skills

Shared, tool-agnostic instruction sets live in `.agents/skills/`. They are checked into the repository so the whole team works from the same guidance rather than each person's local agent configuration.

| Skill | File | Use for |
|---|---|---|
| `frontend-ui-engineering` | `.agents/skills/frontend-ui-engineering/SKILL.md` | Component architecture, state management, design-system adherence, accessibility, and responsive UI. Use for anything under `frontend/src`. |
| `code-documentation` | `.agents/skills/code-documentation/SKILL.md` | README structure, TSDoc/JSDoc conventions, OpenAPI spec shape, inline comment judgment, and ADR format. Use after completing a feature, or whenever documenting an API. |

**How to use them:** these files are plain Markdown, so any agent tool can consume them — point your assistant at the relevant `SKILL.md` before starting work, or read it yourself.