import { pool } from '../server/db';
import { createApiApp } from '../server/app';

/**
 * Order/payment flow checks against the API + Neon:
 *
 *   bun run db:check:orders
 *
 * Cria encomendas de teste (dedicação ao isolamento), valida recálculo de
 * preços, idempotência, bairro obrigatório, levantamento sem taxa, envio e
 * validação de comprovativo, transições proibidas e vistas de outros
 * utilizadores. Os testes não fazem pagamentos reais.
 */
let failures = 0;

const step = (label: string, ok: boolean, detail = '') => {
  if (!ok) failures++;
  console.log(`${ok ? '✓' : '✗'} ${label}${detail ? ` — ${detail}` : ''}`);
};

const app = createApiApp();
const server = app.listen(0, '127.0.0.1');
await new Promise<void>((resolve) => server.once('listening', resolve as any));
const port = (server.address() as any).port;
const base = `http://127.0.0.1:${port}`;
const ORIGIN = process.env.BETTER_AUTH_URL || base;

type ApiRes = { status: number; body: any };
const api = async (path: string, init: RequestInit = {}, waitAuth = ''): Promise<ApiRes> => {
  const headers: Record<string, string> = {
    'content-type': 'application/json',
    origin: ORIGIN,
    ...(waitAuth ? { cookie: waitAuth } : {}),
    ...(init as any).headers,
  };
  const res = await fetch(`${base}${path}`, { ...init, headers });
  const text = await res.text();
  let body: any;
  try { body = JSON.parse(text); } catch { body = text; }
  return { status: res.status, body };
};

/* ---------------------------------------------------------- helper accounts */

const suffix = Date.now().toString(36);
const customer = {
  email: `orders+${suffix}@polaris.test`,
  password: 'polaris12345',
  name: 'Cliente Teste',
};
const other = {
  email: `orders2+${suffix}@polaris.test`,
  password: 'polaris12345',
  name: 'Outro Cliente',
};

const cookieOf = (res: Response) => res.headers.get('set-cookie')?.split(';')[0] || '';
const cookieCache: Record<string, string> = {};

for (const [key, account] of Object.entries({ customer, other })) {
  const res = await fetch(`${base}/api/auth/sign-up/email`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: ORIGIN },
    body: JSON.stringify(account),
  });
  cookieCache[key] = cookieOf(res);
  if (!res.ok) {
    // Account may exist from a previous run: sign in.
    const signin = await fetch(`${base}/api/auth/sign-in/email`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: ORIGIN },
      body: JSON.stringify(account),
    });
    cookieCache[key] = cookieOf(signin);
  }
}
step('registo/sessão do cliente de teste', !!cookieCache.customer && cookieCache.customer.length > 0);

/* --------------------------------------------------------- menu de referência */

const menu = (await api('/api/menuItems', {}, cookieCache.customer)).body;
const firstItem = Array.isArray(menu) && menu.length > 0 ? menu.find((i: any) => i.is_available !== false) : null;
if (!firstItem) {
  console.log('✗ sem itens no menu — corre `bun run db:seed` antes deste check');
  process.exit(1);
}

// O bairro tem de vir da própria BD (a lista do frontend pode diferir).
const zones = (await api('/api/zones', {}, cookieCache.customer)).body;
const enabledZone = (Array.isArray(zones) ? zones : []).find((z: any) => z.enabled !== false && (z.neighborhoods || []).length > 0);
const TEST_NEIGHBORHOOD = enabledZone?.neighborhoods?.[0];
if (!TEST_NEIGHBORHOOD) {
  console.log('✗ sem zonas de entrega na BD — configura uma zona no painel admin primeiro');
  process.exit(1);
}
console.log(`· bairro de teste: ${TEST_NEIGHBORHOOD} (zona ${enabledZone.name}, taxa ${enabledZone.fee})`);

/* ---------------------------------------------------------------- checkout */

const buildPayload = (overrides: Record<string, any> = {}) => ({
  items: [{ menuItemId: firstItem.id, quantity: 2, extraNames: [] }],
  fulfillment: 'delivery',
  neighborhood: TEST_NEIGHBORHOOD,
  address: 'Rua de Teste 123, junto ao portão',
  customerName: 'Cliente Teste',
  customerPhone: '922923776',
  customerEmail: customer.email,
  paymentMethod: 'transfer',
  clientToken: `tok-${suffix}-1`,
  ...overrides,
});

