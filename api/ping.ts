import type { IncomingMessage, ServerResponse } from 'node:http';

/**
 * Liveness probe for the Vercel function infrastructure.
 *
 * It has no imports at all — not even the API — so a 200 here proves the
 * platform booted the function and can serve a request. If this endpoint fails
 * while `/api/health` also fails, the problem is the deployment/runtime, not
 * this repository's code. If it answers 200 and `/api/health` does not, the
 * problem is inside the API.
 */
export default function handler(_req: IncomingMessage, res: ServerResponse) {
  res.statusCode = 200;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.end(JSON.stringify({ ok: true, probe: 'function-alive' }));
}