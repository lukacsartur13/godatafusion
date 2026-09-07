import {
  levelFeatures, buildingQuantities, DOOR_TYPES, WINDOW_TYPES, FINISHES,
  finishOf, levelById, elevationLabel,
} from '../webgl/levels.js';
import { CAPTURE_ROUND, roundRooms, stationsByLevel, totalStations } from '../webgl/stations.js';
import { REF_UID } from '../webgl/reference.js';
import { SITE, heightAt } from '../webgl/field.js';
import { metrics, cutFillAt, SCALE, fmt } from '../data/terrain-metrics.js';

/* ============================================================
   THE EXAMPLES — PHASE 12

   "Show what the client gets." Every example on the site is DERIVED
   from the demonstration project the canvas already renders: the
   building in webgl/levels.js and the parcel in webgl/field.js. Nothing
   here is typed in, and nothing here needs WebGL — this module imports
   no three.js, so the tables, the floor plan and the contour figure are
   on the page on every device, including the ones that never fetch the
   renderer.

     [data-q="…"]            a single derived figure, written as text
     [data-xls="…"] tbody    an Excel-shaped schedule, rows written here
     [data-plan-ex]          the floor plan with the capture round on it
     [data-terrain-ex]       the parcel as contour lines with a cut level

   When the first real project arrives, the same hooks take real data:
   DEMO-TO-REAL.md names the seam for each.
   ============================================================ */

const m2 = (v) => `${fmt(v, 1)} m²`;
const NS = 'http://www.w3.org/2000/svg';
const svgEl = (name, attrs = {}, text) => {
  const n = document.createElementNS(NS, name);
  for (const k in attrs) n.setAttribute(k, attrs[k]);
  if (text != null) n.textContent = text;
  return n;
};
const td = (text, cls) => {
  const c = document.createElement('td');
  if (cls) c.className = cls;
  c.textContent = text;
  return c;
};

/* ---------------------------------------------------------------- figures */
export function figures() {
  const Q = buildingQuantities();
  const M = metrics();
  const L0 = levelFeatures('L00');
  const cf = cutFillAt(0.5);
  const v = {
    doors: `${Q.total.doors} db`,
    windows: `${Q.total.windows} db`,
    rooms: `${Q.total.rooms}`,
    levels: `${Q.total.levels}`,
    area: m2(Q.total.area),
    height: `+${fmt(Q.total.height, 2)} m`,
    openings: `${Q.total.doors + Q.total.windows} db`,
    stations: `${totalStations()}`,
    stationsIn: `${CAPTURE_ROUND.length}`,
    stationsByFloor: stationsByLevel().map((l) => String(l.count).padStart(2, '0')).join(' · '),
    summary: `${Q.total.doors} AJTÓ · ${Q.total.windows} ABLAK · `
      + `${Q.total.rooms} HELYISÉG · ${Q.total.levels} SZINT · ${m2(Q.total.area)}`,
    l00rooms: `${L0.rooms.length}`,
    l00area: m2(L0.area),
    l00doors: `${L0.doors.length} db`,
    l00windows: `${L0.windows.length} db`,
    /* terrain */
    tArea: M.areaText,
    tRelief: M.reliefText,
    tInterval: M.intervalText,
    tLines: `${M.lines}`,
    tCut: `${fmt(cf.cut, 1)} m³`,
    tFill: `${fmt(cf.fill, 1)} m³`,
    tPerimeter: M.perimeterText,
    tMin: M.minText,
    tMax: M.maxText,
  };
  /* finish areas over the whole building — the PADLÓBURKOLAT total */
  const fin = {};
  for (const l of Q.levels) for (const k in l.finishes) fin[k] = Math.round(((fin[k] || 0) + l.finishes[k]) * 10) / 10;
  v.finishF2 = m2(fin.F2 || 0);
  v.finishF3 = m2(fin.F3 || 0);
  v.finishAll = m2(Object.entries(fin).filter(([k]) => k !== 'F0').reduce((s, [, a]) => s + a, 0));
  return { v, Q, M, fin };
}

