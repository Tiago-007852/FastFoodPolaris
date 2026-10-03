import { mkdtempSync, copyFileSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

/**
 * Reproduces the Vercel lambda layout: only `api/` ships, `server/` does not, and
 * there is no `node_modules` to fall back on. The failure this guards against is
 * `Cannot find module '/var/task/server/app'` — the API has to travel with the
 * function as the bundle produced by `bun run build:api`.
 */
const dir = mkdtempSync(path.join(tmpdir(), 'lambda-'));
const apiDir = path.join(dir, 'api');
await import('node:fs').then(fs => fs.mkdirSync(apiDir));

copyFileSync('api/_app.cjs', path.join(apiDir, '_app.cjs'));
writeFileSync(path.join(dir, 'package.json'), '{"type":"module"}');

console.log(`lambda de teste: ${dir}`);
console.log(`node_modules presente? ${existsSync(path.join(dir, 'node_modules'))} (tem de ser false)`);

const mod = await import(path.join(apiDir, '_app.cjs'));
const create = mod.createApiApp || mod.default?.createApiApp;
console.log('bundle carregou sem dependências externas:', typeof create);

const app = create();
console.log('Express app criada:', typeof app === 'function');

// The request path the function actually serves, exercised end to end.
const server = (await import('node:http')).createServer((req, res) => app(req, res));
server.listen(0, '127.0.0.1');
await new Promise(resolve => server.once('listening', resolve));
const base = `http://127.0.0.1:${(server.address() as any).port}`;

const health = await fetch(`${base}/api/health`);
const body = await health.json().catch(() => null);
console.log(`GET /api/health → ${health.status} ${JSON.stringify(body).slice(0, 120)}`);

// A DB error here is fine (the sandbox URL is a placeholder); what matters is
// that the request is answered instead of the process dying.
server.close();

const ok = typeof create === 'function' && typeof app === 'function';
console.log(ok ? '\nBundle autossuficiente ✓' : '\nBundle não carrega fora do repositório ✗');
process.exit(ok ? 0 : 1);