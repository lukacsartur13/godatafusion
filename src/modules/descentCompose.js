import {
  X0, X1, Z0, Z1, BASE_Y, roofY, floorY, planY, levelFeatures,
  levelById, MPU, SLAB_T,
} from '../webgl/levels.js';
import { PLAN_LEVEL, ROOM, WINDOW, STATION, SOFFIT } from '../webgl/descent.js';
import { SITE } from '../webgl/field.js';

/* ============================================================
   PHASE 11.2 — THE SPATIAL COMPOSITION SOLVER

   Phase 11 read "break the normal website grid" as "place text freely
   around the viewport", and the audit in qa/p112 says what that costs:
   168 elements at a fixed field percentage with no reason to be there,
   62 clipped or sitting under the navigation. NO GRID DOES NOT MEAN NO
   COMPOSITION — it means the grid is the building.

   So this file is the journey's second grid, and it is made of the four
   things the frame actually contains:

     TYPE A  GEOMETRY ANCHORED   a world point, projected. A floor label
                                 stands at a slab edge; a capture ID
                                 stands at its station. If the camera
                                 moves, the label moves, because the
                                 thing it names moved.
     TYPE B  ARCHITECTURAL VOID  editorial type in the largest negative
                                 region the camera has actually left,
                                 solved against the projected building
                                 bounds rather than guessed from one
                                 screenshot.
     TYPE C  STRUCTURAL DATUM    type and linework as one instrument: a
                                 ladder of real elevations with the word
                                 that names it set along its axis.
     TYPE D  GEOMETRY AS GRID    the room rectangles of the drawing used
                                 as typographic containers. This is the
                                 one technique Phase 11 got right and it
                                 is the reference standard here.

   WHAT THIS IS NOT. It is not an auto-layout engine and must not become
   one. It solves the thirteen states of one journey; every placer below
   names its own anchors, and a state that wanted a different composition
   would get a different placer rather than a new option on this one.

   THE CONTRACT WITH CSS. Everything here writes two custom properties —
   `--ax` and `--ay`, the element's top-left in viewport pixels — plus
   `--e`, how resolved it is. styles/descent.css consents to being placed
   under `.dsc.is-solved`; with no JavaScript, no WebGL or reduced motion
   that class is never set and the authored fallback grid is what runs.
   ============================================================ */

/* ------------------------------------------------------------------
   THE SAFE FIELD — PART 04

   Not a layout grid. A collision boundary, and nothing important may
   cross it: the navigation is live for the whole journey and so is the
   section tracker, and both of them are page furniture the journey is
   allowed to sit near but never under.
   ------------------------------------------------------------------ */
const EDGE = (vw) => (vw <= 900 ? 28 : Math.round(Math.min(72, Math.max(48, vw * 0.036))));

/* ---------------- small geometry ---------------- */
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;

function smoothstep(a, b, x) {
  const t = clamp((x - a) / (b - a || 1e-6), 0, 1);
  return t * t * (3 - 2 * t);
}

const rect = (x0, y0, x1, y1) => ({
  x0, y0, x1, y1, get w() { return x1 - x0; }, get h() { return y1 - y0; },
});

const overlaps = (a, b, pad = 0) =>
  a.x0 < b.x1 + pad && a.x1 > b.x0 - pad && a.y0 < b.y1 + pad && a.y1 > b.y0 - pad;

const inset = (r, dx, dy = dx) => rect(r.x0 + dx, r.y0 + dy, r.x1 - dx, r.y1 - dy);

/* The visible part of a projected line, or null. A slab edge is four
   metres of building and most of it is usually off screen; the label
   belongs to the part of it the reader can actually see. */
function clipSegment(a, b, f) {
  let t0 = 0, t1 = 1;
  const dx = b.x - a.x, dy = b.y - a.y;
  const test = (p, q) => {
    if (Math.abs(p) < 1e-9) return q >= 0;
    const r = q / p;
    if (p < 0) { if (r > t1) return false; if (r > t0) t0 = r; }
    else { if (r < t0) return false; if (r < t1) t1 = r; }
    return true;
  };
  if (!test(-dx, a.x - f.x0) || !test(dx, f.x1 - a.x)
    || !test(-dy, a.y - f.y0) || !test(dy, f.y1 - a.y)) return null;
  return {
    a: { x: a.x + dx * t0, y: a.y + dy * t0 },
    b: { x: a.x + dx * t1, y: a.y + dy * t1 },
    /* How much of the real edge is on screen. A floor whose edge has
       almost left the frame is a floor that has almost gone past. */
    seen: t1 - t0,
  };
}

function union(list) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const p of list) {
    if (!p) continue;
    x0 = Math.min(x0, p.x0 ?? p.x); y0 = Math.min(y0, p.y0 ?? p.y);
    x1 = Math.max(x1, p.x1 ?? p.x); y1 = Math.max(y1, p.y1 ?? p.y);
  }
  return x0 === Infinity ? null : rect(x0, y0, x1, y1);
}

/* ============================================================
   THE ANCHOR SET

   Every world point the journey's typography is allowed to stand on,
   named once. Nothing below invents a coordinate: each of these is read
   from webgl/levels.js, webgl/descent.js or webgl/field.js, which are
   the modules that own the building, the route and the ground.
   ============================================================ */
const headY = (id) => floorY(id) + levelById(id).winHead / MPU;
const sillY = (id) => floorY(id) + levelById(id).winSill / MPU;
const ceilY = (id) => floorY(id) + (levelById(id).ftf - SLAB_T) / MPU;

