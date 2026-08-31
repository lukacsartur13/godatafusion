/**
 * Environment / capability detection.
 * Everything the site degrades against is decided here, once.
 */

const mqReduce = window.matchMedia('(prefers-reduced-motion: reduce)');
const mqFine = window.matchMedia('(hover: hover) and (pointer: fine)');
const mqNarrow = window.matchMedia('(max-width: 900px)');

export const env = {
  get reducedMotion() { return mqReduce.matches; },
  get finePointer() { return mqFine.matches; },
  get narrow() { return mqNarrow.matches; },
  touch: window.matchMedia('(hover: none)').matches || navigator.maxTouchPoints > 0,
  webgl: detectWebGL(),
};

function detectWebGL() {
  try {
    const c = document.createElement('canvas');
    const gl = c.getContext('webgl2') || c.getContext('webgl');
    if (!gl) return false;
    // Software rasterisers exist but still render; only hard-fail on no context.
    return true;
  } catch {
    return false;
  }
}

/** Device-pixel-ratio ceiling. Retina looks great; 3x costs 2.25x the fill rate. */
export function dprCap() {
  return Math.min(window.devicePixelRatio || 1, env.narrow ? 1.75 : 2);
}

/* ------------------------------------------------------------------
   PHASE 8.3 — THE CANVAS IS ACTUALLY OPAQUE NOW.

   Phase 8.1 measured `alpha:false` as worth half the hero's frame rate
   and set it. It never took effect. three.js hardcodes `alpha: true` in
   the attributes it hands to `canvas.getContext()` (three.module.js,
   `const contextAttributes = { alpha: true, ... }`) and uses the
   renderer's own `alpha` flag only to decide what to CLEAR the colour
   buffer to. So the pixels were opaque and the DRAWING BUFFER was not:
   the compositor still saw a canvas with an alpha channel, still had to
   blend it against whatever was behind it, and still could not treat it
   as an occluder.

   Verified with `gl.getContextAttributes()` in the shipped build before
   the change: `{alpha: true, ...}`.

   The context is created here instead and handed to three, which then
   reads its real attributes. This is the fix Phase 8.1 believed it had
   made, and Part 16 of the brief is explicit that a transparent canvas
   is not an option to fall back to.
   ------------------------------------------------------------------ */
export function opaqueContext(canvas, { antialias = false } = {}) {
  const attrs = {
    alpha: false, depth: true, stencil: false, antialias,
    premultipliedAlpha: true, preserveDrawingBuffer: false,
    powerPreference: 'high-performance', failIfMajorPerformanceCaveat: false,
  };
  try {
    return canvas.getContext('webgl2', attrs) || canvas.getContext('webgl', attrs) || undefined;
  } catch {
    return undefined;   // let three create its own and carry on
  }
}
