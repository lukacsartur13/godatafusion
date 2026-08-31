import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { MeshSurfaceSampler } from 'three/examples/jsm/math/MeshSurfaceSampler.js';
import { SITE, heightAt } from './field.js';
import {
  LEVELS, LEVEL_IDS, levelById, levelIndex, levelFeatures, allFeatures,
  buildingQuantities, DOOR_TYPES, WINDOW_TYPES, CORE, ROOF,
  MPU, m as toM, u as toU, floorY, planY, roofY, BASE_Y, clearOf,
  elevationLabel, X0 as BX0, X1 as BX1, Z0 as BZ0, Z1 as BZ1, L02_X1,
} from './levels.js';

export {
  LEVELS, LEVEL_IDS, levelById, levelIndex, levelFeatures, allFeatures,
  buildingQuantities, DOOR_TYPES, WINDOW_TYPES, CORE, ROOF, MPU,
  floorY, planY, roofY, BASE_Y, clearOf, elevationLabel,
  FINISHES, finishOf, SLAB_T, EXT_T, INT_T, m, u,
  EXPLODE_GAP_M, EXPLODE_STEP,
} from './levels.js';

/* ============================================================
   The site fragment: one parcel, five co-registered representations.
   Everything below is derived from the same source data, which is what
   makes CAPTURE / MEASURE / QUANTIFY feel like modes of one object
   rather than three different pictures.
   ============================================================ */

/* ------------------------------------------------------------------
   MASSING — what is left of it

   Phase 1 to 7 described the scheme as a podium with two stacked volumes, a
   circulation core and a canopy over it. That was a stand-in: the site had
   ONE built storey and the abstract boxes said "there is more building than
   this".

   Phase 8 built the rest. The three real levels now occupy exactly the space
   those boxes occupied — a 12.30 m envelope over the same footprint — so
   drawing both puts an abstract volume THROUGH the studio floor. The boxes
   therefore split into two families:

     BUILDING   the podium, the volumes, the abstract core, the canopy. Drawn
                only when the procedural source is running, because there the
                nothing else describes the building at all.
     SITE       the outbuilding and the plant enclosure. They are context,
                they stand well clear of the footprint, and they are drawn in
                both sources.

   `buildStandIn()` replaces the family the architecture supersedes with a
   STEPPED THREE-LEVEL MASS taken from the level table itself, so the frame
   the GLB crossfades out of already has the building's real silhouette
   rather than a single flat slab.
   ------------------------------------------------------------------ */
const PAD_TOP = SITE.padY;

export const BOXES = [
  { x:  0.0, y: PAD_TOP,        z:  0.0, w: 6.4, h: 0.92, d: 4.6, site: false },  // podium
  { x: -1.35, y: PAD_TOP + 0.92, z: -0.45, w: 3.3, h: 2.55, d: 3.3, site: false }, // volume A
  { x: -1.35, y: PAD_TOP + 3.47, z: -0.45, w: 3.7, h: 0.14, d: 3.7, site: false }, // roof slab A
  { x:  1.55, y: PAD_TOP + 0.92, z:  0.65, w: 2.5, h: 1.62, d: 2.6, site: false }, // volume B
  { x:  1.55, y: PAD_TOP + 2.54, z:  0.65, w: 2.8, h: 0.12, d: 2.9, site: false }, // roof slab B
  { x: -2.35, y: PAD_TOP + 0.92, z: -1.35, w: 1.12, h: 4.25, d: 1.12, site: false }, // core
  { x:  0.35, y: PAD_TOP + 2.05, z:  2.55, w: 5.1, h: 0.11, d: 1.5, site: false },  // canopy
  { x:  5.15, y: 0, z:  2.55, w: 2.1, h: 1.05, d: 1.7, site: true },               // outbuilding
  { x: -5.05, y: 0, z: -2.05, w: 1.35, h: 0.62, d: 1.35, site: true },             // plant enclosure
];

// Canopy columns.
for (let i = 0; i < 5; i++) {
  BOXES.push({ x: -1.95 + i * 1.15, y: PAD_TOP, z: 2.55, w: 0.11, h: 2.05, d: 0.11, site: false });
}

/* ---------------- terrain ---------------- */
export function buildTerrain(segments) {
  const g = new THREE.PlaneGeometry(SITE.size, SITE.size, segments, segments);
  g.rotateX(-Math.PI / 2);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    p.setY(i, heightAt(p.getX(i), p.getZ(i)));
  }
  p.needsUpdate = true;
  g.computeVertexNormals();
  return g;
}

/* ---------------- massing ---------------- */
export const PODIUM = BOXES[0];

function boxesToGeometry(list) {
  const parts = list.map((b) => {
    const g = new THREE.BoxGeometry(b.w, b.h, b.d);
    g.translate(b.x, b.y + b.h / 2, b.z);
    return g;
  });
  const merged = mergeGeometries(parts, false);
  parts.forEach((g) => g.dispose());
  return merged;
}

/**
 * @param {boolean} skipBuilding drop everything the architectural GLB
 *   supersedes, keeping only the site's outbuildings.
 */
export function buildMassing({ skipBuilding = false } = {}) {
  return boxesToGeometry(skipBuilding ? BOXES.filter((b) => b.site) : BOXES);
}

