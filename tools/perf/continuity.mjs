/* ============================================================
   CONTINUITY — MEASURED ON THE STATE, NOT ON A FEELING.

   §04, §05 and §08 are all one claim: no visual system may jump. A jump
   is a frame whose change is much larger than its neighbours', so it is
   measurable exactly. Every frame this samples the values that decide
   where things ARE — the scan plane's world position, the mode weights,
   the level separation, the camera — and reports the largest per-frame
   step against the median step.

   Three sequences:
     SLOW        one mode at a time, each allowed to finish
     INTERRUPTED a switch at ~30% of the previous one, three deep
     RAPID       ten seconds of switching as fast as the pointer moves

   Run against the DEV server: `_debug` is the read handle, and it is
   compiled out of production. The source is the same source.
   ============================================================ */
import { writeFileSync, mkdirSync } from 'node:fs';
import { launch, chromePath } from '../../test/browser/support/chrome.mjs';

const BASE = process.argv[2] || 'http://localhost:5175';
const OUT = process.argv[3] || 'qa/p82/continuity.json';
if (!chromePath()) { console.error('no Chrome'); process.exit(2); }

const PROBE = `
window.__C = { on: false, rows: [], wired: false };
/* SAMPLE AFTER THE TWEENS HAVE TICKED.
   A bare rAF callback registered at document-start runs BEFORE GSAP's
   own ticker, so it reads the state as of the previous frame — usually.
   When the two rAF callbacks happen to be ordered the other way round
   for one frame, the sample jumps a whole frame forward and the
   measurement reports a velocity spike that the renderer never saw.
   GSAP's ticker runs its listeners after it has advanced every tween,
   which is the only moment at which "the state this frame is drawn
   from" is a well-defined thing to read. */
function sample() {
  if (!window.__C.on) return;
  const d = window.__gdf && window.__gdf.scene && window.__gdf.scene._debug;
  if (!d) return;
  const c = d.camera;
  window.__C.rows.push([
    performance.now(),
    d.scanPos,
    d.hero.capture, d.hero.measure, d.hero.quantify,
    d.state.explode, d.state.labels,
    d.camBasis.x, d.camBasis.y, d.camBasis.z,
    d.layers.plan || 0, d.layers.points || 0,
    d.objects.scanPlane.material.uniforms.uOpacity.value,
    d.objects.scanPlane.material.uniforms.uScanGain.value,
  ]);
}
window.__cstart = () => {
  /* Sample from INSIDE the render loop, immediately after the frame has
     been drawn. That is the only point at which every value below —
     the tween weights, the blended camera basis and the scan uniforms —
     describes the same frame. */
  const d = window.__gdf && window.__gdf.scene && window.__gdf.scene._debug;
  if (!window.__C.wired && d && d.tap) { d.tap(sample); window.__C.wired = true; }
  window.__C.rows.length = 0;
  window.__C.on = true;
  return window.__C.wired;
};
window.__cstop = () => { window.__C.on = false; return window.__C.rows; };
`;

const b = await launch({ width: 1440, height: 900 });
const out = { when: new Date().toISOString(), url: BASE, sequences: {} };

/**
 * A JUMP IS A VELOCITY SPIKE, NOT A LARGE STEP.
 *
 * If a frame arrives 50 ms after the last one instead of 16, everything
 * animating correctly moves three times as far in it. That is the frame
 * being late, not the state jumping, and a metric that cannot tell them
 * apart will report a hitch as a teleport for ever. So every step is
 * divided by the frame delta that produced it, and what is reported is
 * how fast the value was travelling — which a continuous interpolation
 * holds within a small factor of its own median no matter how the
 * frames land.
 */
