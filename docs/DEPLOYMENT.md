# Deployment Guide

This guide outlines the steps to deploy the BalaAstraTech Portfolio System (Backend, Frontend, and Admin Panel) to production. We recommend using **Vercel** for hosting all components and **Neon** (or Vercel Postgres) for the database.

## Prerequisites

1.  **Vercel Account**: [Sign up here](https://vercel.com/signup).
2.  **Cloudinary Account**: [Sign up here](https://cloudinary.com/) for media storage.
3.  **GitHub Repository**: Ensure your project is pushed to a GitHub repository.

---

## 1. Database Setup (Neon / Vercel Postgres)

1.  Create a new project on [Neon](https://neon.tech/) (or use Vercel Storage).
2.  Get the **Connection String** (e.g., `postgresql://user:pass@host/db?sslmode=require`).
3.  Save this string; you will need it for the Backend environment variables.

---

## 2. Backend Deployment (Vercel)

The backend is configured to run as a **Serverless Function** on Vercel.

1.  Go to the [Vercel Dashboard](https://vercel.com/dashboard) and click **"Add New..." -> "Project"**.
2.  Import your GitHub repository.
3.  **Framework Preset**: Select **Other**.
4.  **Root Directory**: Click "Edit" and select `backend`.
5.  **Environment Variables**: Add the following (see `backend/.env.production.example` for details):
    *   `DATABASE_URL`: Your Postgres connection string.
    *   `JWT_SECRET`: A long, random string.
    *   `CLOUDINARY_CLOUD_NAME`: From Cloudinary Dashboard.
    *   `CLOUDINARY_API_KEY`: From Cloudinary Dashboard.
    *   `CLOUDINARY_API_SECRET`: From Cloudinary Dashboard.
    *   `CORS_ORIGIN`: Your frontend URL (e.g., `https://your-frontend.vercel.app`) *and* Admin URL (e.g., `https://your-admin.vercel.app`).
    *   `ADMIN_PANEL_URL`: Your Admin Panel URL.
6.  Click **Deploy**.
7.  Once deployed, copy the **Deployment URL** (e.g., `https://project-backend.vercel.app`).

**Migration:**
After deployment, you may need to run database migrations. You can do this by connecting your local machine to the production DB temporarily or using a post-build script.
*   *Local Method:* Update your local `.env` with the production `DATABASE_URL` and run `npm run db:migrate`.

---

## 3. Frontend Deployment (Vercel)

1.  Go to Vercel Dashboard -> **"Add New..." -> "Project"**.
2.  Import the **same** GitHub repository.
3.  **Root Directory**: Click "Edit" and select `frontend`.
4.  **Framework Preset**: Vercel should auto-detect **Vite**.
5.  **Environment Variables**:
    *   `VITE_API_BASE_URL`: `https://your-backend-url.vercel.app/api` (Append `/api`!).
6.  Click **Deploy**.

---

## 4. Admin Panel Deployment (Vercel)

1.  Go to Vercel Dashboard -> **"Add New..." -> "Project"**.
2.  Import the **same** GitHub repository.
3.  **Root Directory**: Click "Edit" and select `admin-panel`.
4.  **Framework Preset**: Vercel should auto-detect **Vite**.
5.  **Environment Variables**:
    *   `VITE_API_BASE_URL`: `https://your-backend-url.vercel.app/api` (Same as frontend).
6.  Click **Deploy**.

---

## 5. Final Configuration

1.  Go back to your **Backend Project** in Vercel.
2.  Update the `CORS_ORIGIN` environment variable to include the actual deployed URLs of your Frontend and Admin Panel.
    *   Example: `https://my-portfolio.vercel.app,https://my-admin.vercel.app` (Note: Backend `index.ts` needs to support comma-separated origins or you must ensure your CORS logic handles multiple domains).
    *   *Tip:* Our current backend logic accepts an array. Ensure `CORS_ORIGIN` in production maps correctly or update the backend code to split the string if you provided a comma-separated list.
3.  Redeploy the Backend if you changed environment variables.

## Troubleshooting

-   **Images not loading?** Check Cloudinary keys and ensure `Cross-Origin-Resource-Policy` is set (we fixed this in security middleware).
-   **CORS Errors?** Verify `CORS_ORIGIN` matches your frontend domain exactly (no trailing slashes usually).
-   **Database connection fails?** Ensure "SSL" is enabled in your connection string (`?sslmode=require`).
