/* ============================================================
   THE ACCENT ARCHITECTURE, BEFORE AND AFTER — IN ONE BUILD.

   `--p81` reinstates exactly what Phase 8.1 shipped, on top of the
   current build: `--accent` written on the ROOT element, and the
   `:root.is-accent-shift *` universal transition added for the length
   of the shift. Nothing else differs, so the two rows below are a
   controlled comparison of the accent architecture alone rather than
   of two builds that also differ in a dozen other ways.
   ============================================================ */
import { launch, chromePath, serverUp } from '../../test/browser/support/chrome.mjs';
const BASE = process.argv[2] || 'http://localhost:4173';
const CATS = ['devtools.timeline', 'disabled-by-default-devtools.timeline', 'blink.user_timing'];
if (!chromePath() || !(await serverUp(BASE))) { console.error('need Chrome + server'); process.exit(2); }

const P81 = `
document.addEventListener('DOMContentLoaded', () => {
  const S = document.createElement('style');
  S.textContent = \`:root.is-accent-shift,:root.is-accent-shift *,:root.is-accent-shift *::before,:root.is-accent-shift *::after{
    transition-property:color,background-color,background-image,border-color,outline-color,box-shadow,fill,stroke,text-decoration-color,caret-color,-webkit-text-fill-color;
    transition-duration:.85s;transition-timing-function:cubic-bezier(.22,.61,.36,1);transition-delay:0s}\`;
  document.head.appendChild(S);
  const ACC = { capture: '66 232 255', measure: '184 255 61', quantify: '255 104 70', idle: '176 188 190' };
  const root = document.documentElement;
  let clear = 0;
  const shift = (mode) => {
    root.classList.add('is-accent-shift');
    root.style.setProperty('--accent', ACC[mode] || ACC.idle);
    root.style.setProperty('--accent-mix', mode === 'idle' ? '0.000' : '1.000');
    clearTimeout(clear);
    clear = setTimeout(() => root.classList.remove('is-accent-shift'), 940);
  };
  let last = null;
  new MutationObserver(() => {
    const m = document.body.dataset.mode || 'idle';
    if (m !== last) { last = m; shift(m); }
  }).observe(document.body, { attributes: true, attributeFilter: ['data-mode'] });
});`;

const PROBE = `
window.__P = { frames: [], marks: {} };
let prev = 0;
(function t(x){ if (prev) __P.frames.push(x - prev); prev = x; requestAnimationFrame(t); })(0);
window.__mark = (k) => { performance.mark('GDF:' + k); __P.marks[k] = { t: performance.now(), frame: __P.frames.length }; };
window.__win = (a, z) => { const A = __P.marks[a], Z = __P.marks[z];
  const raw = __P.frames.slice(A.frame, Z.frame); const f = raw.slice().sort((x,y)=>x-y);
  const q = (p) => (f.length ? +f[Math.min(f.length-1, Math.floor(f.length*p))].toFixed(2) : 0);
  return { t0:+A.t.toFixed(1), t1:+Z.t.toFixed(1), p50:q(.5), p90:q(.9), p95:q(.95), max:q(1),
    over25: raw.filter(d=>d>25).length, over33: raw.filter(d=>d>33).length, n: raw.length }; };`;

async function run(p81) {
  const b = await launch({ width: 1440, height: 900 });
  try {
    await b.send('Page.addScriptToEvaluateOnNewDocument', { source: PROBE + (p81 ? P81 : '') });
    await b.goto(BASE + '/');
    await b.sleep(8000);
    const rows = [];
    for (const mode of ['capture', 'measure', 'quantify', 'capture']) {
      await b.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 1400, y: 60 });
      await b.sleep(700);
      const ev = []; const off = b.on((m) => { if (m.method === 'Tracing.dataCollected') ev.push(...m.params.value); });
      await b.send('Tracing.start', { traceConfig: { includedCategories: CATS }, transferMode: 'ReportEvents' });
      await b.eval(`__mark('a')`);
      const pt = await b.box(`.modes__rail [data-mode="${mode}"]`);
      await b.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: pt.x, y: pt.y });
      await b.sleep(1500);
      await b.eval(`__mark('z')`);
      const w = await b.json(`__win('a','z')`);
      const done = new Promise((r) => { const o = b.on((m) => { if (m.method === 'Tracing.tracingComplete') { o(); r(); } }); });
      await b.send('Tracing.end'); await done; off();
      const mk = ev.find((e) => e.cat?.includes('blink.user_timing') && e.name === 'GDF:a');
      const offset = mk ? mk.ts / 1000 - w.t0 : 0;
      let recalcMs = 0, recalcs = 0, wide = 0, worst = 0, worstN = 0, paint = 0, layout = 0;
      for (const e of ev) {
        if (e.ph !== 'X' || !e.dur) continue;
        const st = e.ts / 1000 - offset;
        if (st < w.t0 || st > w.t1) continue;
        const ms = e.dur / 1000;
        if (e.name === 'UpdateLayoutTree') {
          const n = e.args?.elementCount ?? e.args?.beginData?.elementCount ?? 0;
          recalcMs += ms; recalcs++; if (n >= 300) wide++;
          if (ms > worst) { worst = ms; worstN = n; }
        } else if (e.name === 'Paint') paint += ms;
        else if (e.name === 'Layout') layout += ms;
      }
      rows.push({ mode, ...w, recalcMs: +recalcMs.toFixed(1), recalcs, wide, worst: +worst.toFixed(2), worstN,
        paint: +paint.toFixed(1), layout: +layout.toFixed(1) });
    }
    return rows;
  } finally { await b.close(); }
}

for (const [label, p81] of [['PHASE 8.1 (root --accent + universal transition)', true],
                            ['PHASE 8.2 (scoped accent + composited atmosphere)', false]]) {
  const rows = await run(p81);
  console.log(`\n== ${label} ==`);
  console.log('mode       p50    p90    p95    max  >25 >33 | recalc ms/n  doc-wide  worst(el)   paint  layout');
  for (const r of rows) {
    console.log(`${r.mode.padEnd(9)} ${String(r.p50).padStart(5)} ${String(r.p90).padStart(6)} ${String(r.p95).padStart(6)} `
      + `${String(r.max).padStart(6)} ${String(r.over25).padStart(4)} ${String(r.over33).padStart(3)} | `
      + `${String(r.recalcMs).padStart(6)}/${String(r.recalcs).padStart(3)} ${String(r.wide).padStart(9)} `
      + `${String(r.worst).padStart(6)}(${r.worstN}) ${String(r.paint).padStart(7)} ${String(r.layout).padStart(7)}`);
  }
}