/**
 * The stepped three-level mass, straight off the level table.
 *
 * This is what paints while the GLB is in flight and what a failed fetch
 * keeps. It is not a placeholder box: it has the real floor-to-floors, the
 * real setback at L02 and the real parapet, so the hero silhouette a visitor
 * sees at 200 ms is the silhouette they see at 2 s.
 */
export function standInBoxes() {
  const boxes = LEVELS.map((lv) => ({
    x: (lv.x0 + lv.x1) / 2,
    z: (lv.z0 + lv.z1) / 2,
    w: lv.x1 - lv.x0,
    d: lv.z1 - lv.z0,
    y: floorY(lv.id) - toU(lv.slab),
    h: toU(lv.ftf),
  }));
  // parapet ring, as a thin slab so the roof line reads
  boxes.push({
    x: (BX0 + L02_X1) / 2, z: 0, w: L02_X1 - BX0, d: BZ1 - BZ0,
    y: roofY(), h: toU(ROOF.parapet) * 0.5,
  });
  return boxes;
}

export const buildStandIn = () => boxesToGeometry(standInBoxes());

/**
 * What the PROCEDURAL point cloud and the massing edge lines are built from.
 *
 * With the abstract volumes retired from the architectural source, `BOXES`
 * is two outbuildings — and a 13 000-point budget spread over two small
 * boxes is not a sampled site, it is a bright blob at the edge of the hero
 * where a building used to be. The stand-in's own envelope goes in instead,
 * which is also what gives the frame a sampled reading and an edge silhouette
 * of the right shape BEFORE the GLB lands.
 */
export function buildCloudSource({ arch = false } = {}) {
  if (!arch) return buildMassing();
  return boxesToGeometry([...standInBoxes(), ...BOXES.filter((b) => b.site)]);
}

/* ---------------- terrain wire (sparse, not a full mesh wireframe) ---- */
export function buildTerrainWire(step = 1.0, sub = 0.25) {
  const half = SITE.size / 2;
  const pts = [];
  for (let x = -half; x <= half + 1e-6; x += step) {
    for (let z = -half; z < half - 1e-6; z += sub) {
      pts.push(x, heightAt(x, z), z, x, heightAt(x, z + sub), z + sub);
    }
  }
  for (let z = -half; z <= half + 1e-6; z += step) {
    for (let x = -half; x < half - 1e-6; x += sub) {
      pts.push(x, heightAt(x, z), z, x + sub, heightAt(x + sub, z), z);
    }
  }
  return linesFrom(pts);
}

/* ---------------- contours (marching squares over the field) ---------- */
export function buildContours(levels = 13, res = 150) {
  const half = SITE.size / 2;
  const step = SITE.size / res;
  const grid = new Float32Array((res + 1) * (res + 1));
  let min = Infinity, max = -Infinity;
  for (let j = 0; j <= res; j++) {
    for (let i = 0; i <= res; i++) {
      const h = heightAt(-half + i * step, -half + j * step);
      grid[j * (res + 1) + i] = h;
      if (h < min) min = h;
      if (h > max) max = h;
    }
  }

  const pts = [];
  const at = (i, j) => grid[j * (res + 1) + i];
  const wx = (i) => -half + i * step;
  const wz = (j) => -half + j * step;

  for (let l = 1; l < levels; l++) {
    const iso = min + ((max - min) * l) / levels;
    for (let j = 0; j < res; j++) {
      for (let i = 0; i < res; i++) {
        const v = [at(i, j), at(i + 1, j), at(i + 1, j + 1), at(i, j + 1)];
        const c = [[wx(i), wz(j)], [wx(i + 1), wz(j)], [wx(i + 1), wz(j + 1)], [wx(i), wz(j + 1)]];
        const cross = [];
        for (let e = 0; e < 4; e++) {
          const a = v[e], b = v[(e + 1) % 4];
          if ((a < iso) === (b < iso)) continue;
          const t = (iso - a) / (b - a);
          const p0 = c[e], p1 = c[(e + 1) % 4];
          cross.push([p0[0] + (p1[0] - p0[0]) * t, p0[1] + (p1[1] - p0[1]) * t]);
        }
        if (cross.length === 2) {
          pts.push(cross[0][0], iso, cross[0][1], cross[1][0], iso, cross[1][1]);
        } else if (cross.length === 4) {
          pts.push(cross[0][0], iso, cross[0][1], cross[1][0], iso, cross[1][1]);
          pts.push(cross[2][0], iso, cross[2][1], cross[3][0], iso, cross[3][1]);
        }
      }
    }
  }
  return linesFrom(pts);
}

/* ============================================================
   THE FLOOR PLANS

   One drawing per level, and every symbol on it stands on a coordinate the
   building itself was extruded from. `webgl/levels.js` derives the walls
   from the room rectangles, the doors from which rooms touch circulation and
   the windows from the structural bay grid; this file only gives those facts
   a line weight.

   That is the whole zero-drift claim, and it is mechanical rather than a
   matter of care: there is no coordinate typed twice between the plan
   QUANTIFY reads and the wall the visitor stands next to in the 360 viewer.
   ============================================================ */

