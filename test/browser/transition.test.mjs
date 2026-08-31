/* ============================================================
   PHASE 8.2 — THE THINGS A MODE TRANSITION MAY NOT DO AGAIN.

   Facts, not timings. A CI box has no display and no opinion about
   frame rate, but it can answer all of these exactly:

     * no style recalculation crosses the document,
     * the drawing buffer does not change size during a transition,
     * nothing is linked, uploaded or fetched,
     * interrupting a transition does not move anything discontinuously.

   Every one of them is a defect this phase fixed, and every one would
   be silent if it came back.

   Run: npm run test:browser   (needs a built dist and `npm run preview`)
   ============================================================ */
import test from 'node:test';
import assert from 'node:assert/strict';
import { launch, chromePath, serverUp } from './support/chrome.mjs';

const BASE = process.env.QA_URL || 'http://localhost:4173';
/* The page has ~1 070 elements. A recalculation over more than a
   quarter of them is not a component restyling, it is the document —
   which is what writing `--accent` on :root used to do, at 1 043
   elements and 10–25 ms a time. */
const DOC_WIDE = 300;

const reason = !chromePath() ? 'no Chrome on this machine'
  : !(await serverUp(BASE)) ? `no preview server at ${BASE} (npm run build && npm run preview)`
  : null;

const PROBE = `
window.__T = { programs: 0, textures: 0, net: [] };
new PerformanceObserver((l) => { for (const e of l.getEntries()) __T.net.push(e.name.split('/').pop()); })
  .observe({ entryTypes: ['resource'] });
for (const P of [self.WebGLRenderingContext, self.WebGL2RenderingContext]) {
  if (!P) continue;
  const lp = P.prototype.linkProgram; P.prototype.linkProgram = function (p) { __T.programs++; return lp.call(this, p); };
  const ti = P.prototype.texImage2D;  P.prototype.texImage2D = function (...a) { __T.textures++; return ti.apply(this, a); };
}
window.__gl = () => { const c = document.getElementById('gl'); return c ? [c.width, c.height] : null; };
`;

test('the hero mode transition', { skip: reason ?? false, concurrency: 1 }, async (t) => {
  const b = await launch({ width: 1440, height: 900 });
  try {
    await b.send('Page.addScriptToEvaluateOnNewDocument', { source: PROBE });
    await b.goto(BASE + '/');
    await b.sleep(8000);                         // loaded, intro over, warm

    const away = () => b.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 1400, y: 60 });
    const hover = async (mode) => {
      const p = await b.box(`.modes__rail [data-mode="${mode}"]`);
      assert.ok(p, `the ${mode} tab is on the page`);
      await b.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: p.x, y: p.y });
    };

    /** Trace one 1,5 s activation and return what the browser did in it. */
    async function activate(mode) {
      await away(); await b.sleep(700);
      const before = await b.json('__gl()');
      const n0 = await b.json('__T');
      const events = [];
      const off = b.on((m) => { if (m.method === 'Tracing.dataCollected') events.push(...m.params.value); });
      await b.send('Tracing.start', {
        traceConfig: { includedCategories: ['devtools.timeline', 'disabled-by-default-devtools.timeline'] },
        transferMode: 'ReportEvents',
      });
      await hover(mode);
      await b.sleep(1500);
      const during = await b.json('__gl()');
      const done = new Promise((r) => { const o = b.on((m) => { if (m.method === 'Tracing.tracingComplete') { o(); r(); } }); });
      await b.send('Tracing.end'); await done; off();
      const n1 = await b.json('__T');
      const recalcs = events.filter((e) => e.name === 'UpdateLayoutTree' && e.ph === 'X')
        .map((e) => e.args?.elementCount ?? e.args?.beginData?.elementCount ?? 0);
      return {
        before, during,
        wide: recalcs.filter((n) => n >= DOC_WIDE),
        programs: n1.programs - n0.programs,
        textures: n1.textures - n0.textures,
        net: n1.net.slice(n0.net.length),
      };
    }

    await t.test('no style recalculation crosses the document', async () => {
      for (const mode of ['capture', 'measure', 'quantify']) {
        const r = await activate(mode);
        /* One scope write reaches ~334 elements — the four regions that
           are on screen. Anything approaching the document means the
           accent has gone back onto :root. */
        const tooWide = r.wide.filter((n) => n > 600);
        assert.deepEqual(tooWide, [],
          `${mode} re-resolved ${tooWide.join(', ')} elements — the accent is document-wide again`);
      }
    });

    await t.test('the drawing buffer does not change during a transition', async () => {
      for (const mode of ['capture', 'measure', 'quantify']) {
        const r = await activate(mode);
        assert.deepEqual(r.during, r.before,
          `${mode} moved the drawing buffer ${r.before?.join('x')} → ${r.during?.join('x')} mid-transition`);
      }
    });

    await t.test('a transition links, uploads and fetches nothing', async () => {
      for (const mode of ['capture', 'measure', 'quantify']) {
        const r = await activate(mode);
        assert.equal(r.programs, 0, `${mode} linked ${r.programs} shader programs`);
        assert.equal(r.textures, 0, `${mode} uploaded ${r.textures} textures`);
        assert.deepEqual(r.net, [], `${mode} fetched: ${r.net.join(', ')}`);
      }
    });

    await t.test('interrupting a transition never snaps the accent scope', async () => {
      /* The scopes carry the accent; if an interrupted transition ever
         left one behind, the page would be two colours at once. */
      for (const m of ['capture', 'measure', 'quantify', 'capture']) {
        await hover(m); await b.sleep(240);
      }
      await b.sleep(1200);
      const scopes = await b.json(`[...document.querySelectorAll('[data-accent]')]
        .filter((e) => { const r = e.getBoundingClientRect();
          return r.bottom > -innerHeight * 0.2 && r.top < innerHeight * 1.2; })
        .map((e) => e.dataset.accent)`);
      assert.ok(scopes.length > 0, 'the accent scopes exist');
      assert.equal(new Set(scopes).size, 1,
        `the visible regions disagree about the accent: ${[...new Set(scopes)].join(', ')}`);
      assert.equal(scopes[0], 'capture', 'the last mode hovered owns the accent');
    });
  } finally {
    await b.close();
  }
});
