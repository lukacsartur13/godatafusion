import gsap from 'gsap';
import { store } from '../core/store.js';
import { env } from '../core/env.js';

const READINGS = {
  idle:     { status: 'STANDBY',    points: 1842760, process: 97.2 },
  capture:  { status: 'CAPTURING',  points: 2214088, process: 99.1 },
  measure:  { status: 'SLICING',    points: 1842760, process: 94.6 },
  quantify: { status: 'EXTRACTING', points: 968412,  process: 98.4 },
};

const huNum = (n) => Math.round(n).toLocaleString('hu-HU').replace(/ /g, ' ');

export function initTelemetry() {
  const elStatus = document.getElementById('tScan');
  const elPoints = document.getElementById('tPoints');
  const elProcess = document.getElementById('tProcess');
  if (!elPoints) return { boot: () => {} };

  const val = { points: 0, process: 0 };
  /* ------------------------------------------------------------------
     PHASE 8.2 — THE COUNTERS DO NOT NEED SIXTY WRITES A SECOND.

     `paint` ran on every GSAP tick, so a mode change rewrote two text
     nodes 60 times over 0,85 s. Each write invalidates and re-lays-out
     the line it is on, in the same frames the scene is trying to hold —
     for a readout whose whole purpose is to look like an instrument
     ticking. 12 Hz is faster than the eye resolves digits changing and
     it is a fifth of the DOM work. The final value is always written,
     so the number that comes to rest is exact.
     ------------------------------------------------------------------ */
  const TICK_MS = 1000 / 12;
  let lastPaint = -1e9;
  const write = () => {
    elPoints.textContent = huNum(val.points);
    elProcess.textContent = `${val.process.toFixed(1)}%`;
  };
  const paint = () => {
    const now = performance.now();
    if (now - lastPaint < TICK_MS) return;
    lastPaint = now;
    write();
  };

  const to = (id, duration) => {
    const r = READINGS[id || 'idle'];
    elStatus.textContent = r.status;
    gsap.to(val, {
      points: r.points, process: r.process,
      duration: env.reducedMotion ? 0 : duration,
      ease: 'power2.out', overwrite: true, onUpdate: paint, onComplete: write,
    });
    if (env.reducedMotion) { val.points = r.points; val.process = r.process; write(); }
  };

  let booted = false;
  store.subscribe((id) => { if (booted) to(id, 0.85); });

  return {
    boot() { booted = true; to(store.active, 1.6); },
  };
}