/** Compatibility face for the ground floor. Framing and the older callers
    read the footprint and the plan datum from here. */
export const PLAN = {
  get y() { return planY('L00'); },
  X0: BX0, X1: BX1, Z0: BZ0, Z1: BZ1,
  get floorTotal() { return levelFeatures('L00').area; },
};

/** Doors, windows and rooms of one level — the objects QUANTIFY counts. */
export function planFeatures(level = 'L00') {
  return levelFeatures(level);
}

/* How far the drawing's dimension lines stand off the footprint. */
export const DIM_OFF = 0.85;

/**
 * One level's drawing.
 *
 * Three weights, drawn in draughting order — structure, then openings, then
 * annotation — which is also the order the draw-on reveal follows.
 */
export function buildPlan(level = 'L00') {
  const lv = levelById(level);
  const F = levelFeatures(lv.id);
  const y = planY(lv.id);

  const wall = [];
  const open = [];
  const dims = [];

  const seg = (a) => (x1, z1, x2, z2) => a.push(x1, y, z1, x2, y, z2);
  const sw = seg(wall);
  const so = seg(open);
  const sd = seg(dims);
  const rect = (t) => (x0, z0, x1, z1) => {
    t(x0, z0, x1, z0); t(x1, z0, x1, z1); t(x1, z1, x0, z1); t(x0, z1, x0, z0);
  };
  const rw = rect(sw);
  const rd = rect(sd);

  /* Outer wall — drawn double, as on a real plan. The 0.16 unit offset is
     the facade thickness, and it is where blender/build_environment.py takes
     the 0.86 m of concrete from. */
  const T = 0.16;
  rw(lv.x0, lv.z0, lv.x1, lv.z1);
  rw(lv.x0 + T, lv.z0 + T, lv.x1 - T, lv.z1 - T);

  /* Partitions. Single line, inset at both ends so they die into the
     exterior wall's inner face instead of crossing it. */
  for (const w of F.walls) {
    if (w.kind !== 'int') continue;
    const a = w.t0, b = w.t1;
    const lo = w.axis === 'v' ? lv.z0 : lv.x0;
    const hi = w.axis === 'v' ? lv.z1 : lv.x1;
    const t0 = Math.abs(a - lo) < 1e-4 ? a + T : a;
    const t1 = Math.abs(b - hi) < 1e-4 ? b - T : b;
    if (w.axis === 'v') sw(w.coord, t0, w.coord, t1);
    else sw(t0, w.coord, t1, w.coord);
  }

  /* Doors: an opening gap plus the quarter-arc swing symbol, at the real
     leaf width of the real type. */
  for (const d of F.doors) {
    const w = toU(DOOR_TYPES[d.type].w);
    if (d.axis === 'v') {
      arc(open, y, d.x, d.z - w / 2, w, -Math.PI / 2, 0);
      so(d.x, d.z - w / 2, d.x + w, d.z - w / 2);
    } else {
      arc(open, y, d.x - w / 2, d.z, w, 0, Math.PI / 2);
      so(d.x - w / 2, d.z, d.x - w / 2, d.z + w);
    }
  }

  /* Structural openings between circulation cells. No leaf and no swing —
     they are holes in a wall, and drawing a door symbol on them would put
     three doors on the schedule that do not exist. */
  for (const o of F.openings) {
    const w = toU(o.w);
    const j = 0.08;
    if (o.axis === 'v') {
      so(o.x, o.z - w / 2, o.x, o.z - w / 2 + j);
      so(o.x, o.z + w / 2 - j, o.x, o.z + w / 2);
    } else {
      so(o.x - w / 2, o.z, o.x - w / 2 + j, o.z);
      so(o.x + w / 2 - j, o.z, o.x + w / 2, o.z);
    }
  }

  /* Windows: paired ticks through the wall thickness, at the type's width. */
  for (const w of F.windows) {
    const s = toU(WINDOW_TYPES[w.type].w) / 2;
    if (w.axis === 'h') {
      const o = w.z < 0 ? T : -T;
      so(w.x - s, w.z, w.x + s, w.z);
      so(w.x - s, w.z + o, w.x + s, w.z + o);
      so(w.x - s, w.z, w.x - s, w.z + o);
      so(w.x + s, w.z, w.x + s, w.z + o);
    } else {
      const o = w.x < 0 ? T : -T;
      so(w.x, w.z - s, w.x, w.z + s);
      so(w.x + o, w.z - s, w.x + o, w.z + s);
      so(w.x, w.z - s, w.x + o, w.z - s);
      so(w.x, w.z + s, w.x + o, w.z + s);
    }
  }

  /* The vertical core, on every level's sheet, with its flight drawn.
     QUANTIFY has to be able to point at the stair, and a reader has to be
     able to see that the same shaft passes through all three sheets. */
  coreSymbol(dims, y);

  /* The terrace, where a level has one: dashed, and outside the floor area.
     It is drawn because it is part of the level and excluded from the
     quantities because it is not floor. */
  if (lv.terrace) {
    const t = lv.terrace;
    dashRect(dims, y, t.x0, t.z0, t.x1, t.z1, 0.26);
  }

  // Dimension lines, at annotation weight.
  dim(dims, y, lv.x0, lv.x1, lv.z1 + DIM_OFF, 'h');
  dim(dims, y, lv.z0, lv.z1, lv.x1 + DIM_OFF, 'v');

  return ribbonGroups([
    { pts: wall, width: 0.044 },
    { pts: open, width: 0.026 },
    { pts: dims, width: 0.015 },
  ]);
}

