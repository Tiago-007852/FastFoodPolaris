import { betterAuth } from 'better-auth';
import { pool } from './db';
import { DEFAULT_ROLE, SUPER_ADMIN_ROLE, isSuperAdminEmail } from './config';

/**
 * Better Auth — replaces Firebase Authentication.
 * Users, sessions and accounts live in the same Neon database as the content,
 * so roles travel with the data and no second provider is needed.
 * Email + password is the only sign-in method.
 */

export const auth = betterAuth({
  database: pool,
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL || 'http://localhost:3000',
  emailAndPassword: {
    enabled: true,
    // Password reset mail needs an email provider. Until one is configured the
    // link is logged so the reset can still be completed from the server logs.
    sendResetPassword: async ({ user, url }) => {
      console.log(`[auth] password reset for ${user.email}: ${url}`);
    },
  },
  user: {
    additionalFields: {
      role: { type: 'string', required: false, defaultValue: DEFAULT_ROLE, input: false },
      lastLogin: { type: 'date', required: false, input: false },
    },
  },
  session: {
    // Keeps SSE + write endpoints cheap: the session is read from the cookie cache.
    cookieCache: { enabled: true, maxAge: 5 * 60 },
  },
  databaseHooks: {
    user: {
      create: {
        // Same rule as the old AuthContext: the super admin email is an admin.
        before: async (user) => ({
          data: {
            ...user,
            role: isSuperAdminEmail(user.email) ? SUPER_ADMIN_ROLE : DEFAULT_ROLE,
          },
        }),
      },
    },
  },
});