/* ============================================================
   THE BUILDING — PHASE 8

   One building. Three usable levels. One authoritative description.

   Everything downstream reads THIS file: the QUANTIFY drawing, the
   quantities the page prints, the walls Blender extrudes, the openings it
   punches, the rooms the furnishing schedule furnishes, the capture
   stations the 360 viewer walks. There is no second copy of the plan, and
   there is no hand-typed total anywhere in the project.

   Phase 7 and earlier described ONE storey as a 4x3 partition grid — two
   arrays of coordinates — and derived doors and windows from a formula over
   that grid. A formula cannot describe three floors with three different
   programs, and it never described a door: it placed 24 of them at
   arithmetic intervals whether or not there was a room on the other side.

   So a level is now a LIST OF ROOM RECTANGLES that tile its footprint, and
   the building fabric is DERIVED from them:

     walls    the union of every room edge, split into exterior and partition
     doors    one per room that touches circulation, sized by what the room is
     windows  one per structural facade bay the room's exterior wall covers,
              typed by what the room is

   That is why L01 can have a two-corridor plan and L02 a terrace without a
   single coordinate being written twice, and why "if a door is added the
   quantity must change" is not a test we have to remember to keep passing —
   there is no other place a door could come from.

   UNITS. Room rectangles are in the site's WORLD UNITS, because that is the
   frame the terrain, the camera and the QUANTIFY drawing already live in.
   Elevations, heights and opening sizes are in METRES, because that is how a
   building is designed. `MPU` converts, and it is solved — not chosen — from
   the floor area the readout has always quoted.
   ============================================================ */

/* ---------------- the footprint ---------------- */

/** Plan extents of the ground floor, in world units. Unchanged since Phase 1. */
export const X0 = -3.2;
export const X1 = 3.2;
export const Z0 = -2.3;
export const Z1 = 2.3;

/** Metres per world unit. 6.4 x 4.6 units IS 842.6 m², so this is arithmetic. */
export const MPU = Math.sqrt(842.6 / ((X1 - X0) * (Z1 - Z0)));

export const m = (u) => u * MPU;          // units → metres
export const u = (metres) => metres / MPU; // metres → units

/* ---------------- the structural bay ----------------
   The facade is composed on a bay module, and that is the whole reason the
   window rhythm can be READ as one building rather than as three storeys
   that happen to be stacked: a bay centre is the same plan coordinate on
   every level, so an opening on L02 lands over an opening on L00 whatever
   room is behind it. Eight bays across the long facade — the same eight the
   downstand beams already run on — and six across the short one.          */
export const BAYS_X = 8;
export const BAYS_Z = 6;
export const BAY_X = (X1 - X0) / BAYS_X;   // 0.8 u = 4.280 m
export const BAY_Z = (Z1 - Z0) / BAYS_Z;   // 0.766 u = 4.102 m

/* The two band lines the ground floor's spine runs on. They are BAY LINES:
   Phase 7 had them at ±0.77 and the bay module puts them at ±0.7667, a
   difference of 18 mm at building scale — but a partition 18 mm off the
   structural grid is a partition that eats the pier beside every opening in
   that bay, and it cost the ground floor a third of its windows. */
export const BZ1 = Z0 + BAY_Z * 2;      // -0.76667
export const BZ2 = Z1 - BAY_Z * 2;      // +0.76667

/** Facade bay centres, in plan units. */
export const bayCentresX = Array.from({ length: BAYS_X }, (_, i) => X0 + BAY_X * (i + 0.5));
export const bayCentresZ = Array.from({ length: BAYS_Z }, (_, i) => Z0 + BAY_Z * (i + 0.5));

/* ---------------- the vertical core ----------------
   One rectangle, at one plan position, on every level. It is not a room
   type — it is the thing that makes the three levels ONE BUILDING, so it is
   declared here rather than three times in the room lists, and every level's
   room grid is authored around it. `blender/build_environment.py` builds the
   shaft, the stair and the lift inside it and cuts the slab voids from it. */
export const CORE = { x0: -3.05, x1: -2.05, z0: -2.15, z1: -1.05 };
/** Wall thickness of the core shaft, metres. */
export const CORE_T = 0.30;

/* ---------------- construction ---------------- */
/** Structural slab, metres. The finished floor of a level sits on top of it. */
export const SLAB_T = 0.32;
/** Exterior wall. The plan draws its outer wall as a double line 0.16 units
    apart, and 0.16 u IS 0.86 m — the thickness is on the drawing, not chosen. */
export const EXT_T = m(0.16);
/** Partition. Drawn as a single line, so it is thin. */
export const INT_T = 0.15;

