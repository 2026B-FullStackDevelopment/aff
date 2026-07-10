# AFF Container Diagram

```mermaid
flowchart LR
  browser["User Browser\nRecipient, Donor, Admin"]
  frontend["React/Vite Frontend\nPages, Components, Hooks, Services"]
  backend["Node.js/Express Backend\nRoutes, Controllers, Services, Repositories"]
  mongodb[("MongoDB Database\nUsers, Food Listings, Reservations, Subscriptions")]

  subgraph modules["Backend Modules"]
    auth["Auth Module"]
    users["Users Module"]
    food["Food Module"]
    reservations["Reservations Module"]
    subscriptions["Subscriptions Module"]
    admin["Admin Module"]
  end

  subgraph external["Optional External Services"]
    payment["Payment Service\nPremium subscriptions"]
    storage["Image Storage\nAvatars and food photos"]
    email["Email Service\nConfirmations and alerts"]
    realtime["Real-time Notifications\nPremium listing alerts"]
  end

  browser -->|"Uses web app"| frontend
  frontend -->|"REST API requests"| backend
  backend --> auth
  backend --> users
  backend --> food
  backend --> reservations
  backend --> subscriptions
  backend --> admin
  auth --> mongodb
  users --> mongodb
  food --> mongodb
  reservations --> mongodb
  subscriptions --> mongodb
  admin --> mongodb
  subscriptions -.-> payment
  food -.-> storage
  auth -.-> email
  food -.-> realtime
```

The user works in the browser through the React/Vite frontend. The frontend calls the Express backend through REST APIs. The backend is a modular monolith: each business module owns its route/controller/service/repository/model style files, and modules talk to each other through interfaces where needed.

MongoDB stores the application data. Optional external services are separated as integrations so the team can add payment, image storage, email, or real-time notification providers without spreading vendor-specific code through business modules.
