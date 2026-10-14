import http from 'node:http';
import { createApiApp } from '../server/app';

/**
 * Read-only validation of the P2 caching layer (scripts only do GETs):
 *
 *   1. public reads carry a strong ETag + `Cache-Control: public, s-maxage=60…`
 *   2. a second GET with `If-None-Match: <etag>` answers 304 without a body
 *   3. a wrong `If-None-Match` still gets 200 + the full payload
 *   4. private/admin routes (/api/users) never receive a cacheable
 *      Cache-Control (Express may still stamp its default weak ETag — ours only
 *      exists on public reads, where it is strong and cacheable)
 *   5. the auth routes (Better Auth) are untouched by our cache/ETag layer
 *
 *   bunx tsx scripts/etag-cache-check.ts
 * Nota: este script serve o Express directamente (sem o rewrite `?p=` da
 * Vercel em `api/index.ts`), por isso os caminhos vão directos: `/api/<rota>`.
 */
let failures = 0;
const step = (label: string, ok: boolean, detail = '') => {
  if (!ok) failures++;
  console.log(`${ok ? '✓' : '✗'} ${label}${detail ? ` — ${detail}` : ''}`);
};

const app = createApiApp();
const server = http.createServer((req, res) => app(req, res));
server.listen(0, '127.0.0.1');
await new Promise((resolve) => server.once('listening', resolve));

const port = (server.address() as any).port;
const base = `http://127.0.0.1:${port}`;

const get = (path: string, headers: Record<string, string> = {}) => fetch(`${base}/api/${path}`, { headers });

// --- 1. public reads are cacheable ------------------------------------------
const first = await get('menuItems');
const etag = first.headers.get('ETag');
const cacheControl = first.headers.get('Cache-Control') || '';
const body = await first.json();
step('GET menuItems devolve lista', Array.isArray(body));
step('ETag forte presente', !!etag, etag || '—');
step(
  'Cache-Control público (s-maxage + SWR)',
  cacheControl.includes('s-maxage=60') && cacheControl.includes('stale-while-revalidate=300'),
  cacheControl,
);

// --- 2. unchanged data answers 304 -----------------------------------------
const conditional = await get('menuItems', { 'If-None-Match': etag || '' });
step('If-None-Match válido → 304', conditional.status === 304, `status=${conditional.status}`);
const conditionalText = await conditional.text();
step('304 não transporta corpo', conditionalText.length === 0, `${conditionalText.length} bytes`);

// --- 3. a stale etag still gets the payload --------------------------------
const stale = await get('menuItems', { 'If-None-Match': '"deadbeef"' });
step('ETag obsoleto → 200 com corpo', stale.status === 200 && Array.isArray(await stale.json()), `status=${stale.status}`);

// --- 4. private/admin routes are not cacheable ------------------------------
const users = await get('users');
step('GET /api/users bloqueado sem sessão (403)', users.status === 403, `status=${users.status}`);
const usersCacheControl = users.headers.get('Cache-Control') || '';
const usersEtag = users.headers.get('ETag') || '';
step(
  'rota privada sem cache público (s-maxage)',
  !usersCacheControl.includes('s-maxage'),
  usersCacheControl || 'sem Cache-Control',
);
step(
  'qualquer ETag numa rota privada é o weak default do Express, não o nosso',
  usersEtag === '' || usersEtag.startsWith('W/'),
  usersEtag || 'sem ETag',
);

// --- 5. auth routes untouched ----------------------------------------------
const session = await get('auth/get-session');
step('GET auth/get-session responde', session.ok, `status=${session.status}`);
step(
  'rota auth sem ETag nosso',
  !session.headers.get('ETag'),
  session.headers.get('ETag') || 'sem ETag',
);

server.close();
console.log(failures === 0 ? '\nCache/ETag OK ✓ (leituras públicas cacheáveis, rotas privadas intactas)' : `\n${failures} verificação(ões) falharam ✗`);
process.exit(failures === 0 ? 0 : 1);