export const ANCHORS = {
  /** The whole building, as a box. The primary architectural subject. */
  building: () => ({ x0: X0, x1: X1, y0: BASE_Y, y1: roofY(), z0: Z0, z1: Z1 }),

  /** The excavated prism the cut/fill figure is computed over. */
  volume: () => ({
    x0: SITE.pad.x0, x1: SITE.pad.x1, y0: SITE.padY, y1: 0.58,
    z0: SITE.pad.z0, z1: SITE.pad.z1,
  }),

  /** The pane the camera crosses — L01-W01-04, south facade of R07. */
  pane: () => ({
    x0: WINDOW.x - 0.55, x1: WINDOW.x + 0.55, z0: WINDOW.z, z1: WINDOW.z,
    y0: sillY('L01'), y1: headY('L01'),
  }),

  /** The reference room's upper wall fields — where PRESENCE. can stand. */
  roomWalls: () => ([
    /* the west facade, above the window head */
    { x0: X0, x1: X0, z0: ROOM.z0, z1: ROOM.z1, y0: headY('L01'), y1: ceilY('L01') },
    /* the north partition, above the door head */
    { x0: ROOM.x0, x1: ROOM.x1, z0: ROOM.z0, z1: ROOM.z0, y0: headY('L01'), y1: ceilY('L01') },
  ]),

  /* PART 09 — the three zones EVERY / VIEW / REMAINS. belong to, in the
     order a round expanding from CP-11 reaches them. They are a wall
     bay, an opening and the floor: three different KINDS of surface, so
     the sentence is spoken by the room rather than laid over it. */
  phrase: () => ([
    /* Through the whole capture state the camera's screen-right is the
       room's −Z, so a sentence that reads left to right runs from the
       south end of the west wall to the north end of the floor. These
       three points are therefore in reading order ON SCREEN as well as
       in the markup, and they descend, which is what lets the phrase be
       read in one glance instead of assembled. */
    { key: 'every', x: X0, y: headY('L01'), z: ROOM.z1 - 0.20 },
    { key: 'view', x: X0, y: lerp(sillY('L01'), headY('L01'), 0.50), z: 1.45 },
    { key: 'remains', x: X0 + 0.65, y: floorY('L01'), z: ROOM.z0 + 0.14 },
  ]),

  /** The slab the floor crossing passes through, at the room's corner. */
  slab: () => ({
    x: ROOM.x0 + 0.18, z: ROOM.z0 + 0.14,
    finish: floorY('L01'), soffit: SOFFIT,
  }),

  /** A level's slab edge, as the segment the camera sees it as. */
  slabEdge: (id) => {
    const lv = levelById(id);
    const y = floorY(id);
    return { a: { x: lv.x1, y, z: Z0 }, b: { x: lv.x1, y, z: Z1 } };
  },

  /** The plan's four typographic rooms — PART 16's rule, unchanged. */
  planRooms: () => {
    const F = levelFeatures(PLAN_LEVEL);
    const usable = F.rooms.filter((r) => r.kind !== 'CIRC' && r.kind !== 'CORE');
    const quads = [[-1, -1], [1, -1], [-1, 1], [1, 1]];
    return quads.map(([sx, sz]) => {
      const inQ = usable.filter((r) => Math.sign(r.x || 1) === sx && Math.sign(r.z || 1) === sz);
      return (inQ.length ? inQ : usable).slice().sort((a, b) => b.area - a.area);
    });
  },

  /* PART 18 — every figure of the data field, the element of the drawing
     it was counted from, and how large it is allowed to be there.

     The ceiling matters as much as the anchor. Eight figures at the sizes
     Phase 11 used could not all stand on their own evidence — the first
     one was wider than the room it was counted from — so each one is
     capped at a fraction of the frame that keeps the hierarchy (the
     building's own area is read first) and still lets it sit where it
     came from. */
  dataSources: () => {
    const F = levelFeatures(PLAN_LEVEL);
    const mean = (list, fb) => (list.length
      ? { x: list.reduce((s, i) => s + i.x, 0) / list.length,
          z: list.reduce((s, i) => s + i.z, 0) / list.length }
      : fb);
    const uid = (u) => F.rooms.find((r) => r.uid === u);
    const biggest = F.rooms.slice().sort((a, b) => b.area - a.area)[0];
    const corridor = F.rooms.filter((r) => r.kind === 'CIRC')
      .sort((a, b) => b.area - a.area)[0] || biggest;
    const c = { x: 0, z: 0 };
    return [
      /* the building's floor area, in the largest room of the drawing */
      { key: 'area', room: biggest, max: 0.092 },
      /* the window count, along the facade the windows are cut into */
      { key: 'windows', at: mean(F.windows.filter((w) => w.side === 'S'), c), max: 0.058 },
      /* the door count, among the doors */
      { key: 'doors', at: mean(F.doors, c), max: 0.042 },
      /* the room the journey stood in, inside that room */
      { key: 'ref', room: uid(`${PLAN_LEVEL}-R07`) || biggest, max: 0.052 },
      { key: 'w03', at: mean(F.windows.filter((w) => w.type === 'W03'), c), max: 0.030 },
      { key: 'd01', at: mean(F.doors.filter((d) => d.type === 'D01'), c), max: 0.026 },
      /* the building height, on the drawing's own dimension line */
      { key: 'height', at: { x: (X0 + X1) / 2, z: Z0 - 0.85 }, max: 0.030 },
      /* the room count, along the circulation that connects them */
      { key: 'rooms', room: corridor, max: 0.026 },
    ];
  },
};

/* ============================================================
   THE COMPOSER
   ============================================================ */
