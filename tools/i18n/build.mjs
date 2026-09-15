#!/usr/bin/env node
/* `npm run i18n`            regenerate /en/ and /de/ from the Hungarian pages
   `npm run i18n -- --extract [page]`  list the Hungarian keys a page needs,
                                       in document order, minus what the
                                       dictionaries already have  */
import { generateAll, extractKeys, loadDict, loadNeutral, PAGES, normKey, TARGET_LANGS } from './core.mjs';

const args = process.argv.slice(2);

if (args[0] === '--extract') {
  const pages = args[1] ? [args[1]] : Object.keys(PAGES);
  const dicts = Object.fromEntries(TARGET_LANGS.map((l) => [l, loadDict(l)]));
  const neutral = new Set(loadNeutral().map(normKey));
  const claimed = new Set();
  const out = {};
  for (const p of pages) {
    out[p] = [];
    for (const [k, kind] of extractKeys(p)) {
      if (claimed.has(k) || neutral.has(k)) continue;
      claimed.add(k);
      const have = TARGET_LANGS.filter((l) => dicts[l].has(k));
      if (have.length === TARGET_LANGS.length) continue;
      out[p].push(kind === 'text' ? k : `${k}   ⟨${kind}⟩`);
    }
  }
  process.stdout.write(JSON.stringify(out, null, 2) + '\n');
} else {
  const report = generateAll();
  const n = Object.values(report).reduce((s, m) => s + m.size, 0);
  if (n && args.includes('--strict')) process.exit(1);
}
