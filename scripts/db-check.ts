import { pool } from '../server/db';
import { createApiApp } from '../server/app';

/**
 * Boots the API on an ephemeral port and exercises the main endpoints against
 * Neon. Run with `bun run db:check`.
 */
const app = createApiApp();
const server = app.listen(0, '127.0.0.1');
await new Promise(resolve => server.once('listening', resolve));

const port = (server.address() as any).port;
const base = `http://127.0.0.1:${port}`;
let failures = 0;

const check = async (label: string, path: string, init?: RequestInit, expect = 200) => {
  const res = await fetch(`${base}${path}`, init);
  const text = await res.text();
  const ok = res.status === expect;
  if (!ok) failures++;
  console.log(`${ok ? '✓' : '✗'} ${label} (${res.status}, esperado ${expect}) ${text.slice(0, 120)}`);
  return res;
};

await check('health', '/api/health');
await check('categories', '/api/categories');
await check('menuItems', '/api/menuItems');
await check('settings', '/api/settings');
await check('about', '/api/about');
await check('zones', '/api/zones');
await check('banners', '/api/banners');
await check('subscribers count', '/api/subscribers/count');
await check(
  'anonymous write is blocked',
  '/api/categories',
  {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name: 'Hackers', order: 99 }),
  },
  403,
);

// --- auth round trip ------------------------------------------------------
const email = `smoke+${Date.now()}@polaris.test`;
let cookie = '';

const signUp = await fetch(`${base}/api/auth/sign-up/email`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ email, password: 'polaris123', name: 'Smoke Test' }),
});
cookie = signUp.headers.get('set-cookie')?.split(';')[0] || '';
console.log(`${signUp.ok ? '✓' : '✗'} sign-up (${signUp.status}) ${signUp.ok ? '' : await signUp.text()}`);
if (!signUp.ok) failures++;

await check('session', '/api/auth/get-session', { headers: { cookie } });
await check('admin endpoint still blocked for a normal user', '/api/users', { headers: { cookie } }, 403);
await check('public review submit', '/api/reviews', {
  method: 'POST',
  headers: { 'content-type': 'application/json', cookie },
  body: JSON.stringify({ userName: 'Smoke', comment: 'Teste automático', rating: 5 }),
});
await check('public dish rating submit', '/api/dishRatings', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ dishId: 'item-burger-simples', userName: 'Smoke', rating: 4 }),
});

// The super admin email is promoted automatically by the create hook.
const adminEmail = 'miguellanttonio007@gmail.com';
const adminSignIn = await fetch(`${base}/api/auth/sign-in/email`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ email: adminEmail, password: 'polaris123' }),
});
const adminCookie = adminSignIn.headers.get('set-cookie')?.split(';')[0] || '';
console.log(
  adminSignIn.ok
    ? `✓ super admin sign-in (${adminSignIn.status})`
    : `· super admin has no account yet (${adminSignIn.status}) — create it once to manage the panel`,
);

server.close();
await pool.end();

console.log(failures === 0 ? '\nAPI smoke test passed ✓' : `\n${failures} check(s) failed ✗`);
process.exit(failures === 0 ? 0 : 1);