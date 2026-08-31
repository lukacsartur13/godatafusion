/* ============================================================
   THE RECORDINGS, AND THE FRAME-BY-FRAME READING OF THEM.

   §16 asks for video and §17 asks for the video to be ANALYSED rather
   than admired. There is no ffmpeg on this machine, so what is produced
   is better suited to the question anyway: the actual presented frames,
   with the timestamp each one was presented at, plus a pixel difference
   between every consecutive pair — and a player that runs them back at
   real speed and lets a human step through them one at a time.

   The two things §17 asks to look for fall straight out of that:
     * a DUPLICATED or FROZEN frame is a pair whose difference is ~0
       across an interval longer than a refresh;
     * a JUMP is a pair whose difference is several times its
       neighbours' — the same local test the state-level continuity
       measurement uses, applied to pixels.

   Screencast capture is not free and it does perturb frame pacing. The
   intervals below are therefore evidence about CONTINUITY — whether
   anything teleports — and not the frame-pacing measurement, which is
   what tools/perf/transition-profile.mjs is for.

   node tools/perf/record.mjs <name> [url]
   ============================================================ */
import { writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { launch, chromePath } from '../../test/browser/support/chrome.mjs';
import { analyse } from './analyse-rec.mjs';

const NAME = process.argv[2] || 'a-slow';
const PREVIEW = process.env.QA_URL || 'http://localhost:4173';
if (!chromePath()) { console.error('no Chrome'); process.exit(2); }

const DIR = `${process.env.QA_DIR || 'qa/p82'}/rec-${NAME}`;

/* ---------------- the five scripted sequences ---------------- */
const SEQ = {
  /* PHASE 8.3 §29 — THE IDLE RECORDING.
     The phase's whole claim is about the hero standing still, so the
     recording that matters most is the one where nobody touches
     anything: 30 s of ambient yaw and the scan plane, pointer parked
     off the rail. If this one skips, the phase failed. */
  'idle': {
    title: 'A — 30 SECONDS OF IDLE HERO',
    note: 'Nothing hovered, nothing clicked. Ambient yaw and the scan plane only.',
    path: '/',
    async run(b, h) { await h.away(); await b.sleep(30000); },
  },
  'a-slow': {
    title: 'A — SLOW SWITCHING',
    note: 'IDLE · CAPTURE · MEASURE · QUANTIFY · CAPTURE, each allowed to finish.',
    path: '/',
    async run(b, h) {
      await b.sleep(1200);
      for (const m of ['capture', 'measure', 'quantify', 'capture']) {
        await h.hover(m); await b.sleep(1900);
        await h.away(); await b.sleep(1300);
      }
    },
  },
  'b-rapid': {
    title: 'B — RAPID SWITCHING',
    note: 'CAPTURE → MEASURE → QUANTIFY → CAPTURE for ten seconds.',
    path: '/',
    async run(b, h) {
      const t0 = Date.now();
      while (Date.now() - t0 < 10000) {
        for (const m of ['capture', 'measure', 'quantify']) { await h.hover(m); await b.sleep(150); }
      }
      await h.away(); await b.sleep(1500);
    },
  },
  'c-scan': {
    title: 'C — THE SCAN PLANE',
    note: 'Deliberate switching, held long enough to follow the plane across a full pass '
      + 'and through the CAPTURE/MEASURE → QUANTIFY axis change.',
    path: '/',
    async run(b, h) {
      await b.sleep(2500);
      await h.hover('capture'); await b.sleep(4000);
      await h.hover('measure'); await b.sleep(4000);
      await h.hover('quantify'); await b.sleep(5000);
      await h.hover('measure'); await b.sleep(4000);
      await h.away(); await b.sleep(3000);
    },
  },
  'd-levels': {
    title: 'D — QUANTIFY FLOOR SWITCHING',
    note: 'ALL → L00 → L01 → L02 → ALL, then the same interrupted half way.',
    path: '/mennyisegszamitas/',
    async run(b, h) {
      const go = async (f, wait) => { await h.click(`[data-floor="${f}"]`); await b.sleep(wait); };
      await b.sleep(1500);
      for (const f of ['ALL', 'L00', 'L01', 'L02', 'ALL']) await go(f, 1900);
      // interrupted
      for (const f of ['L00', 'L02', 'L01', 'ALL', 'L00']) await go(f, 380);
      await b.sleep(2500);
    },
  },
  'e-360': {
    title: 'E — THE 360 VIEWER',
    note: 'Open, switch stations, switch floors, drag.',
    path: '/360-camera/',
    async run(b, h) {
      await h.click('.pano__open, [data-pano-open], .pano__cta');
      await b.sleep(3500);
      for (let i = 0; i < 4; i++) { await h.click('.pano__s:not(.is-on)'); await b.sleep(900); }
      for (const f of ['L01', 'L02', 'L00']) { await h.click(`[data-viewer-floor="${f}"]`); await b.sleep(1500); }
      await h.drag('.pano__canvas', -260, 40); await b.sleep(500);
      await h.drag('.pano__canvas', 200, -30); await b.sleep(500);
      for (let i = 0; i < 3; i++) { await h.click('.pano__s:not(.is-on)'); await b.sleep(700); }
      await b.sleep(1200);
    },
  },
};

const seq = SEQ[NAME];
if (!seq) { console.error(`unknown sequence "${NAME}" — one of ${Object.keys(SEQ).join(', ')}`); process.exit(2); }

/** A self-contained player: real-time playback, and a frame stepper. */
function player(seq, meta, report) {
  return `<!doctype html><meta charset=utf-8><title>${seq.title}</title>
<style>
 :root{color-scheme:dark}
 body{margin:0;background:#0b0d0e;color:#eceae4;font:13px/1.5 ui-monospace,Menlo,monospace}
 header{padding:16px 20px;border-bottom:1px solid #23282a}
 h1{font-size:15px;margin:0 0 4px;letter-spacing:.08em}
 p{margin:0;color:#8b9296;max-width:70ch}
 .wrap{padding:16px 20px}
 img{width:100%;max-width:1000px;display:block;background:#000;border:1px solid #23282a}
 .bar{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin:12px 0}
 button{font:inherit;background:#171b1d;color:inherit;border:1px solid #2c3235;padding:5px 12px;cursor:pointer}
 button:hover{border-color:#4a5459}
 input[type=range]{flex:1;min-width:280px}
 table{border-collapse:collapse;margin-top:14px;font-size:12px}
 td,th{border:1px solid #23282a;padding:3px 9px;text-align:right}
 th{color:#8b9296;font-weight:400;text-align:left}
 .spark{width:100%;max-width:1000px;height:74px;display:block;border:1px solid #23282a;background:#0e1112}
 .k{color:#8b9296}
</style>
<header>
 <h1>${seq.title}</h1>
 <p>${seq.note}</p>
</header>
<div class="wrap">
 <img id=v alt="">
 <div class="bar">
  <button id=play>play</button>
  <button id=prev>◀ frame</button>
  <button id=next>frame ▶</button>
  <input id=sl type=range min=0 value=0>
  <span id=lbl class=k></span>
 </div>
 <canvas class=spark id=sp width=2000 height=148></canvas>
 <p class=k style="margin-top:6px">
  Per-frame pixel change divided by the interval that produced it. A frozen frame is a flat
  segment across a long interval; a teleport is a spike several times its neighbours.
 </p>
 <table>
  <tr><th>presented frames</th><td>${report.presentedFrames}</td></tr>
  <tr><th>span</th><td>${report.span} ms</td></tr>
  <tr><th>interval p50 / p90 / p95 / max</th><td>${report.interval.p50} / ${report.interval.p90} / ${report.interval.p95} / ${report.interval.max} ms</td></tr>
  <tr><th>frozen frames</th><td>${report.frozenFrames}</td></tr>
  <tr><th>worst local pixel jump</th><td>${report.worstLocalPixelJump}×</td></tr>
 </table>
</div>
<script id=meta type="application/json">${JSON.stringify(meta)}</script>
<script>
const META = JSON.parse(document.getElementById('meta').textContent);
let FR = null;
fetch('frames.b64.json').then(r=>r.json()).then(f=>{ FR=f; sl.max=f.length-1; show(0); draw(); });
const v=document.getElementById('v'), sl=document.getElementById('sl'), lbl=document.getElementById('lbl');
function show(i){ if(!FR) return; i=Math.max(0,Math.min(FR.length-1,i)); sl.value=i;
  v.src='data:image/jpeg;base64,'+FR[i];
  const m=META[i]; lbl.textContent='#'+i+'  t='+m.t+'ms  Δt='+m.dt+'ms  pixel Δ='+m.diff.toFixed(3);
  draw(i); }
sl.oninput=()=>show(+sl.value);
document.getElementById('prev').onclick=()=>show(+sl.value-1);
document.getElementById('next').onclick=()=>show(+sl.value+1);
let timer=null;
document.getElementById('play').onclick=()=>{
  if(timer){clearTimeout(timer);timer=null;play.textContent='play';return;}
  play.textContent='pause';
  let i=+sl.value>=FR.length-1?0:+sl.value;
  const step=()=>{ show(i); const nx=i+1; if(nx>=FR.length){timer=null;play.textContent='play';return;}
    timer=setTimeout(()=>{i=nx;step();}, Math.max(1,META[nx].dt)); };
  step();
};
const sp=document.getElementById('sp'), c=sp.getContext('2d');
function draw(cur){
  c.clearRect(0,0,sp.width,sp.height);
  const rates=META.map(m=>m.dt>=4?m.diff/m.dt:0);
  const mx=Math.max(0.001,...rates);
  c.strokeStyle='#2c3235'; c.beginPath(); c.moveTo(0,sp.height-1); c.lineTo(sp.width,sp.height-1); c.stroke();
  c.strokeStyle='#42e8ff'; c.beginPath();
  META.forEach((m,i)=>{ const x=i/(META.length-1)*sp.width, y=sp.height-(rates[i]/mx)*(sp.height-8)-2;
    i?c.lineTo(x,y):c.moveTo(x,y); });
  c.stroke();
  if(cur!=null){ const x=cur/(META.length-1)*sp.width; c.strokeStyle='#ff6846';
    c.beginPath(); c.moveTo(x,0); c.lineTo(x,sp.height); c.stroke(); }
}
</script>`;
}

/* PHASE 8.3 §29 asks for REAL-TIME recordings, so this runs in a real
   window on a real display: headless Chrome has no swapchain and paces
   rAF off a software BeginFrame source, which would make every recording
   a picture of the harness. QA_X/QA_Y place the window on a chosen
   display — this machine has a 60 Hz built-in and a 120 Hz external, and
   the two do not behave the same. */
const b = await launch({
  width: 1280, height: 800,
  headful: process.env.QA_HEADFUL !== '0',
  x: process.env.QA_X ? Number(process.env.QA_X) : null,
  y: process.env.QA_Y ? Number(process.env.QA_Y) : null,
});
const frames = [];
try {
  await b.goto(PREVIEW + seq.path);
  await b.sleep(9000);                         // loaded, intro over, warm

  let at = { x: 1240, y: 60 };
  const helpers = {
    async moveTo(x, y, steps = 8) {
      for (let i = 1; i <= steps; i++) {
        await b.send('Input.dispatchMouseEvent', { type: 'mouseMoved',
          x: Math.round(at.x + (x - at.x) * i / steps), y: Math.round(at.y + (y - at.y) * i / steps) });
        await b.sleep(10);
      }
      at = { x, y };
    },
    async hover(m) {
      const p = await b.box(`.modes__rail [data-mode="${m}"]`);
      if (p) await helpers.moveTo(p.x, p.y);
    },
    away: () => helpers.moveTo(1240, 60),
    async click(sel) { await b.click(sel); },
    drag: (sel, dx, dy) => b.drag(sel, dx, dy),
  };

  const off = b.on(async (m) => {
    if (m.method !== 'Page.screencastFrame') return;
    frames.push({ t: m.params.metadata.timestamp * 1000, data: m.params.data });
    b.send('Page.screencastFrameAck', { sessionId: m.params.sessionId }).catch(() => {});
  });
  /* 960 px wide is more than the player needs and far more than the
     difference analysis does (it works at 240). At full width these
     five recordings came to 428 MB on the author's disk for no gain. */
  await b.send('Page.startScreencast', { format: 'jpeg', quality: 58, maxWidth: 960, everyNthFrame: 1 });
  await seq.run(b, helpers);
  await b.send('Page.stopScreencast');
  await b.sleep(400);
  off();

  /* ---- pixel difference, computed in the same browser ---- */
  console.log(`captured ${frames.length} frames — differencing…`);
  await b.goto('about:blank', 300);
  await b.eval(`
    window.__prev = null; window.__d = [];
    window.__cv = document.createElement('canvas');
    window.__ctx = __cv.getContext('2d', { willReadFrequently: true });
    window.__diff = async (b64) => {
      const bm = await createImageBitmap(await (await fetch('data:image/jpeg;base64,' + b64)).blob());
      const W = 240, H = Math.max(1, Math.round(bm.height / bm.width * 240));
      __cv.width = W; __cv.height = H;
      __ctx.drawImage(bm, 0, 0, W, H);
      const cur = __ctx.getImageData(0, 0, W, H).data;
      let d = 0;
      if (__prev) { for (let i = 0; i < cur.length; i += 4) d += Math.abs(cur[i] - __prev[i]); d /= (cur.length / 4); }
      __prev = cur.slice();
      bm.close();
      return +d.toFixed(4);
    };
  `);
  const diffs = [];
  for (const f of frames) diffs.push(await b.eval(`__diff(${JSON.stringify(f.data)})`));

  /* ---- write it out ---- */
  rmSync(DIR, { recursive: true, force: true });
  mkdirSync(DIR, { recursive: true });
  const t0 = frames[0]?.t ?? 0;
  const meta = frames.map((f, i) => ({
    i, t: +(f.t - t0).toFixed(1),
    dt: i ? +(f.t - frames[i - 1].t).toFixed(1) : 0,
    diff: diffs[i] ?? 0,
  }));
  writeFileSync(`${DIR}/frames.json`, JSON.stringify({ name: NAME, ...seq, title: seq.title, note: seq.note, meta }, null, 2));
  writeFileSync(`${DIR}/frames.b64.json`, JSON.stringify(frames.map((f) => f.data)));

  /* ---- the reading: see tools/perf/analyse-rec.mjs ---- */
  const report = { title: seq.title, ...analyse(meta) };

  writeFileSync(`${DIR}/analysis.json`, JSON.stringify(report, null, 2));
  writeFileSync(`${DIR}/index.html`, player(seq, meta, report));
  console.log(JSON.stringify(report, null, 2));
} finally {
  await b.close();
}
