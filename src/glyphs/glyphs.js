/* GDF SYSTEM GLYPHS — the drawing. One source, two consumers:
     - tools/glyphs-plugin.mjs expands {{glyph:name}} in the static HTML at
       dev and build time, so a glyph on a static page costs no JavaScript;
     - glyph() below builds the same markup for UI that JS assembles (the
       project-input form, the panorama HUD).

   The bodies are INLINED rather than referenced from an SVG <use> sprite.
   A use-element shadow tree only reliably inherits INHERITED properties:
   Chrome does apply document CSS inside it, Firefox and Safari do not, and
   §06 has to move individual corner brackets and draw individual
   measurement lines. Inlining costs repeated markup and buys real CSS —
   and repeated identical strings are the cheapest thing gzip is ever
   handed. Measured on the homepage: 34 glyph instances, 11,9 kB of markup,
   1,4 kB gzipped. */

/* ============================================================
  GDF SYSTEM GLYPHS — PHASE 10 §04 / §05

  One drafting system, twenty-seven marks. No Lucide, no Heroicons,
  no external pack: every path below is drawn for this site.

  CONSTRUCTION
    grid        24 x 24
    live area   x,y in [2.5, 21.5] — a 2,5 unit margin all round, so a
                glyph never touches its own box and a row of them
                optically aligns without per-icon nudging
    stroke      1.5, set by CSS (.gl) so a glyph can go heavier at
                32 px and lighter at 16 px from one declaration
    caps        square. Round caps are what make an icon set read as
                friendly, and this one is a drawing, not an interface.
    joins       miter. Every corner in the family is a drawn corner.
    angles      90 deg and 45 deg only. There are exactly four curves
                in the set — the door swing, the contour lines, the
                360 orbit and the sensor rings — and each is a curve
                because the thing it draws is round.
    geometry    OPEN. Almost nothing here is a closed silhouette; a
                drafting mark describes an edge, a datum or an extent,
                not a filled shape. `fill` is set only on the sensor
                dots and the count markers, which are the two places
                in the system where a mark means "here, exactly".

  THE THREE FAMILIES (§05) — the service glyphs are built from shared
  parts, so they visibly belong together:
    CAPTURE    corner brackets + sensor point + frame
    MEASURE    terrain + dimension line + datum tick
    QUANTIFY   plan + object boundary + count marker
  Every other glyph reuses those parts: the same 4-unit corner
  bracket, the same 3-unit measurement tick, the same r=1 sensor dot.

  ANIMATION HOOKS (§06). The parts that resolve on hover carry a
  class and read `--gl-on` (0 idle, 1 engaged), which the host sets on
  the referencing element. Custom properties inherit into a <use>
  shadow tree, so one variable drives the whole family and no glyph
  needs its own script. Timing and easing live in glyphs.css.
   ============================================================ */

