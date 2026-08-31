/* ============================================================
   PHASE 8.2 — THE TRANSITION PROFILER.

   Phase 8.1 measured ten-second spans and called the hero fixed. A
   visitor does not experience a ten-second span; they experience the
   1,5 s window that opens the moment they touch a mode tab. This
   measures exactly that window, one transition at a time, and never
   averages two of them together.

   Per transition:
     * frame-delta p50 / p75 / p90 / p95 / p99 / max
     * how many frames crossed 20 / 25 / 33 / 50 ms
     * trace accounting INSIDE the window — style recalc, layout, paint,
       scripting — and how many recalcs were WHOLE-DOCUMENT. Phase 8.2's
       hard requirement is zero of those.
     * the renderer's pixel ratio and drawing-buffer size before, during
       and after. They must not move.

   node tools/perf/transition-profile.mjs [url] [outfile]
   ============================================================ */
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { launch, chromePath, serverUp } from '../../test/browser/support/chrome.mjs';

const BASE = process.argv[2] || process.env.QA_URL || 'http://localhost:4173';
const OUT = process.argv[3] || 'qa/p82/transitions.json';
/* Headless Chrome has no display: it paces rAF off a software BeginFrame
   source and copies each frame out of the GPU, so its deltas describe the
   harness. Frame-pacing claims are measured with GDF_HEADFUL=1. */
const HEADFUL = process.env.GDF_HEADFUL === '1';
/* An UpdateLayoutTree over this many elements is not a component
   restyling — it is the document. The page has ~1 070 elements. */
const DOC_WIDE = 300;

if (!chromePath()) { console.error('no Chrome on this machine'); process.exit(2); }
if (!(await serverUp(BASE))) { console.error(`no server at ${BASE}`); process.exit(2); }

const PROBE = `
window.__P = { frames: [], marks: {}, long: [] };
new PerformanceObserver((l) => { for (const e of l.getEntries()) __P.long.push(+e.duration.toFixed(1)); })
  .observe({ entryTypes: ['longtask'] });
let prev = 0;
(function tick(t){ if (prev) __P.frames.push(t - prev); prev = t; requestAnimationFrame(tick); })(0);
window.__mark = (k) => { performance.mark('GDF:' + k);
  __P.marks[k] = { t: performance.now(), frame: __P.frames.length, long: __P.long.length }; };
window.__win = (a, z) => {
  const A = __P.marks[a], Z = __P.marks[z];
  const raw = __P.frames.slice(A.frame, Z.frame);
  const f = raw.slice().sort((x, y) => x - y);
  const q = (p) => (f.length ? +f[Math.min(f.length - 1, Math.floor(f.length * p))].toFixed(2) : 0);
  const over = (ms) => raw.filter((d) => d > ms).length;
  /* WHERE the slow frames land inside the window, in ms from its start.
     A spike in the first 60 ms is the announcement; a spread across the
     whole window is the motion itself being slow, and they are different
     defects. */
  let acc = 0;
  const late = [];
  for (const d of raw) { acc += d; if (d > 25) late.push([Math.round(acc), +d.toFixed(1)]); }
  return { t0: +A.t.toFixed(1), t1: +Z.t.toFixed(1), frames: f.length,
    p50: q(.5), p75: q(.75), p90: q(.9), p95: q(.95), p99: q(.99), max: q(1),
    over20: over(20), over25: over(25), over33: over(33), over50: over(50),
    slowAt: late.slice(0, 40),
    long: __P.long.slice(A.long, Z.long) };
};
for (const P of [self.WebGLRenderingContext, self.WebGL2RenderingContext]) {
  if (!P) continue;
  const lp = P.prototype.linkProgram;
  P.prototype.linkProgram = function (p) { self.__progs = (self.__progs || 0) + 1; return lp.call(this, p); };
}
window.__gl = () => {
  const c = document.getElementById('gl');
  if (!c) return null;
  return { dpr: +devicePixelRatio.toFixed(3), bufW: c.width, bufH: c.height,
    cssW: Math.round(c.getBoundingClientRect().width),
    cssH: Math.round(c.getBoundingClientRect().height),
    programs: self.__progs || 0 };
};
`;

const b = await launch({ width: 1440, height: 900, headful: HEADFUL });
const CATS = ['devtools.timeline', 'disabled-by-default-devtools.timeline', 'blink.user_timing'];

