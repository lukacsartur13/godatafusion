/* PHASE 10 §04 — GDF glyphs in static HTML, with no runtime cost.
 *
 * The four documents are hand-authored static HTML, and the glyph system
 * has to reach them without a build step that hides the markup and without
 * a script that has to run before an icon appears. This plugin expands
 *
 *     {{glyph:capture}}
 *     {{glyph:arrow gl--16}}
 *     {{glyph:upload gl--20 | Fájl feltöltése}}
 *
 * into the same inline <svg> that glyph() returns at runtime, from the same
 * src/glyphs/glyphs.js. It runs in `transformIndexHtml`, so dev and build
 * see identical output and the served page contains real SVG — no <use>, no
 * shadow tree, no fetch, and nothing to hydrate.
 *
 * An unknown name is a BUILD ERROR, not a silent blank: a missing glyph in
 * a drafting system is a hole in a drawing.
 */
import { GLYPHS } from '../src/glyphs/glyphs.js';

const TOKEN = /\{\{glyph:([a-z0-9-]+)((?:\s+[a-z0-9_-]+)*)\s*(?:\|\s*([^}]*?))?\s*\}\}/g;

export function glyphsPlugin() {
  return {
    name: 'gdf-glyphs',
    transformIndexHtml: {
      order: 'pre',
      handler(html, ctx) {
        return html.replace(TOKEN, (_m, name, cls, label) => {
          const body = GLYPHS[name];
          if (!body) {
            throw new Error(
              `[gdf-glyphs] ${ctx.path}: unknown glyph "${name}". ` +
              `Known: ${Object.keys(GLYPHS).join(', ')}`);
          }
          const a = label
            ? `role="img" aria-label="${label.trim().replace(/"/g, '&quot;')}"`
            : 'aria-hidden="true"';
          const c = ('gl' + (cls || '')).trim().replace(/\s+/g, ' ');
          return `<svg class="${c}" viewBox="0 0 24 24" ${a} focusable="false">${body}</svg>`;
        });
      },
    },
  };
}