/* ---------------- openings ---------------- */
/** Door types. Widths in metres; `h` is the clear structural opening. */
export const DOOR_TYPES = {
  D01: { w: 1.10, h: 2.35, label: 'Egyszárnyú ajtó' },
  D02: { w: 1.60, h: 2.45, label: 'Kétszárnyú ajtó' },
  D03: { w: 0.90, h: 2.10, label: 'Gépészeti / tároló ajtó' },
};

/** Window types. `full` takes the level's LOW sill — a full-height opening. */
export const WINDOW_TYPES = {
  W01: { w: 2.40, full: false, label: 'Ablak — irodai' },
  W02: { w: 1.60, full: false, label: 'Ablak — kiszolgáló' },
  W03: { w: 3.20, full: true, label: 'Ablak — teljes belmagasságú' },
};

/* Which opening a room's PROGRAM asks for. A meeting room gets a double
   door because eight people leave it at once; a plant room gets the narrow
   one because a filter goes through it and nothing else does. */
const DOOR_BY_KIND = {
  CORE: 'D01', TECH: 'D03', STORE: 'D03', RAW: 'D03',
  MEET: 'D02', LOUNGE: 'D02', OPEN: 'D02', STUDIO: 'D02', BIM: 'D02',
  REVIEW: 'D02', KITCH: 'D02',
};
const WINDOW_BY_KIND = {
  CORE: 'W02', TECH: 'W02', STORE: 'W02', RAW: 'W02',
  RECEP: 'W03', LOUNGE: 'W03', OPEN: 'W03', STUDIO: 'W03', BIM: 'W03',
};

/* Solid/glass balance, and the reason this is not a curtain wall.

   A room takes an opening in every structural bay its exterior wall covers —
   EXCEPT the service rooms, which take every other bay. That is not a
   stylistic thinning: a shaft, a plant room and an archive genuinely do not
   want a window per bay, and the run of solid facade it produces at the
   west end and along the unfinished bay is what gives the building a base
   and a corner instead of eight identical glazed cells per storey. */
const SPARSE_KINDS = new Set(['CORE', 'TECH', 'STORE', 'RAW']);
const DEFAULT_DOOR = 'D01';
const DEFAULT_WINDOW = 'W01';

/** Rooms that are circulation: everything else hangs a door off one of them. */
const isCirc = (r) => r.kind === 'CIRC';

/* ============================================================
   THE LEVELS

   Three levels, three programs, three plan rhythms. The brief for this phase
   is explicit that a copied floor is a failed floor, so the differences are
   structural rather than cosmetic:

     L00  a 4 x 3 cell grid with one deep circulation spine. Public, arrival,
          and the unfinished bay. Coarse — big rooms, few of them.
     L01  a five-band plan with TWO corridors and a deep open-plan zone
          between them. Fourteen rooms, the most doors, the finest grain.
     L02  set back a full structural bay from the east facade, so a 210 m²
          roof terrace opens over L01 and the top of the building steps. A
          spur corridor instead of a spine. Nine rooms, the coarsest grain
          and the largest single spaces.

   Elevations are the real thing the floor labels will print. The ground
   floor is deliberately the tallest — it is the public floor and it holds
   the raw construction bay, which needs the height; the two office floors
   are 3.60 m floor-to-floor, which is what an office actually is.
   ============================================================ */

const L00_ROOMS = [
  // north row — services and work, behind the spine
  { id: 'R01', kind: 'CORE', zone: 'CORE', label: 'Közlekedőmag és gépészet', x0: X0, x1: -1.6, z0: Z0, z1: BZ1 },
  { id: 'R02', kind: 'OFFICE', zone: 'C', label: 'Projektiroda', x0: -1.6, x1: 0, z0: Z0, z1: BZ1 },
  { id: 'R03', kind: 'TECH', zone: 'D', label: 'Technikai helyiség', x0: 0, x1: 1.6, z0: Z0, z1: BZ1 },
  { id: 'R04', kind: 'RAW', zone: 'F', label: 'Szerkezetkész terület', finish: 'raw', x0: 1.6, x1: X1, z0: Z0, z1: BZ1 },
  // the spine
  { id: 'R05', kind: 'CIRC', zone: 'E', label: 'Közlekedő — nyugat', x0: X0, x1: -1.6, z0: BZ1, z1: BZ2 },
  { id: 'R06', kind: 'CIRC', zone: 'E', label: 'Közlekedő — közép', x0: -1.6, x1: 0, z0: BZ1, z1: BZ2 },
  { id: 'R07', kind: 'CIRC', zone: 'E', label: 'Közlekedő — kelet', x0: 0, x1: 1.6, z0: BZ1, z1: BZ2 },
  { id: 'R08', kind: 'CIRC', zone: 'E', label: 'Érkeztető folyosó', x0: 1.6, x1: X1, z0: BZ1, z1: BZ2 },
  // south row — the rooms the site's cameras look at
  { id: 'R09', kind: 'MEET', zone: 'B', label: 'Nagytárgyaló', x0: X0, x1: -1.6, z0: BZ2, z1: Z1 },
  { id: 'R10', kind: 'RECEP', zone: 'A', label: 'Recepció', x0: -1.6, x1: 0, z0: BZ2, z1: Z1 },
  { id: 'R11', kind: 'WAIT', zone: 'A', label: 'Ügyfélvárakozó', x0: 0, x1: 1.6, z0: BZ2, z1: Z1 },
  { id: 'R12', kind: 'LOUNGE', zone: 'A', label: 'Lounge', x0: 1.6, x1: X1, z0: BZ2, z1: Z1 },
];

