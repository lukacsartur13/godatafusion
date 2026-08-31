/* ============================================================
   MULTI-FLOOR DATA CONSISTENCY — PHASE 9 Parts 33 and 34

   Part 34 asks for a development audit: for every room, door, window and
   capture station, report its id, its level, and whether it exists in the
   geometry, in the plan and in the quantities — and it asks for the answer
   to be "no orphaned data".

   This is that audit, written as assertions so it runs on every `npm test`
   instead of being a report somebody has to remember to read. `npm run
   audit` prints the same walk as a table.

   Part 33 asks the other half: that no number the site prints is a stale
   single-floor value. Every total here is recomputed from the parts.

   Run: npm test
   ============================================================ */
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  LEVELS, LEVEL_IDS, levelFeatures, allFeatures, buildingQuantities,
  DOOR_TYPES, WINDOW_TYPES, elevationLabel, ROOF, clearOf, MPU,
} from '../src/webgl/levels.js';
import { CAPTURE_ROUND, roundRooms, totalStations, EXTERIOR_STATIONS }
  from '../src/webgl/stations.js';
import { SITE } from '../src/webgl/field.js';
import { SCALE } from '../src/data/terrain-metrics.js';

const Q = buildingQuantities();

/* ---------------- rooms ---------------- */

test('every room has an id, a level, a rectangle and an area', () => {
  const seen = new Set();
  for (const F of allFeatures()) {
    for (const r of F.rooms) {
      assert.match(r.id, /^R\d{2}$/, `${r.uid}: malformed room id`);
      assert.equal(r.level, F.id, `${r.uid}: level disagrees with its floor`);
      assert.equal(r.uid, `${F.id}-${r.id}`, `${r.uid}: uid is not level-id`);
      assert.ok(r.x1 > r.x0 && r.z1 > r.z0, `${r.uid}: degenerate rectangle`);
      assert.ok(r.area > 0, `${r.uid}: no area`);
      assert.ok(r.label && r.label.length > 2, `${r.uid}: no label`);
      assert.ok(!seen.has(r.uid), `${r.uid}: duplicate`);
      seen.add(r.uid);
    }
  }
  assert.equal(seen.size, Q.total.rooms);
});

/* ---------------- doors and windows ---------------- */

test('every door belongs to a room on its own level and to a known type', () => {
  for (const F of allFeatures()) {
    const ids = new Set(F.rooms.map((r) => r.id));
    for (const d of F.doors) {
      assert.equal(d.level, F.id, `${d.id}: level disagrees`);
      assert.ok(DOOR_TYPES[d.type], `${d.id}: unknown type ${d.type}`);
      assert.ok(ids.has(d.room), `${d.id}: room ${d.room} is not on ${F.id}`);
    }
  }
});

test('every window belongs to a room on its own level and to a known type', () => {
  for (const F of allFeatures()) {
    const ids = new Set(F.rooms.map((r) => r.id));
    for (const w of F.windows) {
      assert.equal(w.level, F.id, `${w.id}: level disagrees`);
      assert.ok(WINDOW_TYPES[w.type], `${w.id}: unknown type ${w.type}`);
      assert.ok(ids.has(w.room), `${w.id}: room ${w.room} is not on ${F.id}`);
      assert.equal(typeof w.cut, 'boolean',
        `${w.id}: a window has to say whether the section removed its wall`);
    }
  }
});

test('a window the cutaway removed is still counted and still scheduled', () => {
  /* PHASE 9 — this is the behaviour change the phase made, and the reason
     for it: a section is a way of DRAWING a building, so moving it must not
     change how many windows the building is said to have. */
  const cut = allFeatures().flatMap((F) => F.windows.filter((w) => w.cut));
  assert.ok(cut.length > 0,
    'no window is inside a cut run — this test has stopped testing anything');
  for (const F of allFeatures()) {
    const counted = Object.values(
      Q.levels.find((l) => l.id === F.id).windowTypes,
    ).reduce((a, b) => a + b, 0);
    assert.equal(counted, F.windows.length,
      `${F.id}: the schedule and the window list disagree`);
  }
});

