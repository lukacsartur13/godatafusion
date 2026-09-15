/* The generator, wired into Vite: regenerate /en/ and /de/ before a build
   and whenever a Hungarian page, a dictionary or a source module changes
   under `vite dev`. The generated HTML is what Vite then serves and
   bundles — a language is a real document, as the Hungarian one is. */
import { generateAll, isSource } from './i18n/core.mjs';

export function i18nPlugin() {
  let timer = null;
  return {
    name: 'gdf-i18n',
    configureServer(server) {
      const kick = (file) => {
        if (!isSource(file)) return;
        clearTimeout(timer);
        timer = setTimeout(() => {
          try { generateAll({ log: server.config.logger }); }
          catch (e) { server.config.logger.error(`[i18n] ${e.message}`); }
        }, 60);
      };
      server.watcher.on('change', kick);
      server.watcher.on('add', kick);
    },
  };
}