/* ------------------------------------------------------------------
   L01 — THE WORK FLOOR

   The plan is INVERTED against the ground floor and against the level
   above: the deep 12.3 m band is on the NORTH, where the open office wants
   the quiet side, and the shallow 8.2 m band faces the entrance. The column
   rhythm is A-B-A rather than the ground floor's four equal bays, which is
   what produces the 4.3 m focus rooms this floor has and neither of the
   others does. One extra north-south link corridor gives the open office a
   second route out, so this floor also has the most doors in the building.
   ------------------------------------------------------------------ */
const L01_ROOMS = [
  { id: 'R01', kind: 'CORE', zone: 'CORE', label: 'Közlekedőmag és gépészet', x0: X0, x1: -1.6, z0: Z0, z1: 0.0 },
  { id: 'R02', kind: 'OPEN', zone: 'C', label: 'Nyitott iroda', x0: -1.6, x1: 0.8, z0: Z0, z1: 0.0 },
  { id: 'R03', kind: 'CIRC', zone: 'E', label: 'Északi összekötő', x0: 0.8, x1: 1.6, z0: Z0, z1: 0.0 },
  { id: 'R04', kind: 'PROJECT', zone: 'D', label: 'Projektszoba', x0: 1.6, x1: 2.4, z0: Z0, z1: 0.0 },
  { id: 'R05', kind: 'STORE', zone: 'D', label: 'Tervtár és irattár', x0: 2.4, x1: X1, z0: Z0, z1: 0.0 },
  { id: 'R06', kind: 'CIRC', zone: 'E', label: 'Központi folyosó', x0: X0, x1: X1, z0: 0.0, z1: BZ2 },
  { id: 'R07', kind: 'MEET', zone: 'B', label: 'Tárgyaló 01', x0: X0, x1: -1.6, z0: BZ2, z1: Z1 },
  { id: 'R08', kind: 'FOCUS', zone: 'C', label: 'Fókuszszoba 01', x0: -1.6, x1: -0.8, z0: BZ2, z1: Z1 },
  { id: 'R09', kind: 'FOCUS', zone: 'C', label: 'Fókuszszoba 02', x0: -0.8, x1: 0.0, z0: BZ2, z1: Z1 },
  { id: 'R10', kind: 'FOCUS', zone: 'C', label: 'Fókuszszoba 03', x0: 0.0, x1: 0.8, z0: BZ2, z1: Z1 },
  { id: 'R11', kind: 'MEET', zone: 'B', label: 'Tárgyaló 02', x0: 0.8, x1: 2.4, z0: BZ2, z1: Z1 },
  { id: 'R12', kind: 'KITCH', zone: 'A', label: 'Teakonyha és közösségi tér', x0: 2.4, x1: X1, z0: BZ2, z1: Z1 },
];

/* ------------------------------------------------------------------
   L02 — THE PROJECT FLOOR

   Set back a full structural bay from the east facade, so a 211 m² roof
   terrace opens over L01 and the building steps. The deep band is back on
   the SOUTH — the mirror of L01 — which means a different room faces the
   site's cameras on every storey. Fewest rooms, largest rooms: this is the
   floor that holds the two spaces the practice actually works in.
   ------------------------------------------------------------------ */
export const L02_X1 = 1.6;

