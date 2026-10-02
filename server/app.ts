import express, { type NextFunction, type Request, type Response } from 'express';
import { fromNodeHeaders, toNodeHandler } from 'better-auth/node';
import { auth } from './auth';
import { addClient, broadcast, startHeartbeat } from './events';
import { SUPER_ADMIN_ROLE, isSuperAdminEmail } from './config';
import { query, newId } from './db';
import {
  ALL_DEFS,
  RESOURCES,
  SETTINGS_DEF,
  ABOUT_DEF,
  MENU_DEF,
  createRow,
  createMenuItem,
  updateRow,
  updateMenuItem,
  deleteRow,
  upsertRow,
  listMenuItems,
  read,
} from './resources';
import { seedContent } from './seed';

/**
 * The API that replaces the Firestore client SDK: every read/write the SPA used
 * to do directly against Firebase now goes through these endpoints, and role
 * checks that used to live in `firestore.rules` are enforced here.
 */

export interface SessionUser {
  id: string;
  email: string | null;
  name: string;
  image: string | null;
  role: string;
  emailVerified: boolean;
}

/** Reads the better-auth session from the request cookie. */
export async function getSessionUser(req: Request): Promise<SessionUser | null> {
  try {
    const session = await auth.api.getSession({ headers: fromNodeHeaders(req.headers) });
    const user = session?.user as any;
    if (!user) return null;
    return {
      id: user.id,
      email: user.email ?? null,
      name: user.name ?? '',
      image: user.image ?? null,
      role: isSuperAdminEmail(user.email) ? SUPER_ADMIN_ROLE : user.role || 'user',
      emailVerified: !!user.emailVerified,
    };
  } catch {
    return null;
  }
}

/** `isAdmin()` from the old firestore.rules, now enforced server side. */
export async function isAdminUser(req: Request): Promise<boolean> {
  const user = await getSessionUser(req);
  return !!user && user.role === SUPER_ADMIN_ROLE;
}

const requireAdmin = async (req: Request, res: Response, next: NextFunction) => {
  if (await isAdminUser(req)) return next();
  res.status(403).json({ error: 'Apenas administradores podem alterar o conteúdo.' });
};

const asyncRoute =
  (handler: (req: Request, res: Response) => Promise<void>) =>
  (req: Request, res: Response, next: NextFunction) => {
    handler(req, res).catch(next);
  };