/* ============================================================
   PHASE 11 — THE DRAWING, BY SEMANTIC LAYER

   `buildPlan` merges structure, openings and annotation into one mesh,
   because everywhere else on the site a plan is read as one sheet. PART 13
   asks for the opposite: the drawing has to come APART, and it has to come
   apart the way a draughtsman would take it apart — by what each line MEANS,
   not by where it happens to sit in the buffer.

   So the same rules that build the sheet build it again into six meshes:

     walls    the exterior double line, the partitions and the core shaft
     doors    leaf and swing per door, plus the structural openings
     windows  the paired ticks through the wall, per window
     rooms    one rectangle per room — the boundaries the quantities count
     zones    the floor zones, hatched, one angle per zone letter
     dims     the dimension lines and the terrace

   Nothing here is a second description of the plan. Every group reads the
   same `levelFeatures()` the merged sheet reads, so a wall that moves moves
   in both, and a group that separates in PART 13 is separating real
   drawing content rather than a decorative copy of it.
   ============================================================ */

/** The order the layers detach in, and the order they are drawn in. */
export const PLAN_LAYERS = ['walls', 'doors', 'windows', 'rooms', 'zones', 'dims'];

/** Ribbon weight per layer. Structure is heaviest; annotation is lightest. */
const PLAN_LAYER_W = {
  walls: 0.044, doors: 0.026, windows: 0.026,
  rooms: 0.018, zones: 0.011, dims: 0.015,
};

/* One hatch angle per zone letter, so two zones that touch never read as
   one. The angles are the four a draughtsman actually uses. */
const ZONE_ANGLE = { A: 0.785, B: -0.785, C: 0.785, D: -0.785, E: 0, F: 1.571, CORE: -0.785 };

export function buildPlanLayers(level = 'L01') {
  const lv = levelById(level);
  const F = levelFeatures(lv.id);
  const y = planY(lv.id);
  const G = Object.fromEntries(PLAN_LAYERS.map((k) => [k, []]));

  const seg = (a) => (x1, z1, x2, z2) => a.push(x1, y, z1, x2, y, z2);
  const box = (a) => (x0, z0, x1, z1) => {
    const s = seg(a);
    s(x0, z0, x1, z0); s(x1, z0, x1, z1); s(x1, z1, x0, z1); s(x0, z1, x0, z0);
  };

  /* ---- walls: the same double exterior line and the same partitions ---- */
  const T = 0.16;
  box(G.walls)(lv.x0, lv.z0, lv.x1, lv.z1);
  box(G.walls)(lv.x0 + T, lv.z0 + T, lv.x1 - T, lv.z1 - T);
  const sw = seg(G.walls);
  for (const w of F.walls) {
    if (w.kind !== 'int') continue;
    const lo = w.axis === 'v' ? lv.z0 : lv.x0;
    const hi = w.axis === 'v' ? lv.z1 : lv.x1;
    const t0 = Math.abs(w.t0 - lo) < 1e-4 ? w.t0 + T : w.t0;
    const t1 = Math.abs(w.t1 - hi) < 1e-4 ? w.t1 - T : w.t1;
    if (w.axis === 'v') sw(w.coord, t0, w.coord, t1);
    else sw(t0, w.coord, t1, w.coord);
  }
  // The vertical core is structure, and it is the one thing on every sheet.
  coreSymbol(G.walls, y);

  /* ---- doors: leaf and swing, at the real leaf width of the real type ---- */
  const so = seg(G.doors);
  for (const d of F.doors) {
    const w = toU(DOOR_TYPES[d.type].w);
    if (d.axis === 'v') {
      arc(G.doors, y, d.x, d.z - w / 2, w, -Math.PI / 2, 0);
      so(d.x, d.z - w / 2, d.x + w, d.z - w / 2);
    } else {
      arc(G.doors, y, d.x - w / 2, d.z, w, 0, Math.PI / 2);
      so(d.x - w / 2, d.z, d.x - w / 2, d.z + w);
    }
  }
  for (const o of F.openings) {
    const w = toU(o.w);
    const j = 0.08;
    if (o.axis === 'v') {
      so(o.x, o.z - w / 2, o.x, o.z - w / 2 + j);
      so(o.x, o.z + w / 2 - j, o.x, o.z + w / 2);
    } else {
      so(o.x - w / 2, o.z, o.x - w / 2 + j, o.z);
      so(o.x + w / 2 - j, o.z, o.x + w / 2, o.z);
    }
  }

  /* ---- windows: paired ticks through the wall thickness ---- */
  const swn = seg(G.windows);
  for (const w of F.windows) {
    const s = toU(WINDOW_TYPES[w.type].w) / 2;
    if (w.axis === 'h') {
      const o = w.z < 0 ? T : -T;
      swn(w.x - s, w.z, w.x + s, w.z);
      swn(w.x - s, w.z + o, w.x + s, w.z + o);
      swn(w.x - s, w.z, w.x - s, w.z + o);
      swn(w.x + s, w.z, w.x + s, w.z + o);
    } else {
      const o = w.x < 0 ? T : -T;
      swn(w.x, w.z - s, w.x, w.z + s);
      swn(w.x + o, w.z - s, w.x + o, w.z + s);
      swn(w.x, w.z - s, w.x + o, w.z - s);
      swn(w.x, w.z + s, w.x + o, w.z + s);
    }
  }

  /* ---- rooms: the boundary each quantity is counted inside ---- */
  const inset = 0.035;
  for (const r of F.rooms) {
    box(G.rooms)(r.x0 + inset, r.z0 + inset, r.x1 - inset, r.z1 - inset);
  }

  /* ---- zones: the floor hatched by what the floor is for ---- */
  const sz = seg(G.zones);
  /* Coarse on purpose. PART 12 positions language in the EMPTY rooms of
     this drawing, and a hatch at drafting density fills every one of them
     — the sheet stops having empty rooms to write in. Two hatch lines per
     structural bay is enough to say a zone is a zone. */
  const STEP = 0.52;
  for (const r of F.rooms) {
    const a = ZONE_ANGLE[r.zone] ?? 0.785;
    const dx = Math.cos(a), dz = Math.sin(a);
    const w = r.x1 - r.x0, d = r.z1 - r.z0;
    const span = Math.abs(w * dx) + Math.abs(d * dz);
    const n = Math.max(1, Math.round(span / STEP));
    for (let i = 1; i < n; i++) {
      /* One hatch line = the chord of the room rectangle along the zone
         angle. Clipped against the rectangle, so a hatch never leaves the
         room it describes. */
      const t = -span / 2 + (span * i) / n;
      const cx = (r.x0 + r.x1) / 2 + -dz * t;
      const cz = (r.z0 + r.z1) / 2 + dx * t;
      const hit = clipRay(cx, cz, dx, dz, r.x0 + inset, r.z0 + inset, r.x1 - inset, r.z1 - inset);
      if (hit) sz(hit[0], hit[1], hit[2], hit[3]);
    }
  }

  /* ---- dims: the measurements, and the terrace where there is one ---- */
  if (lv.terrace) {
    const t = lv.terrace;
    dashRect(G.dims, y, t.x0, t.z0, t.x1, t.z1, 0.26);
  }
  dim(G.dims, y, lv.x0, lv.x1, lv.z1 + DIM_OFF, 'h');
  dim(G.dims, y, lv.z0, lv.z1, lv.x1 + DIM_OFF, 'v');

  return Object.fromEntries(PLAN_LAYERS.map(
    (k) => [k, ribbonsFrom(G[k], PLAN_LAYER_W[k])],
  ));
}

