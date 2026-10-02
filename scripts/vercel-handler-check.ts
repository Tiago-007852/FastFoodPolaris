import http from 'node:http';
import handler from '../api/index';
import { pool } from '../server/db';

/**
 * Simulates the Vercel serverless function: serves `/api?p=<path>` through the
 * same handler `api/index.ts` uses, so the rewrite, routing and the full
 * register → session → admin write flow can be verified locally before deploy.
 *
 *   bun run db:check:vercel
 */
const server = http.createServer((req, res) => handler(req, res));
server.listen(0, '127.0.0.1');
await new Promise(resolve => server.once('listening', resolve));

const base = `http://127.0.0.1:${(server.address() as any).port}`;
/**
 * Browsers always send Origin on same-origin POSTs and Better Auth only accepts
 * origins equal to BETTER_AUTH_URL (or explicitly trusted). Simulate the real
 * browser here so the check fails the same way production would.
 */
const ORIGIN = process.env.BETTER_AUTH_URL || base;
const jsonHeaders = { 'content-type': 'application/json', origin: ORIGIN };
let failures = 0;

const step = (label: string, ok: boolean, detail = '') => {
  if (!ok) failures++;
  console.log(`${ok ? '✓' : '✗'} ${label}${detail ? ` — ${detail}` : ''}`);
};

const get = (path: string) => fetch(`${base}/api?p=${path}`);
const json = async (path: string) => (await get(path)).json();

// ---- public reads ----------------------------------------------------------
step('GET /api/health', (await json('health'))?.ok === true);
step('GET /api/menuItems', Array.isArray(await json('menuItems')));
step('GET /api/settings', !!(await json('settings'))?.restaurantName);
step('GET /api/teasers', Array.isArray(await json('teasers')));

// ---- register + session ----------------------------------------------------
const email = `vercel-check+${Date.now()}@polaris.test`;
const password = 'polaris-vercel-check';

const signUp = await fetch(`${base}/api?p=auth/sign-up/email`, {
  method: 'POST',
  headers: jsonHeaders,
  body: JSON.stringify({ email, password, name: 'Vercel Check' }),
});
const cookie = signUp.headers.get('set-cookie')?.split(';')[0] || '';
step('POST /api/auth/sign-up/email', signUp.ok, signUp.ok ? 'conta criada' : await signUp.text());
step('cookie de sessão emitido', cookie.startsWith('better-auth.session_token='), cookie.slice(0, 34) + '…');

const session = await json('auth/get-session').catch(() => null);
const sessionRes = await fetch(`${base}/api?p=auth/get-session`, { headers: { cookie } });
const sessionBody = await sessionRes.json();
step('GET /api/auth/get-session', !!sessionBody?.user, sessionBody?.user?.email);

const signIn = await fetch(`${base}/api?p=auth/sign-in/email`, {
  method: 'POST',
  headers: jsonHeaders,
  body: JSON.stringify({ email, password }),
});
step('POST /api/auth/sign-in/email', signIn.ok);

const signOut = await fetch(`${base}/api?p=auth/sign-out`, { method: 'POST', headers: { cookie, origin: ORIGIN } });
step('POST /api/auth/sign-out', signOut.ok);

// ---- admin write -----------------------------------------------------------
await pool.query('update "user" set role = $2 where email = $1', [email, 'admin']);
const adminSignIn = await fetch(`${base}/api?p=auth/sign-in/email`, {
  method: 'POST',
  headers: jsonHeaders,
  body: JSON.stringify({ email, password }),
});
const adminCookie = adminSignIn.headers.get('set-cookie')?.split(';')[0] || '';

const auth = { 'content-type': 'application/json', cookie: adminCookie, origin: ORIGIN };

const dish = await fetch(`${base}/api?p=menuItems`, {
  method: 'POST',
  headers: auth,
  body: JSON.stringify({
    name: 'Prato via Function',
    description: 'Criado pelo teste da function',
    price: 4500,
    image: '/images/teasers/hot-dog.jpg',
    categoryId: (await json('categories'))[0]?.id,
    isAvailable: true,
    extras: [{ name: 'Queijo', price: 500 }],
  }),
});
const dishBody = await dish.json();
step('admin: criar prato', dish.ok, dishBody?.error || dishBody?.id);

const editDish = await fetch(`${base}/api?p=menuItems/${dishBody.id}`, {
  method: 'PUT',
  headers: auth,
  body: JSON.stringify({ price: 5000, isAvailable: false }),
});
step('admin: editar prato', editDish.ok);

const settings = await fetch(`${base}/api?p=settings/main`, {
  method: 'PUT',
  headers: auth,
  body: JSON.stringify({ slogan: 'Teste via function' }),
});
step('admin: guardar definições', settings.ok);

const saved = await json('settings');
step('definições lidas de volta', saved.slogan === 'Teste via function', saved.slogan);
await fetch(`${base}/api?p=settings/main`, {
  method: 'PUT',
  headers: auth,
  body: JSON.stringify({ slogan: 'Onde o apetite encontra direção.' }),
});

const users = await fetch(`${base}/api?p=users`, { headers: auth });
step('admin: lista de utilizadores', users.ok);

// ---- SSE -------------------------------------------------------------------
const sseRes = await fetch(`${base}/api?p=events`);
const reader = sseRes.body!.getReader();
const first = await reader.read();
step('SSE liga', new TextDecoder().decode(first.value).includes('retry'));
await reader.cancel().catch(() => {});

// ---- cleanup ---------------------------------------------------------------
await fetch(`${base}/api?p=menuItems/${dishBody.id}`, { method: 'DELETE', headers: auth });
await pool.query('delete from "user" where email = $1', [email]);

server.close();
console.log(failures === 0 ? '\nVercel function OK ✓ (registo, sessão e painel admin funcionais)' : `\n${failures} verificação(ões) falharam ✗`);
await pool.end();
process.exit(failures === 0 ? 0 : 1);