/* ---------------- capture stations ---------------- */

test('every capture station names a room that exists on its own level', () => {
  for (const { uid, name, level, room } of roundRooms()) {
    assert.ok(LEVEL_IDS.includes(level), `${uid}: unknown level`);
    assert.ok(room, `${uid}: the round visits a room the plan does not have`);
    assert.ok(name && /^[A-Z0-9_]+$/.test(name), `${uid}: bad station name`);
  }
});

test('no room is visited twice by the capture round', () => {
  const seen = new Set();
  for (const [uid] of CAPTURE_ROUND) {
    assert.ok(!seen.has(uid), `${uid}: visited twice`);
    seen.add(uid);
  }
});

test('the capture total the homepage prints is the sum of its parts', () => {
  assert.equal(totalStations(), CAPTURE_ROUND.length + EXTERIOR_STATIONS);
});

/* ---------------- quantities ---------------- */

test('every building total is the sum of the floors — no stale figures', () => {
  const sum = (fn) => Q.levels.reduce((s, l) => s + fn(l), 0);
  assert.equal(Q.total.levels, LEVELS.length);
  assert.equal(Q.total.rooms, sum((l) => l.rooms));
  assert.equal(Q.total.doors, sum((l) => l.doors));
  assert.equal(Q.total.windows, sum((l) => l.windows));
  assert.equal(Q.total.area, Math.round(sum((l) => l.area) * 10) / 10);
  for (const t of Object.keys(DOOR_TYPES)) {
    assert.equal(Q.total.doorTypes[t], sum((l) => l.doorTypes[t]));
  }
  for (const t of Object.keys(WINDOW_TYPES)) {
    assert.equal(Q.total.windowTypes[t], sum((l) => l.windowTypes[t]));
  }
});

test('no floor is a copy of another — three programmes, three grains', () => {
  const sig = Q.levels.map((l) => `${l.rooms}|${l.doors}|${l.windows}|${l.area}`);
  assert.equal(new Set(sig).size, sig.length,
    `two levels have identical quantities: ${sig.join('  ')}`);
});

test('elevations are real, ordered, and printed as an architect writes them', () => {
  let last = -Infinity;
  for (const l of LEVELS) {
    assert.ok(l.elevation > last, `${l.id}: elevation is not above ${last}`);
    last = l.elevation;
    assert.ok(clearOf(l) > 2.4, `${l.id}: clear height under 2.4 m`);
  }
  assert.equal(elevationLabel('L00'), '±0,00 m');
  assert.match(elevationLabel('L01'), /^\+\d+,\d{2} m$/);
  assert.equal(ROOF.elevation, LEVELS.at(-1).elevation + LEVELS.at(-1).ftf);
});

/* ---------------- the one that is NOT consistent ----------------

   PHASE 9 §16 asked for a BUILDING DATUM readout relating the building's
   ±0,00 to the site's high and low points. It was not built, and this is
   the reason, asserted so that it cannot be forgotten or accidentally
   "fixed" by printing a number that means nothing:

   THE TERRAIN AND THE BUILDING ARE AT DIFFERENT SCALES IN ONE WORLD.

   The parcel declares 1 248,62 m² over the site square, which works out at
   about 2,21 m per world unit. The building declares 842,6 m² over its
   footprint, which is about 5,35 m per world unit. Both are used, in the
   same scene, on the same axes. Any figure that crossed from one to the
   other — "the site falls 3,00 m against a building 11,20 m tall" — would
   be arithmetic performed on two different metres.

   The demonstration is internally consistent within each subject, and the
   site never prints a figure that spans them. This test pins that
   boundary: if somebody reconciles the two scales, it fails and the datum
   readout can be built. Until then it may not be.
   ---------------------------------------------------------------- */
test('the terrain and the building metre are KNOWN to disagree', () => {
  const terrainMPU = SCALE;
  const buildingMPU = MPU;
  assert.ok(SITE.size > 0);
  assert.ok(Math.abs(terrainMPU - buildingMPU) > 0.5,
    'the two scales now agree — §16\'s building datum readout can be built, '
    + 'and this test should be replaced by it');
});