/** Slab-method clip of an infinite line against an axis-aligned rectangle. */
function clipRay(cx, cz, dx, dz, x0, z0, x1, z1) {
  let t0 = -1e6, t1 = 1e6;
  const slab = (p, lo, hi, d) => {
    if (Math.abs(d) < 1e-6) return p >= lo && p <= hi;
    const a = (lo - p) / d, b = (hi - p) / d;
    t0 = Math.max(t0, Math.min(a, b));
    t1 = Math.min(t1, Math.max(a, b));
    return true;
  };
  if (!slab(cx, x0, x1, dx) || !slab(cz, z0, z1, dz)) return null;
  if (t1 - t0 < 0.04) return null;
  return [cx + dx * t0, cz + dz * t0, cx + dx * t1, cz + dz * t1];
}

/** The stair and lift shaft, as a plan symbol. */
function coreSymbol(pts, y) {
  const seg = (x1, z1, x2, z2) => pts.push(x1, y, z1, x2, y, z2);
  const { x0, x1, z0, z1 } = CORE;
  seg(x0, z0, x1, z0); seg(x1, z0, x1, z1); seg(x1, z1, x0, z1); seg(x0, z1, x0, z0);
  // stair: nine treads across the west half, plus the direction of travel
  const sx0 = x0 + 0.05, sx1 = x0 + (x1 - x0) * 0.54;
  const n = 9;
  for (let i = 0; i <= n; i++) {
    const z = z0 + 0.06 + ((z1 - z0 - 0.12) * i) / n;
    seg(sx0, z, sx1, z);
  }
  const mx = (sx0 + sx1) / 2;
  seg(mx, z0 + 0.10, mx, z1 - 0.10);
  seg(mx, z0 + 0.10, mx - 0.05, z0 + 0.20);
  seg(mx, z0 + 0.10, mx + 0.05, z0 + 0.20);
  // lift: a box with its diagonals
  const lx0 = x0 + (x1 - x0) * 0.60, lx1 = x1 - 0.05;
  const lz0 = z0 + 0.14, lz1 = z1 - 0.14;
  seg(lx0, lz0, lx1, lz0); seg(lx1, lz0, lx1, lz1);
  seg(lx1, lz1, lx0, lz1); seg(lx0, lz1, lx0, lz0);
  seg(lx0, lz0, lx1, lz1); seg(lx1, lz0, lx0, lz1);
}

