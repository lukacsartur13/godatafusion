import { resolve } from 'node:path';
import { defineConfig, loadEnv } from 'vite';
import { apiPlugin } from './server/vite-api.mjs';
import { glyphsPlugin } from './tools/glyphs-plugin.mjs';
import { basePlugin } from './tools/base-plugin.mjs';

/* Four documents, one build. The service routes are directories so the
   clean URLs (`/360-camera/`) are what the static host serves natively —
   no rewrite rules, no client-side router, no SPA fallback that would
   make SEO depend on JavaScript. */
const pages = {
  home: resolve(import.meta.dirname, 'index.html'),
  capture: resolve(import.meta.dirname, '360-camera/index.html'),
  measure: resolve(import.meta.dirname, 'teruletfelmeres/index.html'),
  quantify: resolve(import.meta.dirname, 'mennyisegszamitas/index.html'),
  notfound: resolve(import.meta.dirname, '404.html'),
  /* PHASE 12 — the two legal documents. Static, one small entry. */
  impressum: resolve(import.meta.dirname, 'impresszum/index.html'),
  privacy: resolve(import.meta.dirname, 'adatkezeles/index.html'),
};

export default defineConfig(({ mode }) => {
  /* The dev/preview API middleware reads process.env, exactly as the
     deployed function does. Load .env into it so local development uses
     the same environment-variable contract as production. */
  Object.assign(process.env, loadEnv(mode, import.meta.dirname, ''));

  /* Where this build will be served from. Netlify serves the root and
     leaves this unset; the GitHub Pages workflow sets it to `/<repo>/`.
     One variable, so the same commit deploys to both. */
  const base = process.env.BASE_PATH || '/';

  return {
    appType: 'mpa',
    base,
    plugins: [glyphsPlugin(), apiPlugin(), basePlugin(base)],
    // Honour an injected PORT so the harness can place the dev server on a
    // free port; falls back to Vite's own default locally.
    server: { host: true, port: process.env.PORT ? Number(process.env.PORT) : undefined },
    preview: { host: true, port: 4173 },
    build: {
      target: 'es2020',
      cssTarget: 'safari15',
      assetsInlineLimit: 2048,
      rollupOptions: {
        input: pages,
        output: {
          // Keep the heavy renderer in its own chunk so the shell can paint
          // first, and keep the three page-specific demos out of each other's
          // way — a CAPTURE visitor must never download the terrain solver.
          manualChunks(id) {
            /* PHASE 6 — the glTF loader and the meshopt decoder are only
               reachable through webgl/archScene.js, which is itself a
               dynamic import. Left inside the `three` chunk they would be
               downloaded by every visitor on every route, including the
               ones that never fetch a building. */
            if (id.includes('node_modules/three')) {
              if (id.includes('GLTFLoader') || id.includes('meshopt')) return 'gltf';
              return 'three';
            }
            if (id.includes('node_modules/gsap')) return 'gsap';
            /* NOTE on the build listing: the ~16 kB gz common chunk is the
               inquiry form, shared by all four documents. Rollup names a
               shared chunk after one of its members, and since Phase 5 it
               picks `evidence` — that number is NOT the cost of the evidence
               architecture. Splitting the form out by hand to fix the name
               costs ~0.6 kB gz in chunk overhead, which is a worse trade
               than a comment. The evidence architecture's real production
               cost is the `sheet-*` js + css pair, and neither is fetched
               while there is no real project. */
          },
        },
      },
    },
  };
});