const L02_ROOMS = [
  { id: 'R01', kind: 'CORE', zone: 'CORE', label: 'Közlekedőmag és gépészet', x0: X0, x1: -1.6, z0: Z0, z1: BZ1 },
  { id: 'R02', kind: 'OFFICE', zone: 'C', label: 'Iroda 01', x0: -1.6, x1: 0.0, z0: Z0, z1: BZ1 },
  { id: 'R03', kind: 'OFFICE', zone: 'C', label: 'Iroda 02', x0: 0.0, x1: 0.8, z0: Z0, z1: BZ1 },
  { id: 'R04', kind: 'TECH', zone: 'D', label: 'Gépészeti helyiség', x0: 0.8, x1: L02_X1, z0: Z0, z1: BZ1 },
  { id: 'R05', kind: 'CIRC', zone: 'E', label: 'Folyosó', x0: X0, x1: L02_X1, z0: BZ1, z1: 0.0 },
  { id: 'R06', kind: 'BIM', zone: 'D', label: 'BIM és adatszoba', x0: X0, x1: -0.8, z0: 0.0, z1: Z1 },
  { id: 'R07', kind: 'STUDIO', zone: 'C', label: 'Projektstúdió', x0: -0.8, x1: 0.8, z0: 0.0, z1: Z1 },
  { id: 'R08', kind: 'COLLAB', zone: 'D', label: 'Technikai és kollaborációs sáv', x0: 0.8, x1: L02_X1, z0: 0.0, z1: Z1 },
];

/* ------------------------------------------------------------------
   THE CUTAWAY — a pinwheel that turns as the building rises

   A section is how a building is DRAWN, and this one rotates: the ground
   floor opens to the south-east and along the unfinished bay, the work
   floor opens one narrow run of the south-west facade, and the project
   floor opens its whole terrace edge and half its roof. Three levels, three
   different openings, three different rooms shown — the cutaway is itself
   the evidence that no floor is a copy of another.

   `facade` runs are removed from the exterior wall. `slab` rectangles are
   removed from the slab ABOVE the level, because a room opened at the side
   but still wearing a lid shows nothing at all from a raking camera. Those
   pieces are real geometry held on the CEILING layer rather than a runtime
   clipping plane: on a stack, clipping a level's ceiling deletes the floor
   of the level standing on it.
   ------------------------------------------------------------------ */
const CUTS = {
  L00: {
    south: [[0.0, X1]],
    east: [[Z0, BZ1]],
    slab: [{ x0: 0.0, x1: X1, z0: BZ2, z1: Z1 }],
  },
  /* PHASE 9 §08 — THE CUT DELIBERATELY DOES NOT OPEN THE REFERENCE ROOM.

     It was moved onto it and then moved back. Opening a run of facade
     removes that wall from the BUILDING, not only from the picture: standing
     in the room in the 360 viewer and turning south, the visitor is looking
     out of a hole. The reference room is the one room on the site that has
     to survive being stood inside, so the section stays on the two focus
     cells beside it and the room keeps all four of its windows on both of
     its facades. What carries the reality → capture link instead is the
     glazing, the station marker that lands on it in CAPTURE, and the
     same-place section (§26), none of which need a wall removed. */
  L01: {
    south: [[-1.6, 0.0]],
    slab: [{ x0: -1.6, x1: 0.0, z0: 0.0, z1: Z1 }],
  },
  L02: {
    east: [[0.0, Z1]],
    slab: [{ x0: -1.6, x1: L02_X1, z0: 0.0, z1: Z1 }],
  },
};

/** The authoritative level table. Elevations and heights in METRES. */
export const LEVELS = [
  {
    id: 'L00',
    name: 'GROUND',
    label: 'FÖLDSZINT',
    elevation: 0.00,
    ftf: 4.00,
    slab: SLAB_T,
    x0: X0, x1: X1, z0: Z0, z1: Z1,
    /* The public floor is the tall one: it is the arrival space and it holds
       the unfinished bay, which is a construction volume rather than an
       office. */
    winSill: 0.95, winHead: 3.30, winSillLow: 0.25,
    rooms: L00_ROOMS,
    cuts: CUTS.L00,
    /* The one opening in the building that is not derived: a building has an
       entrance, and where it is is a design decision, not an adjacency. */
    entrances: [{ side: 'S', x: -0.80, type: 'D02', room: 'R10' }],
  },
  {
    id: 'L01',
    name: 'WORK',
    label: 'MUNKASZINT',
    elevation: 4.00,
    ftf: 3.60,
    slab: SLAB_T,
    x0: X0, x1: X1, z0: Z0, z1: Z1,
    winSill: 0.85, winHead: 2.95, winSillLow: 0.20,
    rooms: L01_ROOMS,
    cuts: CUTS.L01,
    entrances: [],
  },
  {
    id: 'L02',
    name: 'PROJECT',
    label: 'PROJEKTSZINT',
    elevation: 7.60,
    ftf: 3.60,
    slab: SLAB_T,
    x0: X0, x1: L02_X1, z0: Z0, z1: Z1,
    /* Lower sills throughout. The studio floor is the one that is worked in
       all day and it is the one with the terrace, so its openings sit closer
       to the floor — the same bays, a different proportion. */
    winSill: 0.50, winHead: 3.00, winSillLow: 0.20,
    rooms: L02_ROOMS,
    cuts: CUTS.L02,
    entrances: [],
    /* Roof terrace over L01, east of the setback. Not floor area — it is
       drawn on the plan and excluded from every interior total. */
    terrace: { x0: L02_X1, x1: X1, z0: Z0, z1: Z1 },
  },
];