function dashRect(pts, y, x0, z0, x1, z1, step) {
  const run = (ax, az, bx, bz) => {
    const len = Math.hypot(bx - ax, bz - az);
    const n = Math.max(1, Math.round(len / step));
    for (let i = 0; i < n; i += 2) {
      const t0 = i / n, t1 = Math.min(1, (i + 1) / n);
      pts.push(ax + (bx - ax) * t0, y, az + (bz - az) * t0,
               ax + (bx - ax) * t1, y, az + (bz - az) * t1);
    }
  };
  run(x0, z0, x1, z0); run(x1, z0, x1, z1); run(x1, z1, x0, z1); run(x0, z1, x0, z0);
}

/** Ancillary footprints, on their own layer. Site context, not building. */
export function buildPlanAux() {
  const y = planY('L00');
  const pts = [];
  const rect = (x0, z0, x1, z1) => {
    pts.push(x0, y, z0, x1, y, z0, x1, y, z0, x1, y, z1,
             x1, y, z1, x0, y, z1, x0, y, z1, x0, y, z0);
  };
  rect(4.1, 1.7, 6.2, 3.4);
  rect(-5.72, -2.72, -4.38, -1.38);
  return ribbonsFrom(pts, 0.02);
}

/** Door swing symbol — a quarter arc, tessellated into line segments. */
function arc(pts, y, cx, cz, r, a0, a1, n = 9) {
  for (let i = 0; i < n; i++) {
    const t0 = a0 + ((a1 - a0) * i) / n;
    const t1 = a0 + ((a1 - a0) * (i + 1)) / n;
    pts.push(cx + Math.cos(t0) * r, y, cz + Math.sin(t0) * r,
             cx + Math.cos(t1) * r, y, cz + Math.sin(t1) * r);
  }
}

/** Dimension line with end ticks, as drawn on a real plan. */
function dim(pts, y, a, b, off, axis) {
  const t = 0.16;
  if (axis === 'h') {
    pts.push(a, y, off, b, y, off);
    pts.push(a, y, off - t, a, y, off + t);
    pts.push(b, y, off - t, b, y, off + t);
  } else {
    pts.push(off, y, a, off, y, b);
    pts.push(off - t, y, a, off + t, y, a);
    pts.push(off - t, y, b, off + t, y, b);
  }
}


/** Corner brackets on a unit square — repositioned per recognised feature. */
export function buildBracket() {
  const pts = [];
  const t = 0.34;             // arm length as a fraction of the half-extent
  const c = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
  c.forEach(([sx, sz]) => {
    pts.push(sx, 0, sz, sx - sx * t, 0, sz);
    pts.push(sx, 0, sz, sx, 0, sz - sz * t);
  });
  // Unit-square bracket; the scene scales it per feature, so the ribbon
  // width is normalised here and ends up ~0.03 world at typical extents.
  return ribbonsFrom(pts, 0.05);
}

/* ---------------- capture stations ---------------- */
export const STATIONS = [
  [3.35, 3.15], [-4.3, 2.2], [5.2, -1.4], [-2.0, 4.35],
  [0.6, -3.5], [-5.3, -3.6], [2.2, 1.05], [-1.2, -1.6],
  [4.6, 4.5], [-3.4, -0.4], [1.0, 4.9], [6.1, 0.9],
];

/* PHASE 6 — the interior stations.
   The twelve exterior stations describe the SITE. Once the building has an
   inside, the positions that matter most are the ones a visitor would
   actually stand in: the arrival space, the spine, each room's threshold.
   Those come out of the GLB (the CAPTURE_STATION empties authored against
   the room grid), so this builds the same marker at an arbitrary position
   rather than at a terrain height. */
export function buildStationMarks(points, r = 0.16, stem = 0.10) {
  const pts = [];
  points.forEach(({ x, y, z }) => {
    for (let i = 0; i < 20; i++) {
      const a0 = (i / 20) * Math.PI * 2, a1 = ((i + 1) / 20) * Math.PI * 2;
      pts.push(x + Math.cos(a0) * r, y, z + Math.sin(a0) * r,
               x + Math.cos(a1) * r, y, z + Math.sin(a1) * r);
    }
    pts.push(x, y - stem, z, x, y + stem, z);
    pts.push(x - r * 0.5, y, z, x + r * 0.5, y, z);
    pts.push(x, y, z - r * 0.5, x, y, z + r * 0.5);
  });
  return linesFrom(pts);
}

export function buildStations() {
  const pts = [];
  STATIONS.forEach(([x, z]) => {
    const y = heightAt(x, z) + 0.10;   // clear of the terrain surface
    const r = 0.4;
    for (let i = 0; i < 28; i++) {
      const a0 = (i / 28) * Math.PI * 2, a1 = ((i + 1) / 28) * Math.PI * 2;
      pts.push(x + Math.cos(a0) * r, y, z + Math.sin(a0) * r,
               x + Math.cos(a1) * r, y, z + Math.sin(a1) * r);
    }
    pts.push(x, y, z, x, y + 0.62, z);          // tripod stem
    pts.push(x - 0.14, y + 0.62, z, x + 0.14, y + 0.62, z);
    pts.push(x, y + 0.62, z - 0.14, x, y + 0.62, z + 0.14);
  });
  return linesFrom(pts);
}