export function createApiApp() {
  const app = express();

  // Base64 images arrive as data URLs, so the JSON limit has to be generous.
  app.use(express.json({ limit: '4mb' }));

  app.get('/api/health', async (_req, res) => {
    const rows = await query('select now() as now');
    res.json({ ok: true, now: rows[0].now });
  });

  // Better Auth (sign up/sign in/sign out + session) — replaces Firebase Auth.
  app.all('/api/auth/*', toNodeHandler(auth));

  // Server-Sent Events — replaces Firestore realtime listeners.
  app.get('/api/events', (req, res) => {
    res.set({
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });
    res.flushHeaders?.();
    res.write('retry: 3000\n\n');
    addClient(res);
    startHeartbeat(res);
  });

  // Notification counter (replaces the notificationSubscribers collection).
  app.get('/api/subscribers/count', asyncRoute(async (_req, res) => {
    const rows = await query('select count(*)::int as total from notification_subscribers');
    res.json({ count: rows[0].total });
  }));

  app.post('/api/subscribers', asyncRoute(async (req, res) => {
    const phone = String(req.body?.phone || '').replace(/\D/g, '');
    if (!/^9\d{8}$/.test(phone)) {
      res.status(400).json({ error: 'Número de WhatsApp inválido.' });
      return;
    }
    await query(
      `insert into notification_subscribers (id, name, phone) values ($1, $2, $3)
       on conflict (phone) do update set name = excluded.name`,
      [newId(), req.body?.name ? String(req.body.name) : null, phone],
    );
    broadcast('subscribers');
    res.json({ ok: true });
  }));

  // Admin user management (replaces the `users` collection).
  app.get('/api/users', requireAdmin, asyncRoute(async (_req, res) => {
    const rows = await query(
      `select id, name, email, image, "emailVerified", role, "lastLogin", "createdAt"
       from "user" order by "createdAt" desc`,
    );
    res.json(rows);
  }));

  app.patch('/api/users/:id/role', requireAdmin, asyncRoute(async (req, res) => {
    const role = String(req.body?.role || 'user');
    if (!['visitor', 'user', 'admin'].includes(role)) {
      res.status(400).json({ error: 'Papel inválido.' });
      return;
    }
    const rows = await query('update "user" set role = $2, "updatedAt" = now() where id = $1 returning id, role', [
      req.params.id,
      role,
    ]);
    if (rows.length === 0) {
      res.status(404).json({ error: 'Utilizador não encontrado.' });
      return;
    }
    broadcast('users');
    res.json(rows[0]);
  }));

  // Admin "Resetar/Atualizar Menu" button (replaces seed.ts).
  app.post('/api/seed', requireAdmin, asyncRoute(async (_req, res) => {
    const summary = await seedContent();
    for (const table of ['categories', 'menuItems', 'reviews', 'gallery', 'team', 'banners', 'zones', 'dishRatings', 'teasers', 'settings', 'about']) {
      broadcast(table);
    }
    res.json({ ok: true, ...summary });
  }));

  // ---- generic resource endpoints -------------------------------------------

  app.get('/api/:resource', asyncRoute(async (req, res) => {
    const name = req.params.resource;

    if (name === 'menuItems') {
      res.json(await listMenuItems());
      return;
    }

    const def = ALL_DEFS[name];
    if (!def) {
      res.status(404).json({ error: 'Recurso desconhecido.' });
      return;
    }
    res.json(await read(def));
  }));

  app.post('/api/:resource', asyncRoute(async (req, res) => {
    const name = req.params.resource;

    if (name === 'menuItems') {
      if (!(await isAdminUser(req))) {
        res.status(403).json({ error: 'Apenas administradores podem criar registos.' });
        return;
      }
      const created = await createMenuItem(req.body || {});
      broadcast('menuItems');
      res.json(created);
      return;
    }

    const def = RESOURCES[name];
    if (!def) {
      res.status(404).json({ error: 'Recurso desconhecido.' });
      return;
    }

    if (!def.publicCreate) {
      if (!(await isAdminUser(req))) {
        res.status(403).json({ error: 'Apenas administradores podem criar registos.' });
        return;
      }
    }

    const payload = { ...(req.body || {}) };

    // New reviews and dish ratings are always queued for moderation.
    if (name === 'reviews') {
      payload.isApproved = false;
      const session = await getSessionUser(req);
      payload.userId = session?.id ?? null;
    }
    if (name === 'dishRatings') payload.isHidden = false;

    const created = await createRow(def, payload);
    broadcast(name);
    res.json(created);
  }));

  const updateHandler = asyncRoute(async (req, res) => {
    const name = req.params.resource;
    const id = req.params.id;
    const payload = { ...(req.body || {}) };

    if (name === 'settings') {
      const row = await upsertRow(SETTINGS_DEF, 'main', payload);
      broadcast('settings');
      res.json(row);
      return;
    }
    if (name === 'about') {
      const row = await upsertRow(ABOUT_DEF, 'about', payload);
      broadcast('about');
      res.json(row);
      return;
    }
    if (name === 'menuItems') {
      const row = await updateMenuItem(id, payload);
      broadcast('menuItems');
      res.json(row);
      return;
    }

    const def = RESOURCES[name];
    if (!def) {
      res.status(404).json({ error: 'Recurso desconhecido.' });
      return;
    }

    const row = await updateRow(def, id, payload);
    if (!row) {
      res.status(404).json({ error: 'Registo não encontrado.' });
      return;
    }
    broadcast(name);
    res.json(row);
  });

  app.put('/api/:resource/:id', requireAdmin, updateHandler);
  app.patch('/api/:resource/:id', requireAdmin, updateHandler);

  app.delete('/api/:resource/:id', requireAdmin, asyncRoute(async (req, res) => {
    const name = req.params.resource;

    if (name === 'menuItems') {
      // The sizes/extras rows are removed by the cascade on menu_items.
      await deleteRow(MENU_DEF, req.params.id);
      broadcast('menuItems');
      res.json({ ok: true });
      return;
    }

    const def = RESOURCES[name];
    if (!def) {
      res.status(404).json({ error: 'Recurso desconhecido.' });
      return;
    }
    await deleteRow(def, req.params.id);
    broadcast(name);
    res.json({ ok: true });
  }));

  // Error handler — never leak a stack trace to the browser.
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    console.error('[api]', err);
    res.status(500).json({ error: 'Erro interno do servidor.' });
  });

  return app;
}

export { MENU_DEF };