/**
 * Data client for the Neon/Postgres API (`server/`).
 * This replaces the Firebase SDK: no more client-side Firestore or Auth calls,
 * everything goes through same-origin `/api` endpoints and an SSE stream.
 */

export interface AuthUser {
  id: string;
  email: string | null;
  name: string;
  image: string | null;
  role: string;
  emailVerified: boolean;
}

/**
 * Cache of the last body + ETag per GET path. When the server changes the data
 * it sends a new ETag (200 with the payload); when it answers 304 we reuse the
 * previous body, so repeated polls stay cheap both on the wire and on Vercel.
 * Routes without an ETag (auth, admin, private) are simply never cached.
 */
const etagCache = new Map<string, { etag: string; text: string }>();

const isGet = (init?: RequestInit) => !init?.method || init.method.toUpperCase() === 'GET';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `/api${path}`;
  const cached = isGet(init) ? etagCache.get(url) : undefined;

  const res = await fetch(url, {
    credentials: 'same-origin',
    ...init,
    headers: {
      ...(cached ? { 'If-None-Match': cached.etag } : {}),
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...(init?.headers || {}),
    },
  });

  // 304 — the server confirmed the data is unchanged: reuse the cached body.
  if (res.status === 304 && cached) {
    return safeParse(cached.text) as T;
  }

  const text = await res.text();
  const payload = text ? safeParse(text) : null;

  if (!res.ok) {
    throw new ApiError((payload as any)?.message || (payload as any)?.error || `Erro ${res.status}`, res.status, (payload as any)?.code);
  }

  if (isGet(init)) {
    const etag = res.headers.get('ETag');
    if (etag) etagCache.set(url, { etag, text });
    else etagCache.delete(url);
  }

  return payload as T;
}

const safeParse = (text: string) => {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
};

