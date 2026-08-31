/**
 * Which world the renderer draws.
 *
 *   PROCEDURAL     the Phase 1–5 massing: boxes over a noise field, built
 *                  in the browser, no network cost, always available
 *   ARCHITECTURAL  the built environment: the same plan given thickness,
 *                  height, material and contents, fetched as two GLBs
 *
 * The architectural source is an ENHANCEMENT over the procedural one, never
 * a replacement for it. The procedural scene is what paints first, what a
 * failed fetch falls back to, and what a browser with no WebGL2 or a slow
 * link keeps. Nothing on the page is gated on the building arriving.
 *
 * Not a public control. It is a build-time flag with a development-only
 * query override, so a QA pass can put the two side by side and a rollback
 * is one environment variable rather than a revert.
 */

const BUILD = import.meta.env.VITE_SCENE_SOURCE || 'architectural';

function override() {
  if (!import.meta.env.DEV) return null;
  try {
    const v = new URLSearchParams(window.location.search).get('scene');
    return v === 'procedural' || v === 'architectural' ? v : null;
  } catch {
    return null;
  }
}

export const SCENE_SOURCE = override() || BUILD;

export const usesArchitecture = () => SCENE_SOURCE === 'architectural';

/**
 * What this route actually needs to download.
 *
 *   home / CAPTURE   the furnished building — CAPTURE is the mode whose
 *                    whole claim is that it feels like being in a place
 *   MEASURE          structure and terrain; the furniture is what the mode
 *                    exists to strip away, so it must not be fetched
 *   QUANTIFY         structure only, and even that is nearly transparent
 *                    behind the drawing
 */
export function archTier(route) {
  if (route === 'measure' || route === 'quantify') return 'structure';
  return 'full';
}
