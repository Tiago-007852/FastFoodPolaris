import { pool } from '../server/db';
import { seedContent } from '../server/seed';

/** Loads the default site content into Neon. Run with `bun run db:seed`. */
const summary = await seedContent();
console.log('Default content loaded ✓', summary);
await pool.end();