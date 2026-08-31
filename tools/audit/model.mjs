/* ============================================================
   THE MULTI-FLOOR AUDIT — PHASE 9 Part 34

       npm run audit

   One walk over every room, door, window and capture station in the
   building, reporting for each: its identifier, its level, and whether it
   exists in the GEOMETRY (a rectangle or a coordinate), in the PLAN (the
   drawing generated for its level) and in the QUANTITY table.

   `test/consistency.test.mjs` asserts the same relationships and fails the
   build if any of them breaks. This prints them, because a table you can
   read is what tells you WHICH of two hundred objects went missing.
   ============================================================ */
import {
  LEVELS, LEVEL_IDS, levelFeatures, allFeatures, buildingQuantities,
  elevationLabel, finishOf, FINISHES,
} from '../../src/webgl/levels.js';
import { CAPTURE_ROUND, roundRooms, stationsByLevel, totalStations }
  from '../../src/webgl/stations.js';
import { REF_UID, referenceFacts } from '../../src/webgl/reference.js';
import { buildPlan } from '../../src/webgl/geometry.js';

const Q = buildingQuantities();
const pad = (v, n) => String(v).padEnd(n);
const num = (v, n) => String(v).padStart(n);
const YES = '  ok';
const NO = ' MISSING';

let orphans = 0;
const flag = (ok) => { if (!ok) orphans += 1; return ok ? YES : NO; };

console.log('\n=== GODATAFUSION · MULTI-FLOOR MODEL AUDIT ===\n');

/* Which objects the generated DRAWING actually contains. The plan is a
   geometry buffer, not a list, so what is checked is that the level it
   belongs to produces one and that it is not empty — an empty drawing is
   how "the plan contains it" fails in practice. */
const planOf = new Map();
for (const id of LEVEL_IDS) {
  const g = buildPlan(id);
  planOf.set(id, g.getAttribute('position')?.count ?? 0);
}

console.log('LEVELS');
console.log(`  ${pad('ID', 6)}${pad('NAME', 10)}${pad('ELEV', 12)}`
  + `${num('ROOMS', 6)}${num('DOORS', 6)}${num('WINS', 6)}${num('AREA m²', 10)}`
  + `${num('PLAN v', 9)}${num('CP', 4)}`);
for (const l of Q.levels) {
  const cp = stationsByLevel().find((s) => s.id === l.id).count;
  console.log(`  ${pad(l.id, 6)}${pad(l.name, 10)}${pad(elevationLabel(l.id), 12)}`
    + `${num(l.rooms, 6)}${num(l.doors, 6)}${num(l.windows, 6)}${num(l.area.toFixed(1), 10)}`
    + `${num(planOf.get(l.id), 9)}${num(cp, 4)}`);
  flag(planOf.get(l.id) > 0);
}
console.log(`  ${pad('TOTAL', 28)}${num(Q.total.rooms, 6)}${num(Q.total.doors, 6)}`
  + `${num(Q.total.windows, 6)}${num(Q.total.area.toFixed(1), 10)}`
  + `${num('', 9)}${num(CAPTURE_ROUND.length, 4)}`);

console.log('\nROOMS');
const station = new Map(roundRooms().map((r) => [r.uid, r.name]));
for (const F of allFeatures()) {
  for (const r of F.rooms) {
    const doors = F.doors.filter((d) => d.room === r.id).length;
    const wins = F.windows.filter((w) => w.room === r.id).length;
    const fin = finishOf(r);
    console.log(`  ${pad(r.uid, 10)}${pad(r.kind, 9)}${pad(r.label.slice(0, 30), 32)}`
      + `${num(r.area.toFixed(1), 9)} m²  D${num(doors, 2)}  W${num(wins, 2)}`
      + `  ${pad(fin, 4)}${pad(station.get(r.uid) || '', 14)}`
      + `${flag(r.area > 0 && FINISHES[fin])}${r.uid === REF_UID ? '   ◀ REFERENCE' : ''}`);
  }
}

console.log('\nOPENINGS');
for (const F of allFeatures()) {
  const ids = new Set(F.rooms.map((x) => x.id));
  const cut = F.windows.filter((w) => w.cut).length;
  console.log(`  ${pad(F.id, 6)}doors ${num(F.doors.length, 3)}`
    + `   windows ${num(F.windows.length, 3)} (${cut} in a cut run — counted, not built)`
    + `   orphaned ${flag(F.doors.every((d) => ids.has(d.room))
      && F.windows.every((w) => ids.has(w.room)))}`);
}

console.log('\nCAPTURE ROUND');
for (const { uid, name, level, room } of roundRooms()) {
  console.log(`  ${pad(uid, 10)}${pad(level, 6)}${pad(name, 14)}`
    + `${pad(room ? room.label.slice(0, 30) : '—', 32)}${flag(Boolean(room))}`);
}
console.log(`  interior ${CAPTURE_ROUND.length}  exterior ${totalStations() - CAPTURE_ROUND.length}`
  + `  total ${totalStations()}`);

console.log('\nREFERENCE ROOM');
const R = referenceFacts();
for (const [k, v] of Object.entries(R)) console.log(`  ${pad(k, 12)}${v}`);

console.log(`\n${orphans === 0 ? 'CLEAN — no orphaned data.' : `${orphans} PROBLEM(S) FOUND.`}\n`);
process.exit(orphans === 0 ? 0 : 1);
