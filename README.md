# AFF Full-Stack Project Structure

This repository is the starting structure for the AFF, Affordable Food Federation, group project. It is a TypeScript full-stack monorepo: the React/Vite frontend lives in `frontend`, the Node.js/Express backend lives in `backend`, and project documentation lives in `docs`.

The structure follows the SRS architecture requirements:

- Simplex: separate frontend and backend layers.
- Medium: modular monolith backend modules, middleware authorization, frontend API config, and HTTP helper.
- Ultimo: backend module interfaces, DTOs, and modular frontend component packages where a component's JSX, hook logic, backend calls, and CSS can be separated when the component is complex enough.

## Main Folders

`backend` contains the Express API server. This is where routes, controllers, services, repositories, models, DTOs, interfaces, middleware, and backend configuration live.

`frontend` contains the React/Vite client. This is where pages, feature components, hooks, frontend API services, shared reusable components, and frontend configuration live.

`docs` contains architecture documentation and diagrams. Start with `docs/container-diagram.md` when you need a high-level view of the system.

## File Pattern Guide

Use this guide when you create new files. The comments at the top of the source files use the same wording style on purpose.

| File pattern | What it is for | What it should contain |
|---|---|---|
| `*.routes.ts` | Backend API endpoints | Express route definitions and middleware wiring only. |
| `*.controller.ts` | Backend HTTP request/response handling | Reads `req`, calls a service, returns a DTO response. |
| `*.service.ts` | Backend business logic | Rules, workflows, permission checks, and calls to repositories or module interfaces. |
| `*.repository.ts` | Backend database queries | Mongoose query methods such as `find`, `create`, and `findByIdAndUpdate`. |
| `*.model.ts` | Backend MongoDB schema | Mongoose schema and model definitions. |
| `*.dto.ts` | Backend response shaping | Functions that return safe data for frontend or module-to-module use. |
| `*.interface.ts` | Backend module public API | Safe functions other modules may call instead of importing internal services. |
| `*.middleware.ts` | Backend request guards | Authentication, role authorization, error handling, and similar request checks. |
| `*.provider.ts` | Third-party integration wrapper | Vendor-facing code for payment, email, storage, maps, or notifications. |
| `*Page.tsx` | Frontend page | A full screen connected to a frontend route. |
| Component `*.tsx` | Frontend visible UI piece | JSX markup and typed props for one UI responsibility. |
| `use*.ts` | Frontend hook | Reusable state and behavior for pages or components. |
| Frontend `*.service.ts` | Frontend API calls | Calls to the backend through `httpClient`. |
| Component `*.css` | Component styling | Styling for the nearby component package. |
| `apiRoutes.ts` | Frontend API route config | Backend route strings grouped by business domain. |
| `httpClient.ts` | Frontend REST helper | Shared, typed `GET`, `POST`, `PUT`, `PATCH`, and `DELETE` request logic. |

## Backend Structure

The backend uses this flow:

```text
Route -> Controller -> Service -> Repository -> Model -> MongoDB
```

`routes` define the API endpoints. A route should be thin: it connects a URL and HTTP method to a controller function.

`backend/src/routes.ts` registers each module's top-level API base path. A module's own `*.routes.ts` file defines the remaining path and HTTP method. For example, mounting `food.routes.ts` at `/api/food` and defining `router.get('/')` produces `GET /api/food`.

`controllers` handle HTTP details. They read `req`, call services, and send JSON responses. Controllers should not contain database query code.

`services` contain business logic. This is where rules live, such as "only a donor can create a food listing" or "a reserved listing cannot be reserved again."

`repositories` contain database query functions. They are the only layer that should directly call Mongoose query methods such as `find`, `findById`, `create`, or `findByIdAndUpdate`.

`models` define MongoDB/Mongoose schemas. Models describe what the data looks like.

`dtos` shape data before it leaves the backend. A DTO helps us return only the fields the frontend or another module needs.

`interfaces` expose a safe public API for a module. Other modules should call the interface, not the module's internal service file directly.

