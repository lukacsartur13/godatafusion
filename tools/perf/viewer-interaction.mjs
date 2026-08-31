/* ============================================================
   §10 / §15 / §16 — WHAT A 360 INTERACTION IS ALLOWED TO DO.

   A station change and a floor change must not load, compile or
   reconstruct anything. This counts the three things that would prove
   otherwise — network requests, shader program links, and GLTF parses —
   across a run of station and floor switching, and records the frame
   intervals of each interaction window separately.
   ============================================================ */
import { writeFileSync, mkdirSync } from 'node:fs';
import { launch, chromePath, serverUp } from '../../test/browser/support/chrome.mjs';
const BASE = process.argv[2] || 'http://localhost:4173';
if (!chromePath() || !(await serverUp(BASE))) { console.error('need Chrome + server'); process.exit(2); }

const PROBE = `
window.__V = { frames: [], net: [], programs: 0, textures: 0, marks: {} };
new PerformanceObserver((l) => { for (const e of l.getEntries()) __V.net.push(e.name.split('/').pop()); })
  .observe({ entryTypes: ['resource'] });
for (const P of [self.WebGLRenderingContext, self.WebGL2RenderingContext]) {
  if (!P) continue;
  const lp = P.prototype.linkProgram; P.prototype.linkProgram = function (p) { __V.programs++; return lp.call(this, p); };
  const ti = P.prototype.texImage2D;  P.prototype.texImage2D = function (...a) { __V.textures++; return ti.apply(this, a); };
}
let prev = 0;
(function t(x){ if (prev) __V.frames.push(x - prev); prev = x; requestAnimationFrame(t); })(0);
window.__mark = (k) => { __V.marks[k] = { t: performance.now(), f: __V.frames.length, n: __V.net.length,
  p: __V.programs, x: __V.textures }; };
window.__win = (a, z) => { const A = __V.marks[a], Z = __V.marks[z];
  const raw = __V.frames.slice(A.f, Z.f); const s = raw.slice().sort((x, y) => x - y);
  const q = (k) => (s.length ? +s[Math.floor(s.length * k)].toFixed(1) : 0);
  return { frames: s.length, p50: q(.5), p90: q(.9), p95: q(.95), max: q(.999),
    over33: raw.filter(d => d > 33).length,
    net: __V.net.slice(A.n, Z.n), programs: Z.p - A.p, textures: Z.x - A.x }; };`;

const b = await launch({ width: 1280, height: 800 });
const out = { when: new Date().toISOString(), windows: [] };
try {
  await b.send('Page.addScriptToEvaluateOnNewDocument', { source: PROBE });
  await b.goto(BASE + '/360-camera/');
  await b.sleep(9000);
  await b.click('.pano__open, .pano__cta');
  await b.sleep(4500);                                   // viewer open and warm
  const win = async (label, fn) => {
    await b.eval(`__mark('a')`);
    await fn();
    await b.sleep(900);
    await b.eval(`__mark('z')`);
    out.windows.push({ label, ...(await b.json(`__win('a','z')`)) });
  };
  for (let i = 0; i < 4; i++) await win(`station ${i + 1}`, () => b.click('.pano__s:not(.is-on)'));
  for (const f of ['L01', 'L02', 'L00']) await win(`floor ${f}`, () => b.click(`[data-viewer-floor="${f}"]`));
  await win('drag', () => b.drag('.pano__canvas', -260, 40));
} finally {
  mkdirSync('qa/p82', { recursive: true });
  writeFileSync('qa/p82/viewer.json', JSON.stringify(out, null, 2));
  await b.close();
}
console.log('window          frames   p50   p90   p95    max  >33  programs  textures  network');
for (const w of out.windows) {
  console.log(`${w.label.padEnd(15)} ${String(w.frames).padStart(6)} ${String(w.p50).padStart(5)} `
    + `${String(w.p90).padStart(5)} ${String(w.p95).padStart(5)} ${String(w.max).padStart(6)} `
    + `${String(w.over33).padStart(4)} ${String(w.programs).padStart(9)} ${String(w.textures).padStart(9)}  `
    + (w.net.length ? w.net.join(', ') : '—'));
}
