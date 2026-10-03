/** Shared server configuration. */

/** Email that always gets the `admin` role (same rule the Firebase build used). */
export const SUPER_ADMIN_EMAIL = 'miguellanttonio007@gmail.com';

/** Max size accepted by the base64 upload endpoint (matches the old 1MB limit). */
export const MAX_UPLOAD_BYTES = 1024 * 1024;

/** Cookie the SPA sends the session with; better-auth sets it on sign in. */
export const SESSION_COOKIE = 'better-auth.session_token';

export const SUPER_ADMIN_ROLE = 'admin';
export const DEFAULT_ROLE = 'user';

/**
 * Which environment variables this process can actually see — presence only,
 * never the values. Returned by `/api/health` and by the serverless handler so a
 * missing Production variable can be told apart from an application bug.
 * This module has no imports and no side effects, so the handler can load it
 * even when the rest of the API fails to load.
 */
export const envReport = () => ({
  DATABASE_URL: !!process.env.DATABASE_URL,
  BETTER_AUTH_SECRET: !!process.env.BETTER_AUTH_SECRET,
  BETTER_AUTH_URL: process.env.BETTER_AUTH_URL || null,
  NODE_ENV: process.env.NODE_ENV || null,
});

export const isSuperAdminEmail = (email?: string | null) =>
  !!email && email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();