import { LEVEL_IDS, levelFeatures, levelById } from './levels.js';

/* ============================================================
   THE CAPTURE ROUND — PHASE 9 Part 10

   Which rooms a capture round stands in, in the order it walks them.

   This list used to live in `blender/config/rooms.py`, which meant the web
   could not say how many capture points a floor had without waiting for the
   GLB to arrive — and the homepage's CAPTURE readout, which is drawn long
   before any of that, printed the number `20 + 12` written out by hand.
   Part 10 asks for the distribution BY FLOOR, and a hand-written total
   cannot be broken down.

   So the round is declared here, on the same side of the fence as the rooms
   themselves, and `blender/dump_plan.mjs` hands it to Blender along with
   everything else. Python no longer keeps a copy. Add a room to the round
   and the Blender build gains a station, the 360 viewer gains an entry in
   its rail, and the floor counts on the homepage change — from this one
   edit.

   The order matters: it is the order a surveyor would actually walk the
   building — arrival, then circulation, then the rooms — and it is the
   order the 360 viewer's PREVIOUS / NEXT controls step through.
   ============================================================ */

/** @type {Array<[string, string]>} [room uid, station name] */
export const CAPTURE_ROUND = [
  // L00 — arrival first, then the spine, then the working rooms
  ['L00-R10', 'RECEPTION'],
  ['L00-R11', 'WAITING'],
  ['L00-R09', 'BOARDROOM'],
  ['L00-R06', 'CIRC_CENTRE'],
  ['L00-R08', 'CIRC_EAST'],
  ['L00-R02', 'OFFICE'],
  ['L00-R03', 'TECHNICAL'],
  ['L00-R04', 'RAW'],
  // L01 — out of the core, down the corridor, through the open plan
  ['L01-R06', 'CORRIDOR'],
  ['L01-R02', 'OPEN_OFFICE'],
  ['L01-R07', 'MEETING_01'],
  ['L01-R09', 'FOCUS_02'],
  ['L01-R11', 'MEETING_02'],
  ['L01-R12', 'KITCHEN'],
  ['L01-R04', 'PROJECT'],
  // L02 — the studio floor
  ['L02-R05', 'CORRIDOR'],
  ['L02-R06', 'BIM'],
  ['L02-R07', 'STUDIO'],
  ['L02-R08', 'COLLAB'],
  ['L02-R02', 'OFFICE'],
];

/**
 * The twelve EXTERIOR positions of the same round — the tripods standing on
 * the parcel rather than in a room. They are `geometry.js`'s STATIONS, and
 * they are counted apart because they document the SITE, not the building.
 */
export const EXTERIOR_STATIONS = 12;

/** Interior capture points per level, derived from the round itself. */
export function stationsByLevel() {
  return LEVEL_IDS.map((id) => ({
    id,
    label: levelById(id).label,
    count: CAPTURE_ROUND.filter(([uid]) => uid.startsWith(`${id}-`)).length,
  }));
}

/** Interior + exterior. The figure the homepage prints. */
export const totalStations = () => CAPTURE_ROUND.length + EXTERIOR_STATIONS;

/** Every room the round names, resolved against the plan. Null if unknown. */
export function roundRooms() {
  return CAPTURE_ROUND.map(([uid, name]) => {
    const lid = uid.split('-')[0];
    const room = LEVEL_IDS.includes(lid)
      ? levelFeatures(lid).rooms.find((r) => r.uid === uid) : null;
    return { uid, name, level: lid, room };
  });
}