export function fillFigures(root = document) {
  const { v } = figures();
  for (const el of root.querySelectorAll('[data-q]')) {
    const k = el.dataset.q;
    if (v[k] !== undefined) el.textContent = v[k];
  }
  return v;
}

/* ---------------------------------------------------------------- sheets */
function fillSheets(root) {
  const { Q, fin } = figures();
  const L0 = levelFeatures('L00');

  /* KONSZIGNÁCIÓ — nyílászárók típusonként, az egész épületre */
  for (const body of root.querySelectorAll('tbody[data-xls="konszignacio"]')) {
    body.textContent = '';
    let n = 1;
    const row = (id, t, kind, count) => {
      const tr = document.createElement('tr');
      const th = document.createElement('th'); th.scope = 'row'; th.textContent = String(n++);
      tr.append(th, td(id, 'k'), td(t.label), td(kind),
        td(t.w ? `${fmt(t.w, 2)} m` : '', 'n'),
        td(t.h ? `${fmt(t.h, 2)} m` : (t.full ? 'teljes' : 'mellvédes'), 'n'),
        td(String(count), 'n'));
      body.append(tr);
    };
    for (const [id, t] of Object.entries(DOOR_TYPES)) row(id, t, 'Ajtó', Q.total.doorTypes[id]);
    for (const [id, t] of Object.entries(WINDOW_TYPES)) row(id, t, 'Ablak', Q.total.windowTypes[id]);
    const foot = body.parentElement?.querySelector('tfoot [data-xls-total]');
    if (foot) foot.textContent = String(Q.total.doors + Q.total.windows);
  }

  /* HELYISÉGKÖNYV — a földszint helyiségei */
  for (const body of root.querySelectorAll('tbody[data-xls="helyisegkonyv"]')) {
    body.textContent = '';
    const doorsOf = (r) => L0.doors.filter((d) => d.room === r.id).length;
    const winsOf = (r) => L0.windows.filter((w) => w.room === r.id).length;
    L0.rooms.forEach((r, i) => {
      const tr = document.createElement('tr');
      const th = document.createElement('th'); th.scope = 'row'; th.textContent = String(i + 1);
      tr.append(th, td(r.uid, 'k'), td(r.label),
        td(m2(r.area), 'n'), td(String(doorsOf(r)), 'n'), td(String(winsOf(r)), 'n'),
        td(FINISHES[finishOf(r)].label));
      body.append(tr);
    });
    const foot = body.parentElement?.querySelector('tfoot [data-xls-total]');
    if (foot) foot.textContent = m2(L0.area);
  }

  /* PADLÓBURKOLAT — burkolattípusonként, szintenként és összesen */
  for (const body of root.querySelectorAll('tbody[data-xls="padloburkolat"]')) {
    body.textContent = '';
    let n = 1;
    for (const [k, f] of Object.entries(FINISHES)) {
      if (k === 'F0') continue;
      const tr = document.createElement('tr');
      const th = document.createElement('th'); th.scope = 'row'; th.textContent = String(n++);
      tr.append(th, td(k, 'k'), td(f.label));
      for (const l of Q.levels) tr.append(td(l.finishes[k] ? m2(l.finishes[k]) : '–', 'n'));
      tr.append(td(m2(fin[k] || 0), 'n'));
      body.append(tr);
    }
    const foot = body.parentElement?.querySelector('tfoot [data-xls-total]');
    if (foot) foot.textContent = m2(Object.entries(fin).filter(([k]) => k !== 'F0').reduce((s, [, a]) => s + a, 0));
  }
}

/* ------------------------------------------------------------ floor plan */
/**
 * The CAPTURE example: one storey of the demonstration building with the
 * capture round standing in it. Rooms from levelFeatures(), stations from
 * the round — the same two sources the 360 viewer's own map reads.
 */
