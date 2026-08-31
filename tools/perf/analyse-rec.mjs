/* ============================================================
   THE FRAME-BY-FRAME READING (§17), separated from the capture so it
   can be re-run over recordings already on disk.

   Two corrections that decide whether the numbers mean anything:

   1. THE DIFFERENCE IS DIVIDED BY THE INTERVAL. A frame presented 33 ms
      after the last one shows twice the change of one presented after
      16, and that is the pacing, not a teleport.

   2. DOUBLED SCREENCAST DELIVERIES ARE DROPPED. The transport emits the
      occasional second frame 2–4 ms behind its predecessor, carrying
      the change of the whole preceding interval. Measured against a 4 ms
      gap that reads as a 700× velocity, and every one of the "jumps" in
      the first pass over these recordings was one of them. A presented
      frame on a 60 Hz display is at least 8 ms after the last.

   node tools/perf/analyse-rec.mjs
   ============================================================ */
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';

const MIN_DT = 8;

export function analyse(meta) {
  const real = meta.filter((m, i) => i > 0 && m.dt >= MIN_DT)
    .map((m) => ({ ...m, rate: m.diff / m.dt }));
  const dts = real.map((m) => m.dt).sort((a, b) => a - b);
  const q = (k) => +(dts[Math.floor(dts.length * k)] ?? 0).toFixed(1);
  /* Frozen: a real interval passed and the picture did not change. */
  const frozen = real.filter((m) => m.diff < 0.02 && m.dt > 20);
  let worst = 0; const jumps = [];
  for (let i = 4; i < real.length - 4; i++) {
    const a = [real[i - 3], real[i - 2], real[i - 1], real[i + 1], real[i + 2], real[i + 3]]
      .map((x) => x.rate).sort((x, y) => x - y);
    const base = (a[2] + a[3]) / 2;
    if (base < 0.002) continue;
    const r = real[i].rate / base;
    if (r > worst) worst = r;
    if (r > 4) jumps.push({ i: real[i].i, t: real[i].t, dt: real[i].dt, r: +r.toFixed(1) });
  }
  return {
    presentedFrames: real.length,
    droppedAsDoubled: meta.length - 1 - real.length,
    span: +(meta.at(-1)?.t ?? 0).toFixed(0),
    interval: { p50: q(.5), p90: q(.9), p95: q(.95), max: dts.at(-1) ?? 0 },
    over25: real.filter((m) => m.dt > 25).length,
    over33: real.filter((m) => m.dt > 33).length,
    frozenFrames: frozen.length,
    worstLocalPixelJump: +worst.toFixed(1),
    jumps: jumps.slice(0, 12),
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const dirs = readdirSync('qa/p82').filter((d) => d.startsWith('rec-'));
  console.log('recording            frames  dropped   p50   p90   p95    max  >25  >33  frozen  worst jump');
  for (const d of dirs.sort()) {
    const f = `qa/p82/${d}/frames.json`;
    if (!existsSync(f)) continue;
    const j = JSON.parse(readFileSync(f, 'utf8'));
    const r = analyse(j.meta);
    writeFileSync(`qa/p82/${d}/analysis.json`, JSON.stringify({ title: j.title, ...r }, null, 2));
    console.log(`${d.padEnd(20)} ${String(r.presentedFrames).padStart(6)} ${String(r.droppedAsDoubled).padStart(8)} `
      + `${String(r.interval.p50).padStart(5)} ${String(r.interval.p90).padStart(5)} ${String(r.interval.p95).padStart(5)} `
      + `${String(r.interval.max).padStart(6)} ${String(r.over25).padStart(4)} ${String(r.over33).padStart(4)} `
      + `${String(r.frozenFrames).padStart(7)} ${String(r.worstLocalPixelJump + 'x').padStart(11)}`);
  }
}
