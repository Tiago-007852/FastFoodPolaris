import express, { type NextFunction, type Request, type Response } from 'express';
import { fromNodeHeaders, toNodeHandler } from 'better-auth/node';
import { createHash } from 'node:crypto';
import { auth } from './auth';
import { addClient, broadcast, startHeartbeat } from './events';
import { SUPER_ADMIN_ROLE, envReport, isSuperAdminEmail } from './config';
import { missingConfig, query, newId } from './db';
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
  listRows,
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

/*
 * Public reads are safe to cache: they return the same payload for every
 * visitor. Routes carrying private or per-user data — auth signs in/out, /api
 * users, subscribers, health — must never pass here.
 *
 * `s-maxage` lets the Vercel edge serve the cached copy without invoking the
 * function, cutting invocations and Fast Origin Transfer. `stale-while-
 * revalidate` keeps serving the previous copy while the edge refetches.
 * Admin edits therefore land for visitors within 60 s in the worst case —
 * in line with the frontend polling interval — and live exactly as fast as
 * before for the SSE/polling clients that bypass the edge (same-origin fetches
 * hit the edge cache only after the TTL).
 *
 * The strong ETag then lets a client confirm freshness with a cheap 304 that
 * carries no payload.
 */
const PUBLIC_CACHE_CONTROL = 'public, s-maxage=60, stale-while-revalidate=300';

/** Sends a JSON payload with a strong ETag, answering 304 when unchanged. */
function sendWithEtag(req: Request, res: Response, payload: unknown) {
  const body = JSON.stringify(payload);
  const etag = `"${createHash('sha1').update(body).digest('hex')}"`;
  res.set({ ETag: etag, 'Cache-Control': PUBLIC_CACHE_CONTROL });

  const clientEtags = String(req.headers['if-none-match'] ?? '').split(',');
  if (
    clientEtags.some(
      (tag) => tag.trim() === etag || tag.trim() === '*' || tag.trim() === `W/${etag}`,
    )
  ) {
    res.status(304).end();
    return;
  }

  res.set({ 'Content-Type': 'application/json; charset=utf-8' });
  // `If-Modified-Since` is meaningless here (only the ETag is authoritative).
  // Express only adds its own weak ETag when none is set, so ours wins.
  res.send(body);
}

export function createApiApp() {
  const app = express();

  // Base64 images arrive as data URLs, so the JSON limit has to be generous.
  app.use(express.json({ limit: '4mb' }));

  // Wrapped in asyncRoute on purpose: an unhandled rejection here would kill the
  // Node process and answer with Vercel's opaque FUNCTION_INVOCATION_FAILED
  // instead of a readable error.
  app.get('/api/health', asyncRoute(async (_req, res) => {
    const missing = missingConfig();
    if (missing) {
      res.status(503).json({
        ok: false,
        error: `A variável ${missing} não está definida neste ambiente.`,
        env: envReport(),
      });
      return;
    }
    const rows = await query('select now() as now');
    res.json({ ok: true, now: rows[0].now, env: envReport() });
  }));

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

  // Public reads: cacheable at the edge (s-maxage) and validated by the client
  // through strong ETags answered locally as 304.
  //
  // Moderated resources (reviews, dishRatings) split by session):
  // - anonymous: only approved/visible rows, private keys stripped, publicly
  //   cacheable — identical payload for every visitor, safe to cache;
  // - admin: the full list for moderation, never cacheable (`private,
  //   no-store`) so it can never live in a shared cache.
  app.get('/api/:resource', asyncRoute(async (req, res) => {
    const name = req.params.resource;

    if (name === 'menuItems') {
      sendWithEtag(req, res, await listMenuItems());
      return;
    }

    const def = ALL_DEFS[name];
    if (!def) {
      res.status(404).json({ error: 'Recurso desconhecido.' });
      return;
    }

    if (def.publicRead) {
      const admin = await isAdminUser(req);
      const payload = await read(def, admin);
      if (admin) {
        res.set({ 'Cache-Control': 'private, no-store' });
        res.json(payload);
      } else {
        sendWithEtag(req, res, payload);
      }
      return;
    }

    sendWithEtag(req, res, await read(def));
  }));

  /**
   * Full moderation list (pending reviews, hidden ratings included) — admin
   * only, and on a dedicated path so an administrator always reads fresh,
   * complete data straight from the database: this URL never shares the cache
   * key of the public reads, and the response itself is `private, no-store`.
   */
  app.get('/api/:resource/all', requireAdmin, asyncRoute(async (req, res) => {
    const def = ALL_DEFS[req.params.resource];
    if (!def) {
      res.status(404).json({ error: 'Recurso desconhecido.' });
      return;
    }
    res.set({ 'Cache-Control': 'private, no-store' });
    res.json(await listRows(def, true));
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
    // A missing variable is a configuration problem, not a bug: say which one.
    const missing = missingConfig();
    if (missing) {
      res.status(503).json({
        error: `A variável ${missing} não está definida neste ambiente.`,
        env: envReport(),
      });
      return;
    }
    res.status(500).json({ error: 'Erro interno do servidor.' });
  });

  return app;
}

export { MENU_DEF };