#!/usr/bin/env node
/* Which Hungarian string literals in src/ a language cannot translate yet.
   These are the strings JavaScript writes into the page at runtime — form
   labels, validation lines, derived table headers — as opposed to the
   markup, which tools/i18n/missing.mjs covers. */
import { sourceLiterals, translatedKeys, loadDict, loadNeutral, normKey } from './core.mjs';

/* A literal carrying an interpolation is a fragment of a template, not a
   key; the dictionary is keyed by whole sentences. */
const FRAGMENT = /\$\{|^<|<\/[a-z]/;

const lang = process.argv[2] || 'en';
const dict = loadDict(lang);
const neutral = new Set(loadNeutral().map(normKey));
/* Two rules. A string the code hands t() is by definition meant to be
   translated, accents or not — that is exact. Anything else that merely
   LOOKS Hungarian is a candidate the code has not routed through t() yet,
   and that is a guess, but a useful one. */
const HU = /[áéíóöőúüűÁÉÍÓÖŐÚÜŰ]/;
let n = 0;
const asked = translatedKeys();
const candidates = new Set([...asked, ...[...sourceLiterals()].filter((s) => HU.test(s))]);
for (const k of [...candidates].sort()) {
  if (dict.has(k) || neutral.has(k)) continue;
  if (FRAGMENT.test(k)) continue;
  console.log(JSON.stringify(k));
  n++;
}
console.error(`${lang}: ${n} runtime string(s) untranslated`);
