import type { IncomingMessage, ServerResponse } from 'node:http';

/**
 * Vercel serverless function — exposes the Postgres API at `/api/*`.
 *
 * The SPA is deployed as a static Vite build and calls same-origin `/api`, so the
 * serverless function has to answer those requests; without it every endpoint
 * answers 404 and login/content fail. `vercel.json` rewrites `/api/<path>` here
 * and carries the original path in `?p=`, which `restorePath()` puts back before
 * the Express app (shared with the dev server and `bun start`) sees the request.
 *
 * This module deliberately has **no top-level runtime import** — only a type-only
 * one. A value import would be resolved while the function boots, and anything
 * that goes wrong there kills the invocation before a single `try`/`catch` of ours
 * exists, which Vercel reports as an opaque `FUNCTION_INVOCATION_FAILED`. The API
 * itself is loaded inside the request, where its failures can be answered with
 * readable JSON.
 */

type Handler = (req: any, res: any) => unknown;

let appPromise: Promise<Handler> | null = null;

/** Duplicated from `server/config.ts` on purpose — see the note above. */
const envReport = () => ({
  DATABASE_URL: !!process.env.DATABASE_URL,
  BETTER_AUTH_SECRET: !!process.env.BETTER_AUTH_SECRET,
  BETTER_AUTH_URL: process.env.BETTER_AUTH_URL || null,
  NODE_ENV: process.env.NODE_ENV || null,
});

/**
 * Node terminates the process on an unhandled rejection or uncaught exception,
 * and a terminated serverless invocation answers with nothing useful
 * (`FUNCTION_INVOCATION_FAILED`). A dependency that rejects in the background —
 * Better Auth's schema check is the one that bites here — must not be able to
 * take the whole function down, so both are logged and the instance survives.
 */
process.on('unhandledRejection', (reason) => {
  console.error('[api] unhandled rejection (ignored):', reason);
});
process.on('uncaughtException', (err) => {
  console.error('[api] uncaught exception (ignored):', err);
});

/** Connection strings and secrets never reach the browser, even in an error. */
const redact = (text: string) => {
  let out = text.replace(/postgres(ql)?:\/\/[^@\s"']+@/gi, 'postgres://***@');
  for (const key of ['DATABASE_URL', 'BETTER_AUTH_SECRET']) {
    const value = process.env[key];
    if (value) out = out.split(value).join('***');
  }
  return out;
};

function loadApp(): Promise<Handler> {
  // The app is imported inside the request, not at module scope: a failure while
  // loading it (missing variable, broken dependency) then becomes a readable JSON
  // 500 instead of killing the invocation with FUNCTION_INVOCATION_FAILED.
  appPromise ??= import('../server/app').then((m) => m.createApiApp() as unknown as Handler);
  // A rejected load must not become an unhandled rejection, and the next request
  // should be free to try again.
  appPromise.catch(() => {
    appPromise = null;
  });
  return appPromise;
}

function restorePath(req: any) {
  if (!req.url || !req.url.startsWith('/api')) return;
  const url = new URL(req.url, 'http://localhost');
  const subPath = url.searchParams.get('p');
  if (!subPath) return;
  url.searchParams.delete('p');
  req.url = `/api/${subPath}${url.search}`;
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  restorePath(req);

  try {
    const app = await loadApp();
    return app(req, res);
  } catch (err) {
    console.error('[api] the API could not start:', err);
    if (res.headersSent) {
      res.end();
      return;
    }
    res.statusCode = 500;
    res.setHeader('content-type', 'application/json; charset=utf-8');
    res.end(
      JSON.stringify(
        {
          error: 'A API não conseguiu arrancar.',
          detail: redact(String((err as Error)?.stack || err)),
          env: envReport(),
        },
        null,
        2,
      ),
    );
  }
}