// 1. criação com preços recalculados a partir do menu (com a sessão do cliente)
const created = await api('/api/orders', { method: 'POST', body: JSON.stringify(buildPayload()) }, cookieCache.customer);
step('POST /api/orders cria encomenda', created.status === 201, `status=${created.status} ${JSON.stringify(created.body).slice(0, 160)}`);
const order = created.body;
step('status inicial pendente_pagamento', order?.status === 'pendente_pagamento', String(order?.status));
step('subtotal recalculado no servidor é número', typeof order?.subtotal === 'number' && order.subtotal >= 0, String(order?.subtotal));
step('referência gerada', /^POL-/.test(String(order?.reference)), String(order?.reference));

// O preço unitário × quantidade tem de bater certo com o menu (recalculado).
// Uma linha alterada no cliente não muda o total.
const expectedLine = num_or_0(firstItem.price) * 2;
step('total bate certo com o preço da BD', Math.abs((order?.subtotal ?? -1) - expectedLine) < 0.01,
  `subtotal=${order?.subtotal} esperado=${expectedLine}`);

// 2. idempotência — repetir o pedido devolve a mesma encomenda
const again = await api('/api/orders', { method: 'POST', body: JSON.stringify(buildPayload()) }, cookieCache.customer);
step('pedido repetido não duplica encomenda', again.status === 200 && again.body?.id === order.id,
  `status=${again.status} id=${again.body?.id}`);

// 3. preço manipulado no frontend é ignorado
const tamper = await api('/api/orders', {
  method: 'POST',
  body: JSON.stringify(buildPayload({ items: [{ menuItemId: firstItem.id, quantity: 2, price: 1 }], clientToken: `tok-${suffix}-2` })),
});
step('preço enviado pelo frontend é ignorado', tamper.status === 201 && tamper.body?.id !== order.id &&
  Math.abs((tamper.body?.subtotal ?? -1) - expectedLine) < 0.01, `subtotal=${tamper.body?.subtotal}`);

// 4. bairro inválido é rejeitado
const badZone = await api('/api/orders', { method: 'POST', body: JSON.stringify(buildPayload({ neighborhood: 'Bairro Fantasma', clientToken: `tok-${suffix}-3` })) });
step('bairro fora da lista é rejeitado', badZone.status === 400, `status=${badZone.status}`);

// 5. entrega sem bairro é rejeitada
const noZone = await api('/api/orders', { method: 'POST', body: JSON.stringify(buildPayload({ neighborhood: '', clientToken: `tok-${suffix}-4` })) });
step('entrega sem bairro é rejeitada', noZone.status === 400, `status=${noZone.status}`);

// 6. levantamento sem bairro e sem taxa
const pickup = await api('/api/orders', { method: 'POST', body: JSON.stringify(buildPayload({ fulfillment: 'pickup', neighborhood: '', address: '', clientToken: `tok-${suffix}-5` })) });
step('levantamento aceita sem bairro', pickup.status === 201, `status=${pickup.status} ${JSON.stringify(pickup.body).slice(0, 120)}`);
step('taxa do levantamento é zero', num_or_0(pickup.body?.deliveryFee) === 0, String(pickup.body?.deliveryFee));
step('total do levantamento = subtotal', Math.abs(num_or_0(pickup.body?.total) - num_or_0(pickup.body?.subtotal)) < 0.01);

// 7. pagamento express indisponível está bloqueado no servidor
const express = await api('/api/orders', { method: 'POST', body: JSON.stringify(buildPayload({ paymentMethod: 'express', clientToken: `tok-${suffix}-6` })) });
step('pagamento express indisponível é rejeitado', express.status === 400, `status=${express.status}`);

/* --------------------------------------------------------------- comprovativos */

// 8. comprovativo 1x1 PNG válido
const pngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
const proofRes = await api(`/api/orders/${order.id}/proof`, {
  method: 'POST',
  body: JSON.stringify({ dataUrl: `data:image/png;base64,${pngBase64}`, filename: 'comprovativo.png', note: 'Transferência feita' }),
}, cookieCache.customer);
step('comprovativo submetido → comprovativo_submetido', proofRes.status === 200 && proofRes.body?.status === 'comprovativo_submetido',
  `status=${proofRes.status} ${JSON.stringify(proofRes.body).slice(0, 140)}`);
step('proofStatus pendente', proofRes.body?.proofStatus === 'pendente', String(proofRes.body?.proofStatus));

