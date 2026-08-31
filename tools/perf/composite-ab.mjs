/* ============================================================
   WHY THE HERO PRESENTS AT 30 fps ON A 120 Hz DISPLAY.

   Measured from the GPU process, not from rAF: composited frames per
   second, the cost of SwapBuffers, and how much of that is
   CALayerTreeCoordinator::ApplyBackpressure — the GPU process waiting
   for macOS to release the previous frame's buffer. WebGL's own cost is
   printed alongside so the two cannot be confused.

   Every case gets a FRESH NAVIGATION. Compositing layers are decided at
   layerisation time, so a stylesheet toggled into a page that has
   already been laid out does not answer the question. The baseline runs
   first and last; if the two disagree the run is drifting and the
   middle rows mean nothing.
   ============================================================ */
import { launch } from '../../test/browser/support/chrome.mjs';
const CATS = ['viz', 'gpu', 'benchmark'];
const BASE = process.argv[2] || 'http://localhost:4173';
const TRACE_MS = 4000;

const CASES = [
  ['baseline', ''],
  ['.stage will-change:auto', '.stage{will-change:auto!important}'],
  ['.atmos__grain off (mix-blend)', '.atmos__grain{display:none!important}'],
  ['.frame off', '.frame{display:none!important}'],
  ['annos off', '.anno{display:none!important}'],
  ['stage will-change + grain off', '.stage{will-change:auto!important}.atmos__grain{display:none!important}'],
  ['everything but the canvas', '.atmos,.frame,.anno,.scanplane,.stage__veil,.tracker,.cursor,main,.nav,.foot{display:none!important}'],
  ['CONTROL (clear-only page)', null],
  ['baseline (repeat)', ''],
];

const b = await launch({ width: 1440, height: 900, headful: true });
try {
  await b.send('Page.bringToFront').catch(() => {});
  console.log('case                                comp.fps  swap.mean  swap.p90  backpressure  webgl.mean  layers');
  for (const [name, css] of CASES) {
    if (css === null) await b.goto(BASE + '/_control.html', 3000);
    else {
      await b.send('Page.addScriptToEvaluateOnNewDocument', {
        source: `document.addEventListener('DOMContentLoaded',()=>{const s=document.createElement('style');s.textContent=${JSON.stringify(css)};document.head.appendChild(s);});`,
      });
      await b.goto(BASE + '/', 9000);
    }
    const ev = [];
    const off = b.on((m) => { if (m.method === 'Tracing.dataCollected') ev.push(...m.params.value); });
    await b.send('Tracing.start', { traceConfig: { includedCategories: CATS }, transferMode: 'ReportEvents' });
    await b.sleep(TRACE_MS);
    const done = new Promise((r) => { const o = b.on((m) => { if (m.method === 'Tracing.tracingComplete') { o(); r(); } }); });
    await b.send('Tracing.end'); await done; off();

    const pick = (re) => ev.filter((e) => e.ph === 'X' && e.dur && re.test(e.name)).map((e) => e.dur / 1000).sort((x, y) => x - y);
    const swap = pick(/SkiaOutputSurfaceImplOnGpu::SwapBuffers/);
    const bp = pick(/ApplyBackpressure$/);
    const gl = pick(/^WebGL$/);
    const mean = (a) => (a.length ? a.reduce((s, v) => s + v, 0) / a.length : 0);
    const p90 = (a) => (a.length ? a[Math.floor(a.length * 0.9)] : 0);
    let layers = 0;
    try {
      await b.send('LayerTree.enable');
      const seen = new Promise((r) => { const o = b.on((m) => { if (m.method === 'LayerTree.layerTreeDidChange') { o(); r(m.params.layers?.length || 0); } }); setTimeout(() => r(0), 1500); });
      layers = await seen;
      await b.send('LayerTree.disable');
    } catch { /* not available */ }
    console.log(`${name.padEnd(33)} ${(swap.length / (TRACE_MS / 1000)).toFixed(1).padStart(8)} `
      + `${mean(swap).toFixed(1).padStart(10)} ${p90(swap).toFixed(1).padStart(9)} `
      + `${mean(bp).toFixed(1).padStart(13)} ${mean(gl).toFixed(2).padStart(11)} ${String(layers).padStart(7)}`);
  }
} finally { await b.close(); }
