import { createHmac, timingSafeEqual } from 'node:crypto';
import { OrderError } from './orders';

/**
 * Payment integration boundary.
 *
 * The only payment methods the site offers today:
 *   1. Transferência bancária (transfer) — receipt validated by an admin.
 *   2. Pagamento Express — INACTIVE until Polaris confirms the official
 *      provider and the credentials below are set in the environment. There is
 *      no invented API: the gateway stays `configured: false` and the checkout
 *      hides method express while that remains true.
 *
 * Requirements, once Polaris confirms a provider (documented for the report):
 *   - EXPRESS_GATEWAY_URL   — base URL of the official API.
 *   - EXPRESS_GATEWAY_KEY   — API key/merchand id.
 *   - EXPRESS_WEBHOOK_SECRET— secret used to verify the webhook signature.
 * (+ any provider-specific fields the official docs require.)
 */

export const gatewayEnv = () => ({
  EXPRESS_GATEWAY_URL: process.env.EXPRESS_GATEWAY_URL || null,
  EXPRESS_GATEWAY_KEY: !!process.env.EXPRESS_GATEWAY_KEY,
  EXPRESS_WEBHOOK_SECRET: !!process.env.EXPRESS_WEBHOOK_SECRET,
});

/** True only when every required credential is present. */
export const expressGatewayConfigured = (): boolean =>
  !!process.env.EXPRESS_GATEWAY_URL && !!process.env.EXPRESS_GATEWAY_KEY;

/**
 * Verify a payment-notification signature. Repeated notifications are safe:
 * approving an already-paid/canceled order here is rejected by the state
 * machine in server/orders.ts, and nothing duplicates orders.
 */
export function verifyGatewaySignature(rawBody: string, signatureHeader: string | undefined): boolean {
  const secret = process.env.EXPRESS_WEBHOOK_SECRET;
  if (!secret) {
    throw new OrderError('A integração de pagamento eletrónico não está configurada.', 503);
  }
  if (!signatureHeader) return false;

  const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
  const provided = Buffer.from(String(signatureHeader).replace(/^sha256=/i, ''), 'utf8');
  const computed = Buffer.from(expected, 'utf8');
  return provided.length === computed.length && timingSafeEqual(provided, computed);
}

/** Payment gateway handlers that only exist for a real configured provider. */
export type OrderRow = { id: string; reference: string; total: number; status: string; payment_method: string };

export async function startExpressPayment(_order: OrderRow): Promise<never> {
  // No real provider is configured, so starting an electronic payment must
  // fail loudly instead of pretending success.
  throw new OrderError('O pagamento Express ainda não está disponível. Pague por transferência bancária.', 503);
}
