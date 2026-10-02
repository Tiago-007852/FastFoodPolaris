import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { pool } from '../server/db';

/**
 * Applies `server/schema.sql` to the Neon database. Safe to run repeatedly —
 * every statement is `create table if not exists`.
 */
const sqlPath = path.resolve(process.cwd(), 'server/schema.sql');
const schema = await readFile(sqlPath, 'utf8');

await pool.query(schema);
console.log('Schema applied to Neon ✓');
await pool.end();