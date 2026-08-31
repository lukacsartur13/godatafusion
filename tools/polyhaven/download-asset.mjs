/**
 * Download approved assets into tools/polyhaven/downloads/ and record
 * provenance in assets.json.
 *
 *   node tools/polyhaven/download-asset.mjs models  side_table_01 --res 1k
 *   node tools/polyhaven/download-asset.mjs texture oak_veneer_02  --res 1k --maps Diffuse,arm,nor_gl
 *   node tools/polyhaven/download-asset.mjs hdri    kloofendal_overcast_puresky --res 1k
 *
 * Only the resolutions actually needed on the web are fetched — see
 * Phase 7 Part 08. Nothing here downloads an 8K source "just in case".
 */
import { join, dirname } from 'node:path';
import { api, fetchFile, ROOT } from './client.mjs';
import { record } from './asset-cache.mjs';

const DL = join(ROOT, 'tools', 'polyhaven', 'downloads');

const [kind, slug, ...rest] = process.argv.slice(2);
const flag = (n, d) => { const i = rest.indexOf(`--${n}`); return i < 0 ? d : rest[i + 1]; };
const res = flag('res', '1k');
const maps = flag('maps', 'Diffuse,arm,nor_gl').split(',');

const info = await api(`/info/${slug}`);
const files = await api(`/files/${slug}`);
const out = join(DL, slug);
let bytes = 0;
const got = [];

async function grab(url, dest) {
  const r = await fetchFile(url, dest);
  bytes += r.bytes;
  got.push({ file: dest.slice(DL.length + 1), bytes: r.bytes, cached: r.cached });
}

if (kind === 'models') {
  const g = files.gltf?.[res];
  if (!g) throw new Error(`${slug}: no gltf at ${res} (have ${Object.keys(files.gltf || {})})`);
  const main = g.gltf;
  await grab(main.url, join(out, `${slug}.gltf`));
  for (const [name, f] of Object.entries(main.include || {})) await grab(f.url, join(out, name));
} else if (kind === 'texture') {
  for (const m of maps) {
    const f = files[m]?.[res]?.jpg || files[m]?.[res]?.png;
    if (!f) { console.warn(`  ! ${slug}: no ${m} at ${res}`); continue; }
    await grab(f.url, join(out, `${slug}_${m}_${res}.jpg`));
  }
} else if (kind === 'hdri') {
  const f = files.hdri?.[res]?.hdr;
  if (!f) throw new Error(`${slug}: no hdri at ${res}`);
  await grab(f.url, join(out, `${slug}_${res}.hdr`));
} else {
  throw new Error('kind must be models | texture | hdri');
}

await record(slug, {
  kind,
  name: info.name,
  authors: Object.keys(info.authors || {}),
  /* Poly Haven publishes every asset as CC0 (ToS preamble). Recorded per
     asset rather than assumed globally, so a future licence change on one
     asset is visible in the register instead of silently inherited. */
  license: 'CC0 1.0',
  source: `https://polyhaven.com/a/${slug}`,
  api: `https://api.polyhaven.com/info/${slug}`,
  sourcePolycount: info.polycount ?? null,
  sourceMaxRes: info.max_resolution || null,
  fetchedRes: res,
  attributes: info.attributes || {},
  files: got,
  bytes,
});

console.log(`${slug}  ${kind}@${res}  ${(bytes / 1024).toFixed(0)} kB  ${got.length} files`);
for (const f of got) console.log(`   ${f.cached ? 'cache' : 'fetch'}  ${(f.bytes / 1024).toFixed(0).padStart(7)} kB  ${f.file}`);