/** Run `fn` with tracing on; return its value plus the trace events. */
async function traced(fn) {
  const events = [];
  const off = b.on((m) => {
    if (m.method === 'Tracing.dataCollected') events.push(...m.params.value);
  });
  await b.send('Tracing.start', { traceConfig: { includedCategories: CATS }, transferMode: 'ReportEvents' });
  const value = await fn();
  const done = new Promise((res) => {
    const off2 = b.on((m) => { if (m.method === 'Tracing.tracingComplete') { off2(); res(); } });
  });
  await b.send('Tracing.end');
  await done;
  off();
  return { value, events };
}

/**
 * Chrome's trace `ts` is monotonic-clock microseconds; `performance.now()`
 * is milliseconds since navigation start. They are different origins, so
 * the window boundaries are located by the USER-TIMING MARKS the probe
 * emits — the same two events, in both clocks — and the offset is read off
 * them rather than assumed.
 */
function clockOffset(events, markName, perfNow) {
  const m = events.find((e) => e.cat?.includes('blink.user_timing') && e.name === 'GDF:' + markName);
  return m ? m.ts / 1000 - perfNow : null;
}

/** Sum trace work inside [t0,t1] page-relative ms. */
function account(events, t0, t1, timeOrigin) {
  const out = { recalcMs: 0, recalcs: 0, docWideRecalcs: 0, maxRecalcMs: 0, maxRecalcElems: 0,
    layoutMs: 0, layouts: 0, paintMs: 0, paints: 0, scriptMs: 0, gpuMs: 0, rasterMs: 0 };
  const NAMES = {
    UpdateLayoutTree: 'recalc', ScheduleStyleRecalculation: null,
    Layout: 'layout', Layerize: 'layout',
    Paint: 'paint', PrePaint: 'paint', 'Paint Setup': 'paint',
    FunctionCall: 'script', EvaluateScript: 'script', TimerFire: 'script',
    v8_execute: 'script',
    GPUTask: 'gpu', RasterTask: 'raster',
  };
  for (const e of events) {
    if (e.ph !== 'X' || e.dur == null) continue;
    const kind = NAMES[e.name];
    if (kind === undefined || kind === null) continue;
    const start = e.ts / 1000 - timeOrigin;   // timeOrigin here is the measured offset
    if (start < t0 || start > t1) continue;
    const ms = e.dur / 1000;
    if (kind === 'recalc') {
      const n = e.args?.elementCount ?? e.args?.beginData?.elementCount ?? 0;
      out.recalcMs += ms; out.recalcs++;
      if (n >= DOC_WIDE) out.docWideRecalcs++;
      if (ms > out.maxRecalcMs) { out.maxRecalcMs = ms; out.maxRecalcElems = n; }
    } else if (kind === 'layout') { out.layoutMs += ms; out.layouts++; }
    else if (kind === 'paint') { out.paintMs += ms; out.paints++; }
    else if (kind === 'script') out.scriptMs += ms;
    else if (kind === 'gpu') out.gpuMs += ms;
    else if (kind === 'raster') out.rasterMs += ms;
  }
  for (const k in out) out[k] = +out[k].toFixed(2);
  return out;
}

/** Account a window, locating it in trace time via its opening mark. */
function window_(events, w, openMark) {
  const off = clockOffset(events, openMark, w.t0);
  if (off === null) return { unresolved: true };
  return account(events, w.t0, w.t1, off);
}

const results = { url: BASE, when: new Date().toISOString(), idle: null, transitions: [] };

