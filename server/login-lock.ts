import { query, queryOne } from './db';

/**
 * Server-side login lockout (P1): 3 consecutive failed sign-ins lock the
 * account for 10 minutes. The counter lives in Postgres (`login_locks`), so the
 * limit is consistent between tabs, devices and serverless instances — it does
 * not depend on anything the frontend stores.
 *
 * Failed attempts are keyed by the email as typed (lower-cased), and a success
 * resets the counter. During the lock the sign-in route answers 429 without
 * even touching better-auth, so no further password checks happen. The native
 * better-auth limiter (3 sign-ins / 10 s per IP) complements this; both layers
 * stay active at the same time.
 */

const MAX_FAILURES = 3;
/** Lock duration in seconds after the 3rd consecutive failure. */
const LOCK_SECONDS = 10 * 60;

export interface SignInLock {
  locked: boolean;
  /** Remaining failures before the lock (shown as feedback to the customer). */
  remaining: number;
  lockedUntil?: string | null;
}

/** Reads (and lazily counts) the state before a sign-in attempt. */
export async function checkSignInLock(emailRaw: string): Promise<SignInLock> {
  const email = String(emailRaw || '').trim().toLowerCase();
  if (!email) return { locked: false, remaining: MAX_FAILURES };

  const row = await queryOne<{ failures: number; locked_until: string | Date | null }>(
    'select failures, locked_until from login_locks where email = $1',
    [email],
  );
  if (!row) return { locked: false, remaining: MAX_FAILURES };

  const lockedUntil = row.locked_until ? new Date(row.locked_until).getTime() : 0;
  const locked = lockedUntil > Date.now();
  return {
    locked,
    remaining: Math.max(0, MAX_FAILURES - (locked ? MAX_FAILURES : row.failures)),
    lockedUntil: lockedUntil ? new Date(lockedUntil).toISOString() : null,
  };
};

/** Records a failed attempt and applies the 10-minute lock on the third one. */
export async function recordSignInFailure(emailRaw: string): Promise<void> {
  const email = String(emailRaw || '').trim().toLowerCase();
  if (!email) return;

  const row = await queryOne<{ failures: number }>('select failures from login_locks where email = $1', [email]);
  const failures = ((row?.failures ?? 0) + 1) % 1_000_000;

  if (failures >= MAX_FAILURES) {
    await query(
      `insert into login_locks (email, failures, locked_until, updated_at)
       values ($1, $2, now() + interval '${LOCK_SECONDS} seconds', now())
       on conflict (email) do update
         set failures = $2, locked_until = now() + interval '${LOCK_SECONDS} seconds', updated_at = now()`,
      [email, failures],
    );
    // Security event without any password/secret. Only the client email count.
    console.warn(`[auth] 3 failed sign-ins — account locked for 10 min: ${email.slice(0, 3)}***@${email.split('@')[1]}`);
  } else {
    await query(
      `insert into login_locks (email, failures, updated_at) values ($1, $2, now())
       on conflict (email) do update set failures = $2, locked_until = null, updated_at = now()`,
      [email, failures],
    );
  }
};

/** Clears the counter after a successful sign-in. */
export async function recordSignInSuccess(emailRaw: string): Promise<void> {
  const email = String(emailRaw || '').trim().toLowerCase();
  if (!email) return;
  await query('delete from login_locks where email = $1', [email]);
};
