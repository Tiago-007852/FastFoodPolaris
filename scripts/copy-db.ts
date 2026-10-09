import { Pool } from 'pg';

/**
 * Copies every row of the content (and auth) tables from one Postgres database
 * into another.
 *
 * Written for the Neon quota incident: the previous database answered `53000`
 * (insufficient_resources) to every query, so the site had to be re-pointed at a
 * fresh database seeded with the defaults. Once the old project is readable
 * again, this script brings the real content back — no re-typing products in the
 * admin panel.
 *
 *   bun run db:copy -- --from "postgresql://...antiga...?sslmode=require"
 *
 * The target is always `DATABASE_URL` (the database the site is using now).
 * Everything runs in a single transaction and TRUNCATE is transactional in
 * Postgres, so a failure leaves the target exactly as it was.
 */

/** Insert order matters: parents before children (the foreign keys). */
const TABLES = [
  'user',
  'session',
  'account',
  'verification',
  'categories',
  'menu_items',
  'menu_item_sizes',
  'menu_item_extras',
  'site_settings',
  'about_content',
  'reviews',
  'gallery_images',
  'team_members',
  'banners',
  'delivery_zones',
  'dish_ratings',
  'teasers',
  'notification_subscribers',
];

const argIndex = process.argv.indexOf('--from');
const sourceUrl = argIndex > -1 ? process.argv[argIndex + 1] : process.env.SOURCE_DATABASE_URL;
const targetUrl = process.env.DATABASE_URL;

if (!sourceUrl) {
  console.error('Falta a origem. Usa:  bun run db:copy -- --from "postgresql://..."');
  process.exit(1);
}
if (!targetUrl) {
  console.error('DATABASE_URL (destino) não está definida neste ambiente.');
  process.exit(1);
}

const poolFor = (connectionString: string) =>
  new Pool({ connectionString, ssl: { rejectUnauthorized: false }, max: 2 });

const source = poolFor(sourceUrl);
const target = poolFor(targetUrl);

console.log('A ler da base de origem…');

const snapshot = new Map<string, { columns: string[]; rows: any[] }>();

for (const table of TABLES) {
  try {
    const result = await source.query(`select * from "${table}"`);
    snapshot.set(table, { columns: result.fields.map(field => field.name), rows: result.rows });
    console.log(`  ${table.padEnd(24)} ${result.rows.length}`);
  } catch (error: any) {
    // 42P01 = undefined_table: an older schema simply does not have it yet.
    if (error?.code === '42P01') {
      console.log(`  ${table.padEnd(24)} (tabela inexistente na origem — ignorada)`);
      continue;
    }
    throw error;
  }
}

console.log('\nA escrever no destino (transação única)…');

const client = await target.connect();
try {
  await client.query('begin');
  await client.query(
    `truncate ${TABLES.map(table => `"${table}"`).join(', ')} restart identity cascade`,
  );

  let copied = 0;
  for (const table of TABLES) {
    const data = snapshot.get(table);
    if (!data || data.rows.length === 0) continue;
    const columns = data.columns.map(column => `"${column}"`).join(', ');
    for (const row of data.rows) {
      const values = data.columns.map(column => row[column]);
      const placeholders = data.columns.map((_, index) => `$${index + 1}`).join(', ');
      await client.query(`insert into "${table}" (${columns}) values (${placeholders})`, values);
      copied++;
    }
    console.log(`  ${table.padEnd(24)} ${data.rows.length}`);
  }

  await client.query('commit');
  console.log(`\nCopiadas ${copied} linhas ✓`);
} catch (error) {
  await client.query('rollback');
  console.error('\nFalhou — a transação foi revertida, o destino ficou intacto.');
  throw error;
} finally {
  client.release();
}

const count = async (table: string) => {
  const rows = await target.query(`select count(*)::int as total from "${table}"`);
  return rows.rows[0].total as number;
};

console.log('\nVerificação:');
let mismatches = 0;
for (const table of TABLES) {
  const expected = snapshot.get(table)?.rows.length ?? 0;
  const actual = await count(table);
  const ok = expected === actual;
  if (!ok) mismatches++;
  console.log(`  ${ok ? '✓' : '✗'} ${table.padEnd(24)} origem=${expected} destino=${actual}`);
}

await source.end();
await target.end();

console.log(
  mismatches === 0
    ? '\nCópia completa e verificada ✓'
    : `\n${mismatches} tabela(s) não batem certo ✗`,
);
process.exit(mismatches === 0 ? 0 : 1);
