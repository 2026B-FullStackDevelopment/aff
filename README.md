# AFF Full-Stack Project Structure

This repository is the starting structure for the AFF, Affordable Food Federation, group project. It is set up as a small full-stack monorepo: the React/Vite frontend lives in `frontend`, the Node.js/Express backend lives in `backend`, and project documentation lives in `docs`.

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
| `*.routes.js` | Backend API endpoints | Express route definitions and middleware wiring only. |
| `*.controller.js` | Backend HTTP request/response handling | Reads `req`, calls a service, returns a DTO response. |
| `*.service.js` | Backend business logic | Rules, workflows, permission checks, and calls to repositories or module interfaces. |
| `*.repository.js` | Backend database queries | Mongoose query methods such as `find`, `create`, and `findByIdAndUpdate`. |
| `*.model.js` | Backend MongoDB schema | Mongoose schema and model definitions. |
| `*.dto.js` | Backend response shaping | Functions that return safe data for frontend or module-to-module use. |
| `*.interface.js` | Backend module public API | Safe functions other modules may call instead of importing internal services. |
| `*.middleware.js` | Backend request guards | Authentication, role authorization, error handling, and similar request checks. |
| `*.provider.js` | Third-party integration wrapper | Vendor-facing code for payment, email, storage, maps, or notifications. |
| `*Page.jsx` | Frontend page | A full screen connected to a frontend route. |
| Component `*.jsx` | Frontend visible UI piece | Markup and props for one UI responsibility. |
| `use*.js` | Frontend hook | Reusable state and behavior for pages or components. |
| Frontend `*.service.js` | Frontend API calls | Calls to the backend through `httpClient`. |
| Component `*.css` | Component styling | Styling for the nearby component package. |
| `apiRoutes.js` | Frontend API route config | Backend route strings grouped by business domain. |
| `httpClient.js` | Frontend REST helper | Shared `GET`, `POST`, `PUT`, `PATCH`, and `DELETE` request logic. |

## Backend Structure

The backend uses this flow:

```text
Route -> Controller -> Service -> Repository -> Model -> MongoDB
```

`routes` define the API endpoints. A route should be thin: it connects a URL and HTTP method to a controller function.

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

`config/apiRoutes.js` stores backend route strings in one place so we do not scatter API paths across the frontend.

## Component Packages

For small components, one `.jsx` file is fine.

For complex business components, use a package folder:

```text
FoodCard/
  FoodCard.jsx
  useFoodCard.js
  FoodCard.css
```

Only add a component-specific service file if that component genuinely owns backend calls. Most backend calls should stay in the module service, such as `modules/food/services/food.service.js`.

## Interfaces And External Services

In the SRS, "external services via interfaces" most likely means external to a backend module, not necessarily a third-party API.

Example: the `reservations` module may need user data. It should call `users/user.interface.js`, not `users/user.service.js`. This keeps module internals private and makes dependencies easier to understand.

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

## Container Diagram

The project container diagram is in `docs/container-diagram.md`. GitHub can render it because it uses Mermaid syntax inside a Markdown file.
