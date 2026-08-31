import gsap from 'gsap';
import { ScrollTrigger } from '../core/scroll.js';
import { env } from '../core/env.js';
import { store } from '../core/store.js';
import {
  PATH, PATH_MOBILE, STILLS, CHAPTERS, chapterRanges, sampleDescent,
  PLAN_LEVEL, STATION, markFractions,
} from '../webgl/descent.js';
import { levelFeatures, buildingQuantities, planY, SLAB_T, LEVELS } from '../webgl/levels.js';
import { referenceFacts } from '../webgl/reference.js';
import { CAPTURE_ROUND } from '../webgl/stations.js';
import { metrics, cutFillAt } from '../data/terrain-metrics.js';
import { createComposer } from './descentCompose.js';

/* ============================================================
   THE DATA DESCENT — the controller

   One scroll authority over one journey. It does four things and it does
   not do anything else:

     1. turns the reader's position in the section into a progress along
        the path, and hands the sampled frame to the renderer;
     2. tells each block of markup how present it is, with two custom
        properties and nothing else — there is no tween per word;
     3. writes the section's numbers, all of which are read from
        webgl/levels.js and data/terrain-metrics.js at boot;
     4. hands every state's typography to the spatial composition solver
        in modules/descentCompose.js, once per RENDERED frame, so that
        every word is placed against the geometry that frame contains.

   PHASE 11.2 CHANGED ONLY THE FOURTH OF THOSE. The camera path, the
   pacing map and the scroll authority are untouched; what moved is where
   the type stands, from a fixed twelve-by-twelve field to the projected
   building, its rooms, its slab edges and the voids between them.

   WHAT IT DOES NOT DO. It does not touch the scroll. PART 20 is explicit
   and so is this codebase's history: the document scrolls, Lenis smooths
   it, and this reads it. There is no pin, no wheel handler, no scroll
   hijack and no place the reader can be held.
   ============================================================ */

/* Which service colour the page wears in each part of the journey. It is
   the site's own three-service progression — the same store the hero rail
   and the chapters write to — performed spatially instead of listed:
   nothing, then the round, then the ground, then the drawing. */
const ACCENT = {
  entry: null, glass: null, interior: null,
  capture: 'capture', floor: 'capture',
  under: 'measure', volume: 'measure',
  ascent: 'quantify', collapse: 'quantify', plan: 'quantify',
  apart: 'quantify', field: 'quantify',
  final: null,
};

/* PART 26 — which still each block cuts to under reduced motion. Five
   states, and every block belongs to one of them. */
const STILL_FOR = {
  entry: 'exterior', glass: 'exterior',
  interior: 'interior', capture: 'interior', floor: 'interior',
  under: 'terrain', volume: 'terrain',
  ascent: 'plan', collapse: 'plan', plan: 'plan',
  apart: 'data', field: 'data', final: 'exterior',
};

const hu = (n, d = 1) => n.toLocaleString('hu-HU', {
  minimumFractionDigits: d, maximumFractionDigits: d,
});

