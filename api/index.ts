import { createApiApp } from '../server/app';

/**
 * Vercel serverless function — exposes the Postgres API at `/api/*`.
 *
 * The SPA is deployed as a static Vite build and calls same-origin `/api`, so the
 * serverless function has to answer those requests; without it every endpoint
 * answers 404 and login/content fail. `vercel.json` rewrites `/api/<path>` here
 * and carries the original path in `?p=`, which `restorePath()` puts back before
 * the Express app (shared with the dev server and `bun start`) sees the request.
 */
const app = createApiApp();

function restorePath(req: any) {
  if (!req.url || !req.url.startsWith('/api')) return;
  const url = new URL(req.url, 'http://localhost');
  const subPath = url.searchParams.get('p');
  if (!subPath) return;
  url.searchParams.delete('p');
  req.url = `/api/${subPath}${url.search}`;
}

export default function handler(req: any, res: any) {
  restorePath(req);
  return app(req, res);
}