# AI Agent Instructions for AFF Full-Stack Project

Welcome to the Affordable Food Federation (AFF) project. When assisting with this repository, please adhere to the following project guidelines and architecture details.

## Core Documentation References
Before making any changes or answering questions, always refer to the following documentation files:
- **Project Specifications & Requirements:** Always refer to `docs/PRD.md` for project specifications and requirements.
- **Database Design:** Always refer to `docs/database_design.md` for database design and schema structure.
- **API Design:** Always refer to `docs/api_design.md` for API design contracts and endpoint details.

## Overall Architecture
This is a TypeScript full-stack monorepo consisting of a React/Vite frontend (`frontend/`) and a Node.js/Express backend (`backend/`). The project follows a architecture with separate frontend and backend layers, utilizing a modular monolith pattern.

### Backend Architecture (Domain & Module-Based)
The backend is structured as a **Modular Monolith** using Express and Mongoose. Each folder in `backend/src/modules` is a business module with its own bounded context.

**Current Domains/Modules:**
- `auth`: login, registration, logout, token/session logic.
- `users`: user profiles and user lookup.
- `food`: donor food listings.
- `reservations`: recipient food reservation and collection flow.
- `subscriptions`: premium recipient subscription logic.
- `admin`: admin-only account and listing management.

**Backend Flow:**
`Route -> Controller -> Service -> Repository -> Model -> MongoDB`

- **Routes (`*.routes.ts`):** Connect URL and HTTP method to a controller.
- **Controllers (`*.controller.ts`):** Handle HTTP request/response, read `req`, call services, send JSON/DTO. No direct database queries.
- **Services (`*.service.ts`):** Contain domain business logic and rules.
- **Repositories (`*.repository.ts`):** Contain Mongoose database query methods.
- **Models (`*.model.ts`):** Define MongoDB/Mongoose schemas.
- **DTOs (`*.dto.ts`):** Shape data crossing the backend's external boundary. Response DTOs (`<Entity>ResponseDto`, built by a `to<Entity>ResponseDto()` mapper) shape outbound data; request DTOs (`<Verb><Entity>RequestDto`) shape inbound HTTP request bodies. Both live in the same module's `*.dto.ts` file.
- **Interfaces (`*.interface.ts`):** Expose safe public APIs for other modules to call. Cross-module communication must happen via interfaces (e.g. `reservations.service -> user.interface`), not directly via services.

### Frontend Architecture
The frontend is built with React and Vite. It separates logic into pages, components, hooks, and services.

**Frontend Flow:**
`Page -> Component -> Hook -> Service -> Backend API`

- **Pages (`*Page.tsx`):** Full screens connected to routes (`frontend/src/app/router.tsx`).
- **Components (`*.tsx`):** Reusable UI pieces. Complex components are grouped in packages with their JSX, Hook, Service (if specific), and CSS.
- **Hooks (`use*.ts`):** Reusable state and behavior.
- **Services (`*.service.ts`):** Frontend API calls using a shared `httpClient.ts`.
- **Config:** Backend API paths are centralized in `apiRoutes.ts`.

When building new features, respect the module boundaries in both the backend and frontend. Place new features in the module that owns the business idea.