export function initDescent({ getScene } = {}) {
  const S = () => getScene?.() ?? null;
  const section = document.getElementById('descent');
  if (!section) return null;

  const stage = document.getElementById('stage');
  const stick = section.querySelector('.dsc__stick');
  const holds = [...section.querySelectorAll('.dsc__ch')].map((el) => ({
    key: el.dataset.dsc,
    box: el,
    hold: el.querySelector('.dsc__hold'),
  }));

  /* The markup and the pacing table have to describe the same thirteen
     blocks or the camera is in a different chapter from the type. In
     development that is a loud failure rather than a subtle drift. */
  if (import.meta.env.DEV) {
    const a = holds.map((h) => h.key).join(',');
    const b = CHAPTERS.map((c) => c.key).join(',');
    if (a !== b) {
      console.warn('[gdf:descent] the markup and the pacing map disagree:\n  '
        + `markup  ${a}\n  pacing  ${b}`);
    }
  }

  const ranges = chapterRanges();
  /* Where each level mark peaks inside the ASCENT state. Read from the
     camera path rather than chosen: a mark peaks exactly where the camera
     crosses the floor it names, and nothing else can put it anywhere. */
  const LEVEL_MARK = markFractions('ascent', ['L00', 'L01', 'L02']);
  const byKey = new Map(ranges.map((r) => [r.key, r]));

  fillValues();
  buildLadder();
  buildLayerKey();
  buildField();

  const projEl = document.getElementById('dscProj');
  const levelItems = [...section.querySelectorAll('.dsc__levels li')];
  let unsub = null;
  /* The last frame the scroll handler produced, held for the renderer's
     own callback: a word may only be positioned from the camera that has
     actually been DRAWN, never from the one the scroll handler was about
     to hand over. */
  let last = null;
  const layerItems = () => [...section.querySelectorAll('.dsc__layers li')];
  const fieldItems = () => [...section.querySelectorAll('.dsc__field li')];

  /* ------------------------------------------------------------------
     PHASE 11.2 — THE COMPOSITION SOLVER

     It is created only where it can actually run. Under reduced motion
     there is no camera path and no sticky pane, so there is nothing to
     project against and the authored fallback stack in descent.css is
     the composition; `is-solved` is the switch between the two, and it
     is never set on that branch.
     ------------------------------------------------------------------ */
  const composer = env.reducedMotion ? null : createComposer({ getScene, section });
  if (composer) {
    section.classList.add('is-solved');
    /* `import.meta.env.DEV` is replaced with a literal at build time, so
       the visual-QA handle is absent from the shipped bundle entirely. */
    if (import.meta.env.DEV) window.__gdfCompose = composer.debug;
  }

  /* ------------------------------------------------------------------
     PART 26 — REDUCED MOTION

     No path, no camera travel, no sticky pane. Each block is an ordinary
     stacked composition (see descent.css) and the scene CUTS to one of
     five states as that block is reached. Every word of the narrative is
     still on the page and still in the same order.
     ------------------------------------------------------------------ */
  if (env.reducedMotion) {
    let shown = null;
    /* ONE authority, not one trigger per block.

       Thirteen overlapping triggers was the first shape and it does not
       work here: at these block heights a block's activation range starts
       before its predecessor's ends, so the LAST one to fire wins and
       every block showed its successor's frame. A reading line is
       unambiguous — the state is the one whose block has most recently
       crossed it — and it is the same rule the section tracker uses. */
    const pick = () => {
      const line = window.innerHeight * 0.45;
      let cur = holds[0];
      for (const h of holds) {
        if (h.box.getBoundingClientRect().top <= line) cur = h; else break;
      }
      const id = STILL_FOR[cur.key] || 'exterior';
      if (id === shown) return;
      shown = id;
      S()?.setJourney({ ...STILLS[id], round: STILLS[id].round ?? 0 });
      store.setScroll(ACCENT[cur.key] ?? null);
      if (stage) stage.style.opacity = '1';
    };
    ScrollTrigger.create({
      trigger: section, start: 'top bottom', end: 'bottom top',
      onUpdate: pick,
      onToggle: (self) => {
        document.body.classList.toggle('is-journey', self.isActive);
        if (self.isActive) pick();
        else { S()?.setJourney(null); shown = null; store.setScroll(null); }
      },
    });
    return { get active() { return false; } };
  }

  /* ------------------------------------------------------------------
     THE TRACK

     There is nothing to measure. The section's scroll progress IS the
     journey's progress, because the section is one sticky pane and the
     thirteen states are stacked inside it — so a state's span of the
     scroll is exactly its span in `chapterRanges()`, at every viewport
     height, with no sticky arithmetic in between.

     That is the whole reason for the restructure: while each state had
     its own sticky block, its scroll span depended on its own height
     against the viewport, and the two shortest states had no sticky
     travel at all.
     ------------------------------------------------------------------ */
  let live = false;
  const holdOf = new Map(holds.map((h) => [h.key, h.hold]));

  /* ---------------- per-frame ---------------- */
  const mobilePath = () => window.innerWidth <= 900;
  let lastAccent = 'init';

  function apply(p) {
    const at = Math.max(0, Math.min(1, p));
    const frame = sampleDescent(at, mobilePath() ? PATH_MOBILE : PATH);
    S()?.setJourney(frame);

    /* One style write per state per frame: how present it is, and how far
       through it the reader is. Everything the type does is derived from
       those two numbers — in descent.css for the fallback stack, and in
       the composition solver for the placed one. */
    let leading = ranges[0];
    const live_ = [];
    for (const r of ranges) {
      const k = (at - r.a) / Math.max(1e-6, r.b - r.a);
      /* A state fades in over its first tenth and out over its last
         tenth, so two neighbours are never both absent — and the fade is
         a fraction of the state's OWN length, which is what keeps the
         four-percent GLASS block as quick as the camera crossing it. */
      const on = k < -0.02 || k > 1.02 ? 0
        : Math.min(1, Math.min(k + 0.02, 1.02 - k) / 0.10);
      const el = holdOf.get(r.key);
      if (!el) continue;
      el.style.setProperty('--on', on.toFixed(3));
      el.style.setProperty('--k', Math.max(0, Math.min(1, k)).toFixed(4));
      const shown = on > 0.001;
      el.style.setProperty('--vis', shown ? 'visible' : 'hidden');
      el.style.setProperty('--wc', shown ? 'opacity' : 'auto');
      if (shown) live_.push({ key: r.key, hold: el, k: Math.max(0, Math.min(1, k)) });
      if (k >= 0 && k <= 1) leading = r;
    }

    const key = leading.key;
    const lk = Math.max(0, Math.min(1, (at - leading.a) / Math.max(1e-6, leading.b - leading.a)));

    /* PART 10 — the level marks are met one at a time, in the order the
       camera crosses them, and each one is gone before the next arrives. */
    if (key === 'ascent') {
      levelItems.forEach((li, i) => {
        li.style.setProperty('--lv', bell(lk, LEVEL_MARK[i], 0.19).toFixed(3));
      });
    }
    /* PART 13 — the layer key resolves one line at a time, in the order
       the layers detach from the sheet. */
    if (key === 'apart') {
      layerItems().forEach((li, i) => {
        li.style.setProperty('--lv', ramp(lk, i * 0.11, 0.16).toFixed(3));
      });
    }
    if (key === 'field') {
      fieldItems().forEach((li, i) => {
        li.style.setProperty('--lv', ramp(lk, i * 0.055, 0.14).toFixed(3));
      });
    }
    /* The projection readout is a real instrument: it prints the number
       the projection matrix is actually being blended with. */
    if (projEl && (key === 'collapse' || key === 'plan')) {
      const o = frame.ortho;
      projEl.textContent = o < 0.02 ? 'PERSPECTIVE'
        : o > 0.985 ? 'ORTHOGRAPHIC'
        : `${Math.round(o * 100)}% ORTHOGRAPHIC`;
    }
    /* Everything the solver needs, assembled once and handed to the
       renderer's own callback. At most two states are present at a time,
       so this is at most two placements a frame. */
    last = {
      frame,
      states: live_.map((st) => ({
        key: st.key,
        hold: st.hold,
        k: st.k,
        frame,
        /* The same two curves descent.css computes, so a placed element
           and a fallback element arrive at exactly the same moment. */
        arrive: (d) => Math.max(0, Math.min(1, (st.k - d) * 5)),
        ramp: (a, w) => ramp(st.k, a, w),
        level: st.key === 'ascent'
          ? LEVEL_MARK.map((c) => bell(st.k, c, 0.19)) : null,
      })),
    };

    const accent = ACCENT[key] ?? null;
    if (accent !== lastAccent) { store.setScroll(accent); lastAccent = accent; }
    if (stage) {
      stage.style.opacity = '1';
      /* The narrative leaves a `will-change: filter` promise on the stage
         whenever the manifesto's blur was live when the journey took
         over. A full-viewport canvas with a standing filter hint is a
         permanent render surface — Phase 8.3's first finding — and the
         journey never blurs, so the promise is withdrawn here. */
      if (stage.style.filter || stage.style.willChange) {
        stage.style.filter = '';
        stage.style.willChange = '';
      }
    }
  }

  /* ------------------------------------------------------------------
     THE ONE PLACE TYPOGRAPHY IS POSITIONED FROM.

     Not the scroll handler. `scene.project` can only answer with the
     camera it has, and the camera the scroll handler has just written is
     the one for the frame that has NOT been drawn yet — so a word placed
     there is a word placed one frame behind the picture it belongs to.
     This runs immediately after the draw, with the matrices that drew it.
     ------------------------------------------------------------------ */
  /* ------------------------------------------------------------------
     THE COMPOSITION BELONGS TO A PINNED PANE.

     Phase 11.2 solves every placement in VIEWPORT co-ordinates, because
     that is what the projector answers in and what the safe field is
     measured in. That is right while the pane is pinned and wrong the
     moment it is not: on the way out the pane scrolls up, the solver
     keeps re-solving against the viewport, and the type stays glued to
     the screen while the thing it is composed inside leaves — which is
     how REALITY, MADE COMPUTABLE. ended up printed over section 04.

     So the journey's type exists exactly while its pane does. Outside
     that the states are switched off entirely, which also means they are
     not composited while the reader is somewhere else on the page.
     ------------------------------------------------------------------ */
  let parked = false;
  const pinned = () => !stick || Math.abs(stick.getBoundingClientRect().top) < 2;

  function placeAll() {
    if (!composer || !last) return;
    if (!pinned()) {
      if (!parked) {
        parked = true;
        holds.forEach(({ hold }) => {
          hold.style.setProperty('--on', '0');
          hold.style.setProperty('--vis', 'hidden');
          hold.style.setProperty('--wc', 'auto');
        });
      }
      return;
    }
    if (parked) { parked = false; apply(progressNow()); }
    for (const st of last.states) composer.place(st.key, st);
  }

  function watchFrames(on) {
    if (on && !unsub) unsub = S()?.onFrame?.(placeAll) ?? null;
    if (!on && unsub) { unsub(); unsub = null; }
  }

  /* ---------------- entering and leaving ---------------- */
  function setLive(on) {
    if (on === live) return;
    live = on;
    document.body.classList.toggle('is-journey', on);
    watchFrames(on);
    if (!on) {
      last = null;
      parked = false;
      S()?.setJourney(null);
      store.setScroll(null);
      lastAccent = 'init';
      holds.forEach(({ hold }) => {
        hold.style.setProperty('--on', '0');
        hold.style.setProperty('--vis', 'hidden');
        hold.style.setProperty('--wc', 'auto');
      });
    }
  }

  ScrollTrigger.create({
    trigger: section,
    start: 'top top',
    end: 'bottom bottom',
    /* A little smoothing, exactly as the narrative uses. The reader's
       scroll is still the authority; this only stops a trackpad's raw
       step from being a camera jump. */
    scrub: 0.3,
    onRefresh: (self) => { if (live) apply(self.progress); },
    onUpdate: (self) => { if (live) apply(self.progress); },
  });

  /* The journey owns the scene from the moment the section is on screen
     to the moment it is not, which is a viewport wider on each side than
     the scrubbed range above — so there is never a frame where the
     narrative and the journey both think they own the camera. */
  ScrollTrigger.create({
    trigger: section,
    start: 'top bottom',
    end: 'bottom top',
    onToggle: (self) => {
      setLive(self.isActive);
      if (self.isActive) apply(progressNow());
    },
  });

  function progressNow() {
    const top = section.getBoundingClientRect().top + window.scrollY;
    const span = Math.max(1, section.offsetHeight - window.innerHeight);
    return Math.max(0, Math.min(1, (window.scrollY - top) / span));
  }

  window.addEventListener('resize', () => gsap.delayedCall(0.2, () => {
    if (live) apply(progressNow());
  }));

  /* ==================================================================
     THE NUMBERS

     Every figure this section prints is read here, at boot, from the two
     modules that own them — webgl/levels.js for the building and
     data/terrain-metrics.js for the ground. There is not a single typed
     quantity anywhere in the journey's markup, which is the same rule
     the rest of the site has followed since Phase 8.
     ================================================================== */
  function fillValues() {
    const Q = buildingQuantities();
    const R = referenceFacts();
    const M = metrics();
    const v = {
      site: `L00–L02 · ${hu(Q.total.area, 1)} M²`,
      room: `${R.label} · ${R.uid} · ${hu(R.area, 1)} m² · ${R.windows} ablak`,
      round: `360° · ${STATION.id} · ${CAPTURE_ROUND.length} BELSŐ ÁLLÁS`,
      slab: `${hu(SLAB_T, 2)} M`,
      cut: hu(M.cut, 1),
      fill: `FILL ${hu(M.fill, 1)} M³`,
      sheet: `${PLAN_LEVEL} · ${levelFeatures(PLAN_LEVEL).rooms.length} HELYISÉG`,
    };
    for (const el of section.querySelectorAll('[data-dsc-fill]')) {
      const k = el.dataset.dscFill;
      if (v[k] !== undefined) el.textContent = v[k];
    }
    /* The level marks print the level table's own elevations. */
    section.querySelectorAll('.dsc__levels li').forEach((li) => {
      const lv = LEVELS.find((l) => l.id === li.dataset.level);
      const u = li.querySelector('u');
      if (lv && u) {
        u.textContent = lv.elevation === 0
          ? '±0,00' : `+${hu(lv.elevation, 2)}`;
      }
    });
  }

  /* ------------------------------------------------------------------
     PART 08 — THE DATUM LADDER

     "Do not introduce false cross-domain elevation numbers until the
     scale systems are reconciled."

     They are not reconciled. The parcel resolves at 2,21 m per world unit
     and the building at 5,35, because each was solved against a figure
     its own domain owns — the parcel area and the floor area. Printing
     one ladder containing +7,20 over −2,18 would be printing two rulers
     as one, and the two rulers disagree by a factor of 2,4.

     So this ladder is the TERRAIN'S OWN, and it says so on the page. The
     values are the actual contour set at the interval the survey chose,
     plus the cut level the earthwork figure is computed at. Nothing on it
     comes from the building, and the building's own elevations appear
     only in the ascent, where they are the building's alone.
     ------------------------------------------------------------------ */
  function buildLadder() {
    const list = document.getElementById('dscLadder');
    if (!list) return;
    const M = metrics();
    const cut = cutFillAt(0.5).level;
    /* `metrics()` returns the extremes already formatted for print, and
       the intermediate rungs have to be REAL contour elevations rather
       than fractions of the relief — so the set is regenerated at the
       interval the survey actually chose. */
    const lo = parseFloat(M.minText.replace(/\s/g, '').replace(',', '.'));
    const hi = parseFloat(M.maxText.replace(/\s/g, '').replace(',', '.'));
    const step = M.interval;
    const lines = [];
    for (let e = Math.ceil(lo / step) * step; e <= hi + 1e-6; e += step) lines.push(e);
    /* Five rungs: both extremes, the cut level, and the two contour lines
       nearest the quarter points. More than that and the ladder stops
       being a datum and becomes a table. */
    const nearest = (t) => lines.reduce((best, e) =>
      (Math.abs(e - t) < Math.abs(best - t) ? e : best), lines[0]);
    const rungs = [
      { v: hi, k: 'MAX' },
      { v: nearest(lo + (hi - lo) * 0.72), k: '' },
      { v: cut, k: 'CUT', mark: true },
      { v: nearest(lo + (hi - lo) * 0.24), k: '' },
      { v: lo, k: 'MIN' },
    ];
    list.innerHTML = '';
    for (const r of rungs) {
      const li = document.createElement('li');
      if (r.mark) li.dataset.mark = '';
      const b = document.createElement('b');
      b.textContent = r.v === 0 ? '±0,00'
        : `${r.v > 0 ? '+' : '−'}${hu(Math.abs(r.v), 2)}`;
      li.append(b);
      /* Only the three rungs that MEAN something carry a label. An empty
         element on the two intermediate contour lines is a blank string
         announced to a screen reader for no reason. */
      if (r.k) {
        const i = document.createElement('i');
        i.textContent = r.k;
        li.append(i);
      }
      list.append(li);
    }
    const note = list.parentElement?.querySelector('.dsc__datum-k');
    if (note) note.textContent = `TEREP · RELATÍV DATUM · ${hu(step, 2)} M`;
  }

  /* PART 13 — the layer key, counted from the drawing it describes. */
  function buildLayerKey() {
    const list = document.getElementById('dscLayers');
    if (!list) return;
    const F = levelFeatures(PLAN_LEVEL);
    const zones = new Set(F.rooms.map((r) => r.zone)).size;
    const rows = [
      ['WALLS', `${F.walls.length} DB`],
      ['DOORS', `${F.doors.length} DB`],
      ['WINDOWS', `${F.windows.length} DB`],
      ['ROOMS', `${F.rooms.length} DB`],
      ['ZONES', `${zones} DB`],
      ['DIMENSIONS', '2 DB'],
    ];
    list.innerHTML = '';
    for (const [k, v] of rows) {
      const li = document.createElement('li');
      const b = document.createElement('b'); b.textContent = k;
      const i = document.createElement('i'); i.textContent = v;
      li.append(b, i);
      list.append(li);
    }
  }

  /* ------------------------------------------------------------------
     PART 14 — THE DATA FIELD

     Eight measured values, placed on the block's own 12 x 12 field at
     four different sizes. The order is the order they are READ in, which
     is largest first: the building's floor area, then its openings, then
     the one room the journey has been standing in, then the identifiers.

     `--a` is a grid area and `--fz` a size. Both are authored here rather
     than in CSS because they belong to the composition of THIS set of
     numbers — a different set would want a different field.
     ------------------------------------------------------------------ */
  function buildField() {
    const list = document.getElementById('dscField');
    if (!list) return;
    const Q = buildingQuantities();
    const R = referenceFacts();
    const items = [
      { n: hu(Q.total.area, 1), k: 'M² · HASZNOS ALAPTERÜLET',
        a: '2 / 2 / 5 / 10', fz: 'clamp(2.8rem, 10.5vw, 11rem)', am: '2 / 2 / 4 / 9' },
      { n: String(Q.total.windows), k: 'ABLAK · ÖSSZESEN',
        a: '5 / 8 / 8 / 13', fz: 'clamp(2.4rem, 8.5vw, 9rem)', j: 'end', am: '4 / 4 / 6 / 9' },
      { n: String(Q.total.doors), k: 'AJTÓ · ÖSSZESEN',
        a: '2 / 10 / 4 / 13', fz: 'clamp(1.8rem, 5.4vw, 5.4rem)', j: 'end', am: '2 / 6 / 4 / 9' },
      { n: hu(R.area, 1), k: `M² · ${R.uid}`,
        a: '8 / 2 / 11 / 7', fz: 'clamp(2.4rem, 8.5vw, 9rem)', am: '6 / 2 / 8 / 7' },
      { n: String(Q.total.windowTypes.W03), k: 'W03 · TELJES BELMAGASSÁGÚ',
        a: '6 / 2 / 8 / 6', fz: 'clamp(1.5rem, 4.2vw, 4.2rem)', am: '8 / 2 / 10 / 6' },
      { n: String(Q.total.doorTypes.D01), k: 'D01 · EGYSZÁRNYÚ AJTÓ',
        a: '5 / 5 / 7 / 8', fz: 'clamp(1.3rem, 3.4vw, 3.4rem)', am: '8 / 5 / 10 / 9', j: 'end' },
      { n: `+${hu(Q.total.height, 2)}`, k: 'M · ÉPÜLETMAGASSÁG',
        a: '11 / 8 / 13 / 13', fz: 'clamp(1.3rem, 3.8vw, 3.8rem)', j: 'end', am: '10 / 4 / 12 / 9', },
      { n: String(Q.total.rooms), k: 'HELYISÉG · 3 SZINTEN',
        a: '11 / 2 / 13 / 5', fz: 'clamp(1.3rem, 3.4vw, 3.4rem)', am: '10 / 2 / 12 / 4' },
    ];
    const narrow = window.matchMedia('(max-width: 900px)');
    list.innerHTML = '';
    for (const it of items) {
      const li = document.createElement('li');
      li.style.setProperty('--a', narrow.matches ? it.am : it.a);
      li.style.setProperty('--fz', it.fz);
      if (it.j) li.style.setProperty('--j', it.j);
      const b = document.createElement('b'); b.textContent = it.n;
      const i = document.createElement('i'); i.textContent = it.k;
      li.append(b, i);
      list.append(li);
    }
    narrow.addEventListener?.('change', () => {
      [...list.children].forEach((li, n) => {
        li.style.setProperty('--a', narrow.matches ? items[n].am : items[n].a);
      });
    });
  }

  return { get active() { return live; } };
}

/** 0 → 1 → 0 around `c`, over a half-width of `w`. */
function bell(k, c, w) {
  const d = Math.abs(k - c) / w;
  return d >= 1 ? 0 : 1 - d * d * (3 - 2 * d);
}

/** 0 → 1 starting at `a`, over `w`. */
function ramp(k, a, w) {
  const t = Math.max(0, Math.min(1, (k - a) / w));
  return t * t * (3 - 2 * t);
}
