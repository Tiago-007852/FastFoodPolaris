import http from 'node:http';
import { createApiApp } from '../server/app';

/**
 * Verifies the SSE lifetime contract of `server/events.ts`:
 *
 * - Verificação A (ambiente local, sem limites): a stream fica aberta e a
 *   primeira frame anuncia `retry:` — o SSE real mantém-se intacto.
 * - Verificação B (serverless): a stream fecha-se em tempo plano, ANTES do
 *   limite de execução (60 s nesta Vercel), com a frame `: closing` — assim
 *   nenhuma ligação termina em `Task timed out after 60 seconds`.
 *
 *   # A (fica aberta)
 *   bunx tsx scripts/sse-close-check.ts
 *   # B com sobrevida curta, para o teste correr depressa:
 *   SSE_MAX_LIFETIME_MS=5000 bunx tsx scripts/sse-close-check.ts
 *   # B com o comportamento real de produção (default de 20 s na Vercel):
 *   VERCEL=1 bunx tsx scripts/sse-close-check.ts
 *
 * Nota: este script serve o Express directamente (sem o rewrite `?p=` da
 * Vercel em `api/index.ts`), por isso os caminhos vão directos: `/api/events`.
 */
let failures = 0;
const step = (label: string, ok: boolean, detail = '') => {
  if (!ok) failures++;
  console.log(`${ok ? '✓' : '✗'} ${label}${detail ? ` — ${detail}` : ''}`);
};

const envLifetimeMs = Number(process.env.SSE_MAX_LIFETIME_MS) || 0;
const isServerless = !!process.env.VERCEL || !!process.env.AWS_LAMBDA_FUNCTION_NAME;
const bounded = envLifetimeMs > 0 || isServerless;
const expectedLifetimeMs = envLifetimeMs > 0 ? envLifetimeMs : isServerless ? 20_000 : 0;

const app = createApiApp();
const server = http.createServer((req, res) => app(req, res));
server.listen(0, '127.0.0.1');
await new Promise((resolve) => server.once('listening', resolve));

const port = (server.address() as any).port;
const base = `http://127.0.0.1:${port}`;

/**
 * Reads /api/events until the server ends the response or `budgetMs` passes.
 * Returns whether it ended, the thrown-together bytes received and the time.
 */
async function observeStream(budgetMs: number) {
  const started = Date.now();
  const res = await fetch(`${base}/api/events`);
  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let raw = '';
  const readLoop = (async () => {
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) return true;
        raw += decoder.decode(value, { stream: true });
      }
    } catch {
      return false;
    }
  })();

  const ended = await Promise.race([
    readLoop,
    new Promise<false>((resolve) => setTimeout(() => resolve(false), budgetMs)),
  ]);

  try {
    res.body?.cancel();
  } catch {
    // stream already over
  }
  return { ended, raw, elapsed: Date.now() - started };
}

const TIMEOUT_MS = expectedLifetimeMs + Math.min(expectedLifetimeMs, 5_000) || 5_000;
const { ended, raw, elapsed } = await observeStream(TIMEOUT_MS || 5_000);

step('a primeira frame anuncia retry', raw.startsWith('retry: 3000'), raw.slice(0, 16) + '…');

if (!bounded) {
  // Local: the stream must stay open (real SSE), no timeout would be reported.
  step('stream fica aberta localmente', !ended, `observada ${elapsed} ms sem fecho`);
} else {
  step('stream fecha-se sozinha', ended, `fechou aos ${elapsed} ms`);
  step(
    `fecho dentro da vida configurada (${expectedLifetimeMs} ms) + margem`,
    !ended || elapsed <= expectedLifetimeMs + 1_000,
    `${elapsed} ms`,
  );
  step(
    'fecho ANTES do limite de execução de 60 s',
    !ended || elapsed < 60_000,
    ended ? `${elapsed} ms < 60 000 ms` : 'não fechou',
  );
  step('última frame é o fecho controlado (": closing")', raw.includes(': closing'), raw.endsWith(': closing\n\n') ? 'sim' : 'não');
}

server.close();
console.log(failures === 0 ? `\nSSE lifetime OK ✓ (${bounded ? 'serverless, fecho controlado' : 'local, stream aberta'})` : `\n${failures} verificação(ões) falharam ✗`);
process.exit(failures === 0 ? 0 : 1);
