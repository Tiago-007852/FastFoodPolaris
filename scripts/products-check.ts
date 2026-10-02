import { pool } from '../server/db';

/**
 * Product persistence check.
 *
 * Confirms that every product in the database is served by the API with its
 * fields intact, then signs in as a temporary admin to create, edit, toggle and
 * delete a product — restoring the original state afterwards.
 *
 *   bun run db:check:products https://seu-preview
 */
const base = process.argv[2] || 'http://localhost:3000';

let failures = 0;
const step = (label: string, ok: boolean, detail = '') => {
  if (!ok) failures++;
  console.log(`${ok ? '✓' : '✗'} ${label}${detail ? ` — ${detail}` : ''}`);
};

const items = (await fetch(`${base}/api/menuItems`).then(r => r.json())) as any[];
step('API devolve os produtos', Array.isArray(items), `${items.length} produtos`);

const dbCount = await pool.query<{ total: number }>('select count(*)::int as total from menu_items');
step('Postgres tem os mesmos produtos', dbCount.rows[0].total === items.length, `db=${dbCount.rows[0].total}`);

const broken = items.filter(i => !i.id || !i.name || i.price === null || i.price === undefined);
step('todos têm id, nome e preço', broken.length === 0, broken.map(b => b.name).join(', '));

const withoutCategory = items.filter(i => !i.categoryId);
step('todos têm categoria', withoutCategory.length === 0, withoutCategory.map(b => b.name).join(', '));

const burger = items.find(i => i.name === 'Burger Simples');
step('extras do prato preservados', (burger?.extras || []).length > 0, `${burger?.extras?.length ?? 0} extras`);

const sizes = await pool.query<{ total: number }>('select count(*)::int as total from menu_item_sizes');
step('tabela de tamanhos existe', sizes.rows.length === 1, `${sizes.rows[0].total} tamanhos`);

// --- round trip de escrita como admin ---------------------------------------
const email = `produto-check+${Date.now()}@polaris.test`;
const password = 'polaris-produto-check';

const signUp = await fetch(`${base}/api/auth/sign-up/email`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ email, password, name: 'Produto Check' }),
});
step('registo do admin temporário', signUp.ok, signUp.ok ? '' : await signUp.text());
await pool.query('update "user" set role = $2 where email = $1', [email, 'admin']);

const signIn = await fetch(`${base}/api/auth/sign-in/email`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ email, password }),
});
const cookie = signIn.headers.get('set-cookie')?.split(';')[0] || '';
step('login do admin', signIn.ok);

const categoryId = (await fetch(`${base}/api/categories`).then(r => r.json()))[0]?.id;

const created = await fetch(`${base}/api/menuItems`, {
  method: 'POST',
  headers: { 'content-type': 'application/json', cookie },
  body: JSON.stringify({
    name: 'Prato de Verificação',
    description: 'Criado pelo teste automático',
    price: 1234.5,
    image: '/images/hero/hero-burger.jpg',
    categoryId,
    isPopular: true,
    isAvailable: true,
    prepTimeMinutes: 12,
    ingredients: 'Pão, Carne, Queijo',
    allergens: 'Glúten',
    nutritionInfo: '550 kcal',
    sizes: [{ name: 'Grande', price: 1500 }],
    extras: [{ name: 'Queijo Extra', price: 500 }],
  }),
});
const createdBody = await created.json();
step('criar produto', created.ok && !!createdBody.id, createdBody?.error || createdBody?.id);

const afterCreate = (await fetch(`${base}/api/menuItems`).then(r => r.json())) as any[];
const saved = afterCreate.find(i => i.id === createdBody.id);
step('produto lido de volta', !!saved, saved?.name);
step('preço e tamanhos guardados', saved?.price === 1234.5 && saved?.sizes?.[0]?.name === 'Grande', JSON.stringify(saved?.sizes));
step('extras guardados', saved?.extras?.[0]?.name === 'Queijo Extra', JSON.stringify(saved?.extras));
step('detalhes guardados', saved?.prepTimeMinutes === 12 && saved?.allergens === 'Glúten', `${saved?.prepTimeMinutes}/${saved?.allergens}`);
step('restante do menu intacto', afterCreate.length === items.length + 1, `${afterCreate.length} produtos`);

const updated = await fetch(`${base}/api/menuItems/${createdBody.id}`, {
  method: 'PUT',
  headers: { 'content-type': 'application/json', cookie },
  body: JSON.stringify({ price: 2000, isAvailable: false, extras: [{ name: 'Bacon', price: 700 }] }),
});
step('editar produto', updated.ok);

const afterUpdate = (await fetch(`${base}/api/menuItems`).then(r => r.json())) as any[];
const edited = afterUpdate.find(i => i.id === createdBody.id);
step('preço atualizado', edited?.price === 2000, String(edited?.price));
step('esgotado marcado', edited?.isAvailable === false);
step('extras substituídos', edited?.extras?.length === 1 && edited?.extras[0].name === 'Bacon', JSON.stringify(edited?.extras));

await fetch(`${base}/api/menuItems/${createdBody.id}`, { method: 'DELETE', headers: { cookie } });
const afterDelete = (await fetch(`${base}/api/menuItems`).then(r => r.json())) as any[];
step('eliminar produto', afterDelete.length === items.length, `${afterDelete.length} produtos`);

await pool.query('delete from "user" where email = $1', [email]);
step('limpeza', true);

console.log(failures === 0 ? `\nProdutos OK ✓ (${items.length} guardados, round trip completo)` : `\n${failures} verificação(ões) falharam ✗`);
await pool.end();
process.exit(failures === 0 ? 0 : 1);