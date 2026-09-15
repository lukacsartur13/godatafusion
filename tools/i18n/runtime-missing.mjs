#!/usr/bin/env node
/* Which Hungarian string literals in src/ a language cannot translate yet.
   These are the strings JavaScript writes into the page at runtime — form
   labels, validation lines, derived table headers — as opposed to the
   markup, which tools/i18n/missing.mjs covers. */
import { sourceLiterals, loadDict, loadNeutral, normKey } from './core.mjs';

/* A literal carrying an interpolation is a fragment of a template, not a
   key; the dictionary is keyed by whole sentences. */
const FRAGMENT = /\$\{|^<|<\/[a-z]/;

const lang = process.argv[2] || 'en';
const dict = loadDict(lang);
const neutral = new Set(loadNeutral().map(normKey));
const HU = /[áéíóöőúüűÁÉÍÓÖŐÚÜŰ]|\b(?:és|vagy|nem|egy|meg|kell|van|hogy)\b/;
let n = 0;
for (const k of [...sourceLiterals()].sort()) {
  if (dict.has(k) || neutral.has(k)) continue;
  if (!HU.test(k) || FRAGMENT.test(k)) continue;
  console.log(JSON.stringify(k));
  n++;
}
console.error(`${lang}: ${n} runtime string(s) untranslated`);
