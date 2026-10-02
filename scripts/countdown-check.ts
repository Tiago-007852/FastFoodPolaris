import { pool } from '../server/db';

/**
 * Countdown section check: teaser cards (images + descriptions) and the
 * background video, both editable from the admin panel.
 *
 *   bun run db:check:countdown https://seu-preview
 */
const base = process.argv[2] || 'http://localhost:3000';

let failures = 0;
const step = (label: string, ok: boolean, detail = '') => {
  if (!ok) failures++;
  console.log(`${ok ? '✓' : '✗'} ${label}${detail ? ` — ${detail}` : ''}`);
};

const teasers = await fetch(`${base}/api/teasers`).then(r => r.json());
step('API devolve as prévias', Array.isArray(teasers), `${teasers.length} cartões`);
step('todas têm imagem e descrição', teasers.every((t: any) => t.image && t.description), `${teasers.filter((t: any) => t.image && t.description).length}/${teasers.length}`);

const settings = await fetch(`${base}/api/settings`).then(r => r.json());
step('vídeo de fundo configurado', !!settings.countdownBgVideo, settings.countdownBgVideo || 'vazio (usa o default)');

// --- round trip como admin ---------------------------------------------------
const email = `countdown-check+${Date.now()}@polaris.test`;
const password = 'polaris-countdown-check';
await fetch(`${base}/api/auth/sign-up/email`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ email, password, name: 'Countdown Check' }),
});
await pool.query('update "user" set role = $2 where email = $1', [email, 'admin']);
const signIn = await fetch(`${base}/api/auth/sign-in/email`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ email, password }),
});
const cookie = signIn.headers.get('set-cookie')?.split(';')[0] || '';

const created = await fetch(`${base}/api/teasers`, {
  method: 'POST',
  headers: { 'content-type': 'application/json', cookie },
  body: JSON.stringify({
    name: 'Prévia de teste',
    description: 'Descrição editada pelo teste',
    image: '/images/teasers/hot-dog.jpg',
    order: 99,
    enabled: true,
  }),
});
const createdBody = await created.json();
step('criar prévia', created.ok, createdBody?.error || createdBody?.id);

const updated = await fetch(`${base}/api/teasers/${createdBody.id}`, {
  method: 'PUT',
  headers: { 'content-type': 'application/json', cookie },
  body: JSON.stringify({ description: 'Nova descrição', image: '/images/teasers/burger-duplo.jpg', enabled: false }),
});
step('editar prévia (imagem + descrição)', updated.ok);

const video = await fetch(`${base}/api/settings/main`, {
  method: 'PUT',
  headers: { 'content-type': 'application/json', cookie },
  body: JSON.stringify({ countdownBgVideo: '/videos/custom-bg.mp4' }),
});
step('guardar vídeo do countdown', video.ok);

const afterVideo = await fetch(`${base}/api/settings`).then(r => r.json());
step('vídeo lido de volta', afterVideo.countdownBgVideo === '/videos/custom-bg.mp4', afterVideo.countdownBgVideo);

// cleanup
await fetch(`${base}/api/teasers/${createdBody.id}`, { method: 'DELETE', headers: { cookie } });
await fetch(`${base}/api/settings/main`, {
  method: 'PUT',
  headers: { 'content-type': 'application/json', cookie },
  body: JSON.stringify({ countdownBgVideo: '/videos/countdown-bg.mp4' }),
});
await pool.query('delete from "user" where email = $1', [email]);

const restored = await fetch(`${base}/api/teasers`).then(r => r.json());
step('limpeza', restored.length === teasers.length, `${restored.length} cartões`);

console.log(failures === 0 ? '\nCountdown OK ✓' : `\n${failures} verificação(ões) falharam ✗`);
await pool.end();
process.exit(failures === 0 ? 0 : 1);