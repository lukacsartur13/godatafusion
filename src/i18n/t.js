import { langOf, DEFAULT_LANG } from './routes.js';

/* ============================================================
   RUNTIME STRINGS — the JavaScript half of the three languages.

   The markup is translated at build time. The strings JavaScript writes
   into the page — form messages, the derived tables, the viewer's
   status line — are translated here, at the moment they are written.

   The English and German documents carry their own dictionary inline
   (`window.__gdfI18n`, emitted by tools/i18n/core.mjs), holding ONLY the
   keys that occur as literals in src/. The Hungarian document carries
   none and `t()` returns the key, so the Hungarian site pays nothing.

   Usage: t('Kötelező mező.')  ·  t('{n} fájl kiválasztva.', { n: 3 })
   The key is the Hungarian string, verbatim, the same way the HTML
   dictionaries are keyed — one dictionary, two consumers.
   ============================================================ */

const BLOB = (typeof window !== 'undefined' && window.__gdfI18n) || null;

export const lang = (typeof document !== 'undefined'
  && (document.documentElement.lang || langOf(window.location.pathname)))
  || DEFAULT_LANG;

export function t(key, vars) {
  let s = (BLOB && Object.prototype.hasOwnProperty.call(BLOB, key)) ? BLOB[key] : key;
  if (vars) for (const k in vars) s = s.split(`{${k}}`).join(String(vars[k]));
  return s;
}

/* ---- numbers ----
   Hungarian writes 1 248,62; English 1,248.62; German 1.248,62. Every
   formatter on the site goes through this locale so a figure on the
   English page is an English figure, not a Hungarian one in translation. */
export const NUM_LOCALE = { hu: 'hu-HU', en: 'en-GB', de: 'de-DE' }[lang] || 'hu-HU';

/** Fixed decimals, grouped, in the page's locale. */
export const fmtNum = (n, d = 2) => Number(n).toLocaleString(NUM_LOCALE, {
  minimumFractionDigits: d, maximumFractionDigits: d, useGrouping: true,
});

/** The decimal mark of the page's locale — for the few places a number
    is assembled by hand rather than formatted. */
export const DECIMAL = (1.5).toLocaleString(NUM_LOCALE).replace(/1|5/g, '');
