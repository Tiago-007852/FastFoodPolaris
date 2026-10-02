import { Pool } from 'pg';

/**
 * One Postgres pool shared by the whole API.
 * The Neon connection string lives in `DATABASE_URL` (set through the
 * environment, never hardcoded). `rejectUnauthorized: false` is required because
 * Neon's certificate chain is not in Node's default trust store.
 */
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is not set — add the Neon connection string to your environment.');
}

export const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
  max: 5,
});

export type Row = Record<string, any>;

/** Runs a query and returns the rows. */
export async function query<T = Row>(text: string, params: any[] = []): Promise<T[]> {
  const result = await pool.query<T>(text, params);
  return result.rows;
}

/** Runs a query and returns the first row (or null). */
export async function queryOne<T = Row>(text: string, params: any[] = []): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows[0] ?? null;
}

/** Random id for documents created through the API. */
export const newId = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

/** Postgres returns timestamps as ISO strings over HTTP and Date over TCP. */
export const iso = (value: unknown): string | null => {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  return String(value);
};

/** Safe number parsing for numeric columns. */
export const num = (value: unknown, fallback = 0): number => {
  const parsed = typeof value === 'number' ? value : parseFloat(String(value ?? ''));
  return Number.isFinite(parsed) ? parsed : fallback;
};

/** Safe boolean parsing. */
export const bool = (value: unknown, fallback = false): boolean => {
  if (typeof value === 'boolean') return value;
  if (value === null || value === undefined) return fallback;
  return value === 't' || value === 'true' || value === 1 || value === '1';
};