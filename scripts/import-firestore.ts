import { readFileSync } from 'node:fs';
import { cert, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { pool } from '../server/db';
import {
  RESOURCES,
  SETTINGS_DEF,
  ABOUT_DEF,
  MENU_DEF,
  createRow,
  updateMenuItem,
  upsertRow,
} from '../server/resources';

/**
 * One-off import: copies the existing Firestore content into Neon.
 *
 * Requires a Firebase service account JSON (Project settings → Service accounts →
 * Generate new private key). Point FIREBASE_SERVICE_ACCOUNT at the file (or paste
 * the JSON itself) and run:
 *
 *   bun run db:import
 *
 * Existing rows with the same id are updated, so it is safe to run more than once.
 */

const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
if (!raw) {
  console.error(
    'Defina FIREBASE_SERVICE_ACCOUNT com o caminho (ou o conteúdo) do JSON da service account do Firebase.',
  );
  process.exit(1);
}

const credential = raw.trim().startsWith('{')
  ? JSON.parse(raw)
  : JSON.parse(readFileSync(raw, 'utf8'));

initializeApp({ credential: cert(credential) });
const db = getFirestore();

/** Firestore document -> the camelCase payload shape the API/resources use. */
const fromFirestore = (doc: any) => {
  const data = doc.data() || {};
  const clean: Record<string, any> = { id: doc.id };
  for (const [key, value] of Object.entries(data) as [string, any][]) {
    if (value && typeof value.toDate === 'function') clean[key] = value.toDate().toISOString();
    else clean[key] = value;
  }
  return clean;
};

const readCollection = async (name: string) => {
  const snapshot = await db.collection(name).get();
  return snapshot.docs.map(fromFirestore);
};

/** Drops keys the API does not know about so the resource layer can filter them. */
const onlyFields = (def: { fields: Record<string, any> }, data: Record<string, any>) => {
  const out: Record<string, any> = {};
  for (const key of Object.keys(def.fields)) if (key in data) out[key] = data[key];
  return out;
};

const importCollection = async (name: string) => {
  const def = RESOURCES[name];
  if (!def) return 0;
  const docs = await readCollection(name);
  for (const doc of docs) {
    await upsertSafe(def, doc);
  }
  console.log(`${name}: ${docs.length} documentos`);
  return docs.length;
};

const upsertSafe = async (def: any, doc: Record<string, any>) => {
  const payload = onlyFields(def, doc);
  const existing = await upsertRow(def, doc.id, payload);
  if (!existing) await createRow(def, doc, doc.id);
};

let total = 0;

total += await importCollection('categories');
total += await importCollection('reviews');
total += await importCollection('gallery');
total += await importCollection('team');
total += await importCollection('banners');
total += await importCollection('deliveryZones');
total += await importCollection('dishRatings');

// Menu items carry nested sizes/extras arrays.
const menuItems = await readCollection('menuItems');
for (const doc of menuItems) {
  const payload = {
    ...onlyFields(MENU_DEF, doc),
    id: doc.id,
    sizes: doc.sizes || [],
    extras: doc.extras || [],
  };
  try {
    await createRow(MENU_DEF, payload, doc.id);
  } catch {
    // Already imported on a previous run — update it instead.
    await updateMenuItem(doc.id, payload);
  }
}
console.log(`menuItems: ${menuItems.length} documentos`);
total += menuItems.length;

// Single-document settings.
for (const [name, def, id] of [
  ['siteSettings/main', SETTINGS_DEF, 'main'],
  ['siteSettings/about', ABOUT_DEF, 'about'],
] as const) {
  const doc = await db.collection('siteSettings').doc(id).get();
  if (doc.exists) {
    await upsertRow(def, id, onlyFields(def, fromFirestore(doc)));
    console.log(`${name}: importado`);
    total++;
  }
}

console.log(`\nImportação concluída ✓ ${total} registos`);
await pool.end();