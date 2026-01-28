# Developer Guide

## Architecture Overview

The system consists of three main parts:
1.  **Frontend**: React (Vite) + Tailwind CSS + Framer Motion. Handles the public portfolio display.
2.  **Admin Panel**: React (Vite) + Shadcn UI + React Query. Handles content management.
3.  **Backend**: Node.js (Express) + PostgreSQL (Drizzle ORM). Provides the REST API.

## Folder Structure

```
/
├── frontend/           # Public website source
├── admin-panel/        # Admin dashboard source
├── backend/            # API server source
│   ├── src/
│   │   ├── controllers/ # Business logic
│   │   ├── db/          # Schema (Drizzle)
│   │   ├── services/    # External services (Cloudinary)
│   │   └── routes/      # API definition
├── docs/               # Documentation
└── .agent/             # AI Agent memory
```

## Local Development Setup

1.  **Prerequisites**: Node.js v18+, PostgreSQL.
2.  **Install Dependencies**: Run `npm install` in all three folders (`frontend`, `backend`, `admin-panel`).
3.  **Environment Variables**:
    *   Copy `.env.example` to `.env` in all folders.
    *   Configure `DATABASE_URL` and Cloudinary keys in `backend/.env`.
4.  **Database**:
    *   Run `npm run db:generate` (Backend) to create migrations.
    *   Run `npm run db:migrate` (Backend) to apply them.
    *   Run `npm run db:seed` (Backend) to add initial data.
5.  **Run**:
    *   Backend: `npm run dev` (Port 3001)
    *   Frontend: `npm run dev` (Port 5173)
    *   Admin: `npm run dev` (Port 5174)

## API Structure

The API is RESTful and versioned (`/api/public/*`, `/api/admin/*`).

*   **Public API**: Read-only endpoints for the frontend.
*   **Admin API**: Protected CRUD endpoints. Requires `Authorization: Bearer <token>`.

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for production deployment instructions.
