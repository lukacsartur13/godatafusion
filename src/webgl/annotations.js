import * as THREE from 'three';
import { SITE, heightAt } from './field.js';
import { totalStations } from './stations.js';
import {
  PLAN, planFeatures, levelFeatures, buildingQuantities, planY,
  LEVELS, LEVEL_IDS, ROOF, roofY, elevationLabel, levelById,
} from './geometry.js';

/**
 * Measurement callouts anchored to real points on the 3D object and
 * projected to screen space each frame. Decorative: the identical values
 * are in the readout panels, which is where assistive tech reads them.
 *
 * Two families:
 *   • set callouts   — one per service, faded by that service's weight
 *   • extraction     — QUANTIFY only, revealed one at a time by the
 *                      recognition sequence, anchored to actual door,
 *                      window and room symbols on the plan drawing
 */

const PAD = SITE.padY;
const Q = buildingQuantities();
/* The capture round — the same twenty interior positions the 360 viewer
   walks, plus the twelve exterior tripods. Read from webgl/stations.js
   rather than off the GLB, because this list is built before the building
   lands. PHASE 9 §10 moved the declaration there; it used to be a hand
   written `20` here and a second copy in blender/config/rooms.py. */

/** Nth feature of a given type on a level — so a label points at what it names. */
const nth = (list, type, n = 0) => list.filter((d) => d.type === type)[n];
const countOf = (list, type) => String(list.filter((i) => i.type === type).length).padStart(2, '0');
const fmt = (v) => v.toFixed(1).replace('.', ',');

export const ANCHORS = [
  // ---- CAPTURE ----
  /* PHASE 8 — the capture round is 20 interior positions across three
     floors plus the 12 exterior site stations. Counted, like everything
     else on this list. */
  /* PHASE 9 §09 — the three CAPTURE callouts stood on the parcel, east and
     south of the building, which is precisely where the sampled cloud is
     densest: two of the three were unreadable cyan-on-cyan
     (qa/p9/shots/before-lap-home-capture.png). They are on the building
     now — over the facade and the roof, where there is a surface behind
     them — and the round's own numbers are counted rather than typed. */
  { set: 'capture', p: [-2.60, PAD + 0.95, 2.55], k: 'CAPTURE POINTS', v: `${totalStations()}` },
  { set: 'capture', p: [-2.35, PAD + 3.35, -1.35], k: 'RESOLUTION', v: '8K / 360°' },
  { set: 'capture', p: [1.90, PAD + 3.95, 0.30], k: 'LEVELS', v: `${LEVELS.length} + ROOF` },
  // ---- MEASURE ----
  /* PHASE 9 §15 — the three MEASURE callouts belong to the GROUND, so they
     stand on it rather than inside the building: VOLUME on the cut prism it
     names, AREA on the parcel, ELEVATION on the slope it is measuring — and
     the last one has come in from x 6.2, where at 1440 it was cropped by
     the right edge of the frame. */
  { set: 'measure', p: [-0.6, PAD + 0.06, 1.9], k: 'AREA', v: '1 248,62 m²' },
  { set: 'measure', p: [-2.5, PAD + 2.55, -1.9], k: 'VOLUME', v: '684,30 m³' },
  { set: 'measure', p: [4.3, heightAt(4.3, -2.9) + 0.12, -2.9], k: 'ELEVATION', v: '+3,42 m' },
  /* ---- QUANTIFY (summary) ----
     PHASE 8 — these three were the last typed quantities on the site: "24
     PCS", "31 PCS", "842,6 m²", written into the markup when the building
     had one floor and true only for as long as nobody moved a wall. They are
     counted now, over all three levels, from the same derivation the
     drawings are made of. */
  /* PHASE 9 §17 — AND THEY STAND OFF THE DRAWING, NOT ON IT.

     Phase 8 anchored all three inside the plan's footprint, which was
     harmless when the mode showed ONE sheet and became unreadable the moment
     it showed three: the labels landed in the middle of the linework with
     more linework behind them (qa/p9/shots/before-lap-home-quantify.png).
     They are on the near and right EDGES of the drawing now, where the leader
     line has somewhere to come from and the label has somewhere to sit — the
     same convention a dimension string on a real sheet follows. */
  { set: 'quantify', p: [PLAN.X1 + 0.42, PLAN.y + 0.06, -2.00], k: 'DOORS', v: `${Q.total.doors} PCS` },
  { set: 'quantify', p: [PLAN.X1 + 0.42, PLAN.y + 0.06, -0.55], k: 'WINDOWS', v: `${Q.total.windows} PCS` },
  { set: 'quantify', p: [PLAN.X1 + 0.42, PLAN.y + 0.06, 0.90], k: 'FLOOR', v: `${fmt(Q.total.area)} m²` },
];

