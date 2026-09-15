import { SITE, heightAt } from '../webgl/field.js';
import { fmtNum } from '../i18n/t.js';

/* ============================================================
   MEASURED VALUES FOR THE DEMONSTRATION TERRAIN

   Every figure the MEASURE page shows is integrated numerically over
   the same height field the 3D view renders. Nothing is typed in. Move
   the cut level and the volume changes, because it is the actual volume
   between the surface and that level.

   This is a demonstration parcel, and the page says so. What it
   demonstrates — that a surface becomes area, volume, elevation and a
   contour interval — is exactly what the service does.

   The world unit is scaled so the parcel matches the 1 248,62 m² the
   homepage has always quoted, which keeps every derived number on the
   site internally consistent.
   ============================================================ */

export const PARCEL_M2 = 1248.62;
export const SCALE = Math.sqrt(PARCEL_M2) / SITE.size;      // metres per world unit

const RES = 220;

/** One pass over the field; everything else is derived from this. */
function sample() {
  const half = SITE.size / 2;
  const step = SITE.size / RES;
  const grid = new Float32Array((RES + 1) * (RES + 1));
  let min = Infinity, max = -Infinity;
  for (let j = 0; j <= RES; j++) {
    for (let i = 0; i <= RES; i++) {
      const h = heightAt(-half + i * step, -half + j * step);
      grid[j * (RES + 1) + i] = h;
      if (h < min) min = h;
      if (h > max) max = h;
    }
  }
  return { grid, min, max, step };
}

let cached = null;
const field = () => (cached ??= sample());

/* PHASE 14 — the page's own number format. Hungarian writes 1 248,62,
   English 1,248.62 and German 1.248,62, and a figure the site computed
   has to arrive in the format of the document it appears in. */
const hu = (n, d = 2) => fmtNum(n, d);

/** World-space extremes of the field, for the 3D cut prism. */
export function bounds() {
  const { min, max } = field();
  return { min, max };
}

/** Cut / fill split at a level, both in m³ — the pair a site actually needs. */
export function cutFillAt(level01) {
  const { grid, min, max, step } = field();
  const cut = min + (max - min) * level01;
  const cellA = (step * SCALE) ** 2;
  let cutV = 0, fillV = 0;
  for (let i = 0; i < grid.length; i++) {
    const d = grid[i] - cut;
    if (d > 0) cutV += d; else fillV -= d;
  }
  return {
    worldY: cut,
    level: cut * SCALE,
    cut: cutV * SCALE * cellA,
    fill: fillV * SCALE * cellA,
  };
}

export function metrics() {
  const { min, max } = field();
  const relief = (max - min) * SCALE;
  /* A contour interval a surveyor would actually choose: round to a
     sensible step, then count how many lines that produces. */
  const interval = relief > 12 ? 1 : relief > 6 ? 0.5 : 0.25;
  const lines = Math.floor(relief / interval);
  const cf = cutFillAt(0.5);
  return {
    area: PARCEL_M2,
    areaText: `${hu(PARCEL_M2)} m²`,
    relief,
    reliefText: `${hu(relief)} m`,
    minText: `${hu(min * SCALE)} m`,
    maxText: `${hu(max * SCALE)} m`,
    interval,
    intervalText: `${hu(interval, 2)} m`,
    lines,
    cut: cf.cut,
    fill: cf.fill,
    cutText: `${hu(cf.cut, 1)} m³`,
    fillText: `${hu(cf.fill, 1)} m³`,
    perimeterText: `${hu(SITE.size * 4 * SCALE, 1)} fm`,
    scaleText: `${hu(SCALE, 2)} m / egység`,
  };
}

export const fmt = hu;
