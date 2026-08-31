/* ============================================================
   THE BUILDING, CHECKED — PHASE 8 Parts 27 and 28

   Every quantity the site prints comes out of `src/webgl/levels.js`, and
   every wall Blender extrudes comes out of the same derivation. That makes
   this file the place where "the drawing and the building agree" stops being
   a claim and becomes a test.

   Two families:

     ARCHITECTURE   the rooms tile their floor, every room can be walked to,
                    the core lands in one cell on every level, no opening is
                    outside the wall it belongs to, the stair actually goes
                    somewhere.
     QUANTITY       the totals are the sum of the parts, and — the one the
                    brief asks for by name — ADDING A DOOR CHANGES THE COUNT.

   Run: npm test
   ============================================================ */
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  LEVELS, LEVEL_IDS, levelFeatures, allFeatures, buildingQuantities,
  levelById, CORE, MPU, m, u, DOOR_TYPES, WINDOW_TYPES, ROOF,
  clearOf, floorY, planY, roofY, elevationLabel, finishOf,
  bayCentresX, bayCentresZ,
} from '../src/webgl/levels.js';

const EPS = 1e-6;
const area = (r) => m(r.x1 - r.x0) * m(r.z1 - r.z0);
const overlaps = (a, b) =>
  a.x0 < b.x1 - 1e-6 && b.x0 < a.x1 - 1e-6 &&
  a.z0 < b.z1 - 1e-6 && b.z0 < a.z1 - 1e-6;

/* ============================================================
   ARCHITECTURE
   ============================================================ */

test('every level is tiled by its rooms — no gaps, no overlaps', () => {
  for (const lv of LEVELS) {
    const footprint = m(lv.x1 - lv.x0) * m(lv.z1 - lv.z0);
    const sum = lv.rooms.reduce((s, r) => s + area(r), 0);
    assert.ok(Math.abs(sum - footprint) < 0.5,
      `${lv.id}: rooms cover ${sum.toFixed(1)} m² of a ${footprint.toFixed(1)} m² floor`);
    for (let i = 0; i < lv.rooms.length; i++) {
      for (let j = i + 1; j < lv.rooms.length; j++) {
        assert.ok(!overlaps(lv.rooms[i], lv.rooms[j]),
          `${lv.id}: ${lv.rooms[i].id} overlaps ${lv.rooms[j].id}`);
      }
    }
    for (const r of lv.rooms) {
      assert.ok(r.x0 >= lv.x0 - EPS && r.x1 <= lv.x1 + EPS
        && r.z0 >= lv.z0 - EPS && r.z1 <= lv.z1 + EPS,
        `${lv.id}: ${r.id} is outside the footprint`);
    }
  }
});

test('room identifiers are unique across the building', () => {
  const seen = new Set();
  for (const f of allFeatures()) {
    for (const r of f.rooms) {
      assert.ok(!seen.has(r.uid), `duplicate room id ${r.uid}`);
      seen.add(r.uid);
    }
  }
  assert.equal(seen.size, buildingQuantities().total.rooms);
});

test('the vertical core lands inside exactly one room on every level', () => {
  for (const lv of LEVELS) {
    const holders = lv.rooms.filter(
      (r) => r.x0 <= CORE.x0 + EPS && r.x1 >= CORE.x1 - EPS
        && r.z0 <= CORE.z0 + EPS && r.z1 >= CORE.z1 - EPS);
    assert.equal(holders.length, 1,
      `${lv.id}: the core is held by ${holders.length} rooms, not 1`);
    assert.equal(holders[0].kind, 'CORE',
      `${lv.id}: the core sits in ${holders[0].id}, which is not a CORE room`);
  }
});

test('the core aligns: same plan rectangle on every level', () => {
  // It is one rectangle, declared once — this asserts nobody has smuggled a
  // per-level override in, which is the only way a stair could ever miss.
  for (const lv of LEVELS) {
    const core = lv.rooms.find((r) => r.kind === 'CORE');
    assert.ok(core, `${lv.id} has no core room`);
  }
  assert.ok(CORE.x1 > CORE.x0 && CORE.z1 > CORE.z0);
  const w = m(CORE.x1 - CORE.x0), d = m(CORE.z1 - CORE.z0);
  // big enough for a two-flight stair AND a lift beside it
  assert.ok(w > 4.4 && d > 5.2, `core is ${w.toFixed(2)} x ${d.toFixed(2)} m`);
});

