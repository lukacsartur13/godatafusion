/* A minimal headless-Chrome driver for the browser regression tests.
   Zero dependencies — Node's global WebSocket and fetch only.

   The unit suite (`npm test`) does not need a browser. These tests do, so
   they SKIP rather than fail when Chrome or the preview server is missing:
   a machine without either should not turn red, it should say so. */
import { spawn } from 'node:child_process';

const CANDIDATES = [
  process.env.CHROME_PATH,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
].filter(Boolean);

import { existsSync } from 'node:fs';

export const chromePath = () => CANDIDATES.find((p) => existsSync(p)) || null;

export async function serverUp(base) {
  try {
    const r = await fetch(base, { signal: AbortSignal.timeout(2500) });
    return r.ok;
  } catch { return false; }
}

let seq = 0;

/**
 * @param {object} [o]
 * @param {boolean} [o.headful] Run a REAL window on the machine's display.
 *   Headless Chrome has no vsync and no swapchain — it paces rAF off a
 *   software BeginFrame source and copies every frame out — so its frame
 *   deltas describe the harness, not the site. Anything that is a claim
 *   about FRAME PACING has to be measured here.
 */
export async function launch({ width = 1440, height = 900, mobile = false, headful = false, x = null, y = null } = {}) {
  const bin = chromePath();
  if (!bin) throw new Error('no Chrome');
  const port = 9733 + ((process.pid + (seq += 1)) % 400);
  const proc = spawn(bin, [
    ...(headful ? [] : ['--headless=new']),
    '--hide-scrollbars', '--mute-audio', '--no-first-run',
    '--no-default-browser-check', '--disable-features=Translate,MediaRouter',
    `--remote-debugging-port=${port}`, `--window-size=${width},${height}`,
    ...(x === null ? [] : [`--window-position=${x},${y ?? 0}`]),
    `--user-data-dir=/tmp/gdf-test-${port}`,
    '--use-gl=angle', '--use-angle=metal', '--enable-unsafe-swiftshader',
    'about:blank',
  ], { stdio: 'ignore' });

  let target = null;
  for (let i = 0; i < 80 && !target; i++) {
    await new Promise((r) => setTimeout(r, 250));
    try {
      const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
      target = list.find((t) => t.type === 'page');
    } catch { /* not up yet */ }
  }
  if (!target) { proc.kill(); throw new Error('Chrome did not expose a page target'); }

  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });

  let id = 0;
  const pending = new Map();
  const consoleErrors = [];
  /* Subscribers for raw CDP events. The perf tooling needs Tracing.*, which
     is a stream rather than a request/response — everything else here is
     request/response and does not care. */
  let subs = [];
  ws.onmessage = (ev) => {
    const m = JSON.parse(ev.data);
    if (m.id && pending.has(m.id)) {
      const { res, rej } = pending.get(m.id);
      pending.delete(m.id);
      m.error ? rej(new Error(JSON.stringify(m.error))) : res(m.result);
    }
    if (m.method) for (const s of subs) s(m);
    if (m.method === 'Log.entryAdded' && m.params.entry.level === 'error') consoleErrors.push(m.params.entry.text);
    if (m.method === 'Runtime.exceptionThrown') consoleErrors.push(m.params.exceptionDetails.text);
  };
  const send = (method, params = {}) => new Promise((res, rej) => {
    const n = ++id;
    pending.set(n, { res, rej });
    ws.send(JSON.stringify({ id: n, method, params }));
  });

  await send('Page.enable');
  await send('Runtime.enable');
  await send('Log.enable').catch(() => {});
  if (!headful) {
    await send('Emulation.setDeviceMetricsOverride', {
      width, height, deviceScaleFactor: mobile ? 3 : 2, mobile,
      screenWidth: width, screenHeight: height,
    });
  }
  if (mobile) await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  const api = {
    send, consoleErrors, sleep,
    /** Subscribe to raw CDP events. Returns an unsubscribe function. */
    on(fn) { subs.push(fn); return () => { subs = subs.filter((s) => s !== fn); }; },
    async goto(url, settle = 2600) { await send('Page.navigate', { url }); await sleep(settle); },
    async eval(expression) {
      const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
      if (r.exceptionDetails) throw new Error(r.exceptionDetails.text);
      return r.result.value;
    },
    async json(expression) { return JSON.parse(await api.eval(`JSON.stringify(${expression})`)); },
    /** Centre of the first element matching `sel`, or null if it has no box. */
    async box(sel) {
      return api.json(`(()=>{const e=document.querySelector(${JSON.stringify(sel)});
        if(!e) return null; const r=e.getBoundingClientRect();
        return r.width&&r.height?{x:Math.round(r.x+r.width/2),y:Math.round(r.y+r.height/2)}:null;})()`);
    },
    async click(sel) {
      const p = await api.box(sel);
      if (!p) return false;
      await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: p.x, y: p.y, button: 'left', clickCount: 1, buttons: 1 });
      await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: p.x, y: p.y, button: 'left', clickCount: 1, buttons: 0 });
      await sleep(220);
      return true;
    },
    async wheel(sel, deltaY = 120, times = 1) {
      const p = await api.box(sel);
      for (let i = 0; i < times; i++) {
        await send('Input.dispatchMouseEvent', { type: 'mouseWheel', x: p.x, y: p.y, deltaX: 0, deltaY, pointerType: 'mouse' });
        await sleep(20);
      }
      await sleep(200);
    },
    async drag(sel, dx = -180, dy = 30) {
      const p = await api.box(sel);
      await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: p.x, y: p.y, button: 'left', clickCount: 1, buttons: 1 });
      for (let i = 1; i <= 8; i++) {
        await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: p.x + (dx * i) / 8, y: p.y + (dy * i) / 8, button: 'left', buttons: 1 });
      }
      await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: p.x + dx, y: p.y + dy, button: 'left', buttons: 0 });
      await sleep(120);
    },
    async key(key, code = key, vk = 0) {
      await send('Input.dispatchKeyEvent', { type: 'keyDown', key, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk });
      await send('Input.dispatchKeyEvent', { type: 'keyUp', key, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk });
      await sleep(140);
    },
    /* PHASE 8.3 — reap the whole process GROUP, not just the parent.
       Chrome's renderer and GPU helpers do not carry the launch flags, so
       a `proc.kill()` that misses — a crashed run, an interrupted sweep —
       leaves a headless browser rendering the site forever. Eighty-four of
       them accumulated across Phases 8.1 and 8.2 and were sharing this
       GPU with every measurement either phase took. SIGKILL after a grace
       period, because a browser that ignored SIGTERM will ignore it
       again. */
    async close() {
      try { ws.close(); } catch { /* already gone */ }
      try { proc.kill('SIGTERM'); } catch { /* already gone */ }
      await new Promise((r) => setTimeout(r, 250));
      try { if (proc.exitCode === null) proc.kill('SIGKILL'); } catch { /* gone */ }
    },
  };
  return api;
}
