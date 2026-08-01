# AFF Container Diagram

Proposed container architecture for the AFF system. AFF is deployed as a React web application, one Express modular-monolith backend, and MongoDB.

```mermaid

C4Container
  title AFF Container Diagram

  Person(user, "AFF User", "A recipient, donor, or administrator.")

  Container_Boundary(aff, "AFF Software System") {
    Container(web, "AFF Web Application", "React, Vite, TypeScript, HTML/TSX, CSS", "Provides AFF functionality through the user's web browser.")
    Container(backend, "AFF Backend / API", "Node.js, Express, TypeScript", "Runs the REST API and modular-monolith business logic.")
    ContainerDb(database, "AFF Database", "MongoDB with Mongoose", "Stores users, food listings, reservations,<br/>subscriptions, and related AFF data.")
  }

  Boundary(externalSystems, "External Systems (outside AFF)") {
    System_Ext(openStreetMap, "OpenStreetMap", "Provides map data and tiles for donor locations.")
    System_Ext(emailService, "Email Delivery Service", "Delivers payment-confirmation emails to AFF users.")
    System_Ext(stripe, "Stripe", "Processes credit-card payments.")
    System_Ext(objectStorage, "Object Storage Service", "Stores profile and food-listing images.")
  }

  Rel_Down(user, web, "Uses through a browser", "HTTPS")
  Rel_Down(web, backend, "Calls REST API", "HTTPS / JSON")
  Rel_Down(backend, database, "Reads and writes data", "Mongoose / MongoDB")

  Rel_Right(web, openStreetMap, "Loads map data", "HTTPS")
  Rel_Right(backend, emailService, "Requests <br/> confirmation-email delivery", "Provider API / SMTP")
  Rel_Right(backend, stripe, "Processes payments", "HTTPS / JSON")
  Rel_Up(emailService, user, "Sends confirmation email", "Email / SMTP")
  Rel_Right(backend, objectStorage, "Stores and retrieves images", "HTTPS")

  UpdateRelStyle(user, web, $offsetX="-160", $offsetY="-40")
  UpdateRelStyle(web, backend, $offsetX="-100", $offsetY="0")
  UpdateRelStyle(backend, database, $offsetX="-160", $offsetY="0")
  UpdateRelStyle(web, openStreetMap, $offsetX="-40", $offsetY="-10")
  UpdateRelStyle(backend, emailService, $offsetX="-70", $offsetY="0")
  UpdateRelStyle(backend, stripe, $offsetX="-80", $offsetY="15")
  UpdateRelStyle(emailService, user, $offsetX="0", $offsetY="-50")
  UpdateRelStyle(backend, objectStorage, $offsetX="-110", $offsetY="55")

  UpdateLayoutConfig($c4ShapeInRow="1", $c4BoundaryInRow="2")
```

## External-system decisions

The project has four planned external-system dependencies, not only Stripe and OpenStreetMap:

| External system | Requirement or design reason | Directly communicating AFF container |
|---|---|---|
| Stripe | Credit-card payments for priced food orders and premium subscriptions (SRS 5.2.3 and 6.2.1) | AFF Backend/API |
| OpenStreetMap | Displaying donor locations on a map (SRS 5.3.4) | AFF Web Application |
| Email Delivery Service | Successful-payment email notification delivered to the AFF user (SRS 6.1.2) | AFF Backend/API |
| Object Storage Service | Uploaded profile and food-listing images (SRS 3.2.1 and the planned storage integration) | AFF Backend/API |

External systems should connect to the container that directly communicates with them, not automatically to the backend. In this design, Stripe, email delivery, and object storage are backend integrations. OpenStreetMap connects to the web application because the browser loads map data for display. If map geocoding is later implemented by the backend, an additional Backend/API to OpenStreetMap relationship should be added.

The external-systems boundary is a visual grouping only; it does not imply that the four providers share ownership or infrastructure.

The email flow is shown in two stages: the Backend/API requests delivery from the provider, and the provider sends the confirmation email to the AFF user. The delivery label is offset from the arrow to keep the long relationship leg readable.

Real-time in-app notifications are AFF functionality rather than a separate external system. Access to the user's current location is supplied by the browser's geolocation capability, so it is described inside the web container instead of being shown as another software system.

## Shape and notation choices

The diagram uses C4 container notation. A one-shape-per-row layout creates a top-to-bottom AFF flow, while the two-boundary row places the external-systems lane to the right. Relationship-label offsets separate the three backend integration descriptions.

| Representation | Meaning |
|---|---|
| Person node | AFF user above and outside the system boundary |
| Container box | Independently running AFF application or API container |
| Database cylinder | MongoDB data store |
| External-system box | Third-party system outside AFF |
| Software-system boundary | Containers owned and deployed as part of AFF |

Browser-window and terminal symbols, as seen in one reference example, are optional decorations. The C4 person, container, database, external-system, and boundary shapes carry the architectural meaning required for this diagram.
