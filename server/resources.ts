import { query, newId, num, bool, iso } from './db';

/**
 * Generic CRUD for every collection that used to live in Firestore.
 * Each resource declares its columns so the generic insert/update/delete code can
 * translate the SPA's camelCase payloads into SQL, and map rows back to the exact
 * shapes `src/types.ts` expects (no changes needed in the React components).
 */

type FieldKind = 'text' | 'number' | 'bool' | 'stringArray' | 'date';

interface Field {
  column: string;
  kind: FieldKind;
}

export interface ResourceDef {
  /** Route name used by the SPA (`/api/menuItems`). */
  name: string;
  table: string;
  fields: Record<string, Field>;
  orderBy: string;
  /** Single-row resource (settings/about): the list route returns an object. */
  single?: boolean;
  /** Anonymous visitors may create rows (reviews, dish ratings, subscribers). */
  publicCreate?: boolean;
}

const f = (column: string, kind: FieldKind = 'text'): Field => ({ column, kind });

export const RESOURCES: Record<string, ResourceDef> = {
  categories: {
    name: 'categories',
    table: 'categories',
    fields: { name: f('name'), order: f('order_index', 'number') },
    orderBy: 'order_index asc, name asc',
  },
  gallery: {
    name: 'gallery',
    table: 'gallery_images',
    fields: {
      url: f('url'),
      title: f('title'),
      category: f('category'),
      order: f('order_index', 'number'),
    },
    orderBy: 'order_index asc, title asc',
  },
  team: {
    name: 'team',
    table: 'team_members',
    fields: {
      name: f('name'),
      role: f('role'),
      image: f('image'),
      order: f('order_index', 'number'),
    },
    orderBy: 'order_index asc, name asc',
  },
  banners: {
    name: 'banners',
    table: 'banners',
    fields: {
      title: f('title'),
      subtitle: f('subtitle'),
      mediaUrl: f('media_url'),
      mediaType: f('media_type'),
      ctaLabel: f('cta_label'),
      ctaLink: f('cta_link'),
      badge: f('badge'),
      placement: f('placement'),
      order: f('order_index', 'number'),
      active: f('active', 'bool'),
      activeFrom: f('active_from', 'date'),
      activeTo: f('active_to', 'date'),
    },
    orderBy: 'order_index asc, title asc',
  },
  teasers: {
    name: 'teasers',
    table: 'teasers',
    fields: {
      name: f('name'),
      description: f('description'),
      image: f('image'),
      order: f('order_index', 'number'),
      enabled: f('enabled', 'bool'),
    },
    orderBy: 'order_index asc, name asc',
  },
  zones: {
    name: 'zones',
    table: 'delivery_zones',
    fields: {
      name: f('name'),
      neighborhoods: f('neighborhoods', 'stringArray'),
      fee: f('fee', 'number'),
      timeMin: f('time_min', 'number'),
      timeMax: f('time_max', 'number'),
      order: f('order_index', 'number'),
      enabled: f('enabled', 'bool'),
    },
    orderBy: 'order_index asc, name asc',
  },
  reviews: {
    name: 'reviews',
    table: 'reviews',
    fields: {
      userName: f('user_name'),
      comment: f('comment'),
      rating: f('rating', 'number'),
      isApproved: f('is_approved', 'bool'),
      userId: f('user_id'),
    },
    orderBy: 'date desc',
    publicCreate: true,
  },
  dishRatings: {
    name: 'dishRatings',
    table: 'dish_ratings',
    fields: {
      dishId: f('dish_id'),
      userName: f('user_name'),
      rating: f('rating', 'number'),
      comment: f('comment'),
      isHidden: f('is_hidden', 'bool'),
    },
    orderBy: 'date desc',
    publicCreate: true,
  },
};

const SETTINGS_FIELDS: Record<string, Field> = {
  restaurantName: f('restaurant_name'),
  slogan: f('slogan'),
  address: f('address'),
  phone: f('phone'),
  whatsapp: f('whatsapp'),
  instagram: f('instagram'),
  email: f('email'),
  openingHours: f('opening_hours'),
  deliveryFee: f('delivery_fee', 'number'),
  heroImage: f('hero_image'),
  googleMapsUrl: f('google_maps_url'),
  countdownEnabled: f('countdown_enabled', 'bool'),
  countdownTargetDate: f('countdown_target_date'),
  countdownBgVideo: f('countdown_bg_video'),
  launchMessage: f('launch_message'),
};