function drawPlan(fig) {
  const levelId = fig.dataset.planEx || 'L00';
  const F = levelFeatures(levelId);
  const lv = F.level;
  const PAD = 0.45;
  const x0 = lv.x0 - PAD, z0 = lv.z0 - PAD;
  const w = (lv.x1 - lv.x0) + PAD * 2, h = (lv.z1 - lv.z0) + PAD * 2;
  const S = 100;   // plan units → svg units, so text sizes are sane

  const svg = svgEl('svg', {
    viewBox: `0 0 ${(w * S).toFixed(1)} ${(h * S).toFixed(1)}`,
    role: 'img',
    'aria-label': `Alaprajz felvételi pontokkal — ${levelId} ${levelById(levelId).label}, demonstrációs épület`,
  });
  const X = (x) => ((x - x0) * S).toFixed(1);
  const Z = (z) => ((z - z0) * S).toFixed(1);

  const rooms = svgEl('g');
  for (const r of F.rooms) {
    rooms.append(svgEl('rect', {
      x: X(r.x0), y: Z(r.z0), width: ((r.x1 - r.x0) * S).toFixed(1), height: ((r.z1 - r.z0) * S).toFixed(1),
      class: r.uid === REF_UID ? 'pe-room pe-room--ref' : 'pe-room',
    }));
    rooms.append(svgEl('text', {
      x: (Number(X(r.x0)) + 7).toFixed(1), y: (Number(Z(r.z0)) + 16).toFixed(1), class: 'pe-name',
    }, `${r.id} · ${fmt(r.area, 0)} m²`));
  }
  svg.append(rooms);
  svg.append(svgEl('rect', {
    x: X(lv.x0), y: Z(lv.z0), width: ((lv.x1 - lv.x0) * S).toFixed(1), height: ((lv.z1 - lv.z0) * S).toFixed(1),
    class: 'pe-out',
  }));

  const stations = roundRooms()
    .map((s, i) => ({ ...s, n: i + 1 }))
    .filter((s) => s.level === levelId && s.room);
  if (stations.length > 1) {
    const d = stations.map((s, i) => `${i ? 'L' : 'M'}${X(s.room.x)},${Z(s.room.z)}`).join(' ');
    svg.append(svgEl('path', { d, class: 'pe-path' }));
  }
  for (const s of stations) {
    const g = svgEl('g');
    g.append(svgEl('circle', { cx: X(s.room.x), cy: Z(s.room.z), r: 6, class: 'pe-st' }));
    g.append(svgEl('text', {
      x: (Number(X(s.room.x)) + 10).toFixed(1), y: (Number(Z(s.room.z)) - 10).toFixed(1), class: 'pe-lbl',
    }, `CP-${String(s.n).padStart(2, '0')}`));
    g.append(svgEl('title', {}, `CP-${String(s.n).padStart(2, '0')} — ${s.room.label}`));
    svg.append(g);
  }

  fig.querySelector('svg')?.remove();
  fig.prepend(svg);

  const cap = fig.querySelector('[data-plan-cap]');
  if (cap) cap.textContent = `${levelId} · ${levelById(levelId).label} · ${elevationLabel(levelId)} · ${stations.length} felvételi pont · ${F.rooms.length} helyiség`;
}

/* --------------------------------------------------------------- terrain */
/**
 * The MEASURE example: the parcel's height field as contour lines, at the
 * interval terrain-metrics.js chose, with the cut level shaded. Marching
 * squares over the same heightAt() the canvas samples.
 */