/* ------------------------------------------------------------------
   The extraction sequence.
   plan line → element recognised → leader line → data label.
   Every anchor below is the coordinate of a symbol that is actually drawn on
   the plan, and every quantity is a real count of that symbol — ON THE LEVEL
   BEING READ. Change the floor selector and the sequence re-anchors, because
   there is one derivation and it takes a level id.
   ------------------------------------------------------------------ */
export function extractsFor(level = 'L00') {
  const F = levelFeatures(level);
  const y = planY(level);
  /* The room the sequence points at should be one a visitor would recognise
     from the 360 viewer, not the shaft: the largest non-circulation, non-core
     space on the floor. */
  const room = [...F.rooms]
    .filter((r) => r.kind !== 'CIRC' && r.kind !== 'CORE')
    .sort((x, y) => y.area - x.area)[0] || F.rooms[0];
  const lq = Q.levels.find((l) => l.id === level);
  const out = [];
  const push = (id, f, box, k, v) => { if (f) out.push({ id, f, box, k, v, level }); };
  push('d01', nth(F.doors, 'D01', 1) || nth(F.doors, 'D01', 0), [0.9, 0.9],
       'AJTÓ · D01', `× ${countOf(F.doors, 'D01')}`);
  push('d02', nth(F.doors, 'D02', 1) || nth(F.doors, 'D02', 0), [0.9, 0.9],
       'AJTÓ · D02', `× ${countOf(F.doors, 'D02')}`);
  push('w03', nth(F.windows, 'W03', 0) || nth(F.windows, 'W01', 0), [0.85, 0.85],
       'ABLAK', `× ${countOf(F.windows, nth(F.windows, 'W03', 0) ? 'W03' : 'W01')}`);
  push('room', room, [room.w * 0.92, room.d * 0.9],
       `HELYISÉG · ${room.id}`, `${fmt(room.area)} m²`);
  const finish = Object.entries(lq.finishes).sort((a, b) => b[1] - a[1])[0];
  const fRoom = [...F.rooms]
    .filter((r) => r.kind !== 'CIRC' && r.kind !== 'CORE' && r.id !== room.id)
    .sort((x, y) => y.area - x.area)[0] || room;
  push('f1', fRoom, [fRoom.w * 0.8, fRoom.d * 0.7],
       `PADLÓBURKOLAT · ${finish[0]}`, `${fmt(finish[1])} m²`);
  return out.map((e) => ({ ...e, y }));
}

export const EXTRACTS = extractsFor('L00');

/* ------------------------------------------------------------------
   PHASE 8 Part 17 — THE FLOOR LABELS

   Restrained on purpose. Three lines of world-anchored type, each carrying
   the level's identifier and its REAL elevation off the level table, shown
   only while the building is separated enough for a label to belong to one
   plate rather than to a stack. They are decorative: the same elevations are
   in the readout, which is where assistive tech reads them.
   ------------------------------------------------------------------ */
