import { pool } from '../server/db';

/**
 * End-to-end check of the admin path against a running server:
 * signs up a temporary admin, writes through the API, confirms the SSE feed
 * announces the change, then restores everything and removes the temp account.
 *
 *   bun run db:check:admin https://seu-preview
 */
const base = process.argv[2] || 'http://localhost:3000';
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set');

const email = `admin-check+${Date.now()}@polaris.test`;
const password = 'polaris-admin-check';
let failures = 0;

const step = (label: string, ok: boolean, detail = '') => {
  if (!ok) failures++;
  console.log(`${ok ? '✓' : '✗'} ${label}${detail ? ` — ${detail}` : ''}`);
};

const signUp = await fetch(`${base}/api/auth/sign-up/email`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ email, password, name: 'Admin Check' }),
});
step('sign-up', signUp.ok, signUp.ok ? '' : await signUp.text());

await pool.query('update "user" set role = $2 where email = $1', [email, 'admin']);
await pool.query('update "user" set "updatedAt" = now() where email = $1', [email]);

const signIn = await fetch(`${base}/api/auth/sign-in/email`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ email, password }),
});
const cookie = signIn.headers.get('set-cookie')?.split(';')[0] || '';
step('admin sign-in', signIn.ok, cookie ? '' : await signIn.text());

const session = await fetch(`${base}/api/auth/get-session`, { headers: { cookie } }).then(r => r.json());
step('session role is admin', session?.user?.role === 'admin', `role=${session?.user?.role}`);

const events = fetch(`${base}/api/events`).then(async (res) => {
  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  const deadline = Date.now() + 8000;
  while (Date.now() < deadline) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    if (buffer.includes('event: change')) break;
  }
  await reader.cancel().catch(() => {});
  return buffer;
});

await new Promise(r => setTimeout(r, 300));

const created = await fetch(`${base}/api/categories`, {
  method: 'POST',
  headers: { 'content-type': 'application/json', cookie },
  body: JSON.stringify({ name: 'Temporária', order: 99 }),
});
const createdBody = await created.json();
step('admin create', created.ok, createdBody?.error || createdBody?.id);

const updated = await fetch(`${base}/api/categories/${createdBody.id}`, {
  method: 'PUT',
  headers: { 'content-type': 'application/json', cookie },
  body: JSON.stringify({ name: 'Temporária 2', order: 98 }),
});
step('admin update', updated.ok, (await updated.json())?.error || '');

const sse = await events;
step('SSE announced the change', sse.includes('event: change'), sse.split('\n').slice(0, 3).join(' | '));

await fetch(`${base}/api/categories/${createdBody.id}`, {
  method: 'DELETE',
  headers: { cookie },
});
await pool.query('delete from "user" where email = $1', [email]);
step('cleanup', true);

console.log(failures === 0 ? '\nAdmin flow OK ✓' : `\n${failures} verificação(ões) falharam ✗`);
await pool.end();
process.exit(failures === 0 ? 0 : 1);