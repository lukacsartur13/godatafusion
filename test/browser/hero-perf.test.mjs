/* ============================================================
   PHASE 8.1 — THE HERO MODE SWITCH IS NOT ALLOWED TO GET HEAVY AGAIN.

   Three assertions that are FACTS, not timings, so they cannot flake:

     * moving the pointer onto a mode compiles no shader,
     * it fetches nothing,
     * and it produces no main-thread task long enough to be seen.

   Frame deltas are MEASURED and RECORDED rather than asserted against an
   absolute frame rate — a CI box has no display and no business having an
   opinion about 60 fps. The numbers land in test/.perf/hero.json so a
   regression is visible as a number moving, and a long task over the
   threshold fails outright because that is the defect this phase fixed.

   Run: npm run test:browser   (needs a built dist and `npm run preview`)
   ============================================================ */
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { launch, chromePath, serverUp } from './support/chrome.mjs';

const BASE = process.env.QA_URL || 'http://localhost:4173';
/* Generous on purpose. The defect was 108–270 ms frames; anything under
   this is not the defect coming back, and a shared CI core is noisy. */
const LONG_TASK_MS = 120;

const reason = !chromePath() ? 'no Chrome on this machine'
  : !(await serverUp(BASE)) ? `no preview server at ${BASE} (npm run build && npm run preview)`
  : null;

const PROBE = `
window.__P = { frames: [], long: [], net: [], shaders: 0, marks: {} };
new PerformanceObserver((l) => { for (const e of l.getEntries()) __P.long.push(Math.round(e.duration)); })
  .observe({ entryTypes: ['longtask'] });
new PerformanceObserver((l) => { for (const e of l.getEntries()) __P.net.push([Math.round(e.startTime), e.name.split('/').pop()]); })
  .observe({ entryTypes: ['resource'] });
for (const P of [self.WebGLRenderingContext, self.WebGL2RenderingContext]) {
  if (!P) continue;
  const cs = P.prototype.compileShader;
  P.prototype.compileShader = function (s) { __P.shaders++; return cs.call(this, s); };
}
let prev = 0;
(function tick(t) { if (prev) __P.frames.push(t - prev); prev = t; requestAnimationFrame(tick); })(0);
window.__mark = (k) => { __P.marks[k] = { t: performance.now(), frame: __P.frames.length,
  shaders: __P.shaders, long: __P.long.length, net: __P.net.length }; };
window.__span = (a, z) => {
  const A = __P.marks[a], Z = __P.marks[z];
  const f = __P.frames.slice(A.frame, Z.frame).sort((x, y) => x - y);
  const q = (p) => (f.length ? +f[Math.min(f.length - 1, Math.floor(f.length * p))].toFixed(1) : 0);
  return { frames: f.length, p50: q(.5), p95: q(.95), max: q(1),
    shaders: Z.shaders - A.shaders,
    long: __P.long.slice(A.long, Z.long),
    net: __P.net.slice(A.net, Z.net).map((n) => n[1]) };
};`;

test('hero mode switching', { skip: reason ?? false, concurrency: 1 }, async (t) => {
  const b = await launch({ width: 1440, height: 900 });
  const record = {};
  try {
    await b.send('Page.addScriptToEvaluateOnNewDocument', { source: PROBE });
    await b.goto(BASE + '/');
    await b.sleep(7000);                       // scene loaded, intro over

    const away = () => b.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 1400, y: 60 });
    const hover = async (mode) => {
      const p = await b.box(`.modes__rail [data-mode="${mode}"]`);
      assert.ok(p, `the ${mode} tab is on the page`);
      await b.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: p.x, y: p.y });
    };

    await t.test('a mode activation compiles nothing and fetches nothing', async () => {
      for (const mode of ['capture', 'measure', 'quantify', 'capture', 'measure', 'quantify']) {
        await away(); await b.sleep(400);
        await b.eval(`__mark('a')`);
        await hover(mode);
        await b.sleep(1500);
        await b.eval(`__mark('z')`);
        const s = await b.json(`__span('a','z')`);
        record[`switch:${mode}`] = record[`switch:${mode}`] ? [record[`switch:${mode}`], s].flat() : s;
        assert.equal(s.shaders, 0, `${mode} compiled ${s.shaders} shaders — the interaction path must already be hot`);
        assert.deepEqual(s.net, [], `${mode} triggered network activity: ${s.net.join(', ')}`);
        const worst = Math.max(0, ...s.long);
        assert.ok(worst <= LONG_TASK_MS,
          `${mode} produced a ${worst} ms main-thread task (limit ${LONG_TASK_MS} ms)`);
      }
    });

    await t.test('ten seconds of rapid switching stays clean', async () => {
      await b.eval(`__mark('r0')`);
      const t0 = Date.now();
      let n = 0;
      while (Date.now() - t0 < 10000) {
        for (const m of ['capture', 'measure', 'quantify']) { await hover(m); await b.sleep(160); n++; }
      }
      await b.eval(`__mark('r1')`);
      const s = await b.json(`__span('r0','r1')`);
      record.rapid = { switches: n, ...s };
      assert.equal(s.shaders, 0, 'no shader program was built during rapid switching');
      assert.deepEqual(s.net, [], 'nothing was fetched during rapid switching');
      const worst = Math.max(0, ...s.long);
      assert.ok(worst <= LONG_TASK_MS, `rapid switching produced a ${worst} ms task`);
    });
  } finally {
    mkdirSync('test/.perf', { recursive: true });
    writeFileSync('test/.perf/hero.json', JSON.stringify(record, null, 2));
    console.log('  frame deltas (ms):');
    for (const [k, v] of Object.entries(record)) {
      const rows = Array.isArray(v) ? v : [v];
      for (const r of rows) console.log(`    ${k.padEnd(18)} p50=${r.p50} p95=${r.p95} max=${r.max} long=${JSON.stringify(r.long)}`);
    }
    await b.close();
  }
});
