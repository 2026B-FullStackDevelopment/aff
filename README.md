# AFF — Affordable Food Federation

## GitHub Repository Link

https://github.com/2026B-FullStackDevelopment/Team1

## Login Credentials for Testing

| Role                      | Username / Email        | Password |
| ------------------------- | ----------------------- | -------- |
| Recipient                 | recipient01@yopmail.com | Abc@1234 |
| Premium Recipient         | recipient02@yopmail.com | Abc@1234 |
| Premium Recipient         | recipient03@yopmail.com | Abc@1234 |
| Donor                     | donor01@yopmail.com     | Abc@1234 |
| Donor (with free listing) | donor02@yopmail.com     | Abc@1234 |
| Courier                   | courier@aff.com         | Abc@1234 |
| Admin                     | admin@aff.com           | Abc@1234 |

## Steps to Start and Run the Website

**Prerequisites:** Node.js `>=20.19.0`, npm, and a MongoDB connection string.

1. Clone the repository and install dependencies from the root:

    ```bash
    npm install
    ```

2. Set up backend environment variables:

    ```bash
    cp backend/.env.example backend/.env
    ```

    Fill in `backend/.env` with your own MongoDB URI, JWT secret, Stripe keys, Supabase credentials, and email settings or attach the `.env` file provided in the submission.

3. Run the backend and frontend in separate terminals:

    ```bash
    npm run dev:backend
    npm run dev:frontend
    ```

4. Verify your setup:

    ```bash
    npm run typecheck
    npm --workspace backend run test
    ```

## Contribution Table

| Member Name        | Role                | Assigned Tasks                                                                                 | Contribution Score |
| ------------------ | ------------------- | ---------------------------------------------------------------------------------------------- | ------------------ |
| Ngo Hoang Long     | Project Manager     | Donor Food Donation Management, Admin Functionality                                            | 5                  |
| Nguyen Ngoc Hiep   | Tech Lead           | Authentication, Courier Delivery & Real-Time Tracking, Notifications, Image Upload, Deployment | 5                  |
| Pham Van Thanh Dat | Full Stack Engineer | Recipient Food Ordering, Profile Management, Premium Subscription, Stripe Integration          | 5                  |
| Luong Trien Vinh   | Full Stack Engineer | Recipient Food Ordering, Profile Management, Premium Subscription                              | 5                  |
| Luong Vu Gia Khang | Full Stack Engineer | Donor Food Donation Management, Admin Functionality                                            | 5                  |

---

## Overview

AFF is a web-based food redistribution platform that connects food-insecure **Recipients** with surplus-holding **Donors**, operated by an **Admin** and fulfilled by **Couriers**. Recipients can reserve listed food or receive a Donor-initiated donation, paying by Stripe or cash on delivery; a third, untracked "Per-Request" path lets a Recipient self-collect directly from a Donor's posted address. Every online order is fulfilled through a shared Courier delivery queue with live GPS tracking, and the platform supports a Premium Recipient subscription with location-aware, real-time listing alerts.

The project is a TypeScript full-stack monorepo: a React/Vite frontend, a Node.js/Express backend, and MongoDB for storage.

## Features

- **Authentication & Profiles** — Recipient and Donor registration, JWT login with brute-force lockout and server-side token revocation, profile editing with avatar upload.
- **Donor Listing Management** — create, clone, pause/resume/cancel listings, per-person ration limits, search/filter/sort, sold-out alerts, and donation statistics.
- **Recipient Ordering** — browse and search listings, reserve and pay by Stripe or cash on delivery, cancel before Courier claim, view order/delivery history, leave feedback.
- **Per-Request Donations** — an untracked, self-collection donation path with no order record, payment, or Courier involved.
- **Courier Delivery & Real-Time Tracking** — a shared, oldest-first, atomically-claimed delivery queue; one active delivery per Courier; live GPS tracking during transit; cash-on-delivery confirmation.
- **Premium Subscription** — recurring billing via Stripe, configurable notification preferences, real-time match alerts, and location-aware listing ranking.
- **Admin Oversight** — account activation/deactivation, listing moderation, searchable listing directory, and read-only delivery oversight.

## Tech Stack

**Frontend**

- React 19 + Vite 7, React Router 7
- TypeScript
- Tailwind CSS v4 + shadcn/ui (Base UI primitives), lucide icons

**Backend**

- Node.js + Express 5, TypeScript
- MongoDB + Mongoose 9
- Zod (request validation), JWT (`jsonwebtoken`) + bcryptjs (auth)
- Nodemailer (email), Supabase Storage (media/avatar uploads)
- Vitest (testing)

**Third-party services**

- Stripe (checkout and recurring billing)
- OpenStreetMap Nominatim (address search and geocoding)

**Infrastructure**

- npm workspaces monorepo (`backend`, `frontend`)
- Deployed on Render, with MongoDB Atlas

## Contributing

See [`CONTRIBUTING.md`](CONTRIBUTING.md) for the branching strategy, commit conventions, and pull request process.
