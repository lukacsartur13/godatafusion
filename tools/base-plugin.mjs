/* ============================================================
   DEPLOYING UNDER A SUB-PATH

   Netlify serves this site from the root, and every internal link in the
   five documents is written root-absolute because that is what a real
   directory-based site looks like: `/360-camera/`, `/fonts/gdf-text.woff2`,
   `/#contact`.

   GitHub Pages serves a project repository from `/<repo>/`. Vite's `base`
   rewrites the asset URLs IT emits — the script and stylesheet tags, the
   hashed chunks — but it does not touch a hand-written `<a href="/…">`,
   a `<link rel="preload" href="/fonts/…">` or an Open Graph `content="/…"`.
   There are 103 of those across the five pages, and each one of them would
   resolve to the domain root and 404.

   So this rewrites them at build time, in the emitted HTML only. The
   markup on disk stays root-absolute, which is what it should be: the
   sub-path is a property of one host, not of the site.

   With no base (or `/`) the plugin does nothing at all, so the Netlify
   build is byte-identical to what it was.
   ============================================================ */

/** Attributes whose value is a URL we are responsible for. */
const ATTR = /(\s(?:href|src|content|data-src|poster)\s*=\s*")(\/(?!\/)[^"]*)"/g;

export function basePlugin(base) {
  const prefix = (base || '/').replace(/\/+$/, '');
  return {
    name: 'gdf-base',
    apply: 'build',
    enforce: 'post',
    transformIndexHtml: {
      /* AFTER Vite's own rewriting, so the tags it emits are already
         based — which is exactly why the guard below exists. Prefixing
         blindly produced `/godatafusion/godatafusion/assets/…`. */
      order: 'post',
      handler(html) {
        if (!prefix) return html;
        return html.replace(ATTR, (m, attr, url) => (
          /* `//` is protocol-relative and belongs to someone else; already
             based URLs are Vite's and are finished. */
          url === prefix || url.startsWith(`${prefix}/`)
            ? m
            : `${attr}${prefix}${url}"`
        ));
      },
    },
  };
}