const ABOUT_FIELDS: Record<string, Field> = {
  heroImage: f('hero_image'),
  storyTitle: f('story_title'),
  storySubtitle: f('story_subtitle'),
  storyText1: f('story_text1'),
  storyText2: f('story_text2'),
  storyImage: f('story_image'),
  quote: f('quote'),
  quoteAuthor: f('quote_author'),
};

export const SETTINGS_DEF: ResourceDef = {
  name: 'settings',
  table: 'site_settings',
  fields: SETTINGS_FIELDS,
  orderBy: 'id asc',
  single: true,
};

export const ABOUT_DEF: ResourceDef = {
  name: 'about',
  table: 'about_content',
  fields: ABOUT_FIELDS,
  orderBy: 'id asc',
  single: true,
};

/** menu items are handled separately because of the sizes/extras child tables. */
export const MENU_DEF: ResourceDef = {
  name: 'menuItems',
  table: 'menu_items',
  fields: {
    name: f('name'),
    description: f('description'),
    price: f('price', 'number'),
    image: f('image'),
    categoryId: f('category_id'),
    isPopular: f('is_popular', 'bool'),
    isPromo: f('is_promo', 'bool'),
    isNew: f('is_new', 'bool'),
    isAvailable: f('is_available', 'bool'),
    prepTimeMinutes: f('prep_time_minutes', 'number'),
    ingredients: f('ingredients'),
    allergens: f('allergens'),
    nutritionInfo: f('nutrition_info'),
  },
  orderBy: 'name asc',
};

export const ALL_DEFS = { ...RESOURCES, settings: SETTINGS_DEF, about: ABOUT_DEF, menuItems: MENU_DEF };

/* ------------------------------------------------------------------ mapping */

const toDbValue = (field: Field, value: any): any => {
  if (value === undefined) return null;
  switch (field.kind) {
    case 'number':
      return Number.isFinite(Number(value)) ? Number(value) : null;
    case 'bool':
      return typeof value === 'boolean' ? value : value === 'true' || value === 'on';
    case 'stringArray':
      return Array.isArray(value) ? value.map(String).filter(Boolean) : String(value).split(',').map(s => s.trim()).filter(Boolean);
    case 'date': {
      if (!value) return null;
      const parsed = new Date(value as any);
      return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString().slice(0, 10);
    }
    default:
      return value === null || value === undefined ? null : String(value);
  }
};

const fromDbValue = (field: Field, value: any): any => {
  if (value === null || value === undefined) return null;
  switch (field.kind) {
    case 'number':
      return num(value);
    case 'bool':
      return bool(value);
    case 'stringArray':
      return Array.isArray(value) ? value : String(value).split(',').filter(Boolean);
    default:
      return iso(value) ?? String(value);
  }
};

/** Row -> the camelCase object shape the SPA expects. */
export const mapRow = (def: ResourceDef, row: any): any => {
  const out: any = { id: row.id };
  for (const [key, field] of Object.entries(def.fields)) {
    out[key] = fromDbValue(field, row[field.column]);
  }
  return out;
};

/** Only keeps known fields, so a crafted payload cannot touch other columns. */
const pickFields = (def: ResourceDef, data: Record<string, any>) => {
  const entries = Object.entries(data).filter(([key]) => key in def.fields);
  return entries.map(([key, value]) => [def.fields[key], value] as const);
};

/* -------------------------------------------------------------------- reads */

export async function listRows(def: ResourceDef) {
  const rows = await query(`select * from ${def.table} order by ${def.orderBy}`);
  return rows.map(row => mapRow(def, row));
}

/** Returns an object for single-row resources, an array otherwise. */
export async function read(def: ResourceDef) {
  const rows = await listRows(def);
  if (def.single) return rows[0] ?? null;
  return rows;
}