export function createComposer({ getScene, section }) {
  const S = () => getScene?.() ?? null;
  const q = (sel) => section.querySelector(sel);
  const qa = (sel) => [...section.querySelectorAll(sel)];

  /* Every element the solver is responsible for. Adding the marker class
     here rather than in index.html keeps the markup free of a hook that
     only means something while JavaScript is running. */
  const P = {
    go: q('.dsc__go'), in: q('.dsc__in'), huEntry: q('.dsc__hu--entry'),
    tagA: q('.dsc__tag--a'), tagB: q('.dsc__tag--b'),
    g1: q('.dsc__tag--g1'), g2: q('.dsc__tag--g2'),
    presence: q('.dsc__word--presence'), i1: q('.dsc__tag--i1'), i2: q('.dsc__tag--i2'),
    huInterior: q('.dsc__hu--interior'),
    frags: qa('.dsc__frag'), huCapture: q('.dsc__hu--capture'), c1: q('.dsc__tag--c1'),
    sect: q('.dsc__sect'), huFloor: q('.dsc__hu--floor'),
    datum: q('.dsc__datum'), depth: q('.dsc__word--depth'),
    vol: q('.dsc__vol'), v1: q('.dsc__tag--v1'), v2: q('.dsc__tag--v2'),
    huVolume: q('.dsc__hu--volume'),
    levels: qa('.dsc__levels li'),
    proj: q('.dsc__proj'), huCollapse: q('.dsc__hu--collapse'),
    phrase: q('.dsc__phrase'), pw: qa('.dsc__pw'), p1: q('.dsc__tag--p1'),
    layers: q('.dsc__layers'),
    field: qa('.dsc__field li'),
    f1: q('.dsc__f1'), f2: q('.dsc__f2'), f3: q('.dsc__f3'),
  };
  /* Not placed — read, so DEPTH can span exactly the rungs it names. */
  const ladderEl = q('#dscLadder');

  const placed = new Set();
  const mark = (el) => { if (el && !placed.has(el)) { placed.add(el); el.classList.add('is-ph'); } };
  for (const v of Object.values(P)) {
    if (Array.isArray(v)) v.forEach(mark); else mark(v);
  }

  /* ---------------- measurement ----------------
     Positions are written as transforms, so nothing the solver does
     invalidates layout. Natural sizes are therefore read once per element
     per font-size and cached; the cache is dropped on resize and when the
     display face finishes loading, which are the only two events that can
     change what a word measures. */
  let gen = 0;
  /* The key is every inline property that can change what the element
     measures. Without the measure in it, a floor label whose size came
     from `--bfz` would be positioned from the size it had last frame —
     which is exactly the class of one-frame-late placement this module
     exists to remove. */
  const natKey = (el) => `${el.style.fontSize || ''}|${el.style.getPropertyValue('--pw')}`
    + `|${el.style.getPropertyValue('--bfz')}|${el.style.getPropertyValue('--nfz')}`;
  const natural = (el) => {
    const key = natKey(el);
    const c = el.__gdfNat;
    if (c && c.gen === gen && c.key === key) return c;
    const n = { gen, key, w: el.offsetWidth, h: el.offsetHeight };
    el.__gdfNat = n;
    return n;
  };
  /** Natural width and height per 1px of font-size, for an editorial word. */
  const ratios = (el) => {
    if (el.__gdfRat && el.__gdfRat.gen === gen) return el.__gdfRat;
    const prev = el.style.fontSize;
    el.style.fontSize = '100px';
    const r = { gen, w: el.offsetWidth / 100, h: el.offsetHeight / 100 };
    el.style.fontSize = prev;
    el.__gdfRat = r;
    return r;
  };
  const bump = () => { gen += 1; };
  window.addEventListener('resize', bump);
  document.fonts?.ready?.then(bump);

  /* ---------------- writing ----------------
     Every co-ordinate the placers work in is a VIEWPORT co-ordinate,
     because that is what `scene.project` returns and what the safe field
     is expressed in. The elements themselves are positioned inside the
     state's own pane, so the pane's origin is subtracted on the way out —
     once per state per frame, rather than being carried through forty
     call sites. */
  let O = { x: 0, y: 0 };

  function put(el, x, y, opts = {}) {
    if (!el) return null;
    if (opts.fs !== undefined) {
      const s = `${Math.round(opts.fs * 2) / 2}px`;
      if (el.style.fontSize !== s) el.style.fontSize = s;
    }
    if (opts.width !== undefined) el.style.setProperty('--pw', `${Math.round(opts.width)}px`);
    const n = natural(el);
    el.style.setProperty('--ax', `${Math.round((x - O.x) * 10) / 10}px`);
    el.style.setProperty('--ay', `${Math.round((y - O.y) * 10) / 10}px`);
    if (opts.e !== undefined) el.style.setProperty('--e', opts.e.toFixed(3));
    return rect(x, y, x + n.w, y + n.h);
  }

  /* ---------------- projection ---------------- */
  const project = (x, y, z) => S()?.project(x, y, z) ?? null;

  function projectBox(b) {
    const pts = [];
    for (const x of [b.x0, b.x1]) for (const y of [b.y0, b.y1]) for (const z of [b.z0, b.z1]) {
      const p = project(x, y, z);
      if (p) pts.push({ x0: p.x, y0: p.y, x1: p.x, y1: p.y });
    }
    /* Fewer than half the corners in front of the camera is not a box on
       screen, it is a camera inside the box — and a bounding rectangle
       from three corners of a cube you are standing in is a lie. */
    return pts.length >= 5 ? union(pts) : null;
  }

  function projectQuad(b) {
    const pts = [];
    for (const x of [b.x0, b.x1]) for (const y of [b.y0, b.y1]) for (const z of [b.z0, b.z1]) {
      const p = project(x, y, z);
      if (p) pts.push({ x0: p.x, y0: p.y, x1: p.x, y1: p.y });
    }
    return pts.length >= 4 ? union(pts) : null;
  }

  function roomBox(room, y) {
    const pts = [];
    for (const x of [room.x0, room.x1]) for (const z of [room.z0, room.z1]) {
      const p = project(x, y, z);
      if (p) pts.push({ x0: p.x, y0: p.y, x1: p.x, y1: p.y });
    }
    return pts.length === 4 ? union(pts) : null;
  }

  /* ---------------- the safe field ---------------- */
  const navEl = document.querySelector('.nav');
  const trackEl = document.querySelector('.tracker');
  function field() {
    const vw = window.innerWidth, vh = window.innerHeight;
    const pad = EDGE(vw);
    const nav = navEl ? Math.ceil(navEl.getBoundingClientRect().bottom) : 0;
    let right = vw - pad;
    if (trackEl && vw >= 1240) {
      const t = trackEl.getBoundingClientRect();
      if (t.width > 0) right = Math.min(right, t.left - 16);
    }
    return rect(pad, Math.max(pad, nav + Math.round(pad * 0.4)), right, vh - pad);
  }

  /* ------------------------------------------------------------------
     getNegativeSpace — the largest empty rectangle the camera left.

     Candidates are every rectangle whose edges are the safe field's
     edges or an obstacle's edges: with one or two obstacles that is a
     few dozen rectangles, which is cheap enough to solve every frame and
     is the only way the answer can follow the camera.
     ------------------------------------------------------------------ */
  function getNegativeSpace(avoid, f = field(), opt = {}) {
    const obs = avoid.filter(Boolean).map((a) => rect(
      clamp(a.x0, f.x0, f.x1), clamp(a.y0, f.y0, f.y1),
      clamp(a.x1, f.x0, f.x1), clamp(a.y1, f.y0, f.y1),
    )).filter((a) => a.w > 2 && a.h > 2);
    const xs = [f.x0, f.x1], ys = [f.y0, f.y1];
    for (const a of obs) {
      for (const v of [a.x0, a.x1]) if (v > f.x0 && v < f.x1) xs.push(v);
      for (const v of [a.y0, a.y1]) if (v > f.y0 && v < f.y1) ys.push(v);
    }
    xs.sort((a, b) => a - b); ys.sort((a, b) => a - b);
    const minW = opt.minW ?? 90, minH = opt.minH ?? 42;
    let best = null, bestScore = -1;
    for (let i = 0; i < xs.length - 1; i++) {
      for (let j = i + 1; j < xs.length; j++) {
        const w = xs[j] - xs[i];
        if (w < minW) continue;
        for (let k = 0; k < ys.length - 1; k++) {
          for (let l = k + 1; l < ys.length; l++) {
            const h = ys[l] - ys[k];
            if (h < minH) continue;
            const r = rect(xs[i], ys[k], xs[j], ys[l]);
            if (obs.some((a) => overlaps(r, a, -1))) continue;
            /* A word wants width. A tall sliver has area and no use, so
               height only counts up to three quarters of the width. */
            let s = w * Math.min(h, w * 0.75);
            if (opt.bias) s *= opt.bias(r, f);
            if (s > bestScore) { bestScore = s; best = r; }
          }
        }
      }
    }
    return best;
  }

  /* ------------------------------------------------------------------
     fitEditorialType — a word, set to the region it was given.

     The size comes from the space, never from a viewport percentage: a
     region half the frame wide gets a word half the frame wide, and the
     min/max are what stop the same rule producing a caption on one
     screen and a billboard on the next.

     `bleed` is PART 05's intentional crop, and it is the only way a word
     may leave the frame. It is a fraction of the word's own width, it is
     the same fraction at every breakpoint, and it is never more than the
     22% that still leaves four fifths of the letterforms standing.
     ------------------------------------------------------------------ */
  function fitEditorialType(el, region, o = {}) {
    if (!el || !region) return null;
    const r = ratios(el);
    const bleed = clamp(o.bleed ?? 0, 0, 0.22);
    const avail = region.w / (1 - bleed);
    let fs = Math.min(avail / r.w, region.h / r.h);
    fs = clamp(fs, o.min ?? 15, o.max ?? 260);
    const w = fs * r.w, h = fs * r.h;
    const align = o.align ?? 'start';
    let x = align === 'end' ? region.x1 - w
      : align === 'center' ? region.x0 + (region.w - w) / 2
        : region.x0;
    const valign = o.valign ?? 'center';
    let y = valign === 'end' ? region.y1 - h
      : valign === 'start' ? region.y0
        : region.y0 + (region.h - h) / 2;
    if (o.centerY !== undefined) y = o.centerY - h / 2;
    if (o.clampTo) {
      const f = o.clampTo;
      const slack = w * bleed;
      x = clamp(x, f.x0 - slack, Math.max(f.x0 - slack, f.x1 - w + slack));
      y = clamp(y, f.y0, Math.max(f.y0, f.y1 - h));
    }
    return { el, x, y, w, h, fs };
  }

  /* ------------------------------------------------------------------
     avoidBounds — move a box until it stops colliding, or say it failed.

     The first version stopped at the FIRST obstacle it found and gave up
     after three passes, which is how two of the data field's labels ended
     up printed on top of each other: each was clear of the box it had
     been tested against and inside the one it had not.

     This one resolves against the WHOLE set each pass, and it returns
     whether it actually succeeded — because a figure that cannot be
     placed clear of everything else should not be drawn at all (PART 27)
     rather than drawn on top of its neighbour.
     ------------------------------------------------------------------ */
  function avoidBounds(box, avoid, f, pad = 12) {
    const obs = avoid.filter(Boolean);
    const hit = (x, y) => {
      const r = rect(x, y, x + box.w, y + box.h);
      let worst = null, area = 0;
      for (const a of obs) {
        const ox = Math.min(r.x1, a.x1 + pad) - Math.max(r.x0, a.x0 - pad);
        const oy = Math.min(r.y1, a.y1 + pad) - Math.max(r.y0, a.y0 - pad);
        if (ox <= 0 || oy <= 0) continue;
        if (ox * oy > area) { area = ox * oy; worst = a; }
      }
      return { worst, area };
    };
    let { x, y } = box;
    for (let pass = 0; pass < 6; pass++) {
      const h = hit(x, y);
      if (!h.worst) return { ...box, x, y, ok: true };
      const a = h.worst;
      const cand = [
        { x: a.x0 - box.w - pad, y },
        { x: a.x1 + pad, y },
        { x, y: a.y0 - box.h - pad },
        { x, y: a.y1 + pad },
      ].filter((c) => c.x >= f.x0 && c.x + box.w <= f.x1
        && c.y >= f.y0 && c.y + box.h <= f.y1)
        .map((c) => ({ ...c, m: Math.hypot(c.x - box.x, c.y - box.y), o: hit(c.x, c.y).area }));
      if (!cand.length) return { ...box, x, y, ok: false };
      cand.sort((p, q) => (p.o - q.o) || (p.m - q.m));
      if (cand[0].o >= h.area) return { ...box, x, y, ok: false };
      ({ x, y } = cand[0]);
    }
    return { ...box, x, y, ok: !hit(x, y).worst };
  }

  const commit = (items) => {
    for (const i of items) if (i) put(i.el, i.x, i.y, { fs: i.fs, e: i.e });
  };

  /* ------------------------------------------------------------------
     insideFade — the fade that replaces a clip.

     PART 14 lets a floor label travel past the frame with its own floor,
     and PART 25 fails the phase for a word that is unintentionally cut.
     Both are true at once if the label goes out by FADING as it goes.

     The allowance is deliberately asymmetric. Sideways and downward a
     label may hang a little way past the safe field before it dims,
     because that is the direction a floor actually leaves a rising
     camera. Upward it may not: above the field is the navigation, and
     nothing in this journey is allowed under it at any opacity.
     ------------------------------------------------------------------ */
  function insideFade(box, f, slack = 0) {
    const side = Math.min(box.x0 - f.x0, f.x1 - box.x1, f.y1 - box.y1);
    const top = box.y0 - f.y0;
    return clamp((side + slack) / (slack + 8), 0, 1) * clamp((top + 2) / 26, 0, 1);
  }

  /* ============================================================
     THE STATE PLACERS

     One per state. Each names its own anchors and its own relationships,
     which is the whole point: there is no generic rule that could know
     that INSIDE. belongs beside the opening and DEPTH belongs on the
     datum.

     `ctx` carries the sampled camera frame, the state's local progress
     and the arrival curve the CSS would otherwise have computed.
     ============================================================ */
  const placers = {
    /* ---------- 07 · GO INSIDE. ---------- */
    entry(ctx) {
      const f = field();
      const B = projectBox(ANCHORS.building());
      const pane = projectQuad(ANCHORS.pane());
      /* The word goes in the largest void the building has left, and the
         SIDE is decided by where the opening is: reading has to end
         pointing at the thing the sentence names. */
      /* The minimum height is what stops the solver answering with the
         letterbox above the roofline: that band has the most AREA on a
         wide screen and it is the one region the word cannot be large in,
         nor near the opening. A void has to be able to hold the word. */
      const region = getNegativeSpace([B], f, { minW: f.w * 0.20, minH: f.h * 0.30 })
        || getNegativeSpace([B], f, { minW: f.w * 0.16, minH: f.h * 0.18 })
        || inset(f, 10);
      const toward = pane ? (pane.x0 + pane.x1) / 2 : (B ? (B.x0 + B.x1) / 2 : f.x1);
      const rightOfWord = region.x1 <= toward + 4;

      /* A gap off the silhouette, so the last letter ENDS at the facade
         instead of climbing onto it. */
      const gap = Math.max(10, f.w * 0.014);
      const bigRegion = rect(region.x0 + (rightOfWord ? 0 : gap),
        region.y0 + region.h * 0.22,
        region.x1 - (rightOfWord ? gap : 0), region.y1);
      const big = fitEditorialType(P.in, bigRegion, {
        min: 34, max: Math.max(110, window.innerWidth * 0.17),
        align: rightOfWord ? 'end' : 'start', clampTo: f,
        centerY: pane ? clamp((pane.y0 + pane.y1) / 2, region.y0 + region.h * 0.45, region.y1 - 10)
          : undefined,
      });
      if (!big) return;
      big.y = clamp(big.y, f.y0, f.y1 - big.h);
      /* GO is the instruction, not a second headline: a fixed fraction of
         the word it introduces, on the same reading edge, one line above. */
      const goFs = clamp(big.fs * 0.26, 17, 74);
      const goR = P.go ? ratios(P.go) : null;
      const go = goR
        ? { el: P.go, fs: goFs, w: goFs * goR.w, h: goFs * goR.h, x: big.x, y: 0 }
        : null;
      if (go) {
        go.y = big.y - go.h * 0.92;
        if (go.y < f.y0) { const d = f.y0 - go.y; go.y += d; big.y += d; }
      }
      commit([go, big]);

      /* The lede belongs to the lockup and sits under it, on the same
         edge, at the lockup's own measure rather than at a page measure. */
      if (P.huEntry) {
        const w = clamp(big.w * 0.62, 200, 380);
        put(P.huEntry, big.x, Math.min(big.y + big.h + 22, f.y1 - 52), { width: w });
      }
      /* Two technical marks: the sheet number at the field's own corner,
         and the building's own quantity ON the building — under its base
         line, left-aligned to its silhouette. */
      if (P.tagA) put(P.tagA, f.x0, f.y0);
      if (P.tagB) {
        const n = natural(P.tagB);
        const x = B ? clamp(B.x0, f.x0, f.x1 - n.w) : f.x1 - n.w;
        const y = B ? clamp(B.y1 + 14, f.y0, f.y1 - n.h) : f.y1 - n.h;
        put(P.tagB, x, y);
      }
    },

    /* ---------- 02 · GLASS ---------- */
    glass() {
      const f = field();
      const pane = projectQuad(ANCHORS.pane());
      const n1 = P.g1 ? natural(P.g1) : null;
      const x = pane ? clamp(pane.x1 + 18, f.x0, f.x1 - (n1?.w ?? 120)) : f.x0;
      const y = pane ? clamp(pane.y0, f.y0, f.y1 - 48) : f.y0 + 60;
      put(P.g1, x, y);
      put(P.g2, x, y + (n1?.h ?? 16) + 6);
    },

    /* ---------- 08 · PRESENCE. ---------- */
    interior() {
      const f = field();
      /* One dominant word, standing on a real wall field. Two candidate
         planes are offered and the frame chooses: whichever of them the
         camera has actually left more of on screen. */
      const walls = ANCHORS.roomWalls().map(projectQuad).filter(Boolean)
        .map((w) => rect(clamp(w.x0, f.x0, f.x1), clamp(w.y0, f.y0, f.y1),
          clamp(w.x1, f.x0, f.x1), clamp(w.y1, f.y0, f.y1)))
        .filter((w) => w.w > 120 && w.h > 40);
      /* Of the planes big enough to carry the word, the HIGHER one wins.
         PART 08 asks for the upper wall field, and the upper wall field
         is the one part of a room that has nothing else in it. */
      const area = Math.max(0, ...walls.map((w) => w.w * w.h));
      const region = walls.filter((w) => w.w * w.h >= area * 0.42)
        .sort((a, b) => a.y0 - b.y0)[0]
        || getNegativeSpace([], f) || inset(f, 12);
      const word = fitEditorialType(P.presence, inset(region, 8, 4), {
        min: 30, max: Math.max(88, window.innerWidth * 0.135), align: 'start', clampTo: f,
      });
      if (word) commit([word]);

      /* The technical data stands on the room's own floor datum, at the
         far wall, as a stack — an elevation and the station that reads
         it, which are one instrument and not two floating marks. */
      const base = project(ROOM.x0 + 0.12, floorY('L01'), ROOM.z0 + 0.10)
        || project(STATION.x, floorY('L01'), STATION.z);
      const n1 = P.i1 ? natural(P.i1) : { w: 120, h: 16 };
      const n2 = P.i2 ? natural(P.i2) : { w: 80, h: 16 };
      let dx = base ? base.x : f.x1 - n1.w;
      let dy = base ? base.y - n1.h - n2.h - 10 : f.y1 - 90;
      dx = clamp(dx, f.x0, f.x1 - Math.max(n1.w, n2.w));
      dy = clamp(dy, f.y0, f.y1 - n1.h - n2.h - 6);
      put(P.i1, dx, dy);
      put(P.i2, dx, dy + n1.h + 4);

      if (P.huInterior) {
        const n = natural(P.huInterior);
        const avoid = word ? [rect(word.x, word.y, word.x + word.w, word.y + word.h)] : [];
        const box = avoidBounds({ x: f.x0, y: f.y1 - n.h, w: n.w, h: n.h }, avoid, f);
        put(P.huInterior, box.x, box.y, { width: Math.min(n.w, 330) });
      }
    },

    /* ------------------------------------------------------------------
       09 · EVERY / VIEW / REMAINS. — one spatial sentence

       Three words on three different KINDS of surface — a wall bay, an
       opening, the floor — and the thing that makes them one phrase
       rather than three fragments is that they are set on ONE line
       through their own projected anchors.

       The line is fitted, not authored: it is the least-squares axis of
       the three points the room actually puts on screen, so it tilts with
       the camera and it is the room's diagonal rather than a taste. Its
       slope is limited to about 27 degrees, past which a sentence stops
       being read in one glance.
       ------------------------------------------------------------------ */
    capture(ctx) {
      const f = field();
      const pts = ANCHORS.phrase().map((a) => {
        const p = project(a.x, a.y, a.z);
        return p ? { ...a, sx: p.x, sy: p.y } : null;
      });
      const live = pts.filter(Boolean);
      if (live.length < 2 || !P.frags.length) return;

      /* least squares y = m x + c, with the slope held readable */
      const n = live.length;
      const mx = live.reduce((s, p) => s + p.sx, 0) / n;
      const my = live.reduce((s, p) => s + p.sy, 0) / n;
      let num = 0, den = 0;
      for (const p of live) { num += (p.sx - mx) * (p.sy - my); den += (p.sx - mx) ** 2; }
      /* The axis is fitted from the room, and then held inside the band a
         sentence can still be read across: never rising to the right,
         because a phrase that climbs is read as three fragments, and
         never past about 27 degrees down. */
      const m = clamp(den > 1 ? num / den : 0.22, 0.10, 0.46);
      const dir = { x: 1 / Math.hypot(1, m), y: m / Math.hypot(1, m) };

      /* ------------------------------------------------------------
         THE ROOM SETS THE RHYTHM, THE FRAME SETS THE EXTENT.

         The first cut laid each word at its own projected anchor and then
         scaled the whole group to fit. At this camera two of the three
         anchors are off screen — the wall head is above the frame and the
         opening is past the right margin — so the group came out three
         thousand pixels wide and the fit shrank every word to 63% of the
         size it had been authored at. A composition whose type size is a
         by-product of how far apart two invisible points landed is not a
         composition.

         So the anchors decide two things and only two: the DIRECTION of
         the axis, and the RATIO of the gaps along it. The words keep the
         sizes they were given and the phrase is laid out across the safe
         field in the room's own proportions.
         ------------------------------------------------------------ */
      const t = live.map((p) => (p.sx - mx) * dir.x + (p.sy - my) * dir.y);
      const order = ['every', 'view', 'remains'];
      const sizes = [0.082, 0.062, 0.115];        // fractions of the safe field's width
      let items = order.map((key, i) => {
        const el = P.frags[i];
        if (!el) return null;
        const idx = live.findIndex((p) => p.key === key);
        const r = ratios(el);
        const fs = clamp(f.w * sizes[i], 22, Math.max(84, window.innerWidth * 0.115));
        return { el, key, fs, w: fs * r.w, h: fs * r.h, r,
          tn: idx >= 0 ? t[idx] : i, anchor: live[idx] || null };
      }).filter(Boolean);

      /* Normalised anchor positions along the axis, in reading order. A
         camera that puts them out of order still reads forwards: the
         sentence is the sentence. */
      const lo = Math.min(...items.map((i) => i.tn));
      const hi = Math.max(...items.map((i) => i.tn));
      const span = Math.max(1e-3, hi - lo);
      items.forEach((it) => { it.tn = clamp((it.tn - lo) / span, 0, 1); });
      for (let i = 1; i < items.length; i++) {
        items[i].tn = Math.max(items[i].tn, items[i - 1].tn);
      }

      /* If the three words at their authored sizes cannot fit the field
         end to end, every one of them comes down by the same factor —
         which is a fit, not a re-composition. */
      const gap = f.w * 0.026;
      const avail = f.w - 6;
      let wsum = items.reduce((a, i) => a + i.w, 0) + gap * (items.length - 1);
      if (wsum > avail) {
        const k = avail / wsum;
        items.forEach((i) => { i.fs *= k; i.w *= k; i.h *= k; });
        wsum = avail;
      }
      const slack = Math.max(0, avail - wsum);

      let cursor = 0;
      items.forEach((it, i) => {
        if (i > 0) cursor += items[i - 1].w + gap + slack * (it.tn - items[i - 1].tn);
        it.t = cursor;
      });

      /* One line, hung on the centroid of the anchors the room did put on
         screen, and then moved as a rigid body until it is inside the
         field. Rigid, because the phrase is one object. */
      const runW = cursor + items[items.length - 1].w;
      const originX = clamp(mx - runW / 2, f.x0 + 3, Math.max(f.x0 + 3, f.x1 - runW - 3));
      items.forEach((it) => {
        it.x = originX + it.t;
        it.y = my + (it.x + it.w / 2 - mx) * m - it.h / 2;
      });
      const gb = union(items.map((i) => rect(i.x, i.y, i.x + i.w, i.y + i.h)));
      const dy = clamp(0, f.y0 + 4 - gb.y0, f.y1 - 4 - gb.y1);
      items.forEach((it) => { it.y += dy; });

      /* ------------------------------------------------------------
         PART 10 — THE PHRASE AND THE ROUND ARE ONE EVENT

         The sentence is gated on the sampling shell having reached the
         FARTHEST of its three surfaces: one gate for one phrase, because
         "they must read together in one glance" and three independent
         thresholds is three independent animations, which is the gimmick
         the brief asks for none of.

         It is a gate and not a timer: before the round has covered the
         room the phrase cannot start, and after it has, the words arrive
         in reading order. Nothing here can bring a word forward.
         ------------------------------------------------------------ */
      const sample = ctx.frame?.sample ?? 0;
      const reach = ANCHORS.phrase().reduce((d, a) => Math.max(d,
        Math.hypot(a.x - STATION.x, a.y - STATION.y, a.z - STATION.z)), 0);
      /* The round's own progress: nothing until it starts, complete when
         the shell has cleared the farthest surface the phrase stands on.
         There is no scroll number in this — the reader's position reaches
         the words through the measurement, which is the whole of PART 10.

         WHY ONE CURVE AND NOT THREE THRESHOLDS. The station sits near the
         middle of the room, so a shell expanding from it reaches a
         left-to-right sentence from the middle outwards: no assignment of
         these three surfaces to these three words can make the shell
         arrive in reading order, and a sentence that resolves backwards is
         not a sentence. So the round drives ONE progress and the words
         take their turn along it — physical trigger, reading order, and
         no third animation invented to reconcile them. */
      const g = clamp(sample / (reach + 0.10), 0, 1);
      items.forEach((it, i) => {
        it.e = Math.min(ctx.arrive(0.02 + 0.05 * i),
          smoothstep(i * 0.20, i * 0.20 + 0.46, g));
      });
      commit(items);

      const bottom = union(items.map((i) => rect(i.x, i.y, i.x + i.w, i.y + i.h)));
      if (P.huCapture) {
        const nn = natural(P.huCapture);
        put(P.huCapture, f.x0, clamp((bottom?.y1 ?? f.y0) + 24, f.y0, f.y1 - nn.h - 26),
          { width: Math.min(nn.w, 320) });
      }
      if (P.c1) { const nn = natural(P.c1); put(P.c1, f.x0, f.y1 - nn.h); }
    },

    /* ------------------------------------------------------------------
       11 · FLOOR CROSSING — almost no typography

       The geometry is the event. Two labels, and they hug the assembly
       they name: FINISH on the finished floor line, SLAB on the middle of
       the structural slab, both read off the same projected wall corner.
       ------------------------------------------------------------------ */
    floor() {
      const f = field();
      const a = ANCHORS.slab();
      const top = project(a.x, a.finish, a.z);
      const n = P.sect ? natural(P.sect) : { w: 220, h: 90 };
      /* Inside the assembly the camera is pressed against the soffit and
         pointed almost straight down: there is no projected slab line,
         because the slab is the whole frame. So the key falls back to the
         frame's own vertical centre — which IS where the slab is, for the
         only reason this composition was ever symmetrical. */
      const usable = top && top.x > f.x0 - 40 && top.x < f.x1 - n.w
        && top.y > f.y0 && top.y < f.y1 - n.h;
      const x = usable ? clamp(top.x + 26, f.x0, f.x1 - n.w) : f.x0;
      const y = usable ? clamp(top.y - n.h * 0.25, f.y0, f.y1 - n.h)
        : f.y0 + (f.h - n.h) / 2;
      put(P.sect, x, y);
      /* The note is a footnote and goes where every other footnote in the
         journey goes. Under the key it sat on the brightest part of a
         frame that is a single pale gradient, at half opacity, which is
         not a caption — it is an invisible one. */
      if (P.huFloor) {
        const nn = natural(P.huFloor);
        put(P.huFloor, f.x0, f.y1 - nn.h, { width: Math.min(nn.w, 320) });
      }
    },

    /* ------------------------------------------------------------------
       12 · THE UNDERWORLD — the datum IS the composition

       DEPTH. was a very large word alone in black space at the bottom
       right, cropped on two edges, with the survey ladder unrelated to it
       at the far left. They are one instrument now: the word is set
       vertically along the ladder's own axis and spans exactly the
       ladder's height, so the typography and the linework measure the
       same thing.
       ------------------------------------------------------------------ */
    under() {
      const f = field();
      const nD = P.datum ? natural(P.datum) : { w: 300, h: 400 };
      /* The instrument stands against the excavation rather than in the
         middle of nothing: its head goes to the cut prism's projected
         top edge, so the ladder is measuring the thing overhead. */
      const V = projectBox(ANCHORS.volume());
      const wordW = P.depth ? Math.max(70, natural(P.depth).w) : 96;
      const x = clamp(f.x0 + wordW + 20, f.x0, Math.max(f.x0, f.x1 - nD.w));
      let y = V ? V.y0 - nD.h * 0.16 : f.y0 + (f.h - nD.h) / 2;
      y = clamp(y, f.y0, Math.max(f.y0, f.y1 - nD.h));
      put(P.datum, x, y);

      if (P.depth) {
        /* DEPTH is set on the ladder's own axis and spans the RUNGS, not
           the block: the word measures the same interval the elevations
           do, which is the whole reason the two read as one instrument
           rather than as a headline next to a table.

           The size follows from that span — it is a consequence of how
           tall the survey is, and it cannot be chosen. */
        const rungs = ladderEl?.getBoundingClientRect();
        const top = rungs && rungs.height > 40 ? rungs.top : y;
        const height = rungs && rungs.height > 40 ? rungs.height : nD.h;
        const r = ratios(P.depth);           // already the VERTICAL metrics
        const fs = clamp(height / Math.max(0.8, r.h), 20, Math.max(62, window.innerWidth * 0.075));
        const wpx = fs * r.w, hpx = fs * r.h;
        put(P.depth, clamp(x - wpx - 16, f.x0, Math.max(f.x0, f.x1 - wpx)),
          clamp(top + (height - hpx) / 2, f.y0, Math.max(f.y0, f.y1 - hpx)), { fs });
      }
    },

    /* ------------------------------------------------------------------
       13 · 411,7 M³ — the number belongs to the volume

       PART 13 asks for a refinement rather than a redesign. The figure
       keeps its scale and its hung unit; what changes is that its box is
       now solved against the projected cut prism — left edge to the
       volume's left edge, baseline on the volume's own base — so the
       number reads as a dimension of the thing behind it.
       ------------------------------------------------------------------ */
    volume() {
      const f = field();
      const V = projectBox(ANCHORS.volume());
      const n = P.vol ? natural(P.vol) : { w: 400, h: 200 };
      let x = f.x0, y = f.y0 + (f.h - n.h) / 2;
      if (V) {
        x = clamp(V.x0, f.x0, Math.max(f.x0, f.x1 - n.w));
        y = clamp(V.y1 - n.h, f.y0, Math.max(f.y0, f.y1 - n.h));
      }
      put(P.vol, x, y);
      /* CUT and FILL are the figure's own head and foot, aligned to it. */
      const n1 = P.v1 ? natural(P.v1) : { w: 40, h: 16 };
      put(P.v1, x, clamp(y - n1.h - 10, f.y0, f.y1));
      put(P.v2, x, clamp(y + n.h + 8, f.y0, f.y1 - 16));
      if (P.huVolume) {
        const nn = natural(P.huVolume);
        const w = Math.min(nn.w, 320);
        put(P.huVolume, clamp(f.x1 - w, f.x0, f.x1 - w), f.y1 - nn.h, { width: w });
      }
    },

    /* ------------------------------------------------------------------
       14/15 · THE ASCENT — floor labels are architectural objects

       This was the worst frame in the audit: three enormous words stacked
       on a fixed field, with L02 under the navigation and the elevations
       cut in half at every width tested.

       A floor label is signage. It stands at the slab edge it names, at a
       size set by how far away that slab is, and it leaves the frame only
       because the floor leaves the frame — fading as it goes rather than
       being cut.
       ------------------------------------------------------------------ */
    ascent(ctx) {
      const f = field();
      const ids = ['L00', 'L01', 'L02'];
      P.levels.forEach((li, i) => {
        const id = li.dataset.level || ids[i];
        const pres = ctx.level?.[i] ?? 0;
        if (pres <= 0.001) { li.style.setProperty('--e', '0'); return; }
        const e = ANCHORS.slabEdge(id);
        const a = project(e.a.x, e.a.y, e.a.z);
        const b = project(e.b.x, e.b.y, e.b.z);
        if (!a || !b) { li.style.setProperty('--e', '0'); return; }

        /* A slab edge is four and a half metres of building and, from
           inside the plate, most of it is off screen — the raw midpoint
           of the projected edge was five hundred pixels past the right
           margin, which is exactly how a label that is "attached to the
           floor" ends up attached to nothing. The label stands on the
           part of the edge the reader can SEE. */
        const seg = clipSegment(a, b, inset(f, 6));
        if (!seg) { li.style.setProperty('--e', '0'); return; }

        /* Size from how long that edge reads, held between a floor and a
           ceiling. A level mark is signage: it does not become a headline
           because the camera got close, and it does not disappear because
           it got far. PART 15. */
        const edgePx = Math.hypot(b.x - a.x, b.y - a.y);
        const fs = clamp(edgePx * 0.055,
          Math.max(30, window.innerWidth * 0.030),
          Math.max(54, window.innerWidth * 0.082));
        li.style.setProperty('--bfz', `${Math.round(fs * 2) / 2}px`);
        li.style.setProperty('--ifz', `${Math.round(fs * 0.27 * 2) / 2}px`);
        const n = natural(li);
        if (!n.w || !n.h) return;

        /* Sitting ON the edge: the label's baseline is the slab line, and
           it hangs off whichever end of the visible run has room. */
        const mx = (seg.a.x + seg.b.x) / 2, my = (seg.a.y + seg.b.y) / 2;
        const x = clamp(mx - n.w / 2, f.x0, Math.max(f.x0, f.x1 - n.w));
        const y = my - n.h - Math.max(6, fs * 0.10);
        /* PART 05 / PART 14 — it goes out with its floor, and it goes
           out by fading. What it may never do is get cut in half. */
        /* `seg.seen` is the fraction of the world edge that is on screen,
           and it is a presence test, NOT a fade. Fading by it dimmed every
           mobile floor label to a third, because a narrow frame sees a
           smaller share of a four-and-a-half metre slab edge — which says
           nothing about whether that floor is leaving. Whether the LABEL
           is leaving is what insideFade already answers. */
        const vis = insideFade(rect(x, y, x + n.w, y + n.h), f, 34)
          * clamp((seg.seen - 0.008) / 0.03, 0, 1);
        put(li, x, y, { e: pres * vis });
      });
    },

    /* ---------- 11 · PERSPECTIVE COLLAPSE ---------- */
    collapse(ctx) {
      const f = field();
      const n = P.proj ? natural(P.proj) : { w: 180, h: 40 };
      put(P.proj, f.x1 - n.w, f.y0);
      if (P.huCollapse) {
        const nn = natural(P.huCollapse);
        put(P.huCollapse, f.x0, f.y1 - nn.h, { width: Math.min(nn.w, 320) });
      }
    },

    /* ------------------------------------------------------------------
       16/17 · THE PLAN IS THE GRID — the reference standard

       Kept, and made honest about failure. The rule is unchanged: the
       largest non-circulation room in each quadrant, in plan reading
       order. What is new is that the word is MEASURED against the room's
       projected rectangle, inset by a real margin, and if it does not fit
       the placer takes the next room in that quadrant rather than
       shrinking the word until it cannot be read.
       ------------------------------------------------------------------ */
    plan(ctx) {
      const f = field();
      const y = planY(PLAN_LEVEL);
      const quads = quadRooms;
      const taken = [];
      P.pw.forEach((el, i) => {
        const cand = quads[i] || [];
        const r = ratios(el);
        let chosen = null;
        for (const room of cand) {
          const b = roomBox(room, y);
          if (!b) continue;
          const pad = Math.max(6, Math.min(b.w, b.h) * 0.12);
          const cell = inset(b, pad);
          if (cell.w < 24 || cell.h < 14) continue;
          /* A room name on a drawing is set to the room, and in a room
             that is one structural bay wide that means it is set DOWN it.
             DRAWING in a 0.8-bay project room came out at a quarter of
             FROM's size — a hierarchy produced by spelling rather than by
             plan — and turning it costs nothing, because a rotated room
             name is what the drawing it is standing on would do.

             Vertical has to WIN clearly, not narrowly: a word turned for
             a 5% gain is a word turned for no reason. */
          const across = Math.min(cell.w / r.w, cell.h / r.h);
          const down = Math.min(cell.w / r.h, (cell.h * 0.94) / r.w);
          const vert = down > across * 1.35;
          const fs = vert ? down : across;
          if (fs < 13 && cand.indexOf(room) < cand.length - 1) continue;
          chosen = { room, cell, vert, fs: clamp(fs, 12, window.innerWidth * 0.062) };
          break;
        }
        if (!chosen) { el.style.setProperty('--e', '0'); return; }
        el.classList.toggle('is-down', chosen.vert);
        const w = chosen.fs * (chosen.vert ? r.h : r.w);
        const h = chosen.fs * (chosen.vert ? r.w : r.h);
        let x = chosen.cell.x0 + (chosen.cell.w - w) / 2;
        let yy = chosen.cell.y0 + (chosen.cell.h - h) / 2;
        x = clamp(x, f.x0, Math.max(f.x0, f.x1 - w));
        yy = clamp(yy, f.y0, Math.max(f.y0, f.y1 - h));
        const box = { el, x, y: yy, w, h, fs: chosen.fs };
        const fixed = avoidBounds(box, taken, f, 8);
        taken.push(rect(fixed.x, fixed.y, fixed.x + w, fixed.y + h));
        /* PART 26 — the word resolves as the projection flattens, which
           is the moment the room it stands in becomes a rectangle. */
        const ortho = smoothstep(0.55, 0.94, ctx.frame?.ortho ?? 1);
        put(el, fixed.x, fixed.y, { fs: chosen.fs, e: Math.min(ctx.arrive(i * 0.10), ortho) });
      });
      if (P.p1) {
        const n = natural(P.p1);
        put(P.p1, f.x0, f.y1 - n.h);
      }
      if (P.phrase) P.phrase.classList.add('is-placed');
    },

    /* ---------- 13 · DISASSEMBLY ---------- */
    apart(ctx) {
      const f = field();
      const B = projectBox(ANCHORS.building());
      const n = P.layers ? natural(P.layers) : { w: 300, h: 240 };
      /* The legend stands beside the sheet it describes, not at a corner
         of the screen: to the right of the drawing where the drawing
         leaves room, and under it where it does not. */
      let x = f.x1 - n.w, y = f.y0 + (f.h - n.h) / 2;
      if (B) {
        if (f.x1 - B.x1 >= n.w + 24) { x = B.x1 + 24; y = clamp(B.y0, f.y0, f.y1 - n.h); }
        else if (B.x0 - f.x0 >= n.w + 24) { x = B.x0 - n.w - 24; y = clamp(B.y0, f.y0, f.y1 - n.h); }
        else { x = clamp(B.x0, f.x0, f.x1 - n.w); y = clamp(B.y1 + 18, f.y0, f.y1 - n.h); }
      }
      put(P.layers, x, y, { width: Math.min(n.w, Math.max(220, f.w * 0.3)) });
    },

    /* ------------------------------------------------------------------
       18 · THE DATA FIELD — a number stands on its own evidence

       PART 18. The window count is at the openings it counted, the door
       count along the doors, the room area inside the room, and the
       building total in the largest empty zone of the plan. Nothing is
       distributed to fill the screen.
       ------------------------------------------------------------------ */
    field(ctx) {
      const f = field();
      const y = planY(PLAN_LEVEL);
      const items = P.field;
      const taken = [];
      dataSrc.forEach((s, i) => {
        const li = items[i];
        if (!li) return;
        let p = null;
        if (s.room) {
          const b = roomBox(s.room, y);
          if (b) p = { x: (b.x0 + b.x1) / 2, y: (b.y0 + b.y1) / 2, box: b };
        } else p = project(s.at.x, y, s.at.z);
        if (!p) { li.style.setProperty('--e', '0'); return; }

        /* The figure is sized to the frame's own scale and, where it was
           counted from a room, to that room — a number that does not fit
           inside its own evidence is not standing on it. */
        let fs = f.w * s.max;
        if (p.box) fs = Math.min(fs, p.box.w * 0.62, p.box.h * 0.78);
        fs = Math.max(fs, 22);
        li.style.setProperty('--nfz', `${Math.round(fs * 2) / 2}px`);
        const n = natural(li);
        if (!n.w || !n.h) return;

        /* NOT clamped into the frame. A figure whose source has left the
           drawing has nothing to stand on, and PART 27 is explicit that
           the answer to a crowded frame is less copy rather than smaller
           copy — so it fades out with its own evidence instead of being
           parked at the nearest margin. */
        const x = p.x - n.w / 2, yy = p.y - n.h / 2;
        const inFrame = insideFade(rect(x, yy, x + n.w, yy + n.h), f);
        if (inFrame <= 0.001) { li.style.setProperty('--e', '0'); return; }
        /* Read first, placed first: a smaller figure gives way to a
           larger one rather than the other way round, and one that cannot
           be got clear of its neighbours is not drawn. */
        const fixed = avoidBounds({ x, y: yy, w: n.w, h: n.h }, taken, f, 16);
        if (!fixed.ok) { li.style.setProperty('--e', '0'); return; }
        taken.push(rect(fixed.x, fixed.y, fixed.x + n.w, fixed.y + n.h));
        put(li, fixed.x, fixed.y, { e: ctx.ramp(i * 0.055, 0.14) * inFrame });
      });
    },

    /* ------------------------------------------------------------------
       19 · REALITY, MADE COMPUTABLE.

       Three regions at three depths, and none of them chosen by eye.
       REALITY, takes the largest void above the building; COMPUTABLE.
       takes the largest void below or beside it; MADE is small and
       stands AT the building, which is the thing that has just come
       back. The silhouette is computed at this camera state, so
       COMPUTABLE. can be very large and still have a clean edge.
       ------------------------------------------------------------------ */
    final(ctx) {
      const f = field();
      const B = projectBox(ANCHORS.building());
      /* A descender is part of the word. REALITY, sat with its baseline
         exactly on the roofline and hung its comma over the parapet, so
         both bands stand off the silhouette by a real gap. */
      const clear = Math.max(12, f.h * 0.035);
      const upper = rect(f.x0, f.y0,
        f.x1, B ? clamp(B.y0 - clear, f.y0, f.y1) : f.y0 + f.h * 0.45);
      const lower = rect(f.x0, B ? clamp(B.y1 + clear, f.y0, f.y1) : f.y0 + f.h * 0.55,
        f.x1, f.y1);

      const rTop = (upper.h > 70 ? upper : getNegativeSpace([B], f, { minW: 200, minH: 70 }))
        || inset(f, 8);
      const rBot = (lower.h > 90 ? lower
        : getNegativeSpace([B, rTop], f, { minW: 240, minH: 90 })) || inset(f, 8);

      const a = fitEditorialType(P.f1, inset(rTop, 4, 2), {
        min: 26, max: Math.max(76, window.innerWidth * 0.10), align: 'start', valign: 'end', clampTo: f,
      });
      const c = fitEditorialType(P.f3, inset(rBot, 4, 2), {
        min: 32, max: Math.max(96, window.innerWidth * 0.145), align: 'end', valign: 'start', clampTo: f,
      });
      const out = [];
      if (a) { a.e = ctx.arrive(0); out.push(a); }
      if (c) { c.e = ctx.arrive(0.30); out.push(c); }
      commit(out);

      /* MADE is the hinge: small, and at the building rather than near
         it. It goes on whichever flank of the silhouette is clear. */
      if (P.f2) {
        const n = natural(P.f2);
        let x = f.x1 - n.w, yy = f.y0 + (f.h - n.h) / 2;
        if (B) {
          const right = f.x1 - B.x1, left = B.x0 - f.x0;
          x = right >= n.w + 18 ? B.x1 + 18
            : left >= n.w + 18 ? B.x0 - n.w - 18
              : clamp(B.x1 - n.w, f.x0, f.x1 - n.w);
          yy = clamp((B.y0 + B.y1) / 2 - n.h / 2, f.y0, f.y1 - n.h);
        }
        const boxes = out.map((i) => rect(i.x, i.y, i.x + i.w, i.y + i.h));
        const fixed = avoidBounds({ x, y: yy, w: n.w, h: n.h }, boxes, f, 14);
        put(P.f2, fixed.x, fixed.y, { e: ctx.arrive(0.16) });
      }
    },
  };

  /* Solved once: the plan's quadrant candidates and the data field's
     sources are properties of the drawing, and the drawing does not
     change at runtime. */
  const quadRooms = ANCHORS.planRooms();
  const dataSrc = ANCHORS.dataSources();

  return {
    /** True while the solver is the authority for this state's layout. */
    handles: (key) => key in placers,

    place(key, ctx) {
      const fn = placers[key];
      if (!fn) return;
      const r = ctx.hold?.getBoundingClientRect();
      O = r ? { x: r.left, y: r.top } : { x: 0, y: 0 };
      try { fn(ctx); } catch (err) {
        if (import.meta.env.DEV) console.warn(`[gdf:compose] ${key}`, err);
      }
    },

    /** Development-only: what qa/p112 reads to test a placement. */
    debug: {
      field,
      buildingBox: () => projectBox(ANCHORS.building()),
      negativeSpace: () => getNegativeSpace([projectBox(ANCHORS.building())]),
    },
  };
}
