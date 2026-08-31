/**
 * Candidate search.
 *
 *   node tools/polyhaven/search-assets.mjs models "chair" --cat seating --max 20
 *
 * Prints a candidate table: slug, name, polycount, max texture resolution,
 * tags. Selection is a judgement call made against this table and recorded
 * in docs/asset-register.md — it is deliberately NOT automated, because
 * "restrained contemporary meeting chair" is not a query.
 */
import { api, TYPE } from './client.mjs';

const [type = 'models', term = '', ...rest] = process.argv.slice(2);
const flag = (n, d) => {
  const i = rest.indexOf(`--${n}`);
  return i < 0 ? d : rest[i + 1];
};
const cat = flag('cat', null);        // legacy flat category
const path = flag('path', null);      // taxonomy slugPath, e.g. wood/veneer/oak-veneer
const max = Number(flag('max', 25));

const qs = [`t=${type}`];
if (cat) qs.push(`categories=${encodeURIComponent(cat)}`);
if (path) qs.push(`category=${encodeURIComponent(path)}`);
const all = await api(`/assets?${qs.join('&')}`);
const words = term.toLowerCase().split(/\s+/).filter(Boolean);

const rows = Object.entries(all)
  .map(([slug, a]) => ({ slug, ...a }))
  .filter((a) => !words.length || words.some((w) => (
    a.slug.toLowerCase().includes(w)
    || (a.name || '').toLowerCase().includes(w)
    || (a.tags || []).some((t) => t.toLowerCase().includes(w))
    || (a.categories || []).some((t) => t.toLowerCase().includes(w))
  )))
  .sort((a, b) => (a.polycount || 0) - (b.polycount || 0))
  .slice(0, max);

console.log(`type=${type} term="${term}" cat=${cat} → ${rows.length} of ${Object.keys(all).length}\n`);
console.log('slug'.padEnd(30), 'tris'.padStart(8), 'maxres'.padStart(10), ' name / tags');
for (const a of rows) {
  const res = (a.max_resolution || []).join('x') || '—';
  console.log(
    a.slug.padEnd(30),
    String(a.polycount ?? '—').padStart(8),
    res.padStart(10),
    ` ${a.name} :: ${(a.tags || []).slice(0, 7).join(',')}`,
  );
}
console.log(`\n[${TYPE[2]} authors: use asset-metadata.mjs <slug> for creator + files]`);