/** Sparse lat/long sphere at the primary station — panoramic language. */
export function buildPanorama(cx, cz, cy, r = 2.05) {
  const pts = [];
  const RINGS = 5, SEG = 44, MERIDIANS = 8;
  for (let k = 1; k <= RINGS; k++) {
    const phi = (k / (RINGS + 1)) * Math.PI;
    const y = cy + Math.cos(phi) * r, rr = Math.sin(phi) * r;
    for (let i = 0; i < SEG; i++) {
      const a0 = (i / SEG) * Math.PI * 2, a1 = ((i + 1) / SEG) * Math.PI * 2;
      pts.push(cx + Math.cos(a0) * rr, y, cz + Math.sin(a0) * rr,
               cx + Math.cos(a1) * rr, y, cz + Math.sin(a1) * rr);
    }
  }
  for (let m = 0; m < MERIDIANS; m++) {
    const a = (m / MERIDIANS) * Math.PI * 2;
    for (let i = 0; i < 22; i++) {
      const p0 = (i / 22) * Math.PI, p1 = ((i + 1) / 22) * Math.PI;
      pts.push(cx + Math.sin(p0) * Math.cos(a) * r, cy + Math.cos(p0) * r, cz + Math.sin(p0) * Math.sin(a) * r,
               cx + Math.sin(p1) * Math.cos(a) * r, cy + Math.cos(p1) * r, cz + Math.sin(p1) * Math.sin(a) * r);
    }
  }
  return linesFrom(pts);
}

/* ---------------- point cloud ---------------- */
export function buildPointCloud(terrainGeo, massingGeo, counts) {
  const total = counts.terrain + counts.massing;
  const pos = new Float32Array(total * 3);
  const rnd = new Float32Array(total);
  const layer = new Float32Array(total);

  const tmp = new THREE.Vector3();
  let seed = 20240117;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };

  const fill = (geo, count, offset, layerId, jitter) => {
    const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial());
    const sampler = new MeshSurfaceSampler(mesh).build();
    for (let i = 0; i < count; i++) {
      sampler.sample(tmp);
      const k = (offset + i) * 3;
      pos[k] = tmp.x + (rand() - 0.5) * jitter;
      pos[k + 1] = tmp.y + (rand() - 0.5) * jitter;
      pos[k + 2] = tmp.z + (rand() - 0.5) * jitter;
      rnd[offset + i] = rand();
      layer[offset + i] = layerId;
    }
    mesh.material.dispose();
  };

  fill(terrainGeo, counts.terrain, 0, 0, 0.03);
  fill(massingGeo, counts.massing, counts.terrain, 1, 0.02);

  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('aRand', new THREE.BufferAttribute(rnd, 1));
  g.setAttribute('aLayer', new THREE.BufferAttribute(layer, 1));
  g.computeBoundingSphere();
  return g;
}

/* ---------------- helpers ---------------- */

/**
 * Flat segment list → ribbon mesh, given a width in WORLD units.
 *
 * gl.LINES is one device pixel wide. On a 2x display that is half a CSS
 * pixel, which anti-aliases down to roughly half opacity — fine for a
 * contour thicket, useless for a construction drawing where door swings
 * and window ticks have to be READ. Ribbons also mean the linework gains
 * weight as the camera closes in, so QUANTIFY's tight view gets bolder
 * drafting rather than the same hairline scaled up.
 *
 * The plan is planar in XZ, so the ribbon normal is simply the in-plane
 * perpendicular; ends are extended by half a width so corners meet.
 */
export function ribbonsFrom(flat, width = 0.028) {
  const src = flat instanceof Float32Array ? flat : new Float32Array(flat);
  const segs = src.length / 6;
  const pos = new Float32Array(segs * 6 * 3);   // 2 triangles per segment
  const order = new Float32Array(segs * 6);
  const h = width / 2;

  let o = 0;
  for (let i = 0; i < segs; i++) {
    const k = i * 6;
    let x1 = src[k], y1 = src[k + 1], z1 = src[k + 2];
    let x2 = src[k + 3], y2 = src[k + 4], z2 = src[k + 5];
    let dx = x2 - x1, dz = z2 - z1;
    const len = Math.hypot(dx, dz) || 1e-6;
    dx /= len; dz /= len;
    // extend the ends so consecutive segments form a mitre-free joint
    x1 -= dx * h; z1 -= dz * h; x2 += dx * h; z2 += dz * h;
    const nx = -dz * h, nz = dx * h;

    const q = [
      x1 + nx, y1, z1 + nz,
      x1 - nx, y1, z1 - nz,
      x2 - nx, y2, z2 - nz,
      x1 + nx, y1, z1 + nz,
      x2 - nx, y2, z2 - nz,
      x2 + nx, y2, z2 + nz,
    ];
    for (let v = 0; v < 18; v++) pos[o * 3 + v] = q[v];
    const t = i / segs;
    for (let v = 0; v < 6; v++) order[o + v] = t;
    o += 6;
  }

  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('aOrder', new THREE.BufferAttribute(order, 1));
  g.computeBoundingSphere();
  return g;
}

/**
 * Several ribbon weights in ONE mesh, with a single monotonic `aOrder` across
 * the whole set so the draw-on reveal still runs start to finish. Groups are
 * drawn in the order given — structure, openings, annotation — which is both
 * the draughting order and the order a reader needs them in.
 */
