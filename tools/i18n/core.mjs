/* ============================================================
   THE LANGUAGE GENERATOR — Hungarian documents in, English and German
   documents out.

   The seven Hungarian pages are the only markup anybody writes. For each
   of the other two languages this walks a page's HTML as a stream of
   tags and text, and

     · replaces every text node and every human-readable attribute
       (alt, title, aria-label, placeholder, the meta descriptions, the
       few data-* attributes CSS prints) with the dictionary's line for
       it — keyed by the Hungarian text itself, whitespace collapsed;
     · translates the strings inside the JSON-LD block the same way;
     · rewrites every internal link and canonical URL to the language's
       own route (src/i18n/routes.js), including translated slugs;
     · sets <html lang>, og:locale, the language switcher's hrefs and
       aria-current;
     · inlines the runtime dictionary for that language — only the keys
       that also occur as string literals in src/, which is what t() in
       src/i18n/t.js reads.

   It is deliberately NOT an HTML parser: the output keeps the author's
   formatting, comments and entities byte for byte wherever nothing was
   translated, so a diff between a Hungarian page and its English twin
   shows copy and links and nothing else.

   A missing line is reported, never invented: the Hungarian text stays
   in place and test/i18n.test.mjs fails until the dictionary has it.
   `neutral.json` lists the strings that are the same in every language
   (the wordmark, CAPTURE / MEASURE / QUANTIFY, the technical tags) so
   they are neither translated nor reported.
   ============================================================ */
import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync, statSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { LANGS, DEFAULT_LANG, ROUTES, LOCALE, route, keyOfPath } from '../../src/i18n/routes.js';
import { MESSAGES } from '../../src/i18n/messages.js';
import { COMPANY } from '../../src/data/company.js';

export const ROOT = resolve(import.meta.dirname, '../..');
const I18N_DIR = join(ROOT, 'src/i18n');
export const TARGET_LANGS = LANGS.filter((l) => l !== DEFAULT_LANG);

/** The Hungarian documents, by route key. */
export const PAGES = {
  home: 'index.html',
  capture: '360-camera/index.html',
  measure: 'teruletfelmeres/index.html',
  quantify: 'mennyisegszamitas/index.html',
  about: 'rolunk/index.html',
  contact: 'kapcsolat/index.html',
  impressum: 'impresszum/index.html',
  privacy: 'adatkezeles/index.html',
  notfound: '404.html',
};

/** Where a page lands on disk for a language: `/en/site-survey/` → en/site-survey/index.html */
export function outputPath(key, lang) {
  const r = route(key, lang);
  return r.endsWith('/') ? `${r.slice(1)}index.html` : r.slice(1);
}

/* ---------------------------------------------------------------- text */
const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', shy: '' };

/** Entities → characters, so a key reads the way the page does. */
export function decode(s) {
  return s.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (m, e) => {
    if (e[0] === '#') {
      const cp = /^#x/i.test(e) ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(cp) ? String.fromCodePoint(cp) : m;
    }
    return e in ENT ? ENT[e] : m;
  });
}

/** The dictionary key for a piece of markup text. */
export function normKey(raw) {
  return decode(raw).replace(/­/g, '').replace(/ /g, ' ').replace(/\s+/g, ' ').trim();
}

const hasLetter = (s) => /\p{L}/u.test(s);

/* ---------------------------------------------------------- dictionary */
export function loadNeutral() {
  const f = join(I18N_DIR, 'neutral.json');
  return existsSync(f) ? JSON.parse(readFileSync(f, 'utf8')).filter((k) => !k.startsWith('//')) : [];
}

/** All of a language's lines: neutral ∪ src/i18n/<lang>/*.json ∪ messages.js. */
export function loadDict(lang) {
  const dict = new Map();
  for (const k of loadNeutral()) dict.set(normKey(k), k);
  const dir = join(I18N_DIR, lang);
  const files = existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith('.json')).sort() : [];
  for (const f of files) {
    let obj;
    try { obj = JSON.parse(readFileSync(join(dir, f), 'utf8')); }
    catch (e) { throw new Error(`[i18n] ${lang}/${f}: ${e.message}`); }
    for (const [k, v] of Object.entries(obj)) {
      if (k.startsWith('//')) continue;
      if (typeof v !== 'string') throw new Error(`[i18n] ${lang}/${f}: "${k}" is not a string`);
      const nk = normKey(k);
      if (dict.has(nk) && dict.get(nk) !== v) {
        throw new Error(`[i18n] ${lang}/${f}: "${nk}" is defined twice with different text`);
      }
      dict.set(nk, v);
    }
  }
  for (const [k, langs] of Object.entries(MESSAGES)) {
    if (langs[lang]) dict.set(normKey(k), langs[lang]);
  }
  return dict;
}

