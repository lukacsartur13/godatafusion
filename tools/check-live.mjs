/* ============================================================
   GO-LIVE GATE — `npm run check:live`

   Fails while src/data/company.js still carries a placeholder, or while
   any of the five documents still contains a development stand-in that
   the brief names as a defect on a live site: an em-dash value in a
   data cell, a "kitöltendő" note, a placeholder email.

   Run it in CI before the production deploy. It is deliberately NOT part
   of `npm test`, because the demo site must keep building while the real
   company data is still being collected.
   ============================================================ */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const problems = [];

/* The company record. Evaluate the module without Vite: it reads
   import.meta.env defensively, so a plain import works under Node. */
const { COMPANY, placeholders } = await import('../src/data/company.js');
for (const k of placeholders()) problems.push(`src/data/company.js: "${k}" is still a placeholder`);
for (const k of ['legalName', 'address', 'vat', 'email']) {
  if (!COMPANY[k]?.value) problems.push(`src/data/company.js: "${k}" has no value`);
}

/* Every document, from the one table that knows them all — a page added
   without being checked is exactly how a placeholder reaches production. */
const { PAGES } = await import('./i18n/core.mjs');
const pages = Object.values(PAGES).filter((p) => p !== '404.html');
const RE = [
  [/<dd[^>]*>\s*—\s*<\/dd>/g, 'an em-dash placeholder value'],
  [/kitöltendő/gi, 'a "kitöltendő" note'],
  [/\bTODO\b|\bPLACEHOLDER\b/g, 'a development marker'],
];
for (const p of pages) {
  /* Text inside a `[data-company]` element is replaced at runtime from
     company.js, so its markup fallback is allowed to say "kitöltendő" —
     the record above is what is actually checked for those. */
  const html = readFileSync(resolve(root, p), 'utf8')
    .replace(/(<[^>]*\bdata-company="[^"]*"[^>]*>)[^<]*/g, '$1');
  for (const [re, what] of RE) {
    const n = (html.match(re) || []).length;
    if (n) problems.push(`${p}: ${n}× ${what}`);
  }
}

if (problems.length) {
  console.error('NOT READY FOR GO-LIVE:\n  ' + problems.join('\n  '));
  process.exit(1);
}
console.log('go-live check passed');
