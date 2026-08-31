/**
 * Full metadata + file inventory for one or more assets, and (with --thumbs)
 * the preview images, so a candidate comparison is made by LOOKING rather
 * than by reading tags.
 *
 *   node tools/polyhaven/asset-metadata.mjs dining_chair_02 --thumbs
 */
import { api, fetchFile, CACHE } from './client.mjs';
import { join } from 'node:path';

const args = process.argv.slice(2);
const thumbs = args.includes('--thumbs');
const size = Number((args.find((a) => a.startsWith('--size=')) || '--size=512').slice(7));
const slugs = args.filter((a) => !a.startsWith('--'));

for (const slug of slugs) {
  const info = await api(`/info/${slug}`);
  const files = await api(`/files/${slug}`);
  const maps = Object.keys(files).filter((k) => !['blend', 'gltf', 'fbx', 'usd'].includes(k));
  console.log(`\n=== ${slug} — ${info.name}`);
  console.log(`   author    ${Object.keys(info.authors || {}).join(', ')}`);
  console.log(`   category  ${info.category || (info.categories || []).join('/')}`);
  console.log(`   tris      ${info.polycount ?? '—'}   maxres ${(info.max_resolution || []).join('x')}`);
  console.log(`   attrs     ${JSON.stringify(info.attributes || {})}`);
  console.log(`   dims(mm)  ${(info.dimensions || []).map(Math.round).join(' x ')}`);
  console.log(`   desc      ${(info.description || '').slice(0, 160)}`);
  console.log(`   gltf      ${(files.gltf ? Object.keys(files.gltf) : []).join(' ')}`);
  console.log(`   maps      ${maps.join(' ')}`);
  if (thumbs && info.thumbnail_url) {
    const url = info.thumbnail_url.replace(/width=\d+/, `width=${size}`).replace(/height=\d+/, `height=${size}`);
    const { path } = await fetchFile(url, join(CACHE, 'thumbs', `${slug}.png`));
    console.log(`   thumb     ${path}`);
  }
}
