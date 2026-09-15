import './styles/main.css';

import { env } from './core/env.js';
import { store } from './core/store.js';
import { initTheme, refreshAccentScopes } from './core/theme.js';
import { initScroll, ScrollTrigger, gsap, lenis } from './core/scroll.js';
import { initNav } from './modules/nav.js';
import { initModes } from './modules/modes.js';
import { initCursor } from './modules/cursor.js';
import { initTelemetry } from './modules/telemetry.js';
import { createScanPlane } from './modules/scanplane.js';
import { initSections } from './modules/sections.js';
import { initQuantities } from './modules/quantities.js';
import { initNarrative } from './modules/narrative.js';
import { mountRequest } from './modules/request.js';
import { initTransition } from './modules/transition.js';
import { applyCompany } from './modules/company.js';
import { initTracker } from './modules/tracker.js';
import { initSeams } from './modules/seams.js';
import { initDataField } from './modules/datafield.js';
import { playIntro } from './modules/intro.js';
import { initHeroWindow } from './modules/heroWindow.js';
import { initEvidence } from './modules/evidence.js';
import { initExamples } from './modules/examples.js';
import { initMedia } from './modules/media.js';
import { assertAccentColors } from './core/assert.js';

/* ------------------------------------------------------------------
   Boot.
   The shell — type, layout, copy, service logic, the whole inquiry
   form — is live before the renderer is even fetched. WebGL is an
   enhancement, never a gate: if the chunk is slow the intro plays
   without it and the object joins as soon as it is ready.
   ------------------------------------------------------------------ */

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

const stageEl = document.getElementById('stage');
const canvas = document.getElementById('gl');
const annoEl = document.getElementById('annos');
const scanEl = document.getElementById('scanplane');

let scene = null;

initNav();
applyCompany();
initTransition();
initTheme((rgb, mix, ink) => scene?.setAccent(rgb, mix, ink));
initScroll();
initCursor();

const telemetry = initTelemetry();
const scanPlane = createScanPlane(scanEl);
const heroWindow = initHeroWindow({ getScene: () => scene });

/* ------------------------------------------------------------------
   PHASE 8.2 — THE HERO HAS ONE SCAN PLANE, AND IT IS THE WEBGL ONE.

   A mode change used to fire `scanPlane.pass()`, a full-viewport DOM
   band, on top of the Scan Plane the scene is already drawing. Two
   implementations of one motif with no shared state: the DOM half
   restarted from the top of the frame on every activation — including
   every hover, so crossing the rail spawned three of them — while the
   WebGL half carried on from wherever its own phase was. They could not
   be in step, because nothing connected them.

   The motif is unchanged and it is still there: the Scan Plane in the
   hero is the one in the scene, on the single phase in webgl/scene.js,
   passing over the object it is reading. What is gone is the duplicate.

   The DOM plane keeps the two jobs it does alone and does well — the
   opening sequence, and the full-page section transitions on the
   service routes — where nothing else is animating and there is no
   second implementation to disagree with. See modules/scanplane.js.
   ------------------------------------------------------------------ */
initModes();

/* ------------------------------------------------------------------
   PHASE 8 — the hero's vertical behaviour, per service.

   The three modes were four readings of one storey. They are now four
   readings of a three-level building, and each one wants the stack held
   differently:

     IDLE / MEASURE  stacked. MEASURE's subject is the GROUND, and a
                     building taking itself apart over a terrain survey is
                     the building competing with the argument.
     CAPTURE         stacked, floor labels on. Part 10 is explicit: do not
                     explode on entry. CAPTURE is documentation of ONE
                     building, and station markers appearing level by level
                     over an intact building is what says so.
     QUANTIFY        separated. This is the transition Part 14 describes —
                     the roof comes off, the levels part, the walls go and
                     three plans resolve where a building was. Without the
                     separation the three drawings land on top of each other
                     and QUANTIFY shows one illegible sheet.
   ------------------------------------------------------------------ */
/* PHASE 9 §29 — A TABLET IS NOT A DESKTOP.

   The threshold was 700 px, which put 1024×1366 on the desktop side of it
   and gave a portrait tablet the exploded three-sheet axonometric. That
   stack is two floor separations taller and a full plan wider than one
   sheet, and at 1024 it simply did not fit the frame: both ends of every
   drawing were cropped by the edges (qa/p9/shots/r-tab-place3.png before
   this change). A portrait tablet reads ONE storey and the floor selector
   is what changes which — the same answer the phone gets, for the same
   reason. */
