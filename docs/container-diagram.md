# AFF Container Diagram

Proposed architecture — Milestone 1

```mermaid
flowchart LR
  user["AFF User<br/>[Person]<br/>A recipient, donor, or administrator who uses the AFF platform."]

  subgraph aff["AFF Platform [Software System]"]
    direction LR
    web["AFF Web Application<br/>[Container: React single-page application, Vite, Html, Jsx, Css, Typescript]<br/>Provides AFF functionality through the user's web browser."]
    backend["AFF Backend<br/>[Container: Node.js and Express]<br/>Provides AFF business functionality through a REST API."]
    database[("AFF Database<br/>[Container: MongoDB]<br/>Stores users, food listings, reservations, subscriptions, and related AFF data.")]

    web -->|"Sends REST API requests using HTTPS/JSON"| backend
    backend -->|"Reads from and writes to using Mongoose / MongoDB protocol"| database
  end

  user -->|"Uses through a web browser over HTTPS"| web

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

The AFF User uses the React web application in a browser. The web application sends HTTPS/JSON requests to the AFF Backend, and the backend reads and writes AFF data in MongoDB. Internal React components and backend modules are intentionally omitted from this container-level view.
