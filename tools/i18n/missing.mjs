#!/usr/bin/env node
/* `node tools/i18n/missing.mjs <lang>` — every line that language still
   needs, in document order, keyed by the Hungarian text. Feed the output
   back into src/i18n/<lang>/*.json. */
import { extractKeys, loadDict, loadNeutral, PAGES, normKey } from './core.mjs';

const lang = process.argv[2] || 'en';
const dict = loadDict(lang);
const neutral = new Set(loadNeutral().map(normKey));
const seen = new Set();
let n = 0;
for (const p of Object.keys(PAGES)) {
  const rows = [];
  for (const [k, kind] of extractKeys(p)) {
    if (seen.has(k) || neutral.has(k) || dict.has(k)) continue;
    seen.add(k);
    rows.push(kind === 'text' ? k : `${k}   ⟨${kind}⟩`);
  }
  if (!rows.length) continue;
  n += rows.length;
  console.log('=== ' + p);
  rows.forEach((s, i) => console.log(i + '|' + s));
}
console.error(`${lang}: ${n} missing`);