const wideEnoughToExplode = window.matchMedia('(min-width: 1100px)');

/* PHASE 8.2 — ONE CALL, ONE TRANSITION.
   These four things used to be four calls, and therefore four tweens
   with three different durations and three different curves, started in
   the same frame and synchronised by nothing. They are one transition
   on one progress now; `scene.setMode` owns all of it. */
store.subscribe((id) => {
  /* PART 21 — a phone is NOT shown three exploded floors. At 390 px the
     three sheets are three unreadable rows, so the phone reads ONE storey
     and the floor selector is what changes which. The desktop gets the
     exploded axonometric, which is where it belongs. */
  scene?.setMode(id, verticalFor(id));
});

/** How the stack is held for a given mode. One definition, two callers. */
function verticalFor(id) {
  const explode = id === 'quantify' && wideEnoughToExplode.matches;
  return {
    explode: explode ? 0.9 : 0,
    level: id === 'quantify' && !explode ? 'L00' : null,
    labels: id === 'quantify' || id === 'capture' ? 1 : 0,
  };
}

/* Everything below the fold is independent of the renderer, so it is
   wired immediately rather than waiting on the WebGL chunk. */
initQuantities();
/* PHASE 12 — the derived examples and the sample media, wired before the
   renderer so the light sections are complete on every device. */
initExamples();
initMedia();
/* PHASE 13 — the drawing, and the figures counted out of it. Derived, so
   it is on the page whether or not the renderer ever arrives. */
initDataField();
mountRequest(document.getElementById('projectMount'));
initSections({ scanPlane });
initTracker();
/* PHASE 13 — the crossings between the four remaining sections. Written
   after the sections themselves so a seam measures a laid-out page. */
initSeams();

/* ------------------------------------------------------------------
   EVIDENCE.

   Placed between WHY and START PROJECT: proof is the last thing read
   before the form, and the two slots that suggested themselves are both
   inside sequences Phase 5 deliberately joined — SERVICES → PROCESS is
   where the renderer suspends and a photographic asset would sit over a
   live canvas, and PROCESS → WHY is the new hand-off. Moving it is one
   argument here if that judgement turns out wrong.

   Renders nothing, fetches nothing and adds no markup until there is a
   real project in data/evidence.js.
   ------------------------------------------------------------------ */
initEvidence({ anchor: document.getElementById('project') })
  .then((sec) => {
    if (!sec) return;
    /* A section inserted after boot is a new accent scope. */
    refreshAccentScopes();
    ScrollTrigger.refresh();
  });

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

boot();

async function boot() {
  const loading = env.webgl ? loadScene() : Promise.resolve(null);

  // Don't hold the opening sequence hostage to a cold network.
  const ready = await Promise.race([loading, wait(1100).then(() => 'timeout')]);

  // The narrative reads `scene` through a getter, so it is correct whether
  // the renderer arrived in time or lands a second later.
  initNarrative({ getScene: () => scene, scanPlane });

  if (ready === 'timeout') {
    playIntro({ scene: null, scanPlane, telemetry, heroWindow });
    loading.then((sc) => {
      sc?.intro();
      // The renderer landed late; the phone still gets its one transformation.
      heroWindow.measure();
      heroWindow.reveal({ delay: 0.6 });
      ScrollTrigger.refresh();
    });
  } else {
    playIntro({ scene: ready, scanPlane, telemetry, heroWindow });
  }
  ScrollTrigger.refresh();
  assertAccentColors('home');
}

async function loadScene() {
  try {
    const { createScene } = await import('./webgl/scene.js');
    scene = createScene({ canvas, stage: stageEl, annoContainer: annoEl, route: 'home' });
  } catch (err) {
    console.warn('[gdf] renderer unavailable — using the static composition', err);
    scene = null;
  }
  if (!scene) {
    document.body.classList.add('no-webgl');
    return null;
  }
  // Adopt whatever the user has already done while the chunk was loading.
  scene.setMode(store.active, verticalFor(store.active));
  if (import.meta.env.DEV) window.__gdf = { scene, store, gsap, ScrollTrigger, lenis: () => lenis };
  canvas.addEventListener('webglcontextlost', (e) => {
    e.preventDefault();
    document.body.classList.add('no-webgl');
  });
  return scene;
}

if (!env.webgl) document.body.classList.add('no-webgl');

// Font swap changes measured layout; recompute scroll positions once settled.
document.fonts?.ready.then(() => ScrollTrigger.refresh());
