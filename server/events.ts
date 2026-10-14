import type { Response } from 'express';

/**
 * Server-Sent Events hub — the replacement for Firestore's `onSnapshot`.
 * Every write endpoint broadcasts the table it touched; the SPA refetches that
 * resource, so admin edits appear on customer screens without a reload.
 *
 * Serverless hosts kill a function after `maxDuration` (60 s here — see
 * `vercel.json`). An SSE response that never ends therefore always finished as
 * `Task timed out after 60 seconds`: one burned invocation per connection and
 * an error log line for every connected tab, forever. So in serverless the hub
 * closes the stream cleanly BEFORE that limit and the client reconnects with
 * backoff (see `src/lib/api.ts`). With a long-running Node server (`bun run
 * api`) the stream stays open as before, with keep-alive pings.
 *
 * Every timer and the close listener is deregistered as soon as the connection
 * is over — in either direction.
 */
const clients = new Set<Response>();

/** Comment frame written right before the planned close. Log noise-free. */
const CLOSING_FRAME = ': closing\n\n';

/** Heartbeat for proxies that close idle streams. */
const HEARTBEAT_MS = 25_000;

/** Env override for tests (`SSE_MAX_LIFETIME_MS=5000 …`); 0 disables it. */
const envLifetimeMs = Number(process.env.SSE_MAX_LIFETIME_MS) || 0;

/**
 * Vercel (and any AWS Lambda-style host) injects these markers. The bounded
 * default stays far below the 60 s execution limit, with headroom for cold
 * boots, while staying long enough to amortise the connection.
 */
const isServerless = !!process.env.VERCEL || !!process.env.AWS_LAMBDA_FUNCTION_NAME;
const defaultLifetimeMs = isServerless ? 20_000 : 0;

/** Effective lifetime of one SSE response; 0 means "unbounded" (local Node). */
const streamLifetimeMs = envLifetimeMs > 0 ? envLifetimeMs : defaultLifetimeMs;

export function addClient(res: Response) {
  clients.add(res);
  res.on('close', () => clients.delete(res));
}

/** Tells every connected SPA which resource changed. */
export function broadcast(table: string) {
  const payload = `event: change\ndata: ${JSON.stringify({ table })}\n\n`;
  for (const res of clients) {
    try {
      res.write(payload);
    } catch {
      clients.delete(res);
    }
  }
}

/**
 * Keep-alive comments while the stream is open and — in serverless — a graceful
 * close before the function's execution limit (with parity: the client-side
 * reconnect then treats it as a normal drop, no extra protocol needed).
 */
export function startHeartbeat(res: Response) {
  /** True once this connection is finished; guards every timer callback. */
  let stopped = false;

  const handleClose = () => {
    stopped = true;
    clearInterval(ping);
    if (lifetime) clearTimeout(lifetime);
    res.off('close', handleClose);
    clients.delete(res);
  };

  res.on('close', handleClose);

  const ping = setInterval(() => {
    if (stopped) return;
    try {
      res.write(': ping\n\n');
    } catch {
      handleClose();
    }
  }, HEARTBEAT_MS);

  const lifetime =
    streamLifetimeMs > 0
      ? setTimeout(() => {
          if (stopped) return;
          try {
            res.write(CLOSING_FRAME);
          } catch {
            // Socket already gone: the close event runs the cleanup.
          }
          handleClose();
          res.end();
        }, streamLifetimeMs)
      : null;
}
