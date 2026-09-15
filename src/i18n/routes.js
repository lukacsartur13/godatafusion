/* ============================================================
   THE THREE LANGUAGES — one route table, read by everything.

   Hungarian is the default and lives at the root, exactly where it always
   has. English and German are real directories under `/en/` and `/de/`
   with translated slugs, generated at build time from the Hungarian
   documents (tools/i18n/core.mjs) so there is still ONE source for the
   markup and one for the copy of each language (src/i18n/<lang>/*.json).

   No client-side router, no cookie, no redirect by browser language: a
   language is a URL, and a URL is a language. The switcher in the header
   links each page to the same page in the other two languages.
   ============================================================ */

export const LANGS = ['hu', 'en', 'de'];
export const DEFAULT_LANG = 'hu';

/** Open Graph locale per language. */
export const LOCALE = { hu: 'hu_HU', en: 'en_GB', de: 'de_DE' };

/** Native name of each language, for the switcher's accessible label. */
export const LANG_NAME = { hu: 'Magyar', en: 'English', de: 'Deutsch' };

/** Every document, in every language. The Hungarian column IS the file
    on disk; the other two are generated to exactly these paths. */
export const ROUTES = {
  home:      { hu: '/',                   en: '/en/',                  de: '/de/' },
  capture:   { hu: '/360-camera/',        en: '/en/360-camera/',       de: '/de/360-kamera/' },
  measure:   { hu: '/teruletfelmeres/',   en: '/en/site-survey/',      de: '/de/gelaendeaufmass/' },
  quantify:  { hu: '/mennyisegszamitas/', en: '/en/quantity-takeoff/', de: '/de/mengenermittlung/' },
  about:     { hu: '/rolunk/',            en: '/en/about/',            de: '/de/ueber-uns/' },
  contact:   { hu: '/kapcsolat/',         en: '/en/contact/',          de: '/de/kontakt/' },
  impressum: { hu: '/impresszum/',        en: '/en/imprint/',          de: '/de/impressum/' },
  privacy:   { hu: '/adatkezeles/',       en: '/en/privacy/',          de: '/de/datenschutz/' },
  notfound:  { hu: '/404.html',           en: '/en/404.html',          de: '/de/404.html' },
};

/** Which language a pathname is in. `/en/…` → en, `/de/…` → de, else hu. */
export function langOf(pathname = '/') {
  const m = /^\/(en|de)(\/|$)/.exec(pathname);
  return m ? m[1] : DEFAULT_LANG;
}

/** The path of a document in a language. */
export function route(key, lang = DEFAULT_LANG) {
  const r = ROUTES[key];
  if (!r) throw new Error(`[i18n] unknown route "${key}"`);
  return r[lang] || r[DEFAULT_LANG];
}

/** A Hungarian path (with optional `?query` / `#hash`) → the same document
    in `lang`. Paths that are not documents (fonts, media, api) pass through. */
export function localizePath(path, lang) {
  const m = /^([^?#]*)(.*)$/.exec(path);
  const key = keyOfPath(m[1]);
  return key ? route(key, lang) + m[2] : path;
}

/** Which document a path is, in any language. */
export function keyOfPath(path) {
  const p = path.replace(/\/{2,}/g, '/');
  for (const key in ROUTES) {
    for (const lang of LANGS) if (ROUTES[key][lang] === p) return key;
  }
  return null;
}
