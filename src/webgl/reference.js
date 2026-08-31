/* ============================================================
   THE REFERENCE ROOM — PHASE 9 Part 08

   One room, chosen once, and then followed all the way through the site:

     REALITY   it is inside the hero's cutaway, on the work floor
     CAPTURE   a capture station stands in it
     360       that station is the viewer's default entry
     EXPLODED  it is on the plate that lifts in the middle
     PLAN      it is a rectangle on the L01 drawing
     QUANTITY  its identifier, area, doors and windows are counted

   Nothing here is a second description of that room. The rectangle, the
   label, the area, the openings and the station all come from the same two
   places they already came from — `webgl/levels.js` and the capture-station
   empties in the GLB — and this module only decides WHICH one, by a rule
   rather than by a coordinate.

   THE RULE

     the largest MEET room on the WORK level,
     ties broken by how many FACADES it touches, then by window count

   The tie-break is not arbitrary and it is not a coordinate. L01 has two
   meeting rooms of exactly 70.2 m²; one of them is a corner room with four
   windows on two facades and the other has two windows on one. A corner
   room has more daylight, more depth and two directions to be photographed
   from, and when both stations were rendered (`qa/p9/heads-b.png`) the
   corner room's was plainly the better frame — so the rule was written to
   describe what the eye had already chosen, rather than the answer being
   written down. On the current plan it resolves to L01-R07, "Tárgyaló 01",
   station CP-11. `test/reference.test.mjs` asserts every link in the chain.
   ============================================================ */
import { levelFeatures, LEVEL_IDS, LEVELS } from './levels.js';

/** The level the reference room lives on: the one whose programme is WORK. */
export const REF_LEVEL = (LEVELS.find((l) => l.name === 'WORK') || LEVELS[1]).id;

/** The room record itself, derived. */
export function referenceRoom() {
  const F = levelFeatures(REF_LEVEL);
  const rooms = F.rooms.filter((r) => r.kind === 'MEET');
  if (!rooms.length) return F.rooms[0];
  const wins = (r) => F.windows.filter((w) => w.room === r.id);
  const facades = (r) => new Set(wins(r).map((w) => w.side)).size;
  return rooms.slice().sort((a, b) => (
    b.area - a.area || facades(b) - facades(a) || wins(b).length - wins(a).length
  ))[0];
}

/** `L01-R11` — the identifier every other module addresses it by. */
export const REF_UID = referenceRoom().uid;
export const REF_ROOM_ID = referenceRoom().id;

/**
 * Is this capture station standing in the reference room?
 *
 * The room travels under two names depending on where it is read from: the
 * glTF station empty carries the UID (`L01-R07`, because a station has to
 * say which level it is on), the plan carries the plain id (`R07`, because
 * a level already knows which one it is). Both are the same room and this
 * accepts either rather than making every caller remember which it holds.
 */
export const isReferenceStation = (st) => {
  if (!st) return false;
  const level = st.level ?? st.floor;
  const room = st.room ?? st.roomId;
  return level === REF_LEVEL && (room === REF_ROOM_ID || room === REF_UID);
};

/**
 * The reference room's station in a list of stations, or null.
 * @param {Array} list stations as the viewer or archScene hold them
 */
export const referenceStation = (list = []) => list.find(isReferenceStation) || null;

/** Everything a readout needs, counted rather than typed. */
export function referenceFacts() {
  const F = levelFeatures(REF_LEVEL);
  const room = referenceRoom();
  return {
    uid: room.uid,
    id: room.id,
    level: REF_LEVEL,
    label: room.label,
    area: room.area,
    doors: F.doors.filter((d) => d.room === room.id).length,
    windows: F.windows.filter((w) => w.room === room.id).length,
    levelIndex: LEVEL_IDS.indexOf(REF_LEVEL),
  };
}