try {
  await b.send('Page.addScriptToEvaluateOnNewDocument', { source: PROBE });
  await b.goto(BASE + '/');
  /* A window that is not frontmost is throttled by macOS, and a
     throttled window's frame deltas are the window manager's, not the
     site's. Every headful measurement below is taken with the window in
     front. */
  await b.send('Page.bringToFront').catch(() => {});
  await b.sleep(8000);                      // scene loaded, intro over, warmed
  results.gl = await b.json('__gl()');
  results.headful = HEADFUL;

  const timeOrigin = await b.eval('performance.timeOrigin');
  const away = () => b.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 1400, y: 60 });
  const hover = async (mode) => {
    const p = await b.box(`.modes__rail [data-mode="${mode}"]`);
    if (!p) throw new Error(`no ${mode} tab`);
    await b.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: p.x, y: p.y });
  };

  /* ---- idle baseline, 2 s ---- */
  {
    await away(); await b.sleep(900);
    const { value, events } = await traced(async () => {
      await b.eval(`__mark('i0')`);
      await b.sleep(2000);
      await b.eval(`__mark('i1')`);
      return b.json(`__win('i0','i1')`);
    });
    results.idle = { ...value, trace: window_(events, value, 'i0') };
  }

  /* ---- one window per transition ---- */
  const SEQ = ['capture', 'measure', 'quantify', 'capture', 'measure', 'quantify'];
  for (const mode of SEQ) {
    await away(); await b.sleep(700);
    const before = await b.json('__gl()');
    const { value, events } = await traced(async () => {
      await b.eval(`__mark('a')`);
      await hover(mode);
      await b.sleep(1500);
      await b.eval(`__mark('z')`);
      return b.json(`__win('a','z')`);
    });
    const during = await b.json('__gl()');
    await b.sleep(600);
    const after = await b.json('__gl()');
    results.transitions.push({
      mode, ...value,
      trace: window_(events, value, 'a'),
      dpr: { before, during, after },
    });
  }

  /* ---- rapid interruption: 10 s of switching ---- */
  {
    const { value, events } = await traced(async () => {
      await b.eval(`__mark('r0')`);
      const t0 = Date.now();
      let n = 0;
      while (Date.now() - t0 < 10000) {
        for (const m of ['capture', 'measure', 'quantify']) { await hover(m); await b.sleep(150); n++; }
      }
      await b.eval(`__mark('r1')`);
      const w = await b.json(`__win('r0','r1')`);
      w.switches = n;
      return w;
    });
    results.rapid = { ...value, trace: window_(events, value, 'r0') };
  }
} finally {
  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, JSON.stringify(results, null, 2));
  await b.close();
}

/* ---- report ---- */
const row = (k, w) => `${String(k).padEnd(12)} p50=${String(w.p50).padStart(6)} p75=${String(w.p75).padStart(6)} `
  + `p90=${String(w.p90).padStart(6)} p95=${String(w.p95).padStart(6)} p99=${String(w.p99).padStart(6)} `
  + `max=${String(w.max).padStart(7)} | >20:${String(w.over20).padStart(3)} >25:${String(w.over25).padStart(3)} `
  + `>33:${String(w.over33).padStart(3)} >50:${String(w.over50).padStart(3)}`;
const trow = (t) => (t.unresolved ? '             trace window unresolved'
  : `             recalc ${String(t.recalcMs).padStart(6)} ms /${String(t.recalcs).padStart(3)} `
  + `(doc-wide ${t.docWideRecalcs}, worst ${t.maxRecalcMs} ms over ${t.maxRecalcElems} el) `
  + `layout ${t.layoutMs} paint ${t.paintMs} script ${t.scriptMs}`);

console.log(`\n(${HEADFUL ? 'HEADFUL — real window, real vsync' : 'HEADLESS — frame deltas describe the harness'})`);
console.log('\n== IDLE (2 s) ==');
console.log(row('idle', results.idle));
console.log(trow(results.idle.trace));
console.log('\n== TRANSITIONS (1,5 s window each) ==');
for (const t of results.transitions) {
  console.log(row(t.mode, t));
  console.log(trow(t.trace));
  console.log(`             slow frames @ms: ${t.slowAt.map(([a, d]) => `${a}:${d}`).join(' ') || 'none'}`);
  const d = t.dpr;
  const same = d.before && d.during && d.after
    && d.before.dpr === d.during.dpr && d.during.dpr === d.after.dpr
    && d.before.bufW === d.during.bufW && d.during.bufW === d.after.bufW;
  console.log(`             DPR ${d.before?.dpr}/${d.during?.dpr}/${d.after?.dpr} `
    + `buffer ${d.before?.bufW}x${d.before?.bufH} → ${d.during?.bufW}x${d.during?.bufH} → ${d.after?.bufW}x${d.after?.bufH} `
    + `${same ? 'STABLE' : '*** MOVED ***'}  programs ${d.before?.programs}→${d.after?.programs}`);
}
if (results.rapid) {
  console.log(`\n== RAPID (${results.rapid.switches} switches / 10 s) ==`);
  console.log(row('rapid', results.rapid));
  console.log(trow(results.rapid.trace));
}
console.log(`\nwritten: ${OUT}`);