/* ------------------------------------------------------ the translator */
/* Attributes that are read aloud or printed. Missing → reported. */
const REQ_ATTRS = new Set(['alt', 'title', 'aria-label', 'aria-valuetext', 'placeholder',
  'data-section-name', 'data-you', 'data-note', 'data-doc']);
/* Attributes that are printed only in some elements (data-state is also
   a state-machine key). Translated when the dictionary has the value. */
const OPT_ATTRS = new Set(['data-state', 'data-token']);

const TOKEN = /<!--[\s\S]*?-->|<script\b[^>]*>[\s\S]*?<\/script\s*>|<style\b[^>]*>[\s\S]*?<\/style\s*>|<\/?[a-zA-Z][^>]*>|<![^>]*>/g;
const GLYPH = /(\{\{glyph:[^}]*\}\})/;
const GLYPH_PARTS = /^\{\{glyph:([a-z0-9-]+)((?:\s+[a-z0-9_-]+)*)\s*(?:\|\s*([^}]*?))?\s*\}\}$/;

const ORIGIN = COMPANY.origin.replace(/\/$/, '');

export function createTranslator({ lang, page, dict, extract = false }) {
  const missing = new Map();           // key → kind
  const seen = new Map();              // key → kind, in document order (extract mode)
  const used = new Set();

  function lookup(key, kind, required) {
    if (extract) { if (!seen.has(key)) seen.set(key, kind); return null; }
    if (dict.has(key)) { used.add(key); return dict.get(key); }
    if (required && !missing.has(key)) missing.set(key, kind);
    return null;
  }

  function localizeUrl(v) {
    let prefix = '';
    let p = v;
    if (p.startsWith(ORIGIN + '/') || p === ORIGIN) { prefix = ORIGIN; p = p.slice(ORIGIN.length) || '/'; }
    else if (!p.startsWith('/') || p.startsWith('//')) return v;
    const m = /^([^?#]*)(.*)$/.exec(p);
    const key = keyOfPath(m[1]);
    return key ? prefix + route(key, lang) + m[2] : v;
  }

  function tPlain(raw, kind = 'text') {
    if (!raw.trim()) return raw;
    const key = normKey(raw);
    const v = lookup(key, kind, hasLetter(key));
    if (v == null) return raw;
    return raw.match(/^\s*/)[0] + v + raw.match(/\s*$/)[0];
  }

  function tGlyph(tok) {
    const m = GLYPH_PARTS.exec(tok);
    if (!m || !m[3]) return tok;
    const v = lookup(normKey(m[3]), 'glyph', true);
    return v == null ? tok : `{{glyph:${m[1]}${m[2]} | ${v}}}`;
  }

  function tText(raw) {
    return raw.split(GLYPH).map((part, i) => (i % 2 ? tGlyph(part) : tPlain(part))).join('');
  }

  function tAttr(val, kind, required) {
    const key = normKey(val);
    if (!hasLetter(key)) return val;
    const v = lookup(key, kind, required);
    return v == null ? val : v;
  }

  function tTag(tag) {
    if (tag.startsWith('</') || tag.startsWith('<!')) return tag;
    const name = /^<([a-zA-Z][a-zA-Z0-9-]*)/.exec(tag)[1].toLowerCase();
    const langLink = /\sdata-lang="([a-z]{2})"/.exec(tag);
    const alternate = name === 'link' && /\srel="alternate"/.test(tag);
    let out = tag.replace(/(\s)([a-zA-Z_:][-a-zA-Z0-9_:.]*)="([^"]*)"/g, (m, sp, attr, val) => {
      const a = attr.toLowerCase();
      let v = val;
      if (name === 'html' && a === 'lang') v = lang;
      else if (a === 'content' && name === 'meta') {
        if (/property="og:locale"/.test(tag)) v = LOCALE[lang];
        else if (/property="og:url"/.test(tag)) v = localizeUrl(val);
        else if (/name="description"|property="og:(?:title|description)"/.test(tag)) v = tAttr(val, 'meta', true);
      } else if (a === 'href') {
        if (langLink) v = route(page, langLink[1]);
        else if (!alternate) v = localizeUrl(val);
      } else if (REQ_ATTRS.has(a)) v = tAttr(val, 'attr', true);
      else if (OPT_ATTRS.has(a)) v = tAttr(val, 'attr?', false);
      return `${sp}${attr}="${v}"`;
    });
    if (langLink) {
      out = out.replace(/\s+aria-current="[^"]*"/, '');
      if (langLink[1] === lang) out = out.replace(/\s*(\/?)>$/, ' aria-current="true"$1>');
    }
    return out;
  }

  function tJsonLd(script) {
    const m = /^(<script\b[^>]*>)([\s\S]*?)(<\/script\s*>)$/.exec(script);
    let obj;
    try { obj = JSON.parse(m[2]); } catch { return script; }
    const walk = (node, key) => {
      if (Array.isArray(node)) return node.map((n) => walk(n, key));
      if (node && typeof node === 'object') {
        const o = {};
        for (const k in node) o[k] = walk(node[k], k);
        return o;
      }
      if (typeof node === 'string') {
        if (key === 'inLanguage') return lang;
        if (key === 'url' || key === '@id' || key === 'item') return localizeUrl(node);
        if (key === '@type' || key === '@context' || /^https?:/.test(node) || !hasLetter(node)) return node;
        const v = lookup(normKey(node), 'jsonld', true);
        return v == null ? node : decode(v);
      }
      return node;
    };
    return `${m[1]}\n${JSON.stringify(walk(obj), null, 2)}\n${m[3]}`;
  }

  function run(html) {
    let out = '';
    let last = 0;
    TOKEN.lastIndex = 0;
    let m;
    while ((m = TOKEN.exec(html))) {
      out += tText(html.slice(last, m.index));
      const tok = m[0];
      if (tok.startsWith('<!--') || tok.startsWith('<!')) out += tok;
      else if (/^<script\b/i.test(tok)) out += /type="application\/ld\+json"/.test(tok) ? tJsonLd(tok) : tok;
      else if (/^<style\b/i.test(tok)) out += tok;
      else out += tTag(tok);
      last = m.index + tok.length;
    }
    out += tText(html.slice(last));
    return out;
  }

  return { run, missing, seen, used };
}