export class ApiError extends Error {
  status: number;
  code?: string;
  constructor(message: string, status: number, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

/* ------------------------------------------------------------------- reads */

export const apiGet = <T>(path: string) => request<T>(path);

/* ------------------------------------------------------------------ writes */

export const apiPost = <T>(path: string, body?: unknown) =>
  request<T>(path, { method: 'POST', body: JSON.stringify(body ?? {}) });

export const apiPut = <T>(path: string, body: unknown) =>
  request<T>(path, { method: 'PUT', body: JSON.stringify(body) });

export const apiPatch = <T>(path: string, body: unknown) =>
  request<T>(path, { method: 'PATCH', body: JSON.stringify(body) });

export const apiDelete = <T>(path: string) => request<T>(path, { method: 'DELETE' });

/* -------------------------------------------------------------------- auth */

export const authApi = {
  signUp: (name: string, email: string, password: string) =>
    request<{ user: AuthUser }>('/auth/sign-up/email', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    }),

  signIn: (email: string, password: string) =>
    request<{ user: AuthUser }>('/auth/sign-in/email', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  signOut: () => request<{ success: boolean }>('/auth/sign-out', { method: 'POST' }),

  session: () => request<{ user: AuthUser; session: unknown } | null>('/auth/get-session'),

  requestPasswordReset: (email: string) =>
    request<{ status: boolean }>('/auth/request-password-reset', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),

  /** Define a nova palavra-passe com o token da ligação ?token=… */
  resetPassword: (token: string, newPassword: string) =>
    request<{ status: boolean }>('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, newPassword }),
    }),
};

/* -------------------------------------------------------------- checkout */

import type { Order } from '../types';

export const ordersApi = {
  /** Cria a encomenda no servidor — os totais devolvidos são sempre os recalculados lá. */
  create: (payload: Record<string, unknown>) => request<Order>('/orders', { method: 'POST', body: JSON.stringify(payload) }),

  mine: () => request<Order[]>('/orders/mine'),

  track: (reference: string, phone: string) =>
    request<Order>(`/orders/tracking/${encodeURIComponent(reference)}?phone=${encodeURIComponent(phone)}`),

  cancel: (id: string, guest?: { reference: string; phone: string }) =>
    request<Order>(`/orders/${id}/cancel`, { method: 'POST', body: JSON.stringify(guest ?? {}) }),

  uploadProof: (id: string, payload: { dataUrl: string; filename: string; note?: string; reference?: string; phone?: string }) =>
    request<Order>(`/orders/${id}/proof`, { method: 'POST', body: JSON.stringify(payload) }),
};

export const profileApi = {
  get: () => request<{ name: string; email: string; fullName: string; phone: string; address: string; neighborhood: string }>('/profile'),
  update: (data: { fullName: string; phone: string; address: string; neighborhood: string }) =>
    request<{ ok: true }>('/profile', { method: 'PATCH', body: JSON.stringify(data) }),
};

/* ---------------------------------------------------------------- realtime */

/**
 * Subscribes to the SSE change feed. The API broadcasts which resource changed,
 * so a client only refetches what it needs — this is the Firestore `onSnapshot`
 * replacement.
 *
 * One EventSource per TAB (singleton): every `useLiveResource` instance, the
 * auth context and the countdown/teaser components register their callbacks in
 * a shared set instead of each holding an open stream to `/api/events` — the
 * old behaviour in serverless, with a 60 s occupied invocation per resource *
 * per visitor.
 */
let sseHealthy = false;

/**
 * True while the live stream is connected. Serverless hosts close idle
 * connections, so consumers fall back to polling when this is false.
 */
export const isSseHealthy = () => sseHealthy;

type ChangeListener = (table: string) => void;

const listeners = new Set<ChangeListener>();

/** Backoff: 3 s, 6 s, 12 s, 24 s, then capped at 30 s, each ± up to 0.75 s jitter. */
const RETRY_BASE_MS = 3000;
const RETRY_MAX_MS = 30000;
const RETRY_JITTER_MS = 750;

let source: EventSource | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | undefined;
let attempt = 0;

const notify = (table: string) => {
  for (const listener of listeners) {
    try {
      listener(table);
    } catch {
      // One broken consumer cannot take the shared feed down.
    }
  }
};

const scheduleReconnect = () => {
  if (reconnectTimer !== undefined) return;
  const delay = Math.min(RETRY_MAX_MS, RETRY_BASE_MS * 2 ** attempt) + Math.random() * RETRY_JITTER_MS;
  attempt += 1;
  reconnectTimer = setTimeout(() => {
    reconnectTimer = undefined;
    connect();
  }, delay);
};

const connect = () => {
  if (!listeners.size || source || reconnectTimer !== undefined) return;
  source = new EventSource('/api/events');
  source.addEventListener('open', () => {
    sseHealthy = true;
    // A healthy connection resets the backoff for the next drop.
    attempt = 0;
  });
  source.addEventListener('change', (event) => {
    sseHealthy = true;
    try {
      const payload = JSON.parse((event as MessageEvent).data);
      if (payload?.table) notify(payload.table);
    } catch {
      // ignore malformed frames
    }
  });
  source.onerror = () => {
    sseHealthy = false;
    source?.close();
    source = null;
    // `close()` first cancels the browser's own auto-reconnect, so there is
    // exactly one reconnect in flight — ours, with backoff and jitter.
    scheduleReconnect();
  };
};

/**
 * Registers a callback for `change` events. Returns an unsubscribe function;
 * when the last consumer unsubscribes, the connection, its reconnect timer and
 * the health bookkeeping are all torn down.
 */
export function subscribeToChanges(onChange: ChangeListener): () => void {
  listeners.add(onChange);

  if (typeof EventSource !== 'undefined') {
    connect();
  }

  return () => {
    listeners.delete(onChange);
    if (listeners.size > 0) return;

    if (reconnectTimer !== undefined) {
      clearTimeout(reconnectTimer);
      reconnectTimer = undefined;
    }
    source?.close();
    source = null;
    attempt = 0;
    sseHealthy = false;
  };
}