export function createLevelLabels(container) {
  const rows = [...LEVELS.map((l) => ({
    id: l.id, name: l.name, y: planY(l.id), elev: elevationLabel(l.id),
  })), { id: 'ROOF', name: ROOF.label, y: roofY(), elev: elevationLabel('ROOF') }];

  const items = rows.map((r) => {
    const el = document.createElement('div');
    el.className = 'anno anno--level';
    el.innerHTML = `<span class="anno__dot"></span><span class="anno__line"></span>`
      + `<span class="anno__text"><i>${r.id}</i><b>${r.name}</b>`
      + `<u>${r.elev}</u></span>`;
    container.appendChild(el);
    return { ...r, el, vec: new THREE.Vector3(0, r.y, 0), shown: -1 };
  });

  const v = new THREE.Vector3();
  /* The floor indicators dodge the live text column — but against the TYPE,
     not against the column's box.
     The measurement callouts test one rectangle, which is the column's
     `max-width` container: 608 px wide at 1280, while the lede inside it
     wraps at 460 and the space under the headline is empty. Testing that box
     hid three of the four indicators in a region where there was nothing to
     collide with. These test the union of the column's own painted lines
     instead, which is what a designer would look at. */
  let avoidEl = document.querySelector('.hero__content');
  const LEAF = 'h1, h2, p, a, button, li, dt, dd, span.line';
  /* Reading a rect per line of type is a forced layout, and doing it once
     per frame cost the two measurement routes a third of their frame rate
     for a dodge that was not even being drawn there. Measured at most four
     times a second, and only while the labels are actually on screen. */
  let rectCache = [];
  let rectAt = -1e9;
  /* PHASE 8.2 — 250 ms was still four forced layouts per second, and
     the profile put `getBoundingClientRect` at the top of the
     transition's JavaScript: 199 ms across six switches, more than
     every three.js call combined. The type this dodges moves on RESIZE
     and on SCROLL and at no other time, so it is measured on those and
     re-checked slowly in between — never inside the window a
     transition owns. */
  let measureBlockedUntil = 0;
  /** Called by the scene while a transition holds the frame budget. */
  function holdRects(ms) { measureBlockedUntil = performance.now() + ms; }
  function typeRects(now) {
    if (!avoidEl) return [];
    if (now < measureBlockedUntil) return rectCache;
    if (now - rectAt < 900) return rectCache;
    rectAt = now;
    const out = [];
    for (const el of avoidEl.querySelectorAll(LEAF)) {
      const r = el.getBoundingClientRect();
      if (r.width > 4 && r.height > 4) out.push(r);
    }
    rectCache = out.length ? out : [avoidEl.getBoundingClientRect()];
    return rectCache;
  }
  const stale = () => { rectAt = -1e9; };
  window.addEventListener('resize', stale, { passive: true });
  window.addEventListener('scroll', stale, { passive: true });

  return {
    holdMeasurement: holdRects,
    setAvoid(el) { avoidEl = el; rectAt = -1e9; },
    /**
     * @param {number} weight  0 hides the whole family
     * @param {object} lift    per-level extra Y, in world units, from the
     *   exploded view — a label has to travel with the plate it names
     * @param {string|null} focus  the level being read, if any
     */
    update(camera, group, rect, weight, lift = {}, focus = null, anchor = [-3.9, 0]) {
      /* Nothing to place, nothing to measure. The floor indicators are off
         on every route except QUANTIFY and CAPTURE, and this is what keeps
         them free everywhere else. */
      if (weight < 0.02) {
        for (const it of items) {
          if (it.shown !== 0) { it.el.style.opacity = '0'; it.shown = 0; }
        }
        return;
      }
      const avoid = typeRects(performance.now());
      const oL = rect.left || 0;
      const oT = rect.top || 0;
      /* PHASE 9 §05 — FOUR LABELS MAY NOT BECOME ONE SMUDGE.

         The labels are anchored at four elevations on one vertical line, so
         how far apart they land on screen depends entirely on the camera.
         Under the near-vertical QUANTIFY camera four metres of building
         projects to about twelve pixels and the four plates printed on top
         of each other — visible in qa/p9/shots/before-lap-quant-L01.png,
         where three elevations overlap into an unreadable stack.

         So they are placed in ONE pass, top-down, and a label that lands
         inside `MIN_GAP` of the last one placed stands down. The level
         being READ is placed first and never stands down: if only one label
         can be shown, it has to be that one. */
      const MIN_GAP = 26;
      const placed = [];
      const order = focus
        ? [...items].sort((a, b) => (a.id === focus ? -1 : b.id === focus ? 1 : 0))
        : items;
      for (const it of order) {
        const w = weight * (!focus || focus === it.id ? 1 : 0.34);
        if (w < 0.02) {
          if (it.shown !== 0) { it.el.style.opacity = '0'; it.shown = 0; }
          continue;
        }
        it.vec.set(anchor[0], it.y + (lift[it.id] || 0), anchor[1]);
        v.copy(it.vec).applyMatrix4(group.matrixWorld).project(camera);
        const x = (v.x * 0.5 + 0.5) * rect.width;
        const y = (-v.y * 0.5 + 0.5) * rect.height;
        const crowded = placed.some((p) => Math.abs(p - y) < MIN_GAP);
        /* The whole label, not just its dot: it trails ~180 px to the right
           of the anchor and that is the part that would land on a word. */
        const clash = avoid.some((a) => (
          x + 190 > a.left - oL - 8 && x < a.right - oL + 14
          && y + 9 > a.top - oT && y - 9 < a.bottom - oT));
        const off = clash || crowded || v.z > 1
          || x < 8 || x > rect.width - 8 || y < 40 || y > rect.height - 40;
        it.el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
        const o = off ? 0 : w;
        if (!off) placed.push(y);
        if (Math.abs(o - it.shown) > 0.01) {
          it.el.style.opacity = o.toFixed(2);
          it.shown = o;
        }
      }
    },
    dispose() {
      window.removeEventListener('resize', stale);
      window.removeEventListener('scroll', stale);
      items.forEach((i) => i.el.remove());
    },
  };
}