/** Roof datum, metres above L00's finished floor. */
export const ROOF = {
  id: 'ROOF',
  label: 'TETŐ',
  elevation: LEVELS[2].elevation + LEVELS[2].ftf,   // +11.20
  parapet: 1.10,
};

/* ------------------------------------------------------------------
   PHASE 9 §06 — HOW FAR EACH LEVEL TRAVELS WHEN THE BUILDING OPENS.

   Phase 8 lifted level n by n gaps, which is three equal steps and reads as
   three models floating apart. The brief asks for the opposite — one
   building opening itself for inspection — and what produces that read is
   that the ground floor STAYS on its datum while the separation grows as
   the building rises:

     L00   0.00   it is standing on the ground and must not appear to hover
     L01   1.00   one gap; enough to see the ground floor's ceiling
     L02   2.25   the extra quarter is what makes it read as a hinge
     ROOF  3.60   the lid leaves last and furthest

   Multiples of one gap (2.70 m), so a single `setExplode` progress drives
   the architecture, the three drawings, the station marks and the point
   sample without any of them keeping its own copy of the arithmetic.
   Tuned by eye at 1440×900 and 1920×1080 — qa/p9/shots/after-*-exploded.png.
   ------------------------------------------------------------------ */
export const EXPLODE_GAP_M = 2.70;
export const EXPLODE_STEP = { L00: 0, L01: 1, L02: 2.25, ROOF: 3.6 };

export const LEVEL_IDS = LEVELS.map((l) => l.id);
export const levelById = (id) => LEVELS.find((l) => l.id === id) || LEVELS[0];
export const levelIndex = (id) => LEVEL_IDS.indexOf(id);

/** Clear interior height of a level, metres. */
export const clearOf = (lv) => lv.ftf - lv.slab;

/* ============================================================
   DERIVATION
   ============================================================ */

const EPS = 1e-6;
const near = (a, b) => Math.abs(a - b) < 1e-4;
const key = (v) => v.toFixed(4);

/** Union a list of [a,b] intervals. */
function union(list) {
  const s = [...list].sort((p, q) => p[0] - q[0]);
  const out = [];
  for (const [a, b] of s) {
    const last = out[out.length - 1];
    if (last && a <= last[1] + 1e-4) last[1] = Math.max(last[1], b);
    else out.push([a, b]);
  }
  return out;
}

const overlap = (a0, a1, b0, b1) => [Math.max(a0, b0), Math.min(a1, b1)];

/* ---------------- walls ----------------
   Every room edge is a wall. That is the entire rule, and it is why a wall
   can never be left out of a level or drawn where no room ends. */
function wallsOf(lv) {
  const V = new Map();   // constant X → intervals in Z
  const H = new Map();   // constant Z → intervals in X
  const add = (map, coord, a, b) => {
    const k = key(coord);
    if (!map.has(k)) map.set(k, { coord, spans: [] });
    map.get(k).spans.push([a, b]);
  };
  for (const r of lv.rooms) {
    add(V, r.x0, r.z0, r.z1);
    add(V, r.x1, r.z0, r.z1);
    add(H, r.z0, r.x0, r.x1);
    add(H, r.z1, r.x0, r.x1);
  }
  const out = [];
  const emit = (map, axis) => {
    for (const { coord, spans } of map.values()) {
      const ext = axis === 'v'
        ? near(coord, lv.x0) || near(coord, lv.x1)
        : near(coord, lv.z0) || near(coord, lv.z1);
      for (const [a, b] of union(spans)) {
        if (b - a < 1e-3) continue;
        out.push({ axis, coord, t0: a, t1: b, kind: ext ? 'ext' : 'int' });
      }
    }
  };
  emit(V, 'v');
  emit(H, 'h');
  return out;
}

/* ---------------- adjacency ----------------
   Two rooms are adjacent when they share a wall coordinate and their extents
   along it overlap by enough to put a door in. */
function adjacenciesOf(lv) {
  const R = lv.rooms;
  const MIN = u(1.4);          // 1.4 m of shared wall before a door is possible
  const out = [];
  for (let i = 0; i < R.length; i++) {
    for (let j = i + 1; j < R.length; j++) {
      const a = R[i], b = R[j];
      if (near(a.x1, b.x0) || near(b.x1, a.x0)) {
        const [s0, s1] = overlap(a.z0, a.z1, b.z0, b.z1);
        if (s1 - s0 > MIN) {
          out.push({ a, b, axis: 'v', coord: near(a.x1, b.x0) ? a.x1 : b.x1, s0, s1 });
        }
      }
      if (near(a.z1, b.z0) || near(b.z1, a.z0)) {
        const [s0, s1] = overlap(a.x0, a.x1, b.x0, b.x1);
        if (s1 - s0 > MIN) {
          out.push({ a, b, axis: 'h', coord: near(a.z1, b.z0) ? a.z1 : b.z1, s0, s1 });
        }
      }
    }
  }
  return out;
}

