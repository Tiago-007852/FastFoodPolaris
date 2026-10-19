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
  /**
   * Same-origin trust (multi-host suportado): a API corre sempre no mesmo
   * host/esquema que o browser fala (dev, preview, Vercel), por isso um Origin
   * igual ao Host do próprio pedido é por definição first-party. Hospedeiros
   * cruzados continuam rejeitados — a verificação CSRF do Better Auth mantém-se.
   * O BETTER_AUTH_URL estático continua a fixar callbacks e links de reset.
   */
  trustedOrigins: async (request) => {
    try {
      const origin = request.headers.get('origin') || request.headers.get('referer') || '';
      if (!origin || origin === 'null') return [];
      const url = new URL(origin);
      // Atrás de um proxy (Vercel) o Host visto é o do proxy; a origem pública
      // real chega nos cabeçalhos forwarded.
      const forwardedHost = request.headers.get('x-forwarded-host');
      const requestHost = forwardedHost || request.headers.get('host') || '';
      if (!requestHost || url.host !== requestHost) return [];
      return [`${url.protocol}//${url.host}`];
    } catch {
      return [];
    }
  },
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