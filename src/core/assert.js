/* ============================================================
   DEVELOPMENT ASSERTIONS — computed style, not source inspection.

   Phase 4 shipped a family of invalid `rgba(var(--accent) / .x)`
   declarations. Every one of them was correct-looking in the source and
   silently dropped by the parser, so the only thing that would have
   caught them is asking the browser what it actually computed. That is
   what this does.

   `import.meta.env.DEV` is replaced with a literal at build time, so the
   whole module is dead code — and therefore absent — in production.
   ============================================================ */

/* A declaration that failed to parse leaves the property at its initial
   value or empty. These are the two shapes that must never appear on a
   property we asked to be an accent-derived colour. */
const EMPTY = /^\s*$/;
const INVALID = /^(rgba?\(\s*0,\s*0,\s*0,\s*0\s*\)|transparent|none|initial|unset)$/i;

/* [selector, property, {allowTransparent}] — one row per accent-derived
   declaration family that has to compute. Kept small on purpose: this is a
   tripwire for a known failure mode, not a visual regression suite. */
const CHECKS = [
  ['.scanplane__line', 'background-image'],
  ['.scanplane__field', 'background-image'],
  ['.hero__title .dot', 'color'],
  ['.telemetry__v.num', 'color'],
  ['.mode.is-active .mode__key', 'color'],
  ['.strip__track i', 'background-color'],
  ['.pstage.is-on::before', 'background-color'],
  ['.phand__out li', 'border-top-color'],
  ['.pf-scan-l', 'stroke'],
  ['.chain__f circle.cf-node', 'fill'],
  ['.pf rect.pf-scan-f', 'fill'],
  ['.about__sys a::before', 'border-top-color'],
];

/** @param {string} sel may carry a single ::before / ::after suffix */
function read(sel, prop) {
  const m = sel.match(/^(.*?)(::(?:before|after))?$/);
  const el = document.querySelector(m[1]);
  if (!el || !el.getClientRects().length) return { missing: true };
  const v = getComputedStyle(el, m[2] || null).getPropertyValue(prop);
  return { value: v };
}

/**
 * Verify that every accent-derived declaration we depend on actually
 * computes to a colour. Logs one grouped report; never throws — a broken
 * assertion must not take the page down with it.
 */
export function assertAccentColors(label = 'boot') {
  if (!import.meta.env.DEV) return;

  const bad = [];
  const absent = [];
  for (const [sel, prop] of CHECKS) {
    const r = read(sel, prop);
    if (r.missing) { absent.push(`${sel} — not on this page`); continue; }
    if (EMPTY.test(r.value) || INVALID.test(r.value.trim())) {
      bad.push(`${sel} { ${prop} } → ${JSON.stringify(r.value)}`);
    }
  }

  /* The accent channel itself: `--accent` must be three numbers, or every
     rgb(var(--accent) / a) downstream of it silently drops. Read off a
     SCOPE rather than off the root — Phase 8.2 moved the declaration
     there, and the root now only carries the idle fallback. */
  const scope = document.querySelector('.stage[data-accent], .nav[data-accent]')
    || document.documentElement;
  const ch = getComputedStyle(scope).getPropertyValue('--accent').trim();
  if (!/^\d+\s+\d+\s+\d+$/.test(ch)) bad.push(`--accent → ${JSON.stringify(ch)} (want "r g b")`);

  if (bad.length) {
    console.error(`[gdf] accent colour assertion FAILED (${label})\n  ` + bad.join('\n  '));
  } else {
    console.info(`[gdf] accent colours ok (${label}) — ${CHECKS.length - absent.length} checked`);
  }
  return { bad, absent };
}
