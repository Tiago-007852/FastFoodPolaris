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

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    credentials: 'same-origin',
    ...init,
    headers: init?.body ? { 'Content-Type': 'application/json', ...(init?.headers || {}) } : init?.headers,
  });

  const text = await res.text();
  const payload = text ? safeParse(text) : null;

  if (!res.ok) {
    throw new ApiError((payload as any)?.message || (payload as any)?.error || `Erro ${res.status}`, res.status, (payload as any)?.code);
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
    request<{ status: boolean }>('/auth/forget-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),
};

/* ---------------------------------------------------------------- realtime */

/**
 * Subscribes to the SSE change feed. The API broadcasts which resource changed,
 * so a client only refetches what it needs — this is the Firestore `onSnapshot`
 * replacement.
 */
let sseHealthy = false;

/**
 * True while the live stream is connected. Serverless hosts close idle
 * connections, so consumers fall back to polling when this is false.
 */
export const isSseHealthy = () => sseHealthy;

export function subscribeToChanges(onChange: (table: string) => void): () => void {
  if (typeof EventSource === 'undefined') return () => {};

  let source: EventSource | null = null;
  let closed = false;
  let retry: number | undefined;

  const connect = () => {
    if (closed) return;
    source = new EventSource('/api/events');
    source.addEventListener('open', () => {
      sseHealthy = true;
    });
    source.addEventListener('change', (event) => {
      sseHealthy = true;
      try {
        const payload = JSON.parse((event as MessageEvent).data);
        if (payload?.table) onChange(payload.table);
      } catch {
        // ignore malformed frames
      }
    });
    source.onerror = () => {
      sseHealthy = false;
      source?.close();
      source = null;
      // The browser reconnects too, but be explicit so a dropped stream recovers.
      if (!closed) retry = window.setTimeout(connect, 3000);
    };
  };

  connect();
  return () => {
    closed = true;
    sseHealthy = false;
    if (retry) window.clearTimeout(retry);
    source?.close();
  };
}