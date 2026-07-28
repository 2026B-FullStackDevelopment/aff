# AFF Backend Component Diagram - Routes, Validation Middleware, and Controllers

This diagram shows only the route, request-validation middleware, and controller components inside the AFF Express backend. Other backend components will be added after their responsibilities have been studied.

```mermaid
flowchart TB
  subgraph backend["AFF Backend - Express.js Application"]
    direction TB

    subgraph routes["Routes - Express API Routers"]
      direction LR

      auth["AuthRoutes<br/>/api/auth"]
      users["UserRoutes<br/>/api/users"]
      food["FoodRoutes<br/>/api/food"]
      reservations["ReservationRoutes<br/>/api/reservations"]
      subscriptions["SubscriptionRoutes<br/>/api/subscriptions"]
      admin["AdminRoutes<br/>/api/admin"]
    end

    validation["ValidationMiddleware<br/>Request Input Validation"]

    subgraph controllers["Controller - HTTP Request Handlers"]
      direction LR

      authController["AuthController"]
      userController["UserController"]
      foodController["FoodController"]
      reservationController["ReservationController"]
      subscriptionController["SubscriptionController"]
      adminController["AdminController"]
    end

    routes --> validation
    validation --> controllers

  end

  classDef registryComponent fill:#E3F2FD,stroke:#1565C0,color:#1B1B1B,stroke-width:2px;
  classDef routeComponent fill:#FFF3E0,stroke:#EF6C00,color:#1B1B1B,stroke-width:2px;
  classDef validationComponent fill:#FCE4EC,stroke:#C2185B,color:#1B1B1B,stroke-width:2px;
  classDef controllerComponent fill:#FFF8E1,stroke:#F9A825,color:#1B1B1B,stroke-width:2px;

  class registry registryComponent;
  class auth,users,food,reservations,subscriptions,admin routeComponent;
  class validation validationComponent;
  class authController,userController,foodController,reservationController,subscriptionController,adminController controllerComponent;

  style backend fill:#F8FAFC,stroke:#475569,color:#1B1B1B,stroke-width:2px;
  style routes fill:#FFFFFF,stroke:#94A3B8,color:#1B1B1B,stroke-width:1px;
  style controllers fill:#FFFFFF,stroke:#94A3B8,color:#1B1B1B,stroke-width:1px;
```

| Component | Base URL | Responsibility |
|---|---|---|
| `AuthRoutes` | `/api/auth` | Authentication routes, including login and registration. |
| `UserRoutes` | `/api/users` | User account and profile routes. |
| `FoodRoutes` | `/api/food` | Food-listing routes. |
| `ReservationRoutes` | `/api/reservations` | Food-reservation routes. |
| `SubscriptionRoutes` | `/api/subscriptions` | Premium-subscription routes. |
| `AdminRoutes` | `/api/admin` | Administration routes. |

| Middleware | Responsibility |
|---|---|
| `ValidationMiddleware` | Validates request input and returns validation errors before invalid requests reach a controller. |

| Controller | Responsibility |
|---|---|
| `AuthController` | Handles authentication requests and delegates authentication operations. |
| `UserController` | Handles user account and profile requests. |
| `FoodController` | Handles food-listing requests. |
| `ReservationController` | Handles food-reservation requests. |
| `SubscriptionController` | Handles premium-subscription requests. |
| `AdminController` | Handles administration requests. |

The base URLs identify backend route groups. Route requests pass through request-input validation before reaching the corresponding controller. Frontend page URLs and individual HTTP endpoints are intentionally omitted.
