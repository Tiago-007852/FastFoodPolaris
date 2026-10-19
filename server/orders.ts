import { query, queryOne, newId, num } from './db';
import { expressGatewayConfigured } from './payments';

/**
 * Order engine — the server is the only source of truth for prices, totals,
 * statuses and payment validation. Nothing the browser sends is trusted: menu
 * prices come from `menu_items`/`menu_item_sizes`/`menu_item_extras`, the
 * delivery fee from `delivery_zones`, and every transition below is checked
 * against the state machine in this file.
 */

export type OrderStatus =
  | 'pendente_pagamento'      // created, waiting for payment / proof
  | 'comprovativo_submetido'  // transfer receipt submitted, awaiting review
  | 'pago'                    // payment validated (admin or gateway)
  | 'em_preparacao'
  | 'em_entrega'              // delivery orders
  | 'pronto_para_levantamento' // pickup orders
  | 'concluido'
  | 'cancelado'
  | 'pago_rejeitado';         // receipt rejected / payment failed

export const PAYMENT_METHODS = ['transfer', 'express'] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

/** Clean states the customer can still cancel from. */
const CANCELABLE = new Set< OrderStatus>(['pendente_pagamento', 'comprovativo_submetido']);
const PAYMENT_STATES = new Set<OrderStatus>(['pendente_pagamento', 'comprovativo_submetido', 'pago', 'pago_rejeitado']);

/** Allowed transitions. Anything else is rejected with 409. */
const TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pendente_pagamento: ['comprovativo_submetido', 'pago', 'cancelado'],
  comprovativo_submetido: ['comprovativo_submetido', 'pago', 'pago_rejeitado', 'cancelado'],
  pago_rejeitado: ['comprovativo_submetido', 'cancelado'],
  pago: ['em_preparacao', 'cancelado'],
  em_preparacao: ['em_entrega', 'pronto_para_levantamento', 'concluido', 'cancelado'],
  em_entrega: ['concluido', 'cancelado'],
  pronto_para_levantamento: ['concluido', 'cancelado'],
  concluido: [],
  cancelado: [],
};

export const canTransition = (from: OrderStatus, to: OrderStatus): boolean =>
  from !== to && (TRANSITIONS[from] || []).includes(to);

export const isPayableTransition = (from: OrderStatus, to: OrderStatus): boolean =>
  PAYMENT_STATES.has(from);

/* ------------------------------------------------------------------ helpers */

const rake2 = (value: number): number => Math.round((Number.isFinite(value) ? value : 0) * 100) / 100;