// 9. ficheiro não permitido (texto puro) é rejeitado
const badProof = await api(`/api/orders/${order.id}/proof`, {
  method: 'POST',
  body: JSON.stringify({ dataUrl: 'data:text/plain;base64,aGVsbG8gd29ybGQgaGVsbG8gd29ybGQ=', filename: 'comprovativo.txt' }),
}, cookieCache.customer);
step('ficheiro de tipo proibido é rejeitado', badProof.status === 400, `status=${badProof.status}`);

// 10. comprovativo demasiado grande é rejeitado (limite 3 MB decodificados —
// base64 de 4 MB rebentava nos 4,5 MB de corpo da edge da Vercel antes de
// chegar à função).
// Construído a partir de bytes reais: o Node corta a base64 no primeiro padding.
const pngBytes = Buffer.from(pngBase64, 'base64');
const bigBuffer = Buffer.alloc(3_400_000);
pngBytes.copy(bigBuffer);
bigBuffer.set(pngBytes, 0);
const bigBase64 = bigBuffer.toString('base64');
const bigProof = await api(`/api/orders/${order.id}/proof`, {
  method: 'POST',
  body: JSON.stringify({ dataUrl: `data:image/png;base64,${bigBase64}`, filename: 'grande.png' }),
}, cookieCache.customer);
step('comprovativo acima de 3 MB é rejeitado', bigProof.status === 400 || bigProof.status === 413, `status=${bigProof.status}`);

/* ------------------------------------------------------------ isolamento */

// 10. outro utilizador não vê nem valida
const otherView = await api(`/api/orders/${order.id}`, {}, cookieCache.other);
step('outra conta não lê a encomenda do cliente', otherView.status === 403, `status=${otherView.status}`);

const adminApprove = await api(`/api/admin/orders/${order.id}/payment/approve`, { method: 'POST', body: JSON.stringify({ note: 'ok' }) }, cookieCache.other);
step('utilizador comum não valida pagamento', adminApprove.status === 403, `status=${adminApprove.status}`);

// 11. cliente não pode avançar o estado logístico
const cheatStatus = await api(`/api/admin/orders/${order.id}/status`, { method: 'POST', body: JSON.stringify({ status: 'pago' }) }, cookieCache.customer);
step('cliente não marca a encomenda como paga', cheatStatus.status === 403, `status=${cheatStatus.status}`);

// 12. cancelamento pelo cliente enquanto pendente
const cancelRes = await api(`/api/orders/${order.id}/cancel`, { method: 'POST' }, cookieCache.customer);
// 12b. o convidado também pode cancelar com referência+telefone (encomenda pickup)
const guestCancel = await api(`/api/orders/${pickup.body?.id}/cancel`, { method: 'POST', body: JSON.stringify({ reference: pickup.body?.reference, phone: '922923776' }) });
step('convidado cancela com referência+telefone', guestCancel.status === 200 && guestCancel.body?.status === 'cancelado', `${guestCancel.status}`);
step('cliente cancela enquanto pendente', cancelRes.status === 200 && cancelRes.body?.status === 'cancelado', `${cancelRes.status} ${String(cancelRes.body?.status)}`);

// 13. transition proibida após cancelado
const afterCancel = await api(`/api/orders/${order.id}/cancel`, { method: 'POST' }, cookieCache.customer);
step('encomenda cancelada não pode voltar a cancelar', afterCancel.status === 409, `status=${afterCancel.status}`);

/* --------------------------------------------------------------- tracking */

const track = await api(`/api/orders/tracking/${pickup.body?.reference}?phone=922923776`);
step('consultar por referência+telefone funciona', track.status === 200 && track.body?.id === pickup.body?.id, `status=${track.status}`);
const trackBad = await api(`/api/orders/tracking/${pickup.body?.reference}?phone=900000000`);
step('telefone errado não desbloqueia a consulta', trackBad.status === 404, `status=${trackBad.status}`);

function num_or_0(value: unknown): number {
  return Number.isFinite(Number(value)) ? Number(value) : 0;
}

server.close();

const cleanup = `delete from orders where client_token like 'tok-${suffix}-%'`;
await pool.query(cleanup).catch(() => undefined);
console.log(`\nEncomendas de teste removidas (${cleanup}) ✓`);
await pool.end();

console.log(failures === 0 ? '\nCheck de encomendas passou ✓' : `\n${failures} verificação(ões) falharam ✗`);
process.exit(failures === 0 ? 0 : 1);
