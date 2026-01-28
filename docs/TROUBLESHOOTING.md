# Troubleshooting Guide

## Common Issues

### 1. CORS Errors
**Symptom**: Frontend or Admin Panel shows "Network Error" or "Blocked by CORS policy".
**Fix**:
*   Check `backend/.env` (or Vercel variables).
*   Ensure `CORS_ORIGIN` includes the *exact* origin of your frontend (e.g., `https://myapp.vercel.app` - no trailing slash).
*   If using multiple domains, ensure the backend logic supports splitting the comma-separated string.

### 2. Database Connection Failed
**Symptom**: Backend logs show "Connection refused" or "TLS error".
**Fix**:
*   Ensure `DATABASE_URL` is correct.
*   For production (Neon/Vercel Postgres), ensure `?sslmode=require` is appended to the connection string.

### 3. Image Uploads Failing
**Symptom**: "Upload failed" or 500 Error.
**Fix**:
*   Verify Cloudinary credentials in Backend environment variables.
*   Ensure the `CLOUDINARY_API_SECRET` is correct.
*   Check server logs for specific Cloudinary error messages.

### 4. Vercel Function Timeout
**Symptom**: API requests take > 10s and fail.
**Fix**:
*   Vercel Hobby plan functions time out after 10s.
*   Ensure database queries are optimized.
*   Database cold starts can cause this. Using a pooled connection string (Neon provides this) helps.

## Logs

*   **Backend Logs**: View via `vercel logs` CLI or Vercel Dashboard -> Functions.
*   **Frontend Logs**: Check Browser Console (F12).