export function ribbonGroups(groups) {
  const parts = groups.filter((g) => g.pts.length).map((g) => ribbonsFrom(g.pts, g.width));
  if (!parts.length) return ribbonsFrom([], 0.03);
  if (parts.length === 1) return parts[0];

  let n = 0;
  for (const p of parts) n += p.getAttribute('position').count;
  const pos = new Float32Array(n * 3);
  const order = new Float32Array(n);

  let at = 0;
  for (const p of parts) {
    const pa = p.getAttribute('position').array;
    pos.set(pa, at * 3);
    at += p.getAttribute('position').count;
  }
  // One ramp over the merged vertex list, so `uDraw` still means "how much of
  // the drawing has been drawn" rather than "how much of the last group".
  for (let i = 0; i < n; i++) order[i] = i / n;

  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('aOrder', new THREE.BufferAttribute(order, 1));
  g.computeBoundingSphere();
  parts.forEach((p) => p.dispose());
  return g;
}

/** LineSegments geometry + a normalised `aOrder` attribute for draw-on reveals. */
export function linesFrom(flat) {
  const g = new THREE.BufferGeometry();
  const arr = flat instanceof Float32Array ? flat : new Float32Array(flat);
  g.setAttribute('position', new THREE.BufferAttribute(arr, 3));
  const n = arr.length / 3;
  const order = new Float32Array(n);
  for (let i = 0; i < n; i += 2) {
    const t = i / n;
    order[i] = t; order[i + 1] = t;
  }
  g.setAttribute('aOrder', new THREE.BufferAttribute(order, 1));
  g.computeBoundingSphere();
  return g;
}


/* ---------------- survey layer (MEASURE) ----------------
   The instrument furniture the hero never had: a draped parcel boundary,
   dimension lines with ticks, a graduated elevation staff and one section
   cut. This is what makes MEASURE read as a survey rather than as terrain. */
export function buildSurvey() {
  const pts = [];
  const half = SITE.size / 2;
  const inset = 1.15;
  const B = half - inset;                    // parcel boundary half-extent
  const lift = 0.045;

  // Boundary, draped over the ground so it follows the real surface.
  const drape = (x0, z0, x1, z1, n = 26) => {
    for (let i = 0; i < n; i++) {
      const a = i / n, b = (i + 1) / n;
      const xa = x0 + (x1 - x0) * a, za = z0 + (z1 - z0) * a;
      const xb = x0 + (x1 - x0) * b, zb = z0 + (z1 - z0) * b;
      pts.push(xa, heightAt(xa, za) + lift, za, xb, heightAt(xb, zb) + lift, zb);
    }
  };
  drape(-B, -B, B, -B); drape(B, -B, B, B); drape(B, B, -B, B); drape(-B, B, -B, -B);

  // Corner stations.
  [[-B, -B], [B, -B], [B, B], [-B, B]].forEach(([x, z]) => {
    const y = heightAt(x, z) + lift;
    pts.push(x - 0.3, y, z, x + 0.3, y, z, x, y, z - 0.3, x, y, z + 0.3);
    pts.push(x, y, z, x, y + 0.55, z);
  });

  // Two dimension lines with ticks, held at a flat datum outside the parcel.
  const dy = 0.75;
  const tick = (x, z, ax) => {
    if (ax === 'h') pts.push(x, dy, z - 0.22, x, dy, z + 0.22);
    else pts.push(x - 0.22, dy, z, x + 0.22, dy, z);
  };
  pts.push(-B, dy, B + 1.15, B, dy, B + 1.15);
  tick(-B, B + 1.15, 'h'); tick(B, B + 1.15, 'h'); tick(0, B + 1.15, 'h');
  pts.push(B + 1.15, dy, -B, B + 1.15, dy, B);
  tick(B + 1.15, -B, 'v'); tick(B + 1.15, B, 'v');

  // Graduated elevation staff on the high ground.
  const sx = -B + 1.4, sz = -B + 1.4;
  const base = heightAt(sx, sz);
  pts.push(sx, base, sz, sx, base + 3.0, sz);
  for (let i = 0; i <= 6; i++) {
    const y = base + i * 0.5;
    const w = i % 2 ? 0.14 : 0.26;
    pts.push(sx - w, y, sz, sx + w, y, sz);
  }

  // One section cut through the pad — the line the scan slice follows.
  const zc = 0.0;
  for (let i = 0; i < 40; i++) {
    const xa = -half + (SITE.size * i) / 40, xb = -half + (SITE.size * (i + 1)) / 40;
    pts.push(xa, heightAt(xa, zc) + lift, zc, xb, heightAt(xb, zc) + lift, zc);
  }

  return linesFrom(pts);
}

/** The excavated volume as a solid prism — MEASURE's "selected volume". */
export function buildVolumeBox() {
  const { pad, padY } = SITE;
  const top = 0.58;
  const g = new THREE.BoxGeometry(pad.x1 - pad.x0, top - padY, pad.z1 - pad.z0);
  g.translate((pad.x0 + pad.x1) / 2, (padY + top) / 2, (pad.z0 + pad.z1) / 2);
  return g;
}