const makeReference = () =>
  `POL-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

/** Formats an Angolan phone as its last 9 digits, tolerating +244 and spaces. */
const phoneDigits = (value: unknown): string => String(value || '').replace(/\D/g, '').slice(-9);

const clean = (value: unknown, max = 500): string =>
  String(value ?? '').trim().slice(0, max);

/* ----------------------------------------------------- price recalculation */

interface IncomingItem {
  menuItemId: unknown;
  quantity: unknown;
  sizeName?: unknown;
  extraNames?: unknown;
}

interface ComputedLine {
  menuItemId: string | null;
  name: string;
  sizeName: string | null;
  unitPrice: number;
  quantity: number;
  extras: { name: string; price: number }[];
  lineTotal: number;
}

/**
 * Recomputes every line from the database. Unknown items, unavailable items,
 * zero/invalid quantities and extras that do not exist for the item are all
 * rejected — the browser payload only names what it wants, never prices it.
 */
async function computeLines(items: IncomingItem[]): Promise<ComputedLine[]> {
  if (!Array.isArray(items) || items.length === 0) {
    throw badRequest('O carrinho está vazio.');
  }
  if (items.length > 40) {
    throw badRequest('Demasiados artigos numa encomenda.');
  }

  const ids: string[] = [];
  const quantities: number[] = [];
  for (const raw of items) {
    const id = clean(raw.menuItemId, 64);
    const quantity = Math.floor(num(raw.quantity, 0));
    if (!id) throw badRequest('Artigo sem identificador.');
    if (quantity < 1 || quantity > 50) throw badRequest(`Quantidade inválida para "${id}".`);
    ids.push(id);
    quantities.push(quantity);
  }

  // Load the requested items + their sizes/extras in three round trips.
  const placeholders = ids.map((_, i) => `$${i + 1}`).join(', ');
  const rows = await query(
    `select id, name, price, is_available from menu_items where id in (${placeholders})`,
    ids,
  );
  const sizes = await query(
    `select menu_item_id, name, price from menu_item_sizes where menu_item_id in (${placeholders})`,
    ids,
  );
  const extras = await query(
    `select menu_item_id, name, price from menu_item_extras where menu_item_id in (${placeholders})`,
    ids,
  );

  const rowsById = new Map(rows.map(r => [r.id, r]));
  const sizesByItem = new Map<string, any[]>();
  for (const s of sizes) sizesByItem.set(s.menu_item_id, [...(sizesByItem.get(s.menu_item_id) || []), s]);
  const extrasByItem = new Map<string, any[]>();
  for (const e of extras) extrasByItem.set(e.menu_item_id, [...(extrasByItem.get(e.menu_item_id) || []), e]);

  const lines: ComputedLine[] = [];
  for (let i = 0; i < ids.length; i++) {
    const row = rowsById.get(ids[i]);
    if (!row) throw badRequest('Um dos artigos já não existe no menu. Atualize o carrinho e tente novamente.');
    if (row.is_available === false) throw badRequest(`"${row.name}" está esgotado. Remova-o do carrinho para continuar.`);

    const sizeList = sizesByItem.get(row.id) || [];
    let unitPrice = num(row.price);
    let sizeName: string | null = null;
    const requestedSize = clean((items[i] as any).sizeName, 100);
    if (sizeList.length > 0) {
      const size = sizeList.find(s => s.name === requestedSize) ?? sizeList[0];
      unitPrice = num(size.price);
      sizeName = size.name;
    }

    const extraList = extrasByItem.get(row.id) || [];
    const chosen: { name: string; price: number }[] = [];
    const rawExtraNames: unknown[] = Array.isArray((items[i] as any).extraNames) ? (items[i] as any).extraNames : [];
    for (const name of rawExtraNames.slice(0, 20)) {
      const match = extraList.find(e => e.name === clean(name, 100));
      if (!match) throw badRequest(`Um dos extras pedidos não está disponível para "${row.name}".`);
      chosen.push({ name: match.name, price: num(match.price) });
    }

    const extrasTotal = chosen.reduce((sum, e) => sum + e.price, 0);
    lines.push({
      menuItemId: row.id,
      name: row.name,
      sizeName,
      unitPrice: rake2(unitPrice + extrasTotal),
      quantity: quantities[i],
      extras: chosen,
      lineTotal: rake2((unitPrice + extrasTotal) * quantities[i]),
    });
  }
  return lines;
}

/* ----------------------------------------------------------- delivery fee */

/**
 * The delivery fee always comes from the enabled delivery zone that covers the
 * chosen bairro. Pickup orders always pay Kz 0. Nonexistent or disabled
 * bairros are rejected — the customer must pick one from the real list.
 */
async function computeFee(fulfillment: 'delivery' | 'pickup', neighborhood: string) {
  if (fulfillment === 'pickup') {
    return { fee: 0, zoneName: null as string | null };
  }

  if (!neighborhood) {
    throw badRequest('Selecione o bairro onde quer receber a encomenda.');
  }

  const rows = await query(
    `select z.name, z.fee, z.time_min, z.time_max
     from delivery_zones z
     where z.enabled = true and lower($1) = any (
       select lower(n) from unnest(z.neighborhoods) as n
     )
     limit 1`,
    [neighborhood],
  );

  const zone = rows[0];
  if (!zone) {
    throw badRequest('O bairro escolhido não está disponível para entrega. Escolha um bairro da lista.');
  }
  return { fee: rake2(num(zone.fee)), zoneName: zone.name as string };
}

/* ---------------------------------------------------------------- errors */

export class OrderError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}
const badRequest = (message: string) => new OrderError(message, 400);

/* ------------------------------------------------------------- validation */

export interface CreateOrderInput {
  items: IncomingItem[];
  fulfillment: unknown;
  customerName: unknown;
  customerPhone: unknown;
  customerEmail: unknown;
  neighborhood: unknown;
  address: unknown;
  notes: unknown;
  paymentMethod: unknown;
  clientToken: unknown;
}

function validateCreateInput(input: CreateOrderInput) {
  const fulfillment = input.fulfillment === 'pickup' ? 'pickup' : 'delivery';
  const paymentMethod = String(input.paymentMethod || '');
  if (!PAYMENT_METHODS.includes(paymentMethod as PaymentMethod)) {
    throw badRequest('Método de pagamento inválido.');
  }
  if (paymentMethod === 'express' && !expressGatewayConfigured()) {
    throw badRequest('O pagamento Express ainda não está ativado.');
  }

  const customerName = clean(input.customerName, 80);
  if (customerName.length < 2) throw badRequest('Por favor, insira o seu nome.');
  const customerPhone = phoneDigits(input.customerPhone);
  if (!/^9\d{8}$/.test(customerPhone)) throw badRequest('Insira um número de telefone de Angola válido (9xx xxx xxx).');
  const customerEmailRaw = clean(input.customerEmail, 120);
  if (customerEmailRaw && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmailRaw)) {
    throw badRequest('O email indicado não é válido.');
  }

  const neighborhood = fulfillment === 'delivery' ? clean(input.neighborhood, 80) : '';
  const address = clean(input.address, 400);
  if (fulfillment === 'delivery' && address.length < 5) {
    throw badRequest('Insira o endereço completo de entrega.');
  }

  return {
    fulfillment: fulfillment as 'delivery' | 'pickup',
    paymentMethod: paymentMethod as PaymentMethod,
    customerName,
    customerPhone,
    customerEmail: customerEmailRaw || null,
    neighborhood: neighborhood || null,
    address: fulfillment === 'delivery' ? address : null,
    notes: clean(input.notes, 500) || null,
    clientToken: clean(input.clientToken, 64),
  };
}

/* ------------------------------------------------------------------ create */

/**
 * Creates an order. Idempotent by `clientToken`: retries (double-click, page
 * refresh, duplicated request) return the original order with `created: false`
 * instead of writing a second one. All prices/totals are recalculated here.
 */
export async function createOrder(input: CreateOrderInput, userId: string | null) {
  const data = validateCreateInput(input);

  // 1. Idempotency — an existing order for this token wins.
  if (data.clientToken) {
    const existing = await queryOne('select id, reference from orders where client_token = $1', [data.clientToken]);
    if (existing) return { order: await getOrder(existing.id), created: false };
  }

  const lines = await computeLines(input.items);
  const subtotal = rake2(lines.reduce((sum, l) => sum + l.lineTotal, 0));
  const { fee, zoneName } = await computeFee(data.fulfillment, data.neighborhood || '');
  const total = rake2(subtotal + fee);

  const id = newId();
  const reference = makeReference();
  const clientToken = data.clientToken || newId();

  // The reference is unique; a (rare) collision retries once with a new one.
  try {
    await query(
      `insert into orders (id, reference, client_token, user_id, status, fulfillment,
        customer_name, customer_phone, customer_email, neighborhood, zone_name, address, notes,
        payment_method, subtotal, delivery_fee, total)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)`,
      [id, reference, clientToken, userId, 'pendente_pagamento', data.fulfillment,
        data.customerName, data.customerPhone, data.customerEmail, data.neighborhood, zoneName,
        data.address, data.notes, data.paymentMethod, subtotal, fee, total],
    );
  } catch (err: any) {
    if (err?.code === '23505' && String(err?.constraint || '').includes('reference')) {
      const retryReference = makeReference();
      await query(
        `insert into orders (id, reference, client_token, user_id, status, fulfillment,
          customer_name, customer_phone, customer_email, neighborhood, zone_name, address, notes,
          payment_method, subtotal, delivery_fee, total)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)`,
        [id, retryReference, clientToken, userId, 'pendente_pagamento', data.fulfillment,
          data.customerName, data.customerPhone, data.customerEmail, data.neighborhood, zoneName,
          data.address, data.notes, data.paymentMethod, subtotal, fee, total],
      );
    } else {
      throw err;
    }
  }
  for (const line of lines) {
    await query(
      `insert into order_items (order_id, menu_item_id, name, size_name, unit_price, quantity, extras, line_total)
       values ($1,$2,$3,$4,$5,$6,$7::jsonb,$8)`,
      [id, line.menuItemId, line.name, line.sizeName, line.unitPrice, line.quantity, JSON.stringify(line.extras), line.lineTotal],
    );
  }

  await addEvent(id, null, 'pendente_pagamento', userId ? `admin:${userId}` : 'cliente', 'Encomenda criada');
  return { order: await getOrder(id), created: true };
}

/* ------------------------------------------------------------------- shape */

export async function getOrder(id: string) {
  const order = await queryOne('select * from orders where id = $1', [id]);
  if (!order) return null;
  const items = await query(
    'select menu_item_id, name, size_name, unit_price, quantity, extras, line_total from order_items where order_id = $1 order by id',
    [id],
  );
  return mapOrder(order, items);
}

function mapOrder(order: any, items: any[]) {
  return {
    id: order.id,
    reference: order.reference,
    status: order.status,
    fulfillment: order.fulfillment,
    userId: order.user_id ?? null,
    customerName: order.customer_name,
    customerPhone: order.customer_phone,
    neighborhood: order.neighborhood,
    zoneName: order.zone_name,
    address: order.address,
    notes: order.notes,
    paymentMethod: order.payment_method,
    subtotal: num(order.subtotal),
    deliveryFee: num(order.delivery_fee),
    total: num(order.total),
    proofStatus: order.proof_status,
    proofReviewNote: order.proof_review_note,
    paymentValidatedAt: order.payment_validated_at ? new Date(order.payment_validated_at).toISOString() : null,
    createdAt: order.created_at ? new Date(order.created_at).toISOString() : null,
    paidAt: order.paid_at ? new Date(order.paid_at).toISOString() : null,
    hasProof: !!order.proof_data,
    items: items.map(i => ({
      menuItemId: i.menu_item_id,
      name: i.name,
      sizeName: i.size_name,
      unitPrice: num(i.unit_price),
      quantity: i.quantity,
      extras: typeof i.extras === 'string' ? JSON.parse(i.extras || '[]') : i.extras || [],
      lineTotal: num(i.line_total),
    })),
  };
}

export async function getEvents(orderId: string) {
  const rows = await query(
    'select from_status, to_status, actor, note, created_at from order_events where order_id = $1 order by created_at asc',
    [orderId],
  );
  return rows.map(r => ({
    fromStatus: r.from_status,
    toStatus: r.to_status,
    actor: r.actor,
    note: r.note,
    createdAt: r.created_at ? new Date(r.created_at).toISOString() : null,
  }));
}

async function addEvent(orderId: string, from: OrderStatus | null, to: OrderStatus, actor: string, note?: string | null) {
  await query(
    'insert into order_events (order_id, from_status, to_status, actor, note) values ($1,$2,$3,$4,$5)',
    [orderId, from, to, actor, note ?? null],
  );
}

/* ------------------------------------------------------------------ proofs */

/** Allowed real content types, verified by magic bytes — never by the HTTP header. */
const PROOF_TYPES = [
  { mime: 'image/jpeg', size: 3, magic: [0xff, 0xd8, 0xff] },
  { mime: 'image/png', size: 8, magic: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
  { mime: 'application/pdf', size: 5, magic: [0x25, 0x50, 0x44, 0x46, 0x2d] },
  // WebP: matching the "RIFF....WEBP" header, no need to fix the version byte at offset 8.
  { mime: 'image/webp', size: 0, magic: [], mimeType: 'riff-webp' },
];

/** Max size of the receipt payload (base64 inflates a binary by ~33%). */
/**
 * Vercel's edge rejects request bodies bigger than 4.5 MB before our function
 * runs (an opaque HTML 413 would reach the user). A 3 MB decoded file becomes
 * ~4.10 MB of base64 inside the JSON payload — always inside that envelope,
 * locally and on the serverless host.
 */
export const MAX_PROOF_BYTES = 3 * 1024 * 1024;

function detectProofMime(base64: string): string | null {
  const buffer = Buffer.from(base64, 'base64');
  for (const type of PROOF_TYPES as { mime: string; size?: number; magic?: number[]; mimeType?: string }[]) {
    if (type.mimeType === 'riff-webp') {
      if (buffer.length > 12 && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') return type.mime;
      continue;
    }
    const need = type.size ?? type.magic!.length;
    if (buffer.length >= need && type.magic!.every((b, i) => buffer[i] === b)) return type.mime;
  }
  return null;
}

/**
 * Attaches a transfer receipt. `verifier` proves the caller is allowed to see
 * the order (user id or reference+phone pair). The stored bytes are validated
 * server-side; the filename and the browser's claimed MIME type are ignored.
 */
export async function uploadProof(
  orderId: string,
  filename: unknown,
  dataUrl: unknown,
  note: unknown,
  verifier: { userId?: string | null; reference?: string | null; phone?: string | null },
) {
  const order = await queryOne('select id, user_id, status, payment_method from orders where id = $1', [orderId]);
  if (!order) throw new OrderError('Encomenda não encontrada.', 404);

  const isOwner = (verifier.userId && order.user_id && verifier.userId === order.user_id)
    || (verifier.reference && phoneDigits(verifier.phone) === phoneDigits(
      (await queryOne('select customer_phone from orders where id = $1', [orderId]))?.customer_phone,
    ));
  if (!isOwner) throw new OrderError('Não tem permissão para anexar o comprovativo desta encomenda.', 403);

  if (!['transfer'].includes(order.payment_method)) {
    throw badRequest('Só encomendas por transferência bancária aceitam comprovativo.');
  }
  if (!['pendente_pagamento', 'comprovativo_submetido', 'pago_rejeitado'].includes(order.status)) {
    throw badRequest('Esta encomenda já não aceita comprovativos.');
  }

  const text = String(dataUrl || '');
  const match = /^data:([^;,]+)?;base64,(.+)$/s.exec(text);
  if (!match) throw badRequest('Ficheiro inválido. Envie uma imagem (JPG, PNG, WebP) ou PDF.');

  const declaredMime = match[1] || '';
  const base64 = match[2];
  const buffer = Buffer.from(base64, 'base64');
  if (buffer.length < 64) throw badRequest('O ficheiro parece vazio ou danificado.');
  if (buffer.length > MAX_PROOF_BYTES) {
    throw badRequest('O comprovativo excede o tamanho máximo de 3 MB.');
  }

  const realMime = detectProofMime(base64);
  if (!realMime) throw badRequest('Formato não suportado. Envie uma imagem (JPG, PNG, WebP) ou PDF.');
  // The declared type in the data URL is informational only; we keep the real one.
  void declaredMime;

  const safeName = clean(filename, 120).replace(/[/\\]/g, '').slice(0, 120) || 'comprovativo';
  await query(
    `update orders set proof_filename = $2, proof_mime = $3, proof_size = $4, proof_data = $5,
       proof_note = $6, proof_status = 'pendente', proof_uploaded_at = now(),
       status = 'comprovativo_submetido', updated_at = now()
     where id = $1`,
    [orderId, safeName, realMime, buffer.length, base64, clean(note, 300) || null],
  );

  const current = await queryOne<{ status: string }>('select status from orders where id = $1', [orderId]);
  await addEvent(orderId, (current?.status as OrderStatus) ?? null, 'comprovativo_submetido', verifier.userId ? `admin:${verifier.userId}` : 'cliente', 'Comprovativo submetido');
  return getOrder(orderId);
}

/** Serves the receipt bytes to the owner (the access check has to happen in the route before this call). */
export async function readProof(orderId: string) {
  const order = await queryOne('select proof_mime, proof_data, customer_phone, user_id from orders where id = $1', [orderId]);
  if (!order) throw new OrderError('Encomenda não encontrada.', 404);
  if (!order.proof_data) throw new OrderError('Esta encomenda ainda não tem comprovativo.', 404);
  return { mime: order.proof_mime, data: order.proof_data, userId: order.user_id, customerPhone: order.customer_phone };
}
export async function approvePayment(orderId: string, adminUserId: string, note?: string) {
  const order = await queryOne('select status, payment_method, proof_status from orders where id = $1', [orderId]);
  if (!order) throw new OrderError('Encomenda não encontrada.', 404);
  if (!PAYMENT_STATES.has(order.status)) {
    throw new OrderError(`O estado "${order.status}" não permite validar o pagamento.`, 409);
  }
  if (order.payment_method === 'transfer' && order.status !== 'comprovativo_submetido') {
    throw new OrderError('Só há pagamento a validar depois de o cliente submeter o comprovativo.', 409);
  }
  await query(
    `update orders set status = 'pago', proof_status = 'aprovado',
       payment_validated_by = $2, payment_validated_at = now(), paid_at = now(), updated_at = now()
     where id = $1`,
    [orderId, adminUserId],
  );
  await addEvent(orderId, (order.status as OrderStatus) ?? null, 'pago', `admin:${adminUserId}`, note ?? 'Pagamento validado');
  return getOrder(orderId);
}

export async function rejectPayment(orderId: string, adminUserId: string, reason: string) {
  const order = await queryOne('select status, payment_method from orders where id = $1', [orderId]);
  if (!order) throw new OrderError('Encomenda não encontrada.', 404);
  if (order.status !== 'comprovativo_submetido') {
    throw new OrderError('Só um comprovativo submetido pode ser rejeitado.', 409);
  }
  if (!clean(reason, 2)) throw badRequest('Explique ao cliente por que motivo o comprovativo foi rejeitado.');
  await query(
    `update orders set status = 'pago_rejeitado', proof_status = 'rejeitado', proof_review_note = $2,
       payment_validated_by = $3, payment_validated_at = now(), updated_at = now()
     where id = $1`,
    [orderId, clean(reason, 300), adminUserId],
  );
  await addEvent(orderId, (order.status as OrderStatus) ?? null, 'pago_rejeitado', `admin:${adminUserId}`, clean(reason, 300));
  return getOrder(orderId);
}

/** Admin logistics move (prepare → deliver/ready → done). */
export async function moveStatus(orderId: string, to: string, adminUserId: string) {
  const order = await queryOne('select status from orders where id = $1', [orderId]);
  if (!order) throw new OrderError('Encomenda não encontrada.', 404);
  const target = to as OrderStatus;
  if (!(Object.keys(TRANSITIONS) as OrderStatus[]).includes(target)) {
    throw badRequest('Encomenda: estado desconhecido.');
  }
  if (!canTransition(order.status, target)) {
    throw new OrderError(`Não é possível passar de "${order.status}" para "${target}".`, 409);
  }

  const stamp =
    target === 'pago' ? ', paid_at = now()' : target === 'cancelado' ? ', canceled_at = now()' : target === 'concluido' ? ', completed_at = now()' : '';
  await query(`update orders set status = $2${stamp}, updated_at = now() where id = $1`, [orderId, target]);
  await addEvent(orderId, order.status, target, `admin:${adminUserId}`);
  return getOrder(orderId);
}

/** Customer cancels their own order while it is still awaiting payment. */
export async function cancelByCustomer(orderId: string, verifier: { userId?: string | null; reference?: string | null; phone?: string | null }) {
  const order = await queryOne('select status, user_id, customer_phone from orders where id = $1', [orderId]);
  if (!order) throw new OrderError('Encomenda não encontrada.', 404);

  const isOwner = (verifier.userId && order.user_id && verifier.userId === order.user_id)
    || (verifier.reference && phoneDigits(verifier.phone) === phoneDigits(order.customer_phone));
  if (!isOwner) throw new OrderError('Não tem permissão para cancelar esta encomenda.', 403);
  if (!CANCELABLE.has(order.status)) {
    throw new OrderError('A encomenda já está em preparação e não pode mais ser cancelada. Fale connosco no WhatsApp.', 409);
  }
  await query(`update orders set status = 'cancelado', canceled_at = now(), updated_at = now() where id = $1`, [orderId]);
  await addEvent(orderId, order.status, 'cancelado', verifier.userId ? `admin:${verifier.userId}` : 'cliente');
  return getOrder(orderId);
}

/* ------------------------------------------------------------------- lists */

/** Orders of the currently signed-in customer. */
export async function listMine(userId: string) {
  const rows = await query(
    `select * from orders where user_id = $1 order by created_at desc limit 100`,
    [userId],
  );
  const out: any[] = [];
  for (const order of rows) {
    const items = await query(
      'select menu_item_id, name, size_name, unit_price, quantity, extras, line_total from order_items where order_id = $1 order by id',
      [order.id],
    );
    out.push(mapOrder(order, items));
  }
  return out;
}

export interface AdminOrderFilter { status?: string; limit?: number }

export async function listForAdmin(filter: AdminOrderFilter) {
  const params: any[] = [];
  let where = '';
  if (filter.status && Object.keys(TRANSITIONS).includes(filter.status)) {
    params.push(filter.status);
    where = `where status = $${params.length}`;
  }
  const limit = Math.max(1, Math.min(200, Math.floor(filter.limit ?? 50)));
  params.push(limit);
  const rows = await query(
    `select o.*, u.email as user_email from orders o
     left join "user" u on u.id = o.user_id
     ${where} order by o.created_at desc limit $${params.length}`,
    params,
  );
  return rows.map(o => ({
    id: o.id,
    reference: o.reference,
    status: o.status,
    fulfillment: o.fulfillment,
    customerName: o.customer_name,
    customerPhone: o.customer_phone,
    customerEmail: o.customer_email,
    userEmail: o.user_email,
    neighborhood: o.neighborhood,
    zoneName: o.zone_name,
    address: o.address,
    notes: o.notes,
    paymentMethod: o.payment_method,
    subtotal: num(o.subtotal),
    deliveryFee: num(o.delivery_fee),
    total: num(o.total),
    proofStatus: o.proof_status,
    proofFilename: o.proof_filename,
    proofMime: o.proof_mime,
    proofSize: o.proof_size,
    proofReviewNote: o.proof_review_note,
    paymentValidatedBy: o.payment_validated_by,
    paymentValidatedAt: o.payment_validated_at ? new Date(o.payment_validated_at).toISOString() : null,
    createdAt: o.created_at ? new Date(o.created_at).toISOString() : null,
    hasProof: !!o.proof_data,
    userId: o.user_id,
  }));
}

/** Guest tracking: reference + the phone the guest used at checkout. */
export async function getForTracking(reference: string, phone: unknown) {
  const order = await queryOne(
    `select id from orders where reference = $1 and right(regexp_replace(customer_phone, '\\D', '', 'g'), 9) = $2`,
    [reference, phoneDigits(phone)],
  );
  if (!order) throw new OrderError('Não encontramos uma encomenda com essa referência e telefone.', 404);
  return getOrder(order.id);
}
