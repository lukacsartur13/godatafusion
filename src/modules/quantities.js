import { buildingQuantities } from '../webgl/levels.js';
import { fillFigures } from './examples.js';

/* ============================================================
   THE QUANTITIES IN THE MARKUP — PHASE 8, widened in PHASE 12

   Every figure the homepage quotes — doors, windows, rooms, floor area,
   capture points, and now the parcel's area, relief and cut volume — is
   counted from the same modules the drawings are generated from and
   written into `[data-q]` elements at boot. The elements are EMPTY in
   the markup, and an empty figure hides its row (styles/tone.css), so a
   browser that never runs this shows nothing rather than a dash.

   The value table itself lives in modules/examples.js, which the service
   pages share.
   ============================================================ */
export function initQuantities(root = document) {
  fillFigures(root);
  return buildingQuantities();
}