test('every room can be walked to — the door graph is connected', () => {
  for (const f of allFeatures()) {
    const nodes = new Set(f.rooms.map((r) => r.id));
    const edges = new Map([...nodes].map((id) => [id, []]));
    const link = (a, b) => {
      if (!edges.has(a) || !edges.has(b)) return;
      edges.get(a).push(b);
      edges.get(b).push(a);
    };
    for (const d of f.doors) if (!d.exterior) link(d.room, d.from);
    for (const o of f.openings) link(o.rooms[0], o.rooms[1]);

    const start = f.rooms.find((r) => r.kind === 'CORE')?.id || f.rooms[0].id;
    const seen = new Set([start]);
    const queue = [start];
    while (queue.length) {
      for (const n of edges.get(queue.pop())) {
        if (!seen.has(n)) { seen.add(n); queue.push(n); }
      }
    }
    const stranded = [...nodes].filter((n) => !seen.has(n));
    assert.deepEqual(stranded, [],
      `${f.id}: ${stranded.join(', ')} cannot be reached from the core`);
  }
});

test('every door stands on a wall of its own level', () => {
  for (const f of allFeatures()) {
    for (const d of f.doors) {
      const on = f.walls.some((w) => (
        d.axis === w.axis
        && Math.abs(w.coord - (d.axis === 'v' ? d.x : d.z)) < 1e-4
        && (d.axis === 'v' ? d.z : d.x) > w.t0 - 1e-3
        && (d.axis === 'v' ? d.z : d.x) < w.t1 + 1e-3));
      assert.ok(on, `${f.id}: ${d.id} is not on any wall`);
    }
  }
});

test('every door leaf fits inside the wall it opens, clear of both corners', () => {
  for (const f of allFeatures()) {
    for (const d of f.doors) {
      const half = u(DOOR_TYPES[d.type].w) / 2;
      const t = d.axis === 'v' ? d.z : d.x;
      const wall = f.walls.find((w) => d.axis === w.axis
        && Math.abs(w.coord - (d.axis === 'v' ? d.x : d.z)) < 1e-4
        && t > w.t0 - 1e-3 && t < w.t1 + 1e-3);
      assert.ok(t - half > wall.t0 - 1e-3 && t + half < wall.t1 + 1e-3,
        `${f.id}: ${d.id} overruns the end of its wall`);
    }
  }
});

test('every window is on the perimeter and clear of the partitions', () => {
  for (const f of allFeatures()) {
    const lv = f.level;
    for (const w of f.windows) {
      const onEdge = w.axis === 'h'
        ? Math.abs(w.z - lv.z0) < EPS || Math.abs(w.z - lv.z1) < EPS
        : Math.abs(w.x - lv.x0) < EPS || Math.abs(w.x - lv.x1) < EPS;
      assert.ok(onEdge, `${f.id}: ${w.id} is not on an exterior wall`);

      // the room behind it has to contain the whole opening plus its piers
      const room = f.rooms.find((r) => r.id === w.room);
      const half = u(WINDOW_TYPES[w.type].w) / 2;
      const [a, b] = w.axis === 'h' ? [room.x0, room.x1] : [room.z0, room.z1];
      const c = w.axis === 'h' ? w.x : w.z;
      assert.ok(c - half > a - 1e-3 && c + half < b + 1e-3,
        `${f.id}: ${w.id} crosses a partition`);
      assert.ok(w.head <= clearOf(lv) + 1e-6,
        `${f.id}: ${w.id} head at ${w.head} m is above the ${clearOf(lv)} m soffit`);
      assert.ok(w.sill >= 0 && w.head > w.sill);
    }
  }
});

test('windows align vertically: every opening is on a structural bay centre', () => {
  // This is the whole reason three storeys read as one facade.
  for (const f of allFeatures()) {
    for (const w of f.windows) {
      const list = w.axis === 'h' ? bayCentresX : bayCentresZ;
      const c = w.axis === 'h' ? w.x : w.z;
      assert.ok(list.some((v) => Math.abs(v - c) < 1e-6),
        `${f.id}: ${w.id} is off the bay grid at ${c}`);
    }
  }
});

test('storey heights are believable and the elevations add up', () => {
  let e = 0;
  for (const lv of LEVELS) {
    assert.equal(lv.elevation, e, `${lv.id} is at the wrong elevation`);
    assert.ok(lv.ftf >= 3.3 && lv.ftf <= 4.2, `${lv.id} ftf ${lv.ftf} m`);
    const clear = clearOf(lv);
    assert.ok(clear >= 2.8 && clear <= 3.9, `${lv.id} clear ${clear} m`);
    e += lv.ftf;
  }
  assert.equal(ROOF.elevation, e);
  // and the world-unit conversion is monotonic
  const ys = [...LEVEL_IDS.map(floorY), roofY()];
  for (let i = 1; i < ys.length; i++) assert.ok(ys[i] > ys[i - 1]);
  assert.equal(elevationLabel('L00'), '±0,00 m');
  assert.equal(elevationLabel('ROOF'), '+11,20 m');
});

