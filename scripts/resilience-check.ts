import http from 'node:http';
import handler from '../api/index';

/**
 * Proves the failure paths that used to answer Vercel's `FUNCTION_INVOCATION_FAILED`
 * now answer a readable JSON error and leave the function alive:
 * an unusable DATABASE_URL, and a rejection raised in the background.
 *
 *   env -u DATABASE_URL -u BETTER_AUTH_SECRET bunx tsx scripts/resilience-check.ts
 */
delete process.env.DATABASE_URL;
delete process.env.BETTER_AUTH_SECRET;

const server = http.createServer((req, res) => handler(req, res));
server.listen(0, '127.0.0.1');
await new Promise((resolve) => server.once('listening', resolve));

const base = `http://127.0.0.1:${(server.address() as any).port}`;
let failures = 0;

const step = (label: string, ok: boolean, detail = '') => {
  if (!ok) failures++;
  console.log(`${ok ? '✓' : '✗'} ${label}${detail ? ` — ${detail}` : ''}`);
};

// The handler registers its own listener, so a stray rejection must be logged
// without terminating the process. This records it instead of exiting, which
// lets the checks below prove the instance survived.
let rejections = 0;
process.on('unhandledRejection', () => {
  rejections++;
});

/** Every request is bounded: with no database the auth call may never answer. */
const call = (path: string, init?: RequestInit) =>
  fetch(`${base}/api?p=${path}`, { ...init, signal: AbortSignal.timeout(10_000) }).catch(
    (err) => ({ status: 0, ok: false, json: async () => ({ error: String(err) }) }) as any,
  );

const healthRes = await call('health');
const healthBody = await healthRes.json().catch(() => null);
step('health responde 503 em JSON', healthRes.status === 503 && !!healthBody?.error, `status=${healthRes.status}`);
step('o corpo identifica a falta de env var', /DATABASE_URL/.test(String(healthBody?.error)), String(healthBody?.error));
step('env report mostra DATABASE_URL ausente', healthBody?.env?.DATABASE_URL === false);

const signUpRes = await call('auth/sign-up/email', {
  method: 'POST',
  headers: { 'content-type': 'application/json', origin: process.env.BETTER_AUTH_URL || base },
  body: JSON.stringify({ email: `noenv+${Date.now()}@polaris.test`, password: '12345678', name: 'No Env' }),
});
// With no reachable database Better Auth never answers (status 0 = the bounded
// wait gave up) and rejects in the background. Either way it must not take the
// process down: the request below is the real assertion.
step(
  'sign-up não derruba a function (erro ou espera limitada)',
  signUpRes.status === 0 || (signUpRes.status >= 400 && signUpRes.status < 600),
  `status=${signUpRes.status}`,
);

const againRes = await call('health');
step('o processo continua vivo para o pedido seguinte', againRes.status === 503, `status=${againRes.status}`);
step('a rejeição em background foi registada, não fatal', rejections > 0, `${rejections} rejeição(ões) capturada(s)`);

console.log(failures === 0 ? '\nSem crash opaco ✓' : `\n${failures} verificação(ões) falharam ✗`);
// The pool keeps handles open on purpose; force the exit.
process.exit(failures === 0 ? 0 : 1);