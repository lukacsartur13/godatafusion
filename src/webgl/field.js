/**
 * Deterministic terrain field.
 * Seeded so the site fragment is the same object on every load —
 * this is meant to read as survey data, not as generative art.
 */

export const SITE = {
  size: 16,            // world units across the parcel
  padY: -0.55,         // excavated building pad level
  pad: { x0: -3.9, x1: 3.9, z0: -2.9, z1: 2.9 },
};

function hash2(ix, iz) {
  let h = ix * 374761393 + iz * 668265263 + 1013904223;
  h = (h ^ (h >>> 13)) * 1274126177;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}

const smooth = (t) => t * t * (3 - 2 * t);

function vnoise(x, z) {
  const ix = Math.floor(x), iz = Math.floor(z);
  const fx = smooth(x - ix), fz = smooth(z - iz);
  const a = hash2(ix, iz), b = hash2(ix + 1, iz);
  const c = hash2(ix, iz + 1), d = hash2(ix + 1, iz + 1);
  return (a + (b - a) * fx) * (1 - fz) + (c + (d - c) * fx) * fz;
}

/** Smooth rectangular mask, 1 inside the pad, 0 outside, feathered by `f`. */
function padMask(x, z, f = 1.5) {
  const { pad } = SITE;
  const sx = Math.min(smooth(clamp01((x - pad.x0 + f) / f)), smooth(clamp01((pad.x1 + f - x) / f)));
  const sz = Math.min(smooth(clamp01((z - pad.z0 + f) / f)), smooth(clamp01((pad.z1 + f - z) / f)));
  return Math.min(sx, sz);
}
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

/** Terrain elevation at a world XZ. Used by geometry, contours and anchors. */
export function heightAt(x, z) {
  const n =
    1.05 * vnoise(x * 0.17 + 11.3, z * 0.17 - 4.1) +
    0.42 * vnoise(x * 0.41 - 2.7, z * 0.41 + 8.9) +
    0.16 * vnoise(x * 0.93 + 5.5, z * 0.93 + 1.7);
  let h = (n / 1.63) * 2.15 - 0.95;
  // A shallow drainage swale on the north edge — reads as real ground.
  h -= 0.28 * Math.exp(-Math.pow((z + 6.0) / 1.6, 2));
  // Excavate the building pad.
  const m = padMask(x, z);
  return h * (1 - m) + SITE.padY * m;
}
