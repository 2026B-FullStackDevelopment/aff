# AFF Container Diagram

Proposed architecture — Milestone 1

```mermaid
%%{init: {"flowchart": {"curve": "linear"}}}%%
flowchart LR
  user["AFF User<br/>[Person]<br/>A recipient, donor, or administrator<br/>who uses the AFF platform."]

  subgraph aff["AFF Software System"]
    direction LR
    web["AFF Web Application<br/>[Container: React single-page application, Vite]<br/>[HTML/JSX, CSS, JavaScript/TypeScript]<br/>Provides AFF functionality through<br/>the user's web browser."]
    backend["AFF Backend<br/>[Container: Node.js and Express]<br/>Implements AFF business logic and<br/>exposes it through a REST API."]
    database[("AFF Database<br/>[Container: MongoDB]<br/>Stores users, food listings, reservations,<br/>subscriptions, and related AFF data.")]

    web -->|"Sends REST API requests<br/>over HTTPS using JSON"| backend
    backend -->|"Reads and writes data using<br/>Mongoose and the MongoDB protocol"| database
  end

  user -->|"Uses through a web browser<br/>over HTTPS"| web

  classDef person fill:#E8F5E9,stroke:#2E7D32,color:#1B1B1B,stroke-width:2px;
  classDef application fill:#E3F2FD,stroke:#1565C0,color:#1B1B1B,stroke-width:2px;
  classDef dataStore fill:#FFF3E0,stroke:#EF6C00,color:#1B1B1B,stroke-width:2px;
  class user person;
  class web,backend application;
  class database dataStore;
  style aff fill:#F8FAFC,stroke:#475569,color:#1B1B1B,stroke-width:2px;
```

| Colour | Meaning |
|---|---|
| Green | Person using the system |
| Blue | Application container inside AFF |
| Orange | Database container inside AFF |
| Grey boundary | AFF software system boundary |

The AFF User uses the React web application in a browser. The web application sends REST API requests over HTTPS using JSON, and the backend reads and writes AFF data in MongoDB. Internal React components and backend modules are intentionally omitted from this container-level view.