`middleware` contains request checks that run before controllers, such as authentication and role authorization.

## Backend Modules

Each folder in `backend/src/modules` is a business module with its own bounded context:

- `auth`: login, registration, logout, token/session logic.
- `users`: user profiles and user lookup.
- `food`: donor food listings.
- `reservations`: recipient food reservation and collection flow.
- `subscriptions`: premium recipient subscription logic.
- `admin`: admin-only account and listing management.

When adding a new backend feature, place it in the module that owns the business idea. If the feature is global, put it in `shared`, `middleware`, or `config` instead.

## Frontend Structure

The frontend uses this rough flow:

```text
Page -> Component -> Hook -> Service -> Backend API
```

`pages` are full screens connected to routes, such as a login page, donor dashboard, or admin user management page.

`components` are visible pieces of a page. A component should focus on one UI responsibility, such as a food card, filter form, or reservation table.

`hooks` contain reusable state and behavior. Hooks usually start with `use`, such as `useFoodListings`.

`services` contain frontend API calls. They use the shared HTTP client instead of calling `fetch` everywhere.

`shared/components` contains reusable UI used across many features, such as `Button`, `Modal`, and `StatusBadge`.

`config/apiRoutes.ts` stores backend route strings in one place so we do not scatter API paths across the frontend.

## Frontend Page Routes

Browser page routes are defined in `frontend/src/app/router.tsx`. These are different from backend API routes:

| Page/module home | Browser URL |
|---|---|
| Application entry (currently redirects to food listings) | `/` |
| Authentication login | `/login` |
| Authentication registration | `/register` |
| User profile and account information | `/profile` |
| Food listings | `/food` |
| Recipient reservations | `/reservations` |
| Premium subscription | `/subscription` |
| Administration | `/admin` |

## Backend API Base Routes

The backend has six business-module base paths plus one health endpoint:

| Module | API base URL |
|---|---|
| Authentication | `/api/auth` |
| Users | `/api/users` |
| Food listings | `/api/food` |
| Reservations | `/api/reservations` |
| Subscriptions | `/api/subscriptions` |
| Administration | `/api/admin` |
| Service health check | `/api/health` |

The protected `/profile` page currently reads account data through `GET /api/users/me`. Profile and password update endpoints are intentionally not prescribed here; the team member responsible for the users module will choose their HTTP methods and paths.

## Component Packages

For small components, one `.tsx` file is fine.

For complex business components, use a package folder:

```text
FoodCard/
  FoodCard.tsx
  useFoodCard.ts
  FoodCard.css
```

Only add a component-specific service file if that component genuinely owns backend calls. Most backend calls should stay in the module service, such as `modules/food/services/food.service.ts`.

## Interfaces And External Services

In the SRS, "external services via interfaces" most likely means external to a backend module, not necessarily a third-party API.

Example: the `reservations` module may need user data. It should call `users/user.interface.ts`, not `users/user.service.ts`. This keeps module internals private and makes dependencies easier to understand.

```text
Good: reservations.service -> user.interface
Avoid: reservations.service -> user.service
```

Third-party APIs, such as payments or image storage, should live under `backend/src/integrations` if the team decides to implement them later.

## DTOs

DTO means Data Transfer Object. It is a small mapper that controls what data leaves the backend.

For example, a user model may contain password hashes or internal flags. A user DTO should return only safe fields such as `id`, `name`, `email`, and `role`.

## NPM Setup

This project uses three package files:

- root `package.json`: workspace and convenience scripts.
- `backend/package.json`: Express/Mongoose backend dependencies and scripts.
- `frontend/package.json`: React/Vite frontend dependencies and scripts.

Run dependencies from the root with:

```bash
npm install
```

Then start both apps in separate terminals:

```bash
npm run dev:backend
npm run dev:frontend
```

Check TypeScript across both workspaces with:

```bash
npm run typecheck
```

## Container Diagram

The project container diagram is in `docs/container-diagram.md`. GitHub can render it because it uses Mermaid syntax inside a Markdown file.
