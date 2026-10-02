import express from 'express';
import path from 'node:path';
import { createApiApp } from './app';

/**
 * Production server: serves the built SPA from `dist/` and mounts the API.
 * Run with `bun run api` (or `npm start`) after `vite build`.
 */
const app = express();

app.use(createApiApp());

const dist = path.resolve(process.cwd(), 'dist');
app.use(express.static(dist));
app.get('*', (_req, res) => res.sendFile(path.join(dist, 'index.html')));

const port = Number(process.env.PORT || 3000);
app.listen(port, '0.0.0.0', () => {
  console.log(`Polaris server listening on http://0.0.0.0:${port}`);
});