const stat = (rows, idx, label, gateIdx = null) => {
  const steps = [];
  for (let i = 1; i < rows.length; i++) {
    /* A step taken while the thing is INVISIBLE is not a jump — it is
       the point of hiding it. The scan plane's axis change and its wrap
       both happen behind a gate that is at zero; a step there is
       recorded separately rather than counted as motion. */
    const hidden = gateIdx !== null && rows[i][gateIdx] < 0.004 && rows[i - 1][gateIdx] < 0.004;
    const dt = Math.max(1, rows[i][0] - rows[i - 1][0]);      // ms
    steps.push({ v: Math.abs(rows[i][idx] - rows[i - 1][idx]) / dt, hidden, i });
  }
  const visible = steps.filter((x) => !x.hidden).map((x) => x.v);
  const hiddenMax = Math.max(0, ...steps.filter((x) => x.hidden).map((x) => x.v));
  const s = visible.slice().sort((a, c) => a - c);
  /* The baseline is the median of the steps that are MOVING. A signal
     resting at zero for most of a window has a median step of zero, and
     everything is then infinitely larger than it. */
  const moving = s.filter((v) => v > 1e-6);
  const med = moving.length ? moving[moving.length >> 1] : 0;
  const max = s[s.length - 1] || 0;
  const p99 = s[Math.floor(s.length * 0.99)] || 0;
  /* A JUMP is a single frame that moves the value far further than a
     typical frame does. Ten times the median step is generous: an eased
     tween's fastest frame is ~2x its median, and a rate change inside a
     blend is ~3x. */
  /* ----------------------------------------------------------------
     A JUMP IS LOCAL. §17: "if one frame suddenly moves the scan / floor
     / camera several times farther than adjacent frames". Comparing
     against the median of the WHOLE window cannot express that — a
     signal that rests for eight seconds and then travels for one has a
     median of zero, so every moving frame is infinitely above it and
     the metric reports the transition itself as a teleport.

     So each frame is compared with its own neighbours: the median
     velocity of the three frames either side. A continuous
     interpolation stays within a small factor of that however the
     frames land, and a teleport does not.
     ---------------------------------------------------------------- */
  const vis = steps.filter((x) => !x.hidden).map((x) => x.v);
  let worstLocal = 0;
  let jumps = 0;
  for (let i = 3; i < vis.length - 3; i++) {
    const around = [vis[i - 3], vis[i - 2], vis[i - 1], vis[i + 1], vis[i + 2], vis[i + 3]]
      .slice().sort((a, c) => a - c);
    const base = (around[2] + around[3]) / 2;
    if (base < 1e-7) continue;                 // at rest — nothing is moving
    const r = vis[i] / base;
    if (r > worstLocal) worstLocal = r;
    if (r > 4) jumps++;
  }
  return { label, med: +med.toFixed(5), p99: +p99.toFixed(5), max: +max.toFixed(5),
    hiddenMax: +hiddenMax.toFixed(5),
    ratio: +worstLocal.toFixed(1), jumps };
};

