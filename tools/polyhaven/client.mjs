/**
 * Poly Haven public API client.
 *
 * TERMS, verified 2026-08-28 against the document the API's own OpenAPI
 * spec names as `info.termsOfService`
 * (https://github.com/Poly-Haven/Public-API/blob/master/ToS.md):
 *
 *   §2.1  free for anyone, including commercial use, at no charge
 *   §2.3  no key, licence or payment is ever required for API access
 *   §2.4  every call MUST carry a unique Referer or User-Agent naming the
 *         calling software — that is the only hard technical requirement,
 *         and it is why UA below is a constant rather than a default
 *   §2.5  the credit clause binds the LIVE API only. This pipeline runs at
 *         BUILD time and the site self-hosts the results, so the shipped
 *         page makes no API calls and the clause does not reach it. The
 *         assets themselves are CC0 and carry no attribution requirement
 *         "now or ever". docs/asset-register.md records provenance anyway,
 *         because a production site should be able to say where its
 *         geometry came from.
 *   §2.6  do not degrade the service — hence the on-disk cache, the
 *         serial download queue and the delay between requests.
 *
 * Nothing here scrapes polyhaven.com or touches an undocumented endpoint.
 * Every path used is one of the eight in the published spec.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';

export const API = 'https://api.polyhaven.com';
/** §2.4 — identifies this pipeline's traffic. Do not make this generic. */
export const UA = 'GoDataFusion-AssetPipeline/1.0 (+https://godatafusion.hu)';

export const ROOT = join(dirname(decodeURIComponent(new URL(import.meta.url).pathname)), '..', '..');
export const CACHE = join(ROOT, 'tools', 'polyhaven', '.cache');

let last = 0;
/** §2.6 — never burst. One request at a time, spaced. */
async function throttle(ms = 350) {
  const wait = last + ms - Date.now();
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  last = Date.now();
}

export async function api(path, { ttl = 86400e3 } = {}) {
  await mkdir(CACHE, { recursive: true });
  const file = join(CACHE, `${path.replace(/[^\w.-]+/g, '_')}.json`);
  if (existsSync(file)) {
    const st = await readFile(file, 'utf8');
    const { at, body } = JSON.parse(st);
    if (Date.now() - at < ttl) return body;
  }
  await throttle();
  const res = await fetch(API + path, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`${path} → HTTP ${res.status}`);
  const body = await res.json();
  await writeFile(file, JSON.stringify({ at: Date.now(), body }));
  return body;
}

/** Binary fetch with an on-disk cache. Returns the local path. */
export async function fetchFile(url, dest) {
  if (existsSync(dest)) return { path: dest, cached: true, bytes: (await readFile(dest)).length };
  await mkdir(dirname(dest), { recursive: true });
  await throttle(500);
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`${url} → HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  await writeFile(dest, buf);
  return { path: dest, cached: false, bytes: buf.length };
}

export const TYPE = { 0: 'hdris', 1: 'textures', 2: 'models' };
