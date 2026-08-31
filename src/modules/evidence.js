import { getEvidence } from '../data/evidence.js';

/* ============================================================
   EVIDENCE — the production gate.

   This is the whole of what ships while there is no real project: a
   filter and an early return. The section markup, its stylesheet and its
   renderer live in a lazy chunk that is never requested, so an unused
   evidence architecture costs the production bundle a few hundred bytes
   of this file and nothing else.

   Enabling it later is a data change. Nothing here, in the layout, or in
   the visual language has to move.
   ============================================================ */

/**
 * @param {Object} o
 * @param {Element|null} o.anchor   the section is inserted BEFORE this
 * @param {string|null} [o.service] filter to one service page's evidence
 * @param {string} [o.label]        eyebrow text
 * @param {string} [o.title]        section heading
 */
export async function initEvidence({ anchor, service = null, label, title } = {}) {
  if (!anchor) return null;

  const items = [...getEvidence({ service }), ...(await devFixtures(service))];
  if (!items.length) return null;   // production, today: stops here

  const { renderEvidence } = await import('./evidence/sheet.js');
  return renderEvidence({ anchor, items, service, label, title });
}

/**
 * Fixtures are opt-in even in development (`?evidence` on the URL), so the
 * normal dev page is byte-for-byte the production page. The whole branch is
 * `import.meta.env.DEV`-guarded, which Rollup resolves to `false` and folds
 * out — the fixture module is not emitted as a chunk at all.
 */
async function devFixtures(service) {
  if (!import.meta.env.DEV) return [];
  if (!new URLSearchParams(window.location.search).has('evidence')) return [];
  const { FIXTURES } = await import('../data/evidence.fixtures.js');
  return FIXTURES.filter((p) => !service || p.service === service || p.service === 'mixed');
}
