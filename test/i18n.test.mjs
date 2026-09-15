/* ============================================================
   THE THREE LANGUAGES — PHASE 14

   A translated site fails quietly: one missing line leaves Hungarian in
   the middle of an English paragraph and nothing breaks, so nothing
   tells you. These are the invariants that make that loud.

   Run: npm test
   ============================================================ */
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  ROOT, PAGES, TARGET_LANGS, loadDict, loadNeutral, normKey,
  translatePage, outputPath, sourceLiterals, translatedKeys,
} from '../tools/i18n/core.mjs';
import { LANGS, DEFAULT_LANG, ROUTES, route, keyOfPath, langOf, localizePath } from '../src/i18n/routes.js';
import { MESSAGES } from '../src/i18n/messages.js';

/* ---------------- the route table ---------------- */

test('every document has a route in every language, and no two collide', () => {
  const seen = new Map();
  for (const key of Object.keys(ROUTES)) {
    for (const lang of LANGS) {
      const r = route(key, lang);
      assert.match(r, /^\/(?:[a-z0-9-]+\/)*(?:[a-z0-9-]+\.html)?$/,
        `${key}/${lang}: "${r}" is not a clean path`);
      assert.ok(!seen.has(r), `${r} is claimed by both ${seen.get(r)} and ${key}/${lang}`);
      seen.set(r, `${key}/${lang}`);
    }
  }
});

test('every page on disk is in the route table, and the reverse', () => {
  assert.deepEqual(Object.keys(PAGES).sort(), Object.keys(ROUTES).sort());
  for (const [key, file] of Object.entries(PAGES)) {
    assert.ok(existsSync(join(ROOT, file)), `${key}: ${file} does not exist`);
  }
});

test('a path resolves to its own language and back to its Hungarian twin', () => {
  for (const key of Object.keys(ROUTES)) {
    for (const lang of LANGS) {
      const r = route(key, lang);
      assert.equal(langOf(r), lang, `${r} should read as ${lang}`);
      assert.equal(keyOfPath(r), key);
      assert.equal(localizePath(route(key, DEFAULT_LANG), lang), r);
    }
  }
  /* Anything that is not a document passes through untouched — the fonts,
     the media and the endpoint are not translated. */
  for (const p of ['/fonts/gdf-text.woff2', '/api/project-request', '/media/x.mp4']) {
    assert.equal(localizePath(p, 'en'), p);
  }
});

/* ---------------- the dictionaries ---------------- */

test('every language can translate every line of every document', () => {
  for (const lang of TARGET_LANGS) {
    const dict = loadDict(lang);
    for (const key of Object.keys(PAGES)) {
      const { missing } = translatePage({ key, lang, dict });
      assert.equal(missing.size, 0,
        `${lang}/${key}: ${missing.size} line(s) missing — ` +
        [...missing.keys()].slice(0, 4).map((k) => JSON.stringify(k)).join(', '));
    }
  }
});

test('every language can translate every string the code writes into the page', () => {
  const neutral = new Set(loadNeutral().map(normKey));
  /* The same shape the report uses: a Hungarian sentence that is neither a
     template fragment nor a neutral mark has to be in the dictionary. */
  const HU = /[áéíóöőúüűÁÉÍÓÖŐÚÜŰ]/;
  const FRAGMENT = /\$\{|^<|<\/[a-z]/;
  /* A key the code hands t() must be translatable — that is exact, and it
     catches the site's unaccented uppercase vocabulary (TEREPSZINT, DB)
     that an orthographic test cannot see. Anything else that looks
     Hungarian is caught too. */
  const literals = [...new Set([...translatedKeys(), ...[...sourceLiterals()].filter((s) => HU.test(s))])]
    .filter((s) => !FRAGMENT.test(s) && !neutral.has(s));
  assert.ok(literals.length > 40, 'the literal scan found almost nothing — it has stopped working');
  for (const lang of TARGET_LANGS) {
    const dict = loadDict(lang);
    const missing = literals.filter((s) => !dict.has(s));
    assert.deepEqual(missing, [], `${lang}: ${missing.length} runtime string(s) untranslated`);
  }
});

test('a key is never given two different translations', () => {
  /* loadDict throws on a conflict; this states that the guard is live. */
  for (const lang of TARGET_LANGS) assert.ok(loadDict(lang).size > 200);
});

test('the server speaks every language the site is published in', () => {
  for (const [key, langs] of Object.entries(MESSAGES)) {
    for (const lang of TARGET_LANGS) {
      assert.ok(langs[lang], `${key}: no ${lang}`);
    }
    /* A placeholder that exists in the Hungarian key must survive the
       translation, or the message loses the number it was about. */
    for (const ph of key.match(/\{[a-z]+\}/g) || []) {
      for (const lang of TARGET_LANGS) {
        assert.ok(langs[lang].includes(ph), `${key}: ${lang} lost ${ph}`);
      }
    }
  }
});

/* ---------------- the generated documents ---------------- */

test('the generated documents exist and declare their own language', () => {
  for (const lang of TARGET_LANGS) {
    for (const key of Object.keys(PAGES)) {
      const file = join(ROOT, outputPath(key, lang));
      assert.ok(existsSync(file), `${file} has not been generated — run npm run i18n`);
      const html = readFileSync(file, 'utf8');
      assert.match(html, new RegExp(`<html lang="${lang}"`), `${file}: wrong lang`);
      assert.match(html, /rel="alternate" hreflang="hu"/, `${file}: no hreflang set`);
      /* Nothing may still point at another language's document from inside
         a translated one — that is how a visitor falls out of their
         language. The switcher is the one control whose whole job is to
         leave, so it is removed before the scan. */
      const body = html.replace(/<div class="langsw"[\s\S]*?<\/div>/, '');
      const stray = [...body.matchAll(/href="(\/[^"#?]*)/g)]
        .map((m) => m[1])
        .filter((p) => keyOfPath(p) && langOf(p) !== lang);
      assert.deepEqual([...new Set(stray)], [], `${file}: links leave ${lang}`);
    }
  }
});
