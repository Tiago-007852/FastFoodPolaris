import http from 'node:http';
import { createApiApp } from '../server/app';

/**
 * Read-only security validation of the public/moderation split (no writes):
 *
 *   1. GET /api/reviews (anónimo): só avaliações aprovadas e sem `userId`
 *   2. GET /api/dishRatings (anónimo): só classificações visíveis
 *   3. as listas completas de moderação (/api/<resource>/all) exigem sessão admin (403)
 *   4. as respostas públicas de moderação continuam cacheáveis com ETag forte
 *   5. as rotas privadas continuam sem cache público
 *
 *   bunx tsx scripts/public-privacy-check.ts
 *
 * Nota: este script serve o Express directamente (sem o rewrite `?p=` da
 * Vercel em `api/index.ts`), por isso os caminhos vão directos: `/api/<rota>`.
 * As verificações são "vazias" se a BD não tiver registos pendentes/ocultos:
 * a prova completa com dados de moderação reais exige staging (db:check:admin).
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

const get = (path: string, headers: Record<string, string> = {}) =>
  fetch(`${base}/api/${path}`, { headers });

// --- 1. reviews: approved only, no private identity -------------------------
const reviewsRes = await get('reviews');
const reviews: any[] = await reviewsRes.json();
step('GET reviews responde lista', Array.isArray(reviews), `${reviews?.length ?? '—'} linhas`);
step(
  'nenhuma revisão pendente chega ao público',
  reviews.every((r) => r.isApproved === true),
  reviews.some((r) => r.isApproved !== true) ? `violada por ${reviews.filter((r) => r.isApproved !== true).length} registo(s)` : `${reviews.length} registos todos aprovados`,
);
step(
  'userId nunca sai na resposta anónima',
  reviews.every((r) => !('userId' in r)),
  Object.hasOwn(reviews[0] ?? {}, 'userId') ? 'campo presente!' : 'ausente em todas as linhas',
);
step(
  'resposta pública continua cacheável',
  (reviewsRes.headers.get('Cache-Control') || '').includes('s-maxage=60') && !!reviewsRes.headers.get('ETag'),
);

// --- 2. dishRatings: visible only -------------------------------------------
const ratingsRes = await get('dishRatings');
const ratings: any[] = await ratingsRes.json();
step('GET dishRatings responde lista', Array.isArray(ratings), `${ratings?.length ?? '—'} linhas`);
step(
  'nenhuma classificação oculta chega ao público',
  ratings.every((r) => r.isHidden === false),
  ratings.some((r) => r.isHidden !== false) ? `violada por ${ratings.filter((r) => r.isHidden !== false).length} registo(s)` : `${ratings.length} registos todos visíveis`,
);

// --- 3. moderation lists are authenticated ----------------------------------
const reviewsAll = await get('reviews/all');
step('GET reviews/all sem sessão → 403', reviewsAll.status === 403, `status=${reviewsAll.status}`);
const ratingsAll = await get('dishRatings/all');
step('GET dishRatings/all sem sessão → 403', ratingsAll.status === 403, `status=${ratingsAll.status}`);
step(
  'rota de moderação sem cache público',
  !(ratingsAll.headers.get('Cache-Control') || '').includes('s-maxage'),
  (ratingsAll.headers.get('Cache-Control') || '').includes('no-store') ? 'private, no-store' : 'sem Cache-Control público',
);

// --- 4. unaffected public resources -----------------------------------------
const menuRes = await get('menuItems');
step('GET menuItems segue cacheável/ETag (regressão)', !!menuRes.headers.get('ETag') && (menuRes.headers.get('Cache-Control') || '').includes('s-maxage=60'));
const settingsRes = await get('settings');
const settingsBody = await settingsRes.json();
step('GET settings segue público (regressão)', !!settingsBody?.restaurantName || settingsRes.status === 200, `status=${settingsRes.status}`);

server.close();
console.log(
  failures === 0
    ? '\nPrivacidade pública OK ✓ (só aprovados/visíveis, sem userId, moderação autenticada)'
    : `\n${failures} verificação(ões) falharam ✗`,
);
process.exit(failures === 0 ? 0 : 1);