function drawTerrain(fig) {
  const M = metrics();
  const N = 56;
  const half = SITE.size / 2;
  const step = SITE.size / N;
  const H = new Float32Array((N + 1) * (N + 1));
  let min = Infinity, max = -Infinity;
  for (let j = 0; j <= N; j++) {
    for (let i = 0; i <= N; i++) {
      const v = heightAt(-half + i * step, -half + j * step) * SCALE;   // metres
      H[j * (N + 1) + i] = v;
      if (v < min) min = v; if (v > max) max = v;
    }
  }
  const S = 10;   // svg units per cell
  const svg = svgEl('svg', {
    viewBox: `0 0 ${N * S} ${N * S}`, role: 'img',
    'aria-label': `Szintvonalrajz — demonstrációs parcella, ${M.intervalText} szintközzel, ${M.lines} vonal`,
  });

  const grid = svgEl('g');
  for (let k = 0; k <= N; k += 8) {
    grid.append(svgEl('path', { d: `M0,${k * S}H${N * S}M${k * S},0V${N * S}`, class: 'te-grid' }));
  }
  svg.append(grid);

  /* the cut level at the instrument's default — the same integration the
     page's readout quotes */
  const cf = cutFillAt(0.5);
  const cutLevel = cf.level;
  const cut = svgEl('g');
  for (let j = 0; j < N; j++) {
    for (let i = 0; i < N; i++) {
      const a = H[j * (N + 1) + i], b = H[j * (N + 1) + i + 1];
      const c = H[(j + 1) * (N + 1) + i], d = H[(j + 1) * (N + 1) + i + 1];
      if ((a + b + c + d) / 4 > cutLevel) {
        cut.append(svgEl('rect', { x: i * S, y: j * S, width: S, height: S, class: 'te-cut' }));
      }
    }
  }
  svg.append(cut);

  /* contours — marching squares, one path per level */
  const iv = M.interval;
  const first = Math.ceil(min / iv) * iv;
  const lerp = (p, q, va, vb, lvl) => p + (q - p) * ((lvl - va) / (vb - va || 1e-9));
  let major = 0;
  for (let lvl = first; lvl < max; lvl += iv) {
    let d = '';
    for (let j = 0; j < N; j++) {
      for (let i = 0; i < N; i++) {
        const a = H[j * (N + 1) + i], b = H[j * (N + 1) + i + 1];
        const c = H[(j + 1) * (N + 1) + i + 1], e = H[(j + 1) * (N + 1) + i];
        const idx = (a >= lvl ? 8 : 0) | (b >= lvl ? 4 : 0) | (c >= lvl ? 2 : 0) | (e >= lvl ? 1 : 0);
        if (idx === 0 || idx === 15) continue;
        const x = i * S, y = j * S;
        const top = [lerp(x, x + S, a, b, lvl), y];
        const right = [x + S, lerp(y, y + S, b, c, lvl)];
        const bottom = [lerp(x, x + S, e, c, lvl), y + S];
        const left = [x, lerp(y, y + S, a, e, lvl)];
        const seg = (p, q) => { d += `M${p[0].toFixed(1)},${p[1].toFixed(1)}L${q[0].toFixed(1)},${q[1].toFixed(1)}`; };
        switch (idx) {
          case 1: case 14: seg(left, bottom); break;
          case 2: case 13: seg(bottom, right); break;
          case 3: case 12: seg(left, right); break;
          case 4: case 11: seg(top, right); break;
          case 5: seg(left, top); seg(bottom, right); break;
          case 6: case 9: seg(top, bottom); break;
          case 7: case 8: seg(left, top); break;
          case 10: seg(top, right); seg(left, bottom); break;
          default: break;
        }
      }
    }
    if (!d) continue;
    const isMajor = major % 5 === 0;
    svg.append(svgEl('path', { d, class: isMajor ? 'te-c te-c--major' : 'te-c' }));
    major++;
  }

  /* a datum line and two labels, so the figure reads as a drawing */
  svg.append(svgEl('path', { d: `M${S * 2},${N * S - S * 2}H${N * S - S * 2}`, class: 'te-line' }));
  svg.append(svgEl('text', { x: S * 2, y: N * S - S * 2 - 4, class: 'te-lbl' }, `SZINTKÖZ ${M.intervalText}`));
  svg.append(svgEl('text', { x: N * S - S * 2, y: N * S - S * 2 - 4, class: 'te-lbl', 'text-anchor': 'end' },
    `METSZÉS ${fmt(cutLevel, 2)} m`));

  fig.querySelector('svg')?.remove();
  fig.prepend(svg);
}

/* ---------------------------------------------------------------- init */
export function initExamples(root = document) {
  fillFigures(root);
  fillSheets(root);
  root.querySelectorAll('[data-plan-ex]').forEach(drawPlan);
  root.querySelectorAll('[data-terrain-ex]').forEach(drawTerrain);
}