export const GLYPHS = {

  /* 01 CAPTURE — corner brackets close on a sensor */
  'capture': `
  <g class="g-corner g-corner--tl"><path d="M3.5 8.5v-5h5"/></g>
  <g class="g-corner g-corner--tr"><path d="M15.5 3.5h5v5"/></g>
  <g class="g-corner g-corner--br"><path d="M20.5 15.5v5h-5"/></g>
  <g class="g-corner g-corner--bl"><path d="M8.5 20.5h-5v-5"/></g>
  <circle class="g-ring" cx="12" cy="12" r="3.5"/>
  <circle class="g-sensor" cx="12" cy="12" r="1" fill="currentColor" stroke="none"/>
`,

  /* 02 MEASURE — terrain, dimension line, datum */
  'measure': `
  <path class="g-terrain" d="M2.5 13.5 8 8.5l4.5 3.5 8.5-7"/>
  <path class="g-draw" d="M2.5 19.5h19" style="--gl-len:19"/>
  <path class="g-tick" d="M2.5 17v5M21.5 17v5"/>
  <path class="g-datum" d="M12 16.5 13.5 19h-3z" fill="currentColor" stroke="none"/>
`,

  /* 03 QUANTIFY — plan, boundary, count */
  'quantify': `
  <path class="g-plan" d="M3.5 3.5h17v17h-17z"/>
  <path class="g-frag" d="M12 3.5v17M12 12h8.5"/>
  <rect class="g-mark" x="15" y="14.5" width="3" height="3" fill="currentColor" stroke="none"/>
`,

  /* 04 360 — orbit, four station ticks, centre */
  '360': `
  <circle class="g-ring" cx="12" cy="12" r="7.5"/>
  <path class="g-tick" d="M12 1.5v3M12 19.5v3M1.5 12h3M19.5 12h3"/>
  <path class="g-arrow" d="M9.5 6 12 4.5 14.5 6"/>
  <circle class="g-sensor" cx="12" cy="12" r="1.25" fill="currentColor" stroke="none"/>
`,

  /* 05 LOCATION — a survey point, not a map pin */
  'location': `
  <path class="g-line" d="M12 2.5v6M12 15.5v6M2.5 12h6M15.5 12h6"/>
  <circle class="g-ring" cx="12" cy="12" r="3.5"/>
  <circle class="g-sensor" cx="12" cy="12" r="1" fill="currentColor" stroke="none"/>
`,

  /* 06 PLAN — walls, an opening, a room division */
  'plan': `
  <path class="g-plan" d="M3.5 3.5h17v17h-17z"/>
  <path class="g-frag" d="M3.5 13h6M14.5 13h6M13 3.5v4M13 11v9.5"/>
  <path class="g-tick" d="M9.5 13v-3"/>
`,

  /* 07 PDF — a sheet with a fold and a title band */
  'pdf': `
  <path class="g-plan" d="M4.5 2.5h9l6 6v13h-15z"/>
  <path class="g-frag" d="M13.5 2.5v6h6"/>
  <path class="g-line" d="M7.5 13.5h9M7.5 16.5h9M7.5 19.5h5"/>
`,

  /* 08 UPLOAD — into a bracket, from below */
  'upload': `
  <path class="g-corner" d="M3.5 15.5v5h17v-5"/>
  <path class="g-line" d="M12 16.5V4"/>
  <path class="g-arrow" d="M7 8.5 12 3.5l5 5"/>
`,

  /* 09 AREA — an extent, hatched, anchored */
  'area': `
  <path class="g-plan" d="M3.5 6.5h17v13h-17z"/>
  <path class="g-frag" d="M6 19 12.5 6.5M11 19l6.5-12.5M16 19l4.5-8.5"/>
  <path class="g-tick" d="M3.5 2.5v3M20.5 2.5v3"/>
  <path class="g-line" d="M3.5 4h17"/>
`,

  /* 10 VOLUME — an axonometric extent */
  'volume': `
  <path class="g-plan" d="M12 2.5 21.5 8v8L12 21.5 2.5 16V8z"/>
  <path class="g-frag" d="M12 21.5v-11M12 10.5 2.5 8M12 10.5 21.5 8"/>
`,

  /* 11 LINEAR — a measured run */
  'linear': `
  <path class="g-line" d="M2.5 12h19"/>
  <path class="g-tick" d="M2.5 7.5v9M21.5 7.5v9M12 9.5v5"/>
  <path class="g-arrow" d="M6 9 3.5 12 6 15M18 9l2.5 3-2.5 3"/>
`,

  /* 12 CONTOUR — nested level lines with a spot height */
  'contour': `
  <path class="g-terrain" d="M2.5 18.5c4-6 7-8 10-8s6.5 2.5 9 8"/>
  <path class="g-terrain" d="M6 19c3-4.5 4.5-6 6.5-6s4 1.5 5.5 6"/>
  <path class="g-terrain" d="M9.5 19.5c1.5-2.5 2-3 3-3s1.5.5 2.5 3"/>
  <path class="g-tick" d="M12 3.5v4"/>
  <circle class="g-sensor" cx="12" cy="9" r="1" fill="currentColor" stroke="none"/>
`,

  /* 13 DOOR — leaf, swing, two wall stubs */
  'door': `
  <path class="g-plan" d="M2.5 20.5h4M17.5 20.5h4"/>
  <path class="g-frag" d="M6.5 20.5v-14"/>
  <path class="g-arc" d="M6.5 6.5a14 14 0 0 1 14 14"/>
  <path class="g-tick" d="M17.5 18v5"/>
`,

  /* 14 WINDOW — reveal, frame, mullion */
  'window': `
  <path class="g-plan" d="M2.5 9h4v6h-4zM17.5 9h4v6h-4z"/>
  <path class="g-line" d="M6.5 10.5h11M6.5 13.5h11"/>
  <path class="g-tick" d="M12 7.5v9"/>
`,

  /* 15 ROOM — an enclosure with one drawn corner */
  'room': `
  <path class="g-plan" d="M3.5 3.5h17v17h-17z"/>
  <path class="g-corner" d="M7 7v3h3"/>
  <path class="g-line" d="M13 16.5h4"/>
`,

  /* 16 LAYERS — three slabs, axonometric */
  'layers': `
  <path class="g-plan" d="M12 2.5 21.5 7 12 11.5 2.5 7z"/>
  <path class="g-frag" d="M2.5 12 12 16.5 21.5 12"/>
  <path class="g-frag" d="M2.5 16.5 12 21 21.5 16.5"/>
`,

  /* 17 SCAN — a sweep crossing a bracketed field */
  'scan': `
  <g class="g-corner g-corner--tl"><path d="M3.5 7.5v-4h4"/></g>
  <g class="g-corner g-corner--tr"><path d="M16.5 3.5h4v4"/></g>
  <g class="g-corner g-corner--br"><path d="M20.5 16.5v4h-4"/></g>
  <g class="g-corner g-corner--bl"><path d="M7.5 20.5h-4v-4"/></g>
  <path class="g-sweep" d="M2.5 12h19" style="--gl-len:19"/>
  <path class="g-tick" d="M8 9.5v5M16 9.5v5"/>
`,

  /* 18 AI — a resolved node graph, no spark */
  'ai': `
  <path class="g-plan" d="M12 4.5 19.5 12 12 19.5 4.5 12z"/>
  <path class="g-line" d="M1.5 12h3M19.5 12h3"/>
  <path class="g-frag" d="M8.5 12h7M12 8.5v7"/>
  <circle class="g-sensor" cx="12" cy="12" r="1.15" fill="currentColor" stroke="none"/>
`,

  /* 19 DIGITALIZATION — a solid edge becoming a point field */
  'digitalization': `
  <path class="g-plan" d="M11 3.5H3.5v17H11"/>
  <g class="g-field" fill="currentColor" stroke="none">
  <rect x="14" y="4.5" width="1.5" height="1.5"/><rect x="19" y="4.5" width="1.5" height="1.5"/>
  <rect x="14" y="9" width="1.5" height="1.5"/><rect x="19" y="9" width="1.5" height="1.5"/>
  <rect x="14" y="13.5" width="1.5" height="1.5"/><rect x="19" y="13.5" width="1.5" height="1.5"/>
  <rect x="14" y="18" width="1.5" height="1.5"/><rect x="19" y="18" width="1.5" height="1.5"/>
  </g>
  <path class="g-tick" d="M11 12h2"/>
`,

  /* 20 OPTIMIZATION — a detour collapsing to a direct run */
  'optimization': `
  <path class="g-detour" d="M3.5 20.5V13h6V7.5h6V3.5" stroke-dasharray="2 2.5"/>
  <path class="g-line" d="M3.5 20.5 20 7"/>
  <path class="g-arrow" d="M15 6.5h5.5V12"/>
  <circle class="g-sensor" cx="3.5" cy="20.5" r="1.15" fill="currentColor" stroke="none"/>
`,

  /* 21 PROJECT SPACE — a bay with three racked sheets */
  'project-space': `
  <path class="g-corner" d="M3.5 7.5v-4h7l2 2.5h8v4"/>
  <path class="g-plan" d="M3.5 10h17v10.5h-17z"/>
  <path class="g-frag" d="M8.5 10v10.5M15.5 10v10.5"/>
`,

  /* 22 DELIVERY — out of the tray, at 45 */
  'delivery': `
  <path class="g-corner" d="M3.5 13.5v7h17v-7"/>
  <path class="g-line" d="M8.5 11.5 19.5 4"/>
  <path class="g-arrow" d="M14.5 3.5h6v6"/>
  <path class="g-tick" d="M3.5 17h4M16.5 17h4"/>
`,

  /* 23 DATA — a matrix with one read cell */
  'data': `
  <path class="g-plan" d="M3.5 4.5h17v15h-17z"/>
  <path class="g-frag" d="M3.5 9.5h17M3.5 14.5h17M10 4.5v15M15.5 4.5v15"/>
  <rect class="g-mark" x="15.5" y="9.5" width="5" height="5" fill="currentColor" stroke="none"/>
`,

  /* 24 ARROW — the system's 45 degree pointer */
  'arrow': `
  <path class="g-line" d="M5 19 19 5"/>
  <path class="g-arrow" d="M8.5 5H19v10.5"/>
`,

  /* 25 EXTERNAL — the pointer leaving a frame */
  'external': `
  <path class="g-corner" d="M12.5 4.5h-8v15h15v-8"/>
  <path class="g-line" d="M12 12 20.5 3.5"/>
  <path class="g-arrow" d="M14 3.5h6.5V10"/>
`,

  /* 26 FLOOR — a slab at a level, with its datum */
  'floor': `
  <path class="g-plan" d="M12 6.5 21.5 11 12 15.5 2.5 11z"/>
  <path class="g-frag" d="M2.5 11v3.5L12 19l9.5-4.5V11"/>
  <path class="g-tick" d="M12 2.5v2.5"/>
  <path class="g-datum" d="M12 5 13.5 2.5h-3z" fill="currentColor" stroke="none"/>
`,

  /* 27 STATION — an occupied survey point */
  'station': `
  <circle class="g-ring" cx="12" cy="9" r="4.5"/>
  <circle class="g-sensor" cx="12" cy="9" r="1" fill="currentColor" stroke="none"/>
  <path class="g-line" d="M8.5 12.5 5 20.5M15.5 12.5 19 20.5M12 13.5v7"/>
  <path class="g-tick" d="M3.5 20.5h3M17.5 20.5h3"/>
`,
};

export const GLYPH_NAMES = Object.keys(GLYPHS);

/**
 * Build one glyph.
 *
 * @param {string} name      a key of GLYPHS
 * @param {object} [o]
 * @param {string} [o.label] accessible name. Omitted → aria-hidden, which
 *   is the right default: a glyph sitting beside its own label is
 *   decoration, and §28 is explicit that an icon may not REPLACE a label
 *   unless the meaning is universally obvious. Pass a label only when the
 *   glyph stands alone as the whole control.
 * @param {string} [o.cls]   extra classes, e.g. 'gl--20 gl--anim'
 */
export function glyph(name, o = {}) {
  const body = GLYPHS[name];
  if (!body) throw new Error('unknown glyph: ' + name);
  const a = o.label
    ? 'role="img" aria-label="' + String(o.label).replace(/"/g, '&quot;') + '"'
    : 'aria-hidden="true"';
  return '<svg class="gl' + (o.cls ? ' ' + o.cls : '') + '" viewBox="0 0 24 24" '
       + a + ' focusable="false">' + body + '</svg>';
}