try {
  await b.send('Page.addScriptToEvaluateOnNewDocument', { source: PROBE });
  await b.goto(BASE + '/');
  await b.sleep(9000);
  const rail = {};
  for (const m of ['capture', 'measure', 'quantify']) rail[m] = await b.box(`.modes__rail [data-mode="${m}"]`);
  /* A REAL POINTER PASSES THROUGH THE POINTS IN BETWEEN. Dispatching one
     mouseMoved from the rail to the far corner teleports it, and the
     camera's parallax — which follows the pointer, correctly — then
     takes a step no human hand could ask for. The harness must not
     manufacture a discontinuity and then report it. */
  let at = { x: 1400, y: 60 };
  async function moveTo(x, y, steps = 10) {
    for (let i = 1; i <= steps; i++) {
      await b.send('Input.dispatchMouseEvent', { type: 'mouseMoved',
        x: Math.round(at.x + (x - at.x) * i / steps), y: Math.round(at.y + (y - at.y) * i / steps) });
      await b.sleep(12);
    }
    at = { x, y };
  }
  const hover = (m) => moveTo(rail[m].x, rail[m].y);
  const away = () => moveTo(1400, 60);

  const SEQ = {
    slow: async () => {
      for (const m of ['capture', 'measure', 'quantify', 'capture']) {
        await hover(m); await b.sleep(1600); await away(); await b.sleep(1200);
      }
    },
    interrupted: async () => {
      /* MODE_DUR is 0.85 s, so 260 ms is ~30% of the way through. */
      await hover('capture'); await b.sleep(260);
      await hover('measure'); await b.sleep(340);
      await hover('quantify'); await b.sleep(260);
      await hover('capture'); await b.sleep(1800);
      await away(); await b.sleep(1500);
    },
    rapid: async () => {
      const t0 = Date.now();
      while (Date.now() - t0 < 10000) {
        for (const m of ['capture', 'measure', 'quantify']) { await hover(m); await b.sleep(150); }
      }
      await away(); await b.sleep(1200);
    },
  };

  for (const [name, run] of Object.entries(SEQ)) {
    await away(); await b.sleep(1500);
    const wired = await b.eval('__cstart()');
    if (!wired) throw new Error('the GSAP ticker probe could not attach — is this the dev build?');
    await run();
    const rows = await b.json('__cstop()');
    const cam = [];
    for (let i = 1; i < rows.length; i++) {
      const dt = Math.max(1, rows[i][0] - rows[i - 1][0]);
      cam.push(Math.hypot(rows[i][7] - rows[i - 1][7], rows[i][8] - rows[i - 1][8], rows[i][9] - rows[i - 1][9]) / dt);
    }
    const camSorted = cam.slice().sort((a, c) => a - c);
    const camMed = camSorted[camSorted.length >> 1] || 0;
    out.sequences[name] = {
      frames: rows.length,
      scan: stat(rows, 1, 'scan plane (visible only)', 12),
      capture: stat(rows, 2, 'capture weight'),
      measure: stat(rows, 3, 'measure weight'),
      quantify: stat(rows, 4, 'quantify weight'),
      explode: stat(rows, 5, 'level separation'),
      worstCam: (() => {
        let bi = 0, bv = 0;
        for (let i = 0; i < cam.length; i++) if (cam[i] > bv) { bv = cam[i]; bi = i; }
        const ctx = rows.slice(Math.max(0, bi - 1), bi + 3).map((r) => ({
          dt: +(r[0] - rows[Math.max(0, bi - 1)][0]).toFixed(1),
          cam: [+r[7].toFixed(3), +r[8].toFixed(3), +r[9].toFixed(3)],
          w: [+r[2].toFixed(3), +r[3].toFixed(3), +r[4].toFixed(3)],
        }));
        return { vel: +bv.toFixed(5), ctx };
      })(),
      camera: (() => {
        let worst = 0, n = 0;
        for (let i = 3; i < cam.length - 3; i++) {
          const a = [cam[i - 3], cam[i - 2], cam[i - 1], cam[i + 1], cam[i + 2], cam[i + 3]]
            .slice().sort((x, y) => x - y);
          const base = (a[2] + a[3]) / 2;
          if (base < 1e-7) continue;
          const r = cam[i] / base;
          if (r > worst) worst = r;
          if (r > 4) n++;
        }
        return { label: 'camera basis (blend)', med: +camMed.toFixed(5),
          max: +(camSorted[camSorted.length - 1] || 0).toFixed(5),
          ratio: +worst.toFixed(1), jumps: n };
      })(),
    };
  }
} finally {
  mkdirSync('qa/p82', { recursive: true });
  writeFileSync(OUT, JSON.stringify(out, null, 2));
  await b.close();
}

for (const [name, s] of Object.entries(out.sequences)) {
  console.log(`\n== ${name.toUpperCase()} (${s.frames} frames) ==`);
  console.log('signal                          median vel    p99 vel    max vel  worst/local  jumps(>4x)  max vel hidden');
  for (const k of ['scan', 'capture', 'measure', 'quantify', 'explode', 'camera']) {
    const v = s[k];
    console.log(`${v.label.padEnd(28)} ${String(v.med).padStart(11)} ${String(v.p99 ?? '—').padStart(10)} `
      + `${String(v.max).padStart(10)} ${String(v.ratio).padStart(12)} ${String(v.jumps).padStart(11)} `
      + `${String(v.hiddenMax ?? '—').padStart(16)}`);
  }
  const wc = s.worstCam;
  console.log(`  worst camera frame: ${wc.vel} u/ms — ${wc.ctx.map((c) => `+${c.dt}ms [${c.cam}] w[${c.w}]`).join('  ')}`);
}
console.log(`\nwritten: ${OUT}`);
