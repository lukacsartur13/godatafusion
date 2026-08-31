/**
 * The provenance ledger.
 *
 * Every byte this pipeline pulls is recorded here with the asset it came
 * from, the author Poly Haven credits, the licence, the resolution asked
 * for and the date of retrieval. docs/asset-register.md is generated from
 * this file, so the register can never drift from what was actually
 * downloaded — it is not maintained by hand.
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT } from './client.mjs';

export const LEDGER = join(ROOT, 'tools', 'polyhaven', 'assets.json');

export async function readLedger() {
  if (!existsSync(LEDGER)) return { retrieved: {}, entries: {} };
  return JSON.parse(await readFile(LEDGER, 'utf8'));
}

export async function record(slug, entry) {
  const led = await readLedger();
  led.entries[slug] = { ...(led.entries[slug] || {}), ...entry };
  led.retrieved[slug] = new Date().toISOString().slice(0, 10);
  await mkdir(join(ROOT, 'tools', 'polyhaven'), { recursive: true });
  await writeFile(LEDGER, JSON.stringify(led, null, 1));
  return led;
}
