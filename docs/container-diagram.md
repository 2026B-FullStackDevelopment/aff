# AFF Container Diagram

Proposed container architecture for the AFF system. AFF is deployed as a React web application, one Express modular-monolith backend, and MongoDB. Required and planned third-party services are shown outside the AFF software-system boundary.

```mermaid
C4Container
  title AFF Container Diagram

  Person(user, "AFF User", "A recipient, donor, or administrator.")

  Container_Boundary(aff, "AFF Software System") {
    Container(web, "AFF Web Application", "React, Vite, TypeScript", "Provides the AFF browser interface, geolocation, and maps.")
    Container(backend, "AFF Backend/API", "Node.js, Express, TypeScript", "Runs the AFF REST API and modular-monolith business logic.")
    ContainerDb(database, "AFF Database", "MongoDB with Mongoose", "Stores AFF application data.")
  }

  System_Ext(emailService, "Email Delivery Service", "Sends payment-confirmation emails.")
  System_Ext(openStreetMap, "OpenStreetMap", "Provides map data and tiles for donor locations.")
  System_Ext(stripe, "Stripe", "Third-party payment processor.")
  System_Ext(objectStorage, "Object Storage Service", "Stores profile and food-listing images.")

  Rel_Down(user, web, "Uses", "HTTPS")
  Rel_Right(web, backend, "REST API", "HTTPS/JSON")
  Rel_Down(backend, database, "Reads/writes data", "Mongoose/MongoDB")
  Rel_Up(backend, stripe, "Payments", "HTTPS/JSON")
  Rel_Up(web, openStreetMap, "Map data", "HTTPS")
  Rel_Up(backend, emailService, "Sends email", "Provider API/SMTP")
  Rel_Left(emailService, user, "Confirmation email", "Email")
  Rel_Up(backend, objectStorage, "Stores images", "HTTPS")

  UpdateLayoutConfig($c4ShapeInRow="2", $c4BoundaryInRow="1")
```

## External-system decisions

The project has four planned external-system dependencies, not only Stripe and OpenStreetMap:

| External system | Requirement or design reason | Directly communicating AFF container |
|---|---|---|
| Stripe | Credit-card payments for priced food orders and premium subscriptions (SRS 5.2.3 and 6.2.1) | AFF Backend/API |
| OpenStreetMap | Displaying donor locations on a map (SRS 5.3.4) | AFF Web Application |
| Email Delivery Service | Successful-payment email notification (SRS 6.1.2) | AFF Backend/API |
| Object Storage Service | Uploaded profile and food-listing images (SRS 3.2.1 and the planned storage integration) | AFF Backend/API |

External systems should connect to the container that directly communicates with them, not automatically to the backend. In this design, Stripe, email delivery, and object storage are backend integrations. OpenStreetMap connects to the web application because the browser loads map data for display. If map geocoding is later implemented by the backend, an additional Backend/API to OpenStreetMap relationship should be added.

Real-time in-app notifications are AFF functionality rather than a separate external system. Access to the user's current location is supplied by the browser's geolocation capability, so it is described inside the web container instead of being shown as another software system.

## Shape and notation choices

The diagram uses C4 container notation to match the reference examples:

| Representation | Meaning |
|---|---|
| Human-like person icon | AFF user outside the system boundary |
| Container box | Independently running AFF application or API container |
| Database cylinder | MongoDB data store |
| External-system box | Third-party system outside AFF |
| Software-system boundary | Containers owned and deployed as part of AFF |

Browser-window and terminal symbols, as seen in one reference example, are optional decorations. The C4 person, container, database, external-system, and boundary shapes carry the architectural meaning required for this diagram.
