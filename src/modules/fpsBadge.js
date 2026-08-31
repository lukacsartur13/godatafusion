/* ============================================================
   THE FRAME BADGE — a QA instrument for browsers we cannot drive.

   PHASE 8.3 · Part 01/24. Safari will not accept WebDriver or Apple
   Events unless the reader turns on two settings in Safari ▸ Settings ▸
   Developer, and this phase is explicit that we do not silently change
   a person's settings. So the page measures ITSELF instead, and prints
   the answer where anyone can read it: open any route with `?fps` and a
   small panel appears in the corner.

   It reports the two numbers that decide whether a page feels smooth:

     SERVED     frames the browser actually delivered, per second
     ON TIME    what share of them arrived within one BEST FRAME of the
                last — the histogram underneath is the same thing, spelled
                out

   The second is the one that matters. 90 fps made of alternating 8 ms
   and 25 ms gaps looks worse than a flat 60, and an average hides
   exactly that. The best frame is read off the machine, so the same
   panel is correct on a 60 Hz laptop and on a 120 Hz monitor without
   being told which it is on.

   It is loaded by a dynamic import behind the flag, so a real visitor
   never downloads a byte of it. Nothing here touches the scene: it is
   one more rAF subscriber and one absolutely-positioned element outside
   the stage's stacking context.
   ============================================================ */

const BARS = 6;                 // 1..6 best-frame intervals, then "worse"
const WINDOW = 900;             // frames kept — about 8 s at 120 Hz

export function mountFpsBadge() {
  const el = document.createElement('div');
  el.id = 'gdfFps';
  el.setAttribute('aria-hidden', 'true');
  el.style.cssText = [
    'position:fixed', 'z-index:2147483647', 'left:12px', 'bottom:12px',
    'padding:10px 12px', 'background:#04070a', 'color:#f1f0eb',
    'border:1px solid #2a3134', 'font:11px/1.45 ui-monospace,SFMono-Regular,Menlo,monospace',
    'letter-spacing:.06em', 'white-space:pre', 'pointer-events:none',
    'min-width:250px', 'text-align:left',
  ].join(';');
  document.body.appendChild(el);

  const dt = [];
  let last = 0;
  let paintedAt = 0;
  /* Frames rendered by the WebGL scene, counted at the GL call, so a page
     whose rAF is healthy but whose renderer is skipping cannot read as
     smooth. Patching the prototype is safe here: this module only exists
     when the flag is on. */
  let draws = 0;
  const proto = window.WebGL2RenderingContext?.prototype;
  if (proto && !proto.__gdfFpsPatched) {
    const clear = proto.clear;
    proto.clear = function patched(...a) { draws += 1; return clear.apply(this, a); };
    proto.__gdfFpsPatched = true;
  }
  let drawsAt = 0;
  let drawRate = 0;

  const pct = (a, p) => a[Math.min(a.length - 1, Math.floor(a.length * p))];

  function paint(now) {
    const sorted = dt.slice().sort((a, b) => a - b);
    /* The BEST FRAME this machine managed — the 25th percentile of recent
       deltas — is the unit everything else is measured in. The 10th ran
       half a millisecond under a 120 Hz panel's real interval, which was
       enough to bin 2% of perfectly on-time frames as late; the 25th is
       still inside the fast cluster even when half the frames are being
       dropped, which is the case this has to survive. The panel
       deliberately does not name a refresh rate: rAF timestamps jitter a
       few tenths low, which is enough to make a 120 Hz monitor look like a
       144 Hz one, and a wrong label would make every honest frame read as
       late. What the reader needs is the SHAPE, and the shape does not
       need the display's datasheet. */
    const best = Math.min(24, Math.max(3.9, pct(sorted, 0.25)));
    const bins = new Array(BARS + 1).fill(0);
    /* 1,5x rather than 2x: a frame served 1,6 best-frames late has missed
       one, whatever the rounding says. */
    for (const v of dt) bins[Math.min(BARS, Math.max(1, Math.ceil(v / best / 1.5))) - 1] += 1;

    const rate = dt.length / (dt.reduce((s, v) => s + v, 0) / 1000);
    const onTime = (bins[0] / dt.length) * 100;
    const rows = bins.map((n, i) => {
      const share = (n / dt.length) * 100;
      const name = i === BARS ? `${BARS}+` : String(i + 1);
      return `  ${name} x  ${(best * (i + 1)).toFixed(1).padStart(5)} ms `
        + `${String(Math.round(share)).padStart(3)}% ` + '█'.repeat(Math.round(share / 4));
    }).filter((_, i) => bins[i] > 0).join('\n');

    el.textContent = [
      `GODATAFUSION — FRAME BADGE`,
      `served     ${rate.toFixed(1)} fps`,
      `rendered   ${drawRate.toFixed(1)} fps  (WebGL)`,
      `best frame ${best.toFixed(1)} ms`,
      `on time    ${onTime.toFixed(1)} %   <- this is the one that matters`,
      `p50 ${pct(sorted, 0.5).toFixed(1)}  p90 ${pct(sorted, 0.9).toFixed(1)}  `
        + `p95 ${pct(sorted, 0.95).toFixed(1)}  max ${sorted[sorted.length - 1].toFixed(1)} ms`,
      `spacing    (${dt.length} frames)`,
      rows,
    ].join('\n');
    paintedAt = now;
  }

  function tick(now) {
    requestAnimationFrame(tick);
    if (last) {
      dt.push(now - last);
      if (dt.length > WINDOW) dt.shift();
    }
    last = now;
    if (!drawsAt) { drawsAt = now; draws = 0; }
    else if (now - drawsAt >= 1000) {
      drawRate = (draws / (now - drawsAt)) * 1000;
      draws = 0; drawsAt = now;
    }
    // Four updates a second: the panel must not become the thing it measures.
    if (dt.length > 30 && now - paintedAt > 250) paint(now);
  }
  requestAnimationFrame(tick);
}