/**
 * @param {HTMLElement} container
 * @param {object} [sets] optional replacement callout sets. A service page
 *   passes its own anchors; omitted, the homepage sets are used. This is why
 *   three pages can share one projector without sharing one caption list.
 */
export function createAnnotations(container, sets = {}) {
  const anchorList = sets.anchors ?? ANCHORS;
  const extractList = sets.extracts ?? EXTRACTS;

  const mk = (cls, html) => {
    const el = document.createElement('div');
    el.className = cls;
    el.innerHTML = html;
    container.appendChild(el);
    return el;
  };

  const items = anchorList.map((a) => ({
    ...a,
    el: mk('anno',
      '<span class="anno__dot"></span><span class="anno__line"></span>' +
      `<span class="anno__text"><i>${a.k}</i> <b>${a.v}</b></span>`),
    vec: new THREE.Vector3(...a.p),
    shown: -1, flipped: null, px: -1e9, py: -1e9,
  }));

  let extractSource = extractList;
  const extracts = extractList.map((e) => ({
    ...e,
    el: mk('anno anno--x',
      '<span class="anno__dot"></span><span class="anno__line"></span>' +
      `<span class="anno__text"><i>${e.k}</i><b>${e.v}</b></span>`),
    vec: new THREE.Vector3(e.f.x, (e.y ?? PLAN.y) + 0.02, e.f.z),
    gate: 0, shown: -1, flipped: null, px: -1e9, py: -1e9,
  }));

  let avoid = null;
  let avoidAt = -1e9;
  let avoidBlockedUntil = 0;
  let avoidEl = document.querySelector('.hero__content');
  const measureAvoid = () => {
    avoid = avoidEl ? avoidEl.getBoundingClientRect() : null;
    avoidAt = performance.now();
  };
  measureAvoid();
  /* The avoided column is sticky, so it moves under the reader — on
     SCROLL and on RESIZE, and at no other time. Phase 8.1 read it at 10
     Hz from inside the render loop, which is a forced layout ten times a
     second forever; Phase 8.2 invalidates it on the two events that can
     actually move it and re-checks slowly in between. It is never read
     inside a window a transition owns. */
  const staleAvoid = () => { avoidAt = -1e9; };
  window.addEventListener('resize', staleAvoid, { passive: true });
  window.addEventListener('scroll', staleAvoid, { passive: true });

  const v = new THREE.Vector3();

  /** Shared projection + placement. Returns the on-screen weight. */
  function place(it, camera, group, rect, weight, opts) {
    if (weight < 0.02) {
      if (it.shown !== 0) { it.el.style.opacity = '0'; it.shown = 0; }
      return;
    }
    v.copy(it.vec).applyMatrix4(group.matrixWorld).project(camera);
    const behind = v.z > 1;
    const x = (v.x * 0.5 + 0.5) * rect.width;
    const y = (-v.y * 0.5 + 0.5) * rect.height;

    /* Never let a decorative callout land on the live text column.

       `rect` is the stage's SIZE, not a DOMRect — it has no left/top. Reading
       them gave NaN on both sides of every comparison, so `clash` was false
       for every callout and the dodge has silently never run. The stage is
       `position: fixed; inset: 0`, so the origin is 0,0 unless a caller says
       otherwise. */
    const oL = rect.left || 0;
    const oT = rect.top || 0;
    const clash = opts.dodge && avoid &&
      x > avoid.left - oL - 24 && x < avoid.right - oL + 24 &&
      y > avoid.top - oT - 16 && y < avoid.bottom - oT + 16;

    const off = behind || clash ||
      x < 16 || x > rect.width - 16 || y < opts.top || y > rect.height - opts.bottom;

    /* Flip when the label would grow into the live text column, not only at
       the screen edge — the anchor can sit clear of the column while the
       label it trails runs straight through the copy. */
    const guard = avoid ? avoid.left - oL : Infinity;
    const flip = x > rect.width - opts.flipAt ||
      (opts.dodge && x < guard && x + opts.flipAt > guard);
    if (flip !== it.flipped) {
      it.el.classList.toggle('anno--flip', flip);
      it.flipped = flip;
    }

    /* Skip the write when nothing moved half a pixel. An inline style write
       per label per frame is 18 style invalidations a frame for a parallax
       that is often stationary. */
    if (Math.abs(x - it.px) > 0.5 || Math.abs(y - it.py) > 0.5) {
      it.px = x; it.py = y;
      it.el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
    }
    const o = off ? 0 : weight;
    if (Math.abs(o - it.shown) > 0.01) {
      it.el.style.opacity = o.toFixed(2);
      it.shown = o;
    }
  }

  return {
    measure: measureAvoid,
    /** Hold every forced layout for `ms` — the scene calls this on any
        transition, because a measurement taken mid-motion is both the
        most expensive one and the least useful. */
    holdMeasurement(ms) { avoidBlockedUntil = performance.now() + ms; },

    /** Which text column the callouts must stay clear of. */
    setAvoid(el) { avoidEl = el; measureAvoid(); },

    /**
     * Rewrite the summary callouts' values in place.
     *
     * The QUANTIFY page's three anchors are AJTÓ / ABLAK / HELYISÉG, and what
     * they count changes with the floor selector. Their positions do not —
     * those are a composition decision about which half of the frame the
     * reading column owns — so only the text is replaced.
     */
    setAnchorValues(values) {
      items.forEach((it) => {
        const v = values[it.k];
        if (v === undefined || v === it.v) return;
        it.v = v;
        it.el.innerHTML = '<span class="anno__dot"></span><span class="anno__line"></span>'
          + `<span class="anno__text"><i>${it.k}</i> <b>${v}</b></span>`;
        it.shown = -1;
      });
    },

    /** Reveal extraction labels 0..n (−1 hides all). */
    /**
     * @param {number} n     reveal recognitions 0..n (−1 hides all)
     * @param {boolean} only PHASE 9 §22 — reveal ONLY n.
     *
     * The sequence reveals cumulatively, because that is what IDENTIFY is:
     * a reading happening element by element. Tracing ONE room is the
     * opposite act — it is a single answer to a single question, and
     * arriving from the 360 viewer with four other labels already on the
     * sheet buries the room the visitor came to see.
     */
    setExtract(n, only = false) {
      extracts.forEach((e, i) => {
        e.gate = (only ? i === n : i <= n) ? 1 : 0;
      });
    },

    /**
     * PHASE 8 — re-anchor the extraction sequence onto another storey.
     *
     * The DOM nodes are reused rather than rebuilt: the sequence is the same
     * five recognitions on every floor — two door types, a window type, a
     * room and a floor finish — and only what they point at and what they
     * count changes. A caller that has supplied its own extract list keeps
     * it; this only re-derives the ones that came from the plan.
     */
    setLevel(level) {
      if (sets.extracts === false) return;
      const next = extractsFor(level);
      extracts.forEach((it, i) => {
        const e = next[i];
        if (!e) { it.gate = 0; it.el.style.opacity = '0'; it.shown = 0; return; }
        Object.assign(it, e);
        it.vec.set(e.f.x, e.y + 0.02, e.f.z);
        it.el.innerHTML = '<span class="anno__dot"></span><span class="anno__line"></span>'
          + `<span class="anno__text"><i>${e.k}</i><b>${e.v}</b></span>`;
        it.shown = -1;
      });
      extractSource = next;
    },

    /**
     * Re-aim the room recognition at ONE named room.
     *
     * The extraction sequence normally points at the largest space on the
     * sheet, which is the right default and the wrong thing when a visitor
     * has just walked out of a particular room in the 360 viewer. This is
     * how "the room you were standing in" becomes "the room the quantity is
     * about" without a second callout system.
     */
    setRoomExtract(room) {
      const i = extractSource.findIndex((e) => e.id === 'room');
      const it = extracts[i];
      if (!it || !room) return null;
      const next = {
        ...it, f: room, box: [room.w * 0.92, room.d * 0.9],
        k: `HELYISÉG · ${room.id}`,
        v: `${room.area.toFixed(1).replace('.', ',')} m²`,
        y: planY(room.level),
        level: room.level,
      };
      Object.assign(it, next);
      extractSource[i] = next;
      it.vec.set(room.x, next.y + 0.02, room.z);
      it.el.innerHTML = '<span class="anno__dot"></span><span class="anno__line"></span>'
        + `<span class="anno__text"><i>${next.k}</i><b>${next.v}</b></span>`;
      it.shown = -1;
      return { index: i, ...next };
    },

    get extracts() { return extractSource; },

    update(camera, group, rect, setW, opts = {}) {
      const dodge = opts.dodge !== false;
      /* The avoided column is sticky — its position changes under the reader,
         so a rect measured when the section was entered no longer describes
         it. But it changes on SCROLL, not on every frame, and reading it in
         the render loop is a forced layout 60 times a second: measured at
         0,6 ms of a 1,16 ms frame, half the cost of drawing the scene. Ten
         times a second is finer than any scroll a reader can perform. */
      const now = performance.now();
      if (dodge && avoidEl && now >= avoidBlockedUntil && now - avoidAt > 500) {
        avoid = avoidEl.getBoundingClientRect();
        avoidAt = now;
      }
      for (const it of items) {
        place(it, camera, group, rect, setW[it.set] || 0, {
          dodge, top: opts.top ?? 132, bottom: 60, flipAt: 210,
        });
      }
      const xw = setW.extract || 0;
      for (const it of extracts) {
        place(it, camera, group, rect, xw * it.gate, {
          dodge, top: opts.top ?? 132, bottom: 60, flipAt: 250,
        });
      }
    },

    dispose() {
      window.removeEventListener('resize', staleAvoid);
      window.removeEventListener('scroll', staleAvoid);
      items.forEach((i) => i.el.remove());
      extracts.forEach((i) => i.el.remove());
    },
  };
}