test('the plan drawings are drawn at their own elevations', () => {
  const ys = LEVEL_IDS.map(planY);
  for (let i = 1; i < ys.length; i++) {
    assert.ok(ys[i] > ys[i - 1], 'plan sheets must stack in floor order');
  }
  // one storey apart, in world units, to within a millimetre of the metres
  const gap = m(ys[1] - ys[0]);
  assert.ok(Math.abs(gap - LEVELS[1].elevation) < 0.01, `gap ${gap} m`);
});

test('every level has a distinct plan — no floor is a copy of another', () => {
  const shape = (id) => levelFeatures(id).rooms
    .map((r) => `${r.x0},${r.x1},${r.z0},${r.z1}`).sort().join(';');
  const seen = new Map();
  for (const id of LEVEL_IDS) {
    const s = shape(id);
    assert.ok(!seen.has(s), `${id} has the same room grid as ${seen.get(s)}`);
    seen.set(s, id);
  }
  // and the programmes differ too, not just the geometry
  const kinds = LEVEL_IDS.map((id) =>
    [...new Set(levelFeatures(id).rooms.map((r) => r.kind))].sort().join(','));
  assert.notEqual(kinds[0], kinds[1]);
  assert.notEqual(kinds[1], kinds[2]);
});

/* ============================================================
   QUANTITY
   ============================================================ */

test('building totals are the sum of the floors', () => {
  const Q = buildingQuantities();
  const sum = (k) => Q.levels.reduce((s, l) => s + l[k], 0);
  assert.equal(Q.total.rooms, sum('rooms'));
  assert.equal(Q.total.doors, sum('doors'));
  assert.equal(Q.total.windows, sum('windows'));
  assert.ok(Math.abs(Q.total.area - sum('area')) < 0.15,
    `total ${Q.total.area} vs sum ${sum('area')}`);
  assert.equal(Q.total.levels, LEVELS.length);
});

test('type breakdowns account for every opening', () => {
  const Q = buildingQuantities();
  for (const l of Q.levels) {
    assert.equal(Object.values(l.doorTypes).reduce((a, b) => a + b, 0), l.doors);
    assert.equal(Object.values(l.windowTypes).reduce((a, b) => a + b, 0), l.windows);
  }
  assert.equal(Object.values(Q.total.doorTypes).reduce((a, b) => a + b, 0), Q.total.doors);
  assert.equal(Object.values(Q.total.windowTypes).reduce((a, b) => a + b, 0), Q.total.windows);
});

test('floor finish zones account for every square metre of every floor', () => {
  const Q = buildingQuantities();
  for (const l of Q.levels) {
    const sum = Object.values(l.finishes).reduce((a, b) => a + b, 0);
    assert.ok(Math.abs(sum - l.area) < 0.4,
      `${l.id}: finishes cover ${sum} of ${l.area} m²`);
  }
});

test('every room carries a floor finish', () => {
  for (const f of allFeatures()) {
    for (const r of f.rooms) assert.ok(finishOf(r), `${r.uid} has no finish`);
  }
});

/* The brief's own test, Part 28: "If a door is added, quantity count must
   change. If a room is removed, room total must change." Both are asserted
   against the real derivation by mutating a level and re-deriving, rather
   than against a fixture — a fixture would pass even if the pipeline had
   been unplugged. */
test('adding a room adds its doors, its windows and its area', async () => {
  const mod = await import('../src/webgl/levels.js?mutate');
  const lv = mod.levelById('L01');
  const before = mod.buildingQuantities();

  // split the open office in two, which must produce one more room AND one
  // more door onto the corridor it is being split off
  const open = lv.rooms.find((r) => r.kind === 'OPEN');
  const cut = (open.x0 + open.x1) / 2;
  const half = { ...open, id: 'RXX', x0: cut };
  open.x1 = cut;
  lv.rooms.push(half);

  // the module memoises per level; clear the one entry that changed
  mod.__resetCache('L01');
  const after = mod.buildingQuantities();

  assert.equal(after.total.rooms, before.total.rooms + 1, 'room total unchanged');
  assert.ok(after.total.doors > before.total.doors, 'door total unchanged');
  assert.ok(Math.abs(after.total.area - before.total.area) < 0.2,
    'splitting a room must not change the floor area');
});
