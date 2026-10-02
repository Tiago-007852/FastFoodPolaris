/** Shared server configuration. */

/** Email that always gets the `admin` role (same rule the Firebase build used). */
export const SUPER_ADMIN_EMAIL = 'miguellanttonio007@gmail.com';

/** Max size accepted by the base64 upload endpoint (matches the old 1MB limit). */
export const MAX_UPLOAD_BYTES = 1024 * 1024;

/** Cookie the SPA sends the session with; better-auth sets it on sign in. */
export const SESSION_COOKIE = 'better-auth.session_token';

export const SUPER_ADMIN_ROLE = 'admin';
export const DEFAULT_ROLE = 'user';

export const isSuperAdminEmail = (email?: string | null) =>
  !!email && email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();