/* ---------------- doors ----------------
   A door exists where a room meets circulation. Nowhere else, and always
   there. Two corridors meeting produce a STRUCTURAL OPENING instead — no
   leaf, no lining, and not a door on the schedule — which is what turns a row
   of circulation cells into one continuous corridor.

   The position along the shared wall alternates end-to-end by the room's
   ordinal, so the doors read as a designed rhythm rather than as a row of
   centred holes, and stays at least a clear leaf-width off either corner. */
function doorsOf(lv) {
  const doors = [];
  const openings = [];
  const counters = { D01: 0, D02: 0, D03: 0 };

  for (const adj of adjacenciesOf(lv)) {
    const { a, b, axis, coord, s0, s1 } = adj;
    const bothCirc = isCirc(a) && isCirc(b);
    const room = isCirc(a) ? b : a;
    if (!bothCirc && !isCirc(a) && !isCirc(b)) continue;   // room ↔ room: no door

    if (bothCirc) {
      const w = Math.min(3.20, m(s1 - s0) * 0.62);
      openings.push({
        level: lv.id, axis, x: axis === 'v' ? coord : (s0 + s1) / 2,
        z: axis === 'v' ? (s0 + s1) / 2 : coord, w, rooms: [a.id, b.id],
      });
      continue;
    }

    const type = DOOR_BY_KIND[room.kind] || DEFAULT_DOOR;
    const dw = DOOR_TYPES[type].w;
    const span = m(s1 - s0);
    const inset = Math.min(Math.max(0.95, span * 0.26), (span - dw) / 2);
    const ordinal = lv.rooms.indexOf(room);
    const t = ordinal % 2 === 0
      ? s0 + u(inset + dw / 2)
      : s1 - u(inset + dw / 2);
    counters[type] += 1;
    doors.push({
      level: lv.id,
      id: `${lv.id}-${type}-${String(counters[type]).padStart(2, '0')}`,
      name: `DOOR_${lv.id}_${type}_${String(counters[type]).padStart(2, '0')}`,
      type,
      axis,
      x: axis === 'v' ? coord : t,
      z: axis === 'v' ? t : coord,
      room: room.id,
      from: isCirc(a) ? a.id : b.id,
      exterior: false,
    });
  }

  // The entrance. Declared, because a building's front door is a decision.
  for (const e of lv.entrances || []) {
    counters[e.type] += 1;
    doors.push({
      level: lv.id,
      id: `${lv.id}-${e.type}-${String(counters[e.type]).padStart(2, '0')}`,
      name: `DOOR_${lv.id}_${e.type}_${String(counters[e.type]).padStart(2, '0')}`,
      type: e.type,
      axis: e.side === 'N' || e.side === 'S' ? 'h' : 'v',
      x: e.side === 'N' || e.side === 'S' ? e.x : (e.side === 'W' ? lv.x0 : lv.x1),
      z: e.side === 'S' ? lv.z1 : e.side === 'N' ? lv.z0 : e.z,
      room: e.room,
      from: 'EXT',
      exterior: true,
    });
  }

  doors.sort((p, q) => (p.type === q.type ? p.id.localeCompare(q.id) : p.type.localeCompare(q.type)));
  return { doors, openings };
}

/* ---------------- windows ----------------
   One candidate per structural bay per exterior wall. The bay grid is shared
   by every level, so an opening on the studio floor stands over an opening on
   the ground floor whatever room is behind it — which is the only reason
   three storeys read as one facade.

   A candidate is rejected when its pier would be eaten by a partition
   landing on the facade or when the room behind it is a shaft.

   PHASE 9 §03 — A SECTION IS A WAY OF DRAWING, NOT A DESIGN CHANGE.

   Phase 8 also rejected a candidate whose run of wall the CUTAWAY had
   removed, and that quietly made the quantity table a schedule of the cut
   model rather than of the building: moving the section by one bay to frame
   a different room changed how many windows the building was said to have.
   A window in a cut run is still a window — the plan draws it, the schedule
   counts it — so it stays in the list and is FLAGGED instead. Only the two
   consumers that build the physical shell (blender/build_environment.py and
   the glazing that goes with it) skip a flagged one, because there is no
   wall there to put it in. */
