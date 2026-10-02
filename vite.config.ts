import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv, type Plugin, type ViteDevServer} from 'vite';

/** Connect-style middleware (what Vite and Express both hand us). */
type Middleware = (req: any, res: any, next?: (err?: any) => void) => void;

/**
 * Mounts the Postgres API (`server/app.ts`) into the Vite dev server so the SPA
 * can call `/api/*` on the same origin. In production the same Express app is
 * served by `server/index.ts` next to the built `dist/`.
 */
function apiPlugin(): Plugin {
  let api: Middleware | null = null;
  return {
    name: 'polaris-api',
    configureServer(server: ViteDevServer) {
      server.middlewares.use((req, res, next) => {
        if (!req.url || !req.url.startsWith('/api/')) return next();
        (async () => {
          try {
            if (!api) {
              const mod = await server.ssrLoadModule('/server/app.ts');
              api = mod.createApiApp() as unknown as Middleware;
            }
            api(req, res, next);
          } catch (error) {
            next(error);
          }
        })();
      });
    },
  };
}

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react(), tailwindcss(), apiPlugin()],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