/* ------------------------------------------------- the runtime blob */
/* Quoted literals only. A template literal carrying an interpolation is
   not a dictionary key — t() is always called with a plain string — and
   trying to scan one produces spans of source code rather than copy. */
const LIT = /'((?:[^'\\\n]|\\.)*)'|"((?:[^"\\\n]|\\.)*)"/g;
const unescape = (s) => s.replace(/\\(.)/g, (m, c) => ({ n: '\n', t: '\t' }[c] ?? c));

/* Modules no page loads. `descent*` is the Phase 11 journey, which left the
   homepage in Phase 13 and is kept on disk but never imported; the evidence
   fixtures are development stand-ins behind `?evidence`. Neither ships, so
   neither needs a translation — and counting them would leave the report
   permanently non-empty, which is the fastest way to make a report useless. */
const NOT_SHIPPED = [
  'modules/descent.js', 'modules/descentCompose.js', 'modules/manifesto.js',
  'modules/process.js', 'data/evidence.fixtures.js',
];

function jsFiles(dir, out = []) {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) { if (f !== 'i18n') jsFiles(p, out); }
    else if (/\.(m?js)$/.test(f) && !NOT_SHIPPED.some((n) => p.endsWith(n))) out.push(p);
  }
  return out;
}

/** Every string literal in src/ (outside src/i18n), whitespace-collapsed. */
export function sourceLiterals() {
  const set = new Set();
  for (const f of jsFiles(join(ROOT, 'src'))) {
    /* Comments out first. This file is full of prose ABOUT the copy, and a
       sentence quoted in a comment is not a string the page ever shows. */
    const src = readFileSync(f, 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, ' ')
      .replace(/(^|[^:'"\\])\/\/[^\n]*/g, '$1');
    let m;
    LIT.lastIndex = 0;
    while ((m = LIT.exec(src))) {
      const s = unescape(m[1] ?? m[2] ?? '').replace(/\s+/g, ' ').trim();
      if (s && hasLetter(s)) set.add(s);
    }
  }
  return set;
}

/* Every `t('…')` call site in src/, by its key. This is the exact rule the
   orthographic scan above can only approximate: a string handed to t() is
   BY DEFINITION meant to be translated, accents or not — and the site's own
   uppercase vocabulary (TEREPSZINT, DB, SHEET) carries none. */
const T_CALL = /\bt\(\s*(?:'((?:[^'\\\n]|\\.)*)'|"((?:[^"\\\n]|\\.)*)")/g;

export function translatedKeys() {
  const set = new Set();
  for (const f of jsFiles(join(ROOT, 'src'))) {
    const src = readFileSync(f, 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, ' ')
      .replace(/(^|[^:'"\\])\/\/[^\n]*/g, '$1');
    let m;
    T_CALL.lastIndex = 0;
    while ((m = T_CALL.exec(src))) {
      const k = unescape(m[1] ?? m[2] ?? '').replace(/\s+/g, ' ').trim();
      if (k) set.add(k);
    }
  }
  return set;
}

/** The dictionary lines JavaScript can ask for, as the inline object. */
export function runtimeBlob(dict, literals) {
  const obj = {};
  for (const k of literals) {
    if (dict.has(k) && dict.get(k) !== k) obj[k] = decode(dict.get(k));
  }
  return obj;
}

const blobTag = (obj) => (Object.keys(obj).length
  ? `<script>window.__gdfI18n=${JSON.stringify(obj).replace(/<\//g, '<\\/')};</script>\n`
  : '');

/* ------------------------------------------------------------ driver */
export function translatePage({ key, lang, dict, blob }) {
  const html = readFileSync(join(ROOT, PAGES[key]), 'utf8');
  const tr = createTranslator({ lang, page: key, dict });
  let out = tr.run(html);
  if (blob) out = out.replace(/<\/head>/i, `${blobTag(blob)}</head>`);
  return { out, missing: tr.missing };
}

/**
 * Generate every non-Hungarian document. Writes only what changed, so the
 * dev server's watcher does not loop. Returns the missing keys per language.
 */
export function generateAll({ log = console } = {}) {
  const literals = sourceLiterals();
  const report = {};
  let written = 0;
  for (const lang of TARGET_LANGS) {
    const dict = loadDict(lang);
    const blob = runtimeBlob(dict, literals);
    const missing = new Map();
    for (const key of Object.keys(PAGES)) {
      const { out, missing: m } = translatePage({ key, lang, dict, blob });
      for (const [k, kind] of m) if (!missing.has(k)) missing.set(k, `${kind} · ${PAGES[key]}`);
      const dest = join(ROOT, outputPath(key, lang));
      mkdirSync(dirname(dest), { recursive: true });
      if (!existsSync(dest) || readFileSync(dest, 'utf8') !== out) { writeFileSync(dest, out); written++; }
    }
    report[lang] = missing;
    if (log && missing.size) {
      log.warn(`[i18n] ${lang}: ${missing.size} line(s) missing — the Hungarian text is shown instead:`);
      for (const [k, where] of missing) log.warn(`  · ${JSON.stringify(k)}   (${where})`);
    }
  }
  if (log && written) log.info(`[i18n] ${written} document(s) regenerated`);
  return report;
}

/** Document-order key list of one Hungarian page, for building the dictionaries. */
export function extractKeys(key) {
  const html = readFileSync(join(ROOT, PAGES[key]), 'utf8');
  const tr = createTranslator({ lang: 'en', page: key, dict: new Map(), extract: true });
  tr.run(html);
  return tr.seen;
}

/** Every path that, when it changes, should regenerate the documents. */
export function isSource(file) {
  const rel = file.startsWith(ROOT) ? file.slice(ROOT.length + 1) : file;
  return Object.values(PAGES).includes(rel) || rel.startsWith('src/i18n/') || rel.startsWith('src/');
}
