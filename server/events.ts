import type { Response } from 'express';

/**
 * Server-Sent Events hub — the replacement for Firestore's `onSnapshot`.
 * Every write endpoint broadcasts the table it touched; the SPA refetches that
 * resource, so admin edits appear on customer screens without a reload.
 */
const clients = new Set<Response>();

export function addClient(res: Response) {
  clients.add(res);
  res.on('close', () => clients.delete(res));
}

/** Tells every connected SPA which resource changed. */
export function broadcast(table: string) {
  const payload = `event: change\ndata: ${JSON.stringify({ table })}\n\n`;
  for (const res of clients) {
    try {
      res.write(payload);
    } catch {
      clients.delete(res);
    }
  }
}

/** Keep-alive comment so proxies do not drop an idle stream. */
export function startHeartbeat(res: Response) {
  const timer = setInterval(() => {
    try {
      res.write(': ping\n\n');
    } catch {
      clearInterval(timer);
    }
  }, 25000);
  res.on('close', () => clearInterval(timer));
}