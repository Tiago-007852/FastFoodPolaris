import http from 'node:http';
import { pool } from '../server/db';
import { createApiApp } from '../server/app';

/**
 * Verifica que o registo funciona com um Host diferente do BETTER_AUTH_URL
 * (caso do preview / Vercel), e que uma origem cruzada continua bloqueada.
 *   bunx tsx scripts/auth-origin-check.ts
 */
const app = createApiApp();
const server = http.createServer((req, res) => app(req, res));
server.listen(0, '127.0.0.1');
await new Promise(r => server.once('listening', r));
const base = `http://127.0.0.1:${(server.address() as any).port}`;

let failures = 0;
const step = (ok, label, detail = '') => {
  if (!ok) failures++;
  console.log(`${ok ? '✓' : '✗'} ${label}${detail ? ` — ${detail}` : ''}`);
};

/** Registo com Origin divergente do Host declarado (simula o browser atrás do proxy preview). */
const strOrigin = `${base}`; // o Origin que o browser manda é a origem pública vista
const res = await fetch(`${base}/api/auth/sign-up/email`, {
  method: 'POST',
  headers: {
    'content-type': 'application/json',
    // Origin "pública" ≠ Host local da função — o cenário do proxy/Vercel/preview
    origin: 'https://polarisfastfood.online',
  },
  body: JSON.stringify({ email: `origin+${Date.now()}@polaris.test`, password: 'teste12345', name: 'T Origin' }),
});
step(res.status === 403, 'origem cruzada continua bloqueada (403)', `status=${res.status}`);

// Registo mesmo-origem com Host ≠ BETTER_AUTH_URL — o caso real do preview
const sameOriginRes = await fetch(`${base}/api/auth/sign-up/email`, {
  method: 'POST',
  headers: {
    'content-type': 'application/json',
    origin: base, // a origem vista == o Host que serviu o pedido
  },
  body: JSON.stringify({ email: `preview+${Date.now()}@polaris.test`, password: 'teste12345', name: 'Preview User' }),
});
step(sameOriginRes.status === 200, 'registo mesmo-origem com Host ≠ BETTER_AUTH_URL funciona', `status=${sameOriginRes.status}`);

server.close();
await pool.end();
console.log(failures === 0 ? '\nOrigin check OK ✓' : `\n${failures} falha(s) ✗`);
process.exit(failures ? 1 : 0);
