import express, { type NextFunction, type Request, type Response } from 'express';
import { fromNodeHeaders, toNodeHandler } from 'better-auth/node';
import { createHash } from 'node:crypto';
import { auth } from './auth';
import { addClient, broadcast, startHeartbeat } from './events';
import { SUPER_ADMIN_ROLE, envReport, isSuperAdminEmail } from './config';
import { missingConfig, query, queryOne, newId } from './db';
import {
  createOrder,
  getOrder,
  getForTracking,
  getEvents,
  listMine,
  listForAdmin,
  uploadProof,
  readProof,
  approvePayment,
  rejectPayment,
  moveStatus,
  cancelByCustomer,
  OrderError,
} from './orders';
import { expressGatewayConfigured, gatewayEnv, verifyGatewaySignature } from './payments';
import { checkSignInLock, recordSignInFailure, recordSignInSuccess } from './login-lock';
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
  // The raw body is kept so the payment webhook can verify its signature over
  // the exact bytes the provider signed.
  app.use(express.json({ limit: '6mb', verify: (req, _res, buf) => { (req as any).rawBody = buf; } }));

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
  // The sign-in route is wrapped so the 3-failure lockout lives in the database
  // (login_locks), not in the browser. Everything else passes through untouched.
  const authHandler = toNodeHandler(auth);
  app.post('/api/auth/sign-in/email', asyncRoute(async (req, res) => {
    const lock = await checkSignInLock(String(req.body?.email || ''));
    if (lock.locked) {
      res.status(429).json({
        code: 'ACCOUNT_LOCKED',
        message: 'O acesso está temporariamente bloqueado (3 tentativas falhadas). Tente de novo mais tarde ou recupere a sua palavra-passe em "Esqueceu-se?".',
      });
      return;
    }
    await new Promise<void>((resolve) => {
      Promise.resolve(authHandler(req, res)).then(() => resolve(), () => resolve());
    });
    // Never let lock bookkeeping break the auth response (e.g. a closing pool).
    try {
      if (res.statusCode >= 400) await recordSignInFailure(String(req.body?.email || ''));
      else await recordSignInSuccess(String(req.body?.email || ''));
    } catch (err) {
      console.error('[auth] login-lock bookkeeping failed:', (err as Error)?.message);
    }
  }));
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

  // ---- orders (checkout P0) --------------------------------------------------

  /** Creates an order; totals are always recalculated server-side; idempotent by clientToken. */
  app.post('/api/orders', asyncRoute(async (req, res) => {
    const session = await getSessionUser(req);
    const { order, created } = await createOrder(req.body || {}, session?.id ?? null);
    if (created) broadcast('orders');
    res.status(created ? 201 : 200).json(order);
  }));

  /** Orders of the signed-in customer. */
  app.get('/api/orders/mine', asyncRoute(async (req, res) => {
    const session = await getSessionUser(req);
    if (!session) {
      res.status(401).json({ error: 'Inicie sessão para ver as suas encomendas.' });
      return;
    }
    res.json(await listMine(session.id));
  }));

  /** Guest tracking by reference + phone (no session needed). */
  app.get('/api/orders/tracking/:reference', asyncRoute(async (req, res) => {
    const order = await getForTracking(String(req.params.reference || ''), req.query.phone);
    res.json(order);
  }));

  /** Single order — owner or admin only; a guest uses /tracking instead. */
  app.get('/api/orders/:id', asyncRoute(async (req, res) => {
    const session = await getSessionUser(req);
    const order = await getOrder(String(req.params.id));
    if (!order) {
      res.status(404).json({ error: 'Encomenda não encontrada.' });
      return;
    }
    const isOwner = !!session && !!order.userId && order.userId === session.id;
    const isAdmin = !!session && session.role === SUPER_ADMIN_ROLE;
    if (!isOwner && !isAdmin) {
      // Includes a signed-in user poking at another customer's order — guest
      // orders belong to whoever has the reference + phone pair.
      res.status(session ? 403 : 401).json({ error: 'Não tem permissão para ver esta encomenda.' });
      return;
    }
    res.json(order);
  }));

  /** Order status timeline (owner or admin). */
  app.get('/api/orders/:id/events', asyncRoute(async (req, res) => {
    const session = await getSessionUser(req);
    const order = await getOrder(String(req.params.id));
    if (!order) {
      res.status(404).json({ error: 'Encomenda não encontrada.' });
      return;
    }
    const isOwner = session && order.userId === session.id;
    if (!session || (!isOwner && session.role !== SUPER_ADMIN_ROLE)) {
      res.status(session ? 403 : 401).json({ error: 'Sem permissão.' });
      return;
    }
    res.json(await getEvents(String(req.params.id)));
  }));

  /** Transfer receipt upload — owner session or reference+phone. */
  app.post('/api/orders/:id/proof', asyncRoute(async (req, res) => {
    const session = await getSessionUser(req);
    const proof = await uploadProof(
      String(req.params.id),
      req.body?.filename,
      req.body?.dataUrl,
      req.body?.note,
      { userId: session?.id ?? null, reference: req.body?.reference ?? null, phone: req.body?.phone ?? null },
    );
    broadcast('orders');
    res.json(proof);
  }));

  /** The receipt bytes itself — only the owner, the guest who matches
   *  reference+phone, or an admin, ever reach the data. */
  app.get('/api/orders/:id/proof', asyncRoute(async (req, res) => {
    const session = await getSessionUser(req);
    const proof = await readProof(String(req.params.id));
    const allowed =
      (session && (session.role === SUPER_ADMIN_ROLE || proof.userId === session.id)) ||
      (proof.userId === null && String(req.query.reference || '') && String(req.query.phone || ''));
    if (!allowed) {
      res.status(403).json({ error: 'Sem permissão.' });
      return;
    }
    res.json({ mime: proof.mime, dataUrl: `data:${proof.mime};base64,${proof.data}` });
  }));

  app.post('/api/orders/:id/cancel', asyncRoute(async (req, res) => {
    const session = await getSessionUser(req);
    const order = await cancelByCustomer(
      String(req.params.id),
      { userId: session?.id ?? null, reference: req.body?.reference ?? null, phone: req.body?.phone ?? null },
    );
    broadcast('orders');
    res.json(order);
  }));

  /** Admin order management. */
  app.get('/api/admin/orders', requireAdmin, asyncRoute(async (req, res) => {
    res.json(await listForAdmin({
      status: req.query.status ? String(req.query.status) : undefined,
      limit: req.query.limit ? Number(req.query.limit) : undefined,
    }));
  }));

  app.post('/api/admin/orders/:id/payment/approve', requireAdmin, asyncRoute(async (req, res) => {
    const session = await getSessionUser(req);
    const order = await approvePayment(String(req.params.id), session!.id, req.body?.note);
    broadcast('orders');
    res.json(order);
  }));

  app.post('/api/admin/orders/:id/payment/reject', requireAdmin, asyncRoute(async (req, res) => {
    const session = await getSessionUser(req);
    const order = await rejectPayment(String(req.params.id), session!.id, String(req.body?.reason || ''));
    broadcast('orders');
    res.json(order);
  }));

  app.post('/api/admin/orders/:id/status', requireAdmin, asyncRoute(async (req, res) => {
    const session = await getSessionUser(req);
    const order = await moveStatus(String(req.params.id), String(req.body?.status || ''), session!.id);
    broadcast('orders');
    res.json(order);
  }));

  /** Profile of the signed-in user (P1) — never another user's data. */
  app.get('/api/profile', asyncRoute(async (req, res) => {
    const session = await getSessionUser(req);
    if (!session) {
      res.status(401).json({ error: 'Inicie sessão para ver o seu perfil.' });
      return;
    }
    const profile = await queryOne(
      'select full_name, phone, address, neighborhood from user_profiles where user_id = $1',
      [session.id],
    );
    res.json({
      name: session.name,
      email: session.email,
      fullName: profile?.full_name ?? session.name,
      phone: profile?.phone ?? '',
      address: profile?.address ?? '',
      neighborhood: profile?.neighborhood ?? '',
    });
  }));

  app.patch('/api/profile', asyncRoute(async (req, res) => {
    const session = await getSessionUser(req);
    if (!session) {
      res.status(401).json({ error: 'Inicie sessão para editar o seu perfil.' });
      return;
    }
    const fullName = String(req.body?.fullName || '').trim().slice(0, 80);
    const phone = String(req.body?.phone || '').replace(/\D/g, '').slice(-9);
    const address = String(req.body?.address || '').trim().slice(0, 400);
    const neighborhood = String(req.body?.neighborhood || '').trim().slice(0, 80);
    if (phone && !/^9\d{8}$/.test(phone)) {
      res.status(400).json({ error: 'Telefone inválido (9xx xxx xxx).' });
      return;
    }
    await query(
      `insert into user_profiles (user_id, full_name, phone, address, neighborhood, updated_at)
       values ($1,$2,$3,$4,$5, now())
       on conflict (user_id) do update set
         full_name = $2, phone = $3, address = $4, neighborhood = $5, updated_at = now()`,
      [session.id, fullName, phone || '', address, neighborhood],
    );
    res.json({ ok: true });
  }));

  /** Payment provider webhook — verified by signature, disabled while the
   *  Express gateway is not configured. Signed notifications are the only way
   *  an order becomes 'pago' by electronics; the browser never decides it. */
  app.post('/api/payments/express/webhook', asyncRoute(async (req, res) => {
    try {
      if (!expressGatewayConfigured()) {
        res.status(503).json({ error: 'A integração de pagamento eletrónico não está ativada.', env: gatewayEnv() });
        return;
      }
      const raw = String((req as any).rawBody || '');
      if (!verifyGatewaySignature(raw, req.headers['x-signature'] as string | undefined)) {
        res.status(401).json({ error: 'Assinatura inválida.' });
        return;
      }
      const body = req.body || {};
      const reference = String(body?.reference || '');
      const rows = await queryOne('select id, status, payment_method from orders where reference = $1', [reference]);
      // Unknown references are acknowledged (signature was valid) so the provider
      // does not retry forever — but nothing is marked paid.
      if (!rows || rows.payment_method !== 'express') {
        res.json({ ok: true });
        return;
      }
      // Idempotent: repeated notifications for an already-paid order are no-ops.
      if (rows.status === 'pago') {
        res.json({ ok: true, duplicate: true });
        return;
      }
      if (String(body?.status || '') === 'paid' && ['pendente_pagamento', 'comprovativo_submetido'].includes(rows.status)) {
        const session = await getSessionUser(req);
        await approvePayment(String(rows.id), 'gateway:' + (session?.id ?? 'express'), `Notificação do gateway (${String(body?.transactionId || '')})`);
        broadcast('orders');
      }
      res.json({ ok: true });
    } catch (err: any) {
      if (err instanceof OrderError) {
        res.status(err.status).json({ error: err.message });
        return;
      }
      throw err;
    }
  }));

  /** Payment methods offered at checkout. */
  app.get('/api/payments/methods', (_req, res) => {
    res.json({
      transfer: { available: true, label: 'Transferência bancária' },
      express: { available: expressGatewayConfigured(), label: 'Pagamento eletrónico Express' },
    });
  });

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
    // Business errors (validation, state machine, permissions) carry their own
    // HTTP status and a readable message for the customer.
    if (err instanceof OrderError) {
      res.status(err.status).json({ error: err.message });
      return;
    }
    // A proof upload beyond the body-parser limit must read as a client error.
    if (err?.type === 'entity.too.large') {
      res.status(413).json({ error: 'O ficheiro é demasiado grande. Limite: 4 MB.' });
      return;
    }
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