/* ------------------------------------------------------------------- writes */

export async function createRow(def: ResourceDef, data: Record<string, any>, id?: string) {
  const fields = pickFields(def, data);
  const columns = fields.map(([field]) => field.column);
  const values = fields.map(([field, value]) => toDbValue(field, value));
  const rowId = id || (data.id ? String(data.id) : newId());

  columns.unshift('id');
  values.unshift(rowId);

  const placeholders = columns.map((_, index) => `$${index + 1}`).join(', ');
  const rows = await query(
    `insert into ${def.table} (${columns.join(', ')}) values (${placeholders}) returning *`,
    values,
  );
  return mapRow(def, rows[0]);
}

/** Partial update: only the fields present in the payload are written. */
export async function updateRow(def: ResourceDef, id: string, data: Record<string, any>) {
  const fields = pickFields(def, data);
  if (fields.length === 0) {
    const current = await query(`select * from ${def.table} where id = $1`, [id]);
    return current[0] ? mapRow(def, current[0]) : null;
  }

  const assignments = fields.map(([field], index) => `${field.column} = $${index + 2}`);
  const values = fields.map(([field, value]) => toDbValue(field, value));

  const rows = await query(
    `update ${def.table} set ${assignments.join(', ')} where id = $1 returning *`,
    [id, ...values],
  );
  return rows[0] ? mapRow(def, rows[0]) : null;
}

/** Insert or update in one call (used by the single-row settings/about tables). */
export async function upsertRow(def: ResourceDef, id: string, data: Record<string, any>) {
  const existing = await query(`select id from ${def.table} where id = $1`, [id]);
  return existing.length > 0 ? updateRow(def, id, data) : createRow(def, data, id);
}

export async function deleteRow(def: ResourceDef, id: string) {
  await query(`delete from ${def.table} where id = $1`, [id]);
}

/* -------------------------------------------------------------- menu extras */

const mapMenuItem = async (row: any, sizes: any[], extras: any[]) => ({
  ...mapRow(MENU_DEF, row),
  sizes: sizes.map(s => ({ name: s.name, price: num(s.price) })),
  extras: extras.map(e => ({ name: e.name, price: num(e.price) })),
});

export async function listMenuItems() {
  const items = await query(`select * from menu_items order by ${MENU_DEF.orderBy}`);
  const [sizes, extras] = await Promise.all([
    query('select menu_item_id, name, price from menu_item_sizes'),
    query('select menu_item_id, name, price from menu_item_extras'),
  ]);

  const sizesByItem = new Map<string, any[]>();
  for (const s of sizes) sizesByItem.set(s.menu_item_id, [...(sizesByItem.get(s.menu_item_id) || []), s]);
  const extrasByItem = new Map<string, any[]>();
  for (const e of extras) extrasByItem.set(e.menu_item_id, [...(extrasByItem.get(e.menu_item_id) || []), e]);

  return Promise.all(
    items.map(row =>
      mapMenuItem(row, sizesByItem.get(row.id) || [], extrasByItem.get(row.id) || []),
    ),
  );
}

async function replaceChildren(id: string, table: string, rows: any[]) {
  await query(`delete from ${table} where menu_item_id = $1`, [id]);
  for (const row of rows) {
    if (!row || !row.name || !String(row.name).trim()) continue;
    await query(`insert into ${table} (menu_item_id, name, price) values ($1, $2, $3)`, [
      id,
      String(row.name).trim(),
      num(row.price),
    ]);
  }
}

export async function createMenuItem(data: Record<string, any>) {
  const item = await createRow(MENU_DEF, data);
  await replaceChildren(item.id, 'menu_item_sizes', data.sizes || []);
  await replaceChildren(item.id, 'menu_item_extras', data.extras || []);
  return item;
}

export async function updateMenuItem(id: string, data: Record<string, any>) {
  const item = await updateRow(MENU_DEF, id, data);
  if (!item) return null;
  if (Array.isArray(data.sizes)) await replaceChildren(id, 'menu_item_sizes', data.sizes);
  if (Array.isArray(data.extras)) await replaceChildren(id, 'menu_item_extras', data.extras);
  return item;
}