function windowsOf(lv) {
  const wins = [];
  const counters = { W01: 0, W02: 0, W03: 0 };
  const sparse = new Map();
  const cuts = lv.cuts || {};

  const roomAt = (x, z) => lv.rooms.find(
    (r) => x > r.x0 - EPS && x < r.x1 + EPS && z > r.z0 - EPS && z < r.z1 + EPS,
  );

  const cut = (list, a, b) => (list || []).some(([c0, c1]) => a < c1 - 1e-3 && b > c0 + 1e-3);

  const faces = [
    { side: 'N', axis: 'h', coord: lv.z0, centres: bayCentresX, into: +1, cutList: cuts.north },
    { side: 'S', axis: 'h', coord: lv.z1, centres: bayCentresX, into: -1, cutList: cuts.south },
    { side: 'W', axis: 'v', coord: lv.x0, centres: bayCentresZ, into: +1, cutList: cuts.west },
    { side: 'E', axis: 'v', coord: lv.x1, centres: bayCentresZ, into: -1, cutList: cuts.east },
  ];

  for (const f of faces) {
    for (const c of f.centres) {
      // the bay centre must fall inside this level's footprint on that axis
      if (f.axis === 'h' && (c <= lv.x0 + EPS || c >= lv.x1 - EPS)) continue;
      if (f.axis === 'v' && (c <= lv.z0 + EPS || c >= lv.z1 - EPS)) continue;

      const probe = 0.06 * f.into;
      const room = f.axis === 'h'
        ? roomAt(c, f.coord + probe)
        : roomAt(f.coord + probe, c);
      if (!room) continue;

      const type = WINDOW_BY_KIND[room.kind] || DEFAULT_WINDOW;
      const half = u(WINDOW_TYPES[type].w) / 2 + u(0.35);   // opening + minimum pier
      const a = c - half, b = c + half;

      // the room's own extent along this facade has to contain the opening
      const [r0, r1] = f.axis === 'h' ? [room.x0, room.x1] : [room.z0, room.z1];
      if (a < r0 - 1e-3 || b > r1 + 1e-3) continue;
      const removed = cut(f.cutList, a, b);

      if (SPARSE_KINDS.has(room.kind)) {
        const k = `${f.side}|${room.id}`;
        const n = (sparse.get(k) ?? -1) + 1;
        sparse.set(k, n);
        if (n % 2 === 1) continue;
      }

      counters[type] += 1;
      wins.push({
        level: lv.id,
        id: `${lv.id}-${type}-${String(counters[type]).padStart(2, '0')}`,
        name: `WIN_${lv.id}_${type}_${String(counters[type]).padStart(2, '0')}`,
        type, axis: f.axis, side: f.side,
        x: f.axis === 'h' ? c : f.coord,
        z: f.axis === 'h' ? f.coord : c,
        room: room.id,
        sill: WINDOW_TYPES[type].full ? lv.winSillLow : lv.winSill,
        head: lv.winHead,
        /* True when the sectional cutaway has taken the run of wall this
           opening sits in. Counted and drawn all the same; simply not
           built. */
        cut: removed,
      });
    }
  }
  wins.sort((p, q) => (p.type === q.type ? p.id.localeCompare(q.id) : p.type.localeCompare(q.type)));
  return wins;
}

/* ---------------- assembled level ---------------- */

const cache = new Map();

/**
 * Everything derived for one level: its rooms with areas and identifiers,
 * its walls, its doors, its structural openings and its windows.
 */
export function levelFeatures(id = 'L00') {
  if (cache.has(id)) return cache.get(id);
  const lv = levelById(id);
  const { doors, openings } = doorsOf(lv);
  const rooms = lv.rooms.map((r, i) => ({
    ...r,
    level: lv.id,
    uid: `${lv.id}-${r.id}`,
    name: `ROOM_${lv.id}_${r.id}`,
    index: i,
    x: (r.x0 + r.x1) / 2,
    z: (r.z0 + r.z1) / 2,
    w: r.x1 - r.x0,
    d: r.z1 - r.z0,
    /* Gross internal area, from the rectangle. There is nowhere else it
       could come from, which is the point. */
    area: Math.round(m(r.x1 - r.x0) * m(r.z1 - r.z0) * 10) / 10,
  }));
  const out = {
    level: lv,
    id: lv.id,
    rooms,
    doors,
    openings,
    windows: windowsOf(lv),
    walls: wallsOf(lv),
    /* Rounded ONCE, from the exact rectangles. Summing the per-room figures
       after each has been rounded loses 0.2 m² a floor, and a total that does
       not equal its own parts is the one thing a quantity table may not do. */
    area: Math.round(
      lv.rooms.reduce((s, r) => s + m(r.x1 - r.x0) * m(r.z1 - r.z0), 0) * 10) / 10,
  };
  cache.set(id, out);
  return out;
}

/** Every level, derived. */
export const allFeatures = () => LEVELS.map((l) => levelFeatures(l.id));

/**
 * Drop a memoised derivation. Only the tests use this: Part 28 asks for
 * proof that adding a door changes the count, and the only way to prove that
 * about the REAL pipeline rather than about a fixture is to move a wall and
 * re-derive. Nothing in the site calls it — the plan does not change at
 * runtime.
 */
export function __resetCache(id) {
  if (id) cache.delete(id);
  else cache.clear();
}

/* ============================================================
   QUANTITIES

   Counted, never typed. Every number the site prints — per floor and for
   the building — is a `.length` or a sum over the geometry above.
   ============================================================ */

const tally = (list, keys) => Object.fromEntries(
  keys.map((k) => [k, list.filter((i) => i.type === k).length]),
);

export function buildingQuantities() {
  const D = Object.keys(DOOR_TYPES);
  const W = Object.keys(WINDOW_TYPES);
  const levels = allFeatures().map((f) => ({
    id: f.id,
    name: f.level.name,
    label: f.level.label,
    elevation: f.level.elevation,
    ftf: f.level.ftf,
    clear: Math.round(clearOf(f.level) * 100) / 100,
    rooms: f.rooms.length,
    doors: f.doors.length,
    windows: f.windows.length,
    area: f.area,
    doorTypes: tally(f.doors, D),
    windowTypes: tally(f.windows, W),
    /* Floor finish zones — the PADLÓBURKOLAT output. A finish is a property
       of the room's programme, so the zones are grouped from the room list
       rather than being a fourth hand-drawn layer. */
    finishes: finishZones(f),
  }));

  const sum = (fn) => levels.reduce((s, l) => s + fn(l), 0);
  const sumTypes = (which, keys) => Object.fromEntries(
    keys.map((k) => [k, levels.reduce((s, l) => s + l[which][k], 0)]),
  );

  return {
    levels,
    total: {
      levels: levels.length,
      rooms: sum((l) => l.rooms),
      doors: sum((l) => l.doors),
      windows: sum((l) => l.windows),
      area: Math.round(sum((l) => l.area) * 10) / 10,
      doorTypes: sumTypes('doorTypes', D),
      windowTypes: sumTypes('windowTypes', W),
      height: ROOF.elevation,
      terraceArea: Math.round(
        m(X1 - L02_X1) * m(Z1 - Z0) * 10) / 10,
    },
  };
}

/* Which floor finish a room's programme asks for. Three finishes, and the
   raw bay has none — which is the honest answer for an unfinished slab. */
const FINISH_BY_KIND = {
  RAW: 'F0', CIRC: 'F1', CORE: 'F1', TECH: 'F1', STORE: 'F1',
  MEET: 'F2', OFFICE: 'F2', OPEN: 'F2', FOCUS: 'F2', PROJECT: 'F2',
  DOC: 'F2', BIM: 'F2', REVIEW: 'F2', STUDIO: 'F2', COLLAB: 'F2',
  RECEP: 'F3', WAIT: 'F3', LOUNGE: 'F3', KITCH: 'F3',
};
export const FINISHES = {
  F0: { label: 'Szerkezetkész vasbeton aljzat' },
  F1: { label: 'Ipari padló — közlekedő és kiszolgáló' },
  F2: { label: 'Textil padlóburkolat — munkaterek' },
  F3: { label: 'Fa padlóburkolat — reprezentatív terek' },
};
export const finishOf = (room) => FINISH_BY_KIND[room.kind] || 'F1';

function finishZones(f) {
  const out = {};
  for (const r of f.rooms) {
    const k = finishOf(r);
    out[k] = Math.round(((out[k] || 0) + r.area) * 10) / 10;
  }
  return out;
}

/* ============================================================
   ELEVATIONS IN THE SCENE

   The site scene is in world units and its building pad is at SITE.padY.
   These two helpers are the only place that conversion is written down.
   ============================================================ */

/** World Y of L00's finished floor. padY + the structural slab, in units. */
export const BASE_Y = -0.55 + u(SLAB_T);

/** World Y of a level's finished floor. */
export const floorY = (id) => BASE_Y + u(levelById(id).elevation);

/** World Y the level's PLAN is drawn at — just clear of its own slab. */
export const planY = (id) => floorY(id) + 0.055;

/** World Y of the roof datum. */
export const roofY = () => BASE_Y + u(ROOF.elevation);

/** Formatted elevation, as an architect writes it. */
export function elevationLabel(id) {
  const e = id === 'ROOF' ? ROOF.elevation : levelById(id).elevation;
  return e === 0 ? '±0,00 m' : `+${e.toFixed(2).replace('.', ',')} m`;
}
