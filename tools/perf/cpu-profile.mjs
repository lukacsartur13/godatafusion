/* Where the transition's JavaScript actually goes. CDP CPU profile over a
   sequence of mode switches, aggregated bottom-up by self time. */
import { launch, chromePath, serverUp } from '../../test/browser/support/chrome.mjs';
const BASE = process.argv[2] || 'http://localhost:4173';
if (!chromePath() || !(await serverUp(BASE))) { console.error('need Chrome + server'); process.exit(2); }
const b = await launch({ width: 1440, height: 900 });
try {
  await b.goto(BASE + '/');
  await b.sleep(8000);
  const hover = async (m) => {
    const p = await b.box(`.modes__rail [data-mode="${m}"]`);
    await b.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: p.x, y: p.y });
  };
  const away = () => b.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 1400, y: 60 });
  await b.send('Profiler.enable');
  await b.send('Profiler.setSamplingInterval', { interval: 100 });
  await b.send('Profiler.start');
  for (const m of ['capture', 'measure', 'quantify', 'capture', 'measure', 'quantify']) {
    await away(); await b.sleep(500);
    await hover(m); await b.sleep(1500);
  }
  const { profile } = await b.send('Profiler.stop');
  const byId = new Map(profile.nodes.map((n) => [n.id, n]));
  const self = new Map();
  const total = profile.timeDeltas.reduce((a, d) => a + Math.max(0, d), 0) / 1000;
  for (let i = 0; i < profile.samples.length; i++) {
    const n = byId.get(profile.samples[i]);
    const dt = Math.max(0, profile.timeDeltas[i] || 0) / 1000;
    const f = n.callFrame;
    const key = `${f.functionName || '(anon)'}  ${(f.url || '').split('/').pop()}:${f.lineNumber + 1}`;
    self.set(key, (self.get(key) || 0) + dt);
  }
  const rows = [...self.entries()].sort((a, b2) => b2[1] - a[1]).slice(0, 30);
  console.log(`total sampled ${total.toFixed(0)} ms over ${profile.samples.length} samples\n`);
  for (const [k, v] of rows) console.log(`${v.toFixed(1).padStart(8)} ms  ${(100 * v / total).toFixed(1).padStart(5)}%  ${k}`);
} finally { await b.close(); }
