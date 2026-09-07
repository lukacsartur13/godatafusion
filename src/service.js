import './styles/main.css';

import { env } from './core/env.js';
import { store } from './core/store.js';
import { initTheme, refreshAccentScopes } from './core/theme.js';
import { initScroll, ScrollTrigger, gsap, lenis } from './core/scroll.js';
import { initNav } from './modules/nav.js';
import { initCursor } from './modules/cursor.js';
import { createScanPlane } from './modules/scanplane.js';
import { initTransition } from './modules/transition.js';
import { mountRequest } from './modules/request.js';
import { initServiceSections } from './modules/serviceSections.js';
import { initEvidence } from './modules/evidence.js';
import { initExamples } from './modules/examples.js';
import { initMedia } from './modules/media.js';
import { applyCompany } from './modules/company.js';
import { assertAccentColors } from './core/assert.js';
import { SERVICES } from './data/services.js';

/* ============================================================
   THE SHARED SERVICE PAGE

   One entry point for /360-camera/, /teruletfelmeres/ and
   /mennyisegszamitas/. Everything a service page shares with the
   homepage and with its two siblings is wired here — navigation, the
   accent channel, smooth scrolling, the Scan Plane, section reveals,
   the request form, the transition field, the footer.

   What each page does NOT share is loaded last and only for that route:
   `./service/<id>.js`, which owns that page's scene states, its demo and
   its readouts. A CAPTURE visitor never downloads the terrain solver.
   ============================================================ */

/* ------------------------------------------------------------------
   PHASE 8.3 — the frame badge, for browsers we cannot drive.

   Safari refuses WebDriver and Apple Events until two Developer
   settings are turned on, and this phase does not change a reader's
   settings behind their back. `?fps` on any route makes the page report
   its own frame pacing on screen instead. Dynamic import behind the
   flag: a real visitor never fetches it. See modules/fpsBadge.js.
   ------------------------------------------------------------------ */
if (/(^|[?&#])fps\b/.test(location.search + location.hash)) {
  import('./modules/fpsBadge.js').then((m) => m.mountFpsBadge());
}

const id = document.documentElement.dataset.service;
const cfg = SERVICES[id];
if (!cfg) throw new Error(`[gdf] unknown service route "${id}"`);

initNav();
applyCompany();

/* The renderer is a lazy chunk, so the accent channel has to be able to
   reach a scene that does not exist yet. Without this the WebGL side never
   learns the page's colour: every line layer renders at its neutral base
   and the whole canvas reads as a dark grey wireframe — which is exactly
   what the first MEASURE build looked like. */
let scene = null;
let accent = null;
initTheme((rgb, mix) => {
  accent = [rgb, mix];
  scene?.setAccent(rgb, mix);
});
initScroll();
initCursor();
initTransition();

const scanPlane = createScanPlane(document.getElementById('scanplane'));

/* One accent, locked. A service page is inside one mode for its whole
   length: there is no rail to hover and nothing else may claim the colour. */
store.setScroll(id);
document.body.dataset.mode = id;

initServiceSections({ scanPlane });

/* PHASE 12 — the example block: derived tables, the floor plan with the
   capture round, the contour figure. No three.js, so it is on the page
   whether or not the renderer ever arrives. */
initExamples();
initMedia();

const mount = document.getElementById('projectMount');
if (mount) mountRequest(mount, { service: id, lockAccent: true });

/* Each service page can surface ONE real project of its own service later.
   Same component, same layout, filtered by service and inheriting that
   service's accent — and, exactly as on the homepage, absent until a real
   project exists. Placed before the sibling-services block, so the page
   argues its own case before it offers the other two. */
initEvidence({
  anchor: document.getElementById('other') || document.getElementById('project'),
  service: id,
}).then((sec) => {
  if (!sec) return;
  refreshAccentScopes();     // a section inserted after boot is a new accent scope
  ScrollTrigger.refresh();
});

assertAccentColors(`service:${id}`);

const year = document.getElementById('footYear');
if (year) year.textContent = String(new Date().getFullYear());

if (!env.webgl) document.body.classList.add('no-webgl');

/* ---------------- the page's own module ---------------- */
/* An explicit map, not a template literal: Vite can only pre-bundle a
   dynamic import it can statically see, and a hand-rolled string would
   silently ship all three chunks to every route. */
const PAGE = {
  capture: () => import('./service/capture.js'),
  measure: () => import('./service/measure.js'),
  quantify: () => import('./service/quantify.js'),
};

if (import.meta.env.DEV) {
  /* Inspection handle, identical in shape to the homepage's. Replaced with
     a literal at build time, so the whole block is absent in production. */
  window.__gdf = { store, gsap, ScrollTrigger, lenis: () => lenis, service: id };
}

if (env.webgl) {
  PAGE[id]()
    .then((m) => m.init({ scanPlane }))
    .then((page) => {
      scene = page?.scene ?? null;
      if (accent && scene) scene.setAccent(accent[0], accent[1]);
      if (import.meta.env.DEV) window.__gdf.page = page;
    })
    .catch((err) => {
      console.error('[gdf] the page module could not start — the static page stands on its own', err);
      document.body.classList.add('no-webgl');
    });
} else {
  /* No WebGL: the demonstration is replaced by its own static reading of
     the same content, which is already in the markup. */
  document.body.classList.add('no-webgl');
}

document.fonts?.ready.then(() => ScrollTrigger.refresh());
