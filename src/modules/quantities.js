import { buildingQuantities } from '../webgl/levels.js';
import { stationsByLevel, totalStations } from '../webgl/stations.js';

/* ============================================================
   THE QUANTITIES IN THE MARKUP — PHASE 8

   Three places on the homepage quoted the building's door, window and floor
   figures, and all three were typed into the HTML when the building had one
   storey: "24 PCS", "31 PCS", "842,6 m²". They were true in Phase 7 and
   silently false the moment a wall moved.

   They are counted now, from the same room rectangles the drawings and the
   Blender model are generated from — `src/webgl/levels.js` — and they land
   in the markup at boot. The elements keep their fallback em-dash, so a
   browser that never runs this module shows a blank rather than a lie.

   `levels.js` is a data module with no three.js import, so this costs the
   page nothing it was not already paying: the renderer chunk stays where
   it was.
   ============================================================ */

const m2 = (v) => `${v.toFixed(1).replace('.', ',')} m²`;

export function initQuantities(root = document) {
  const Q = buildingQuantities();
  const v = {
    doors: `${Q.total.doors} PCS`,
    windows: `${Q.total.windows} PCS`,
    rooms: String(Q.total.rooms),
    levels: String(Q.total.levels),
    /* PHASE 9 Part 10 — counted, not typed. The interior round is declared
       in webgl/stations.js and the twelve exterior site tripods are counted
       with it, because the readout is about the JOB rather than about the
       building. `20 + 12` was written out by hand here until this phase. */
    stations: String(totalStations()),
    /* PART 10 — the same round, per storey. */
    stationsByFloor: stationsByLevel()
      .map((l) => String(l.count).padStart(2, '0')).join(' · '),
    area: m2(Q.total.area),
    height: `+${Q.total.height.toFixed(2).replace('.', ',')} m`,
    summary: `${Q.total.doors} AJTÓ · ${Q.total.windows} ABLAK · `
      + `${Q.total.rooms} HELYISÉG · ${Q.total.levels} SZINT · ${m2(Q.total.area)}`,
  };
  for (const el of root.querySelectorAll('[data-q]')) {
    const k = el.dataset.q;
    if (v[k] !== undefined) el.textContent = v[k];
  }
  return Q;
}
