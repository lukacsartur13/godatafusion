import {
  PLAN, planFeatures, levelFeatures, buildingQuantities, LEVELS,
  LEVEL_IDS, levelById, FINISHES, elevationLabel,
  finishOf, SLAB_T, EXT_T, INT_T,
} from '../webgl/geometry.js';
import { REF_UID, REF_LEVEL, referenceFacts } from '../webgl/reference.js';
import { extractsFor } from '../webgl/annotations.js';
import { createStage } from './stage.js';
import { env } from '../core/env.js';

/* ============================================================
   /mennyisegszamitas/ — QUANTIFY

   The drawing never leaves the frame. What changes is how much of it has
   been read: DRAWING → IDENTIFY → STRUCTURE → QUANTITY.

   Every count on this page is counted from `planFeatures()` — the same
   function that generates the symbols the canvas draws. There is no
   table of typed-in numbers: if the plan gains a door, the readout gains
   a door. The values are demonstration values because the plan is a
   demonstration plan, and the page says so.
   ============================================================ */

const Q = buildingQuantities();
/* Four reading states plus the exploded axonometric. `qExploded` has no
   step of its own in the markup — it is reached only by choosing ÖSSZES on
   the floor selector, and choosing a floor again returns to whichever
   reading state the visitor had got to. */
const STATES = ['qDrawing', 'qIdentify', 'qStructure', 'qQuantity', 'qExploded'];

const num = (v) => String(v).padStart(2, '0');
const m2 = (v) => `${v.toFixed(1).replace('.', ',')} m²`;

/* The extraction sequence for the floor being read. Five recognitions, the
   same five on every sheet, each anchored to a symbol genuinely drawn at
   that coordinate on THAT level and quoting the real count of its type. */
const extractsOf = (level) => extractsFor(level);

/* All three summary callouts sit on the LEFT half of the drawing. The
   reading column and the extraction sheet own the right side of the frame,
   and a callout that lands under a table is a label nobody can read. */
const anchorsOf = (level) => {
  const F = levelFeatures(level);
  const y = F.rooms[0] ? PLAN.y : PLAN.y;
  return [
    { set: 'quantify', p: [-2.4, y + 0.06, -1.9], k: 'AJTÓ', v: `${F.doors.length} DB` },
    { set: 'quantify', p: [-3.0, y + 0.06, -0.2], k: 'ABLAK', v: `${F.windows.length} DB` },
    { set: 'quantify', p: [-2.0, y + 0.06, 1.9], k: 'HELYISÉG', v: `${F.rooms.length} DB` },
  ];
};

const anchors = anchorsOf('L00');
const extracts = extractsOf('L00');

/* ------------------------------------------------------------------
   PHASE 8 — the floor selector.

   Four choices, three of them a level and one of them the building. The
   scene does the work: `setLevel` isolates a storey, `setExplode` separates
   them, `parkScanAt` puts the scan plane at the selected elevation. This
   module only decides WHICH, and then re-fills a table that was counted, not
   typed.
   ------------------------------------------------------------------ */
let floor = 'L00';
let reading = 'qDrawing';
const noteReading = (name) => { if (name !== 'qExploded') reading = name; };
export async function init({ scanPlane } = {}) {
  /* `createStage` announces its initial state synchronously, so the handler
     cannot close over a `const` that is still in its temporal dead zone. */
  let stage = null;
  stage = await createStage({
    states: STATES,
    initial: 'qDrawing',
    /* The anchors are ours — their POSITIONS are a decision about which half
       of the frame the reading column owns. The extraction sequence is not:
       it is the same five recognitions on every sheet, re-derived by the
       annotation module whenever the floor selector moves, so it is left to
       build its own. */
    callouts: { anchors },
    onState: (name) => { noteReading(name); paintState(name, stage); },
  });
  if (!stage) return null;
  paintState(stage.state, stage);

  initFloors(stage);

  const panel = document.getElementById('analysis');
  if (panel) stage.bindSteps(panel, { side: -1 });
  stage.avoid(document.querySelector('.sv-hero__content'), { top: 120 });

  /* The OUTPUT block reads over the live drawing, so the drawing has to be
     on the other side of the frame from the rows for the whole of it. */
  stage.holdSide(document.querySelector('.sv-out--live'), -1,
    document.querySelector('.sv-out--live .out__col'));

  fillFloorTable();
  fillCounts();
  fillLayers();
  initReference(stage);
  initOutputs(stage);
  initSample(scanPlane);

  /* PHASE 9 Part 36 — arriving from the 360 viewer's VIEW IN PLAN link.
     `?room=L01-R07` selects that room's floor and parks the recognition
     bracket on the rectangle. Deliberate, addressable, and it is the same
     call the reference card makes when it is pressed. */
  const asked = new URLSearchParams(location.search).get('room');
  if (asked) requestAnimationFrame(() => showRoom(stage, asked.toUpperCase()));
  return stage;
}

/* ------------------------------------------------------------------
   PHASE 9 Parts 22 and 36 — THE REFERENCE ROOM AS STRUCTURED DATA.

   The last link in the chain the brief asks for: the room a visitor was
   standing in two pages ago, on the sheet it belongs to, quoting figures
   that are counted off the same rectangle the 360 station stands in and
   the plan draws. Nothing here is written down twice — `referenceFacts()`
   derives all of it from `levelFeatures()`.
   ------------------------------------------------------------------ */
let refCard = null;

function initReference(stage) {
  refCard = document.getElementById('qRef');
  if (!refCard) return;
  const R = referenceFacts();
  const room = levelFeatures(R.level).rooms.find((r) => r.uid === R.uid);
  set('qRefId', R.uid);
  set('qRefLabel', R.label);
  set('qRefArea', m2(R.area));
  set('qRefDoors', `${num(R.doors)} DB`);
  set('qRefWins', `${num(R.windows)} DB`);
  const f = finishOf(room);
  set('qRefFinish', `${f} — ${FINISHES[f].label}`);
  const back = document.getElementById('qRefToPano');
  if (back) back.href = `/360-camera/?room=${R.uid}`;

  /* Pressing the card reads the room. The link inside it navigates and must
     not also do this, so it takes itself out of the gesture. */
  refCard.addEventListener('click', (e) => {
    if (e.target.closest('a')) return;
    showRoom(stage, R.uid);
  });
  paintReference();
}

/** Visible on the floor it is on, and on the exploded view of all of them. */
function paintReference() {
  if (!refCard) return;
  refCard.hidden = !(floor === REF_LEVEL || floor === 'ALL');
}

/** Select a room's floor and park the bracket on it. */
function showRoom(stage, uid) {
  const lid = (uid || '').split('-')[0];
  if (!LEVEL_IDS.includes(lid)) return;
  const btn = document.querySelector(`[data-floor="${lid}"]`);
  if (btn && floor !== lid) btn.click();
  /* STATE FIRST, ROOM SECOND.
     `setState` fires `onState`, which repaints the recognition sequence —
     so focusing the room and then changing state threw the room's own label
     away and put the full five-step sequence back in its place. Two frames:
     one for the state, one for the room it is being entered to read. */
  requestAnimationFrame(() => {
    stage.setState('qStructure', { duration: 0.6 });
    requestAnimationFrame(() => {
      if (stage?.scene?.focusRoom?.(uid)) refCard?.classList.add('is-on');
    });
  });
}

/* ------------------------------------------------------------------
   PHASE 9 Part 21 — RÉTEGREND, WITHOUT INVENTING A LAYER.

   The brief is explicit: if the model does not contain genuine assembly
   data, say so and demonstrate rather than fabricate. This model holds
   exactly three real thicknesses — the structural slab, the external wall
   and the partition — and one real finish per room, derived from the
   room's programme. That is what is printed. There is no build-up table
   with an imagined vapour barrier in it anywhere in this project.
   ------------------------------------------------------------------ */
function fillLayers() {
  /* All three are already in METRES in the level table — EXT_T is derived
     from the double line the plan draws, which is why it is not a round
     number. Printing it converted twice was the first thing this readout
     did wrong. */
  const mm = (v) => `${Math.round(v * 1000)} mm`;
  set('qLayers', `vasbeton födém ${mm(SLAB_T)} · külső fal ${mm(EXT_T)}`
    + ` · válaszfal ${mm(INT_T)} · ${Object.keys(FINISHES).length} padlótípus`);
}

/** The three summary callouts, for the floor being read. */
function repaintAnchors(stage) {
  const isAll = floor === 'ALL';
  const F = levelFeatures(isAll ? 'L00' : floor);
  stage?.scene?.annotations?.setAnchorValues?.({
    'AJTÓ': `${isAll ? Q.total.doors : F.doors.length} DB`,
    'ABLAK': `${isAll ? Q.total.windows : F.windows.length} DB`,
    'HELYISÉG': `${isAll ? Q.total.rooms : F.rooms.length} DB`,
  });
}

/* Which extraction step belongs to which state. IDENTIFY reveals them one
   by one; STRUCTURE holds all of them; QUANTITY hands over to the table. */
function paintState(name, stage) {
  const scene = stage?.scene;
  if (!scene) return;
  const extracts = scene.annotations?.extracts ?? [];
  if (name === 'qExploded') { clearInterval(seq); scene.setExtractStep(-1); return; }
  /* IDENTIFY reveals its recognitions on a 900ms interval that runs for
     ~3.6s. A reader who scrolls on through STRUCTURE into QUANTITY inside
     that window used to leave the sequence running, and its next tick put
     every callout back — on top of the extraction sheet, in the one state
     whose whole job is to be quiet. A state change ends its predecessor. */
  if (name !== 'qIdentify') clearInterval(seq);
  if (name === 'qDrawing') { scene.setExtractStep(-1); stepThrough(scene, -1); }
  else if (name === 'qIdentify') stepThrough(scene, 4);
  else if (name === 'qStructure') scene.setExtractStep(4);
  /* QUANTITY is the resolved state: the recognitions have done their work and
     the sheet is the result, so the callouts clear rather than stack up under
     the table. Hovering an OUTPUT row brings one back, deliberately. */
  else scene.setExtractStep(-1);
}

/* Reveal the recognitions in sequence rather than all at once — the point
   of IDENTIFY is that the reading happens element by element. */
let seq = null;
function stepThrough(scene, last) {
  clearInterval(seq);
  if (last < 0) return;
  let i = 0;
  scene.setExtractStep(0);
  if (env.reducedMotion) { scene.setExtractStep(last); return; }
  seq = setInterval(() => {
    i += 1;
    scene.setExtractStep(i);
    if (i >= last) clearInterval(seq);
  }, 900);
}

const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };

/**
 * The per-floor breakdown and the building total.
 *
 * Written once, on load, because it does not depend on which floor is being
 * read — it IS the comparison between them. Every cell is a `.length` or a
 * sum over the same room rectangles the three drawings are generated from.
 */
function fillFloorTable() {
  const body = document.getElementById('qFloorRows');
  if (body) {
    body.innerHTML = '';
    for (const l of Q.levels) {
      const tr = document.createElement('tr');
      tr.dataset.floor = l.id;
      tr.innerHTML = `<th scope="row">${l.id} · ${l.label}</th>`
        + `<td>${elevationLabel(l.id)}</td>`
        + `<td>${l.rooms}</td><td>${l.doors}</td><td>${l.windows}</td>`
        + `<td>${m2(l.area)}</td>`;
      body.appendChild(tr);
    }
  }
  set('qTotalH', `+${Q.total.height.toFixed(2).replace('.', ',')} m`);
  set('qTotalR', String(Q.total.rooms));
  set('qTotalD', String(Q.total.doors));
  set('qTotalW', String(Q.total.windows));
  set('qTotalA', m2(Q.total.area));
}

/** The quantities of the floor currently being read. */
function fillCounts() {
  const isAll = floor === 'ALL';
  const F = levelFeatures(isAll ? 'L00' : floor);
  const q = isAll ? Q.total : Q.levels.find((l) => l.id === floor);
  const doors = isAll ? Q.total.doorTypes : q.doorTypes;
  const wins = isAll ? Q.total.windowTypes : q.windowTypes;

  set('qDoors', String(isAll ? Q.total.doors : F.doors.length));
  set('qWindows', String(isAll ? Q.total.windows : F.windows.length));
  set('qRooms', String(isAll ? Q.total.rooms : F.rooms.length));
  set('qAreaK', isAll ? 'ÖSSZES SZINT' : 'SZINT');
  set('qFloor', m2(isAll ? Q.total.area : q.area));
  for (const t of ['D01', 'D02', 'D03']) set(`q${t}`, num(doors[t]));
  for (const t of ['W01', 'W02', 'W03']) set(`q${t}`, num(wins[t]));

  const room = [...F.rooms]
    .filter((r) => r.kind !== 'CIRC' && r.kind !== 'CORE')
    .sort((a, b) => b.area - a.area)[0];
  set('qRoomArea', room ? m2(room.area) : '—');
  set('qScope', isAll ? 'A TELJES ÉPÜLET' : `${floor} · ${levelById(floor).label}`);
  set('qSheetNo', isAll
    ? `SHEET 01–${num(LEVEL_IDS.length)} / ${num(LEVEL_IDS.length)}`
    : `SHEET ${num(LEVEL_IDS.indexOf(floor) + 1)} / ${num(LEVEL_IDS.length)}`);

  const fin = Object.entries(isAll
    ? Q.levels.reduce((acc, l) => {
      for (const [k, v] of Object.entries(l.finishes)) acc[k] = (acc[k] || 0) + v;
      return acc;
    }, {})
    : q.finishes).sort((a, b) => b[1] - a[1])[0];
  set('qFinish', fin ? `${fin[0]} — ${FINISHES[fin[0]].label}, ${m2(Math.round(fin[1] * 10) / 10)}` : '—');

  const meta = document.getElementById('qMeta');
  if (meta) {
    const parts = isAll
      ? [`${LEVEL_IDS.length} SZINT`, `D ×${Q.total.doors}`,
         `W ×${Q.total.windows}`, `${Q.total.rooms} HELYISÉG`, m2(Q.total.area)]
      : [floor, `D ×${num(F.doors.length)}`, `W ×${num(F.windows.length)}`,
         room ? room.id : '—', m2(q.area)];
    meta.innerHTML = parts
      .map((t) => `<span class="sv-meta__i">${t}</span>`).join('');
  }

  const rows = document.getElementById('qFloorRows');
  if (rows) {
    [...rows.children].forEach((tr) => {
      tr.classList.toggle('is-on', !isAll && tr.dataset.floor === floor);
    });
  }
}

/* ------------------------------------------------------------------- floors */
/** Run after the browser has produced the frame the caller is starting. */
function afterFrame(fn) {
  requestAnimationFrame(() => requestAnimationFrame(fn));
}

function initFloors(stage) {
  const buttons = [...document.querySelectorAll('[data-floor]')];
  if (!buttons.length) return;

  const go = (id) => {
    if (id === floor) return;
    floor = id;
    buttons.forEach((b) => {
      const on = b.dataset.floor === id;
      b.classList.toggle('is-on', on);
      b.setAttribute('aria-pressed', String(on));
    });
    /* PHASE 8.2 — the readout is refilled AFTER the frame the transition
       starts in.

       Choosing a floor moved the camera, separated the levels, parked
       the scan plane AND rewrote ~25 text nodes, a table highlight and
       two `innerHTML` blocks, all in the click's own frame. The scene
       has to be first: it is what the visitor is watching move, and the
       numbers cannot be read while it is moving anyway. Two frames of
       deferral is below the threshold at which anyone waits for a
       number, and it takes the DOM work out of the frame that starts
       the motion. Nothing here recomputes geometry — `levelFeatures` is
       memoised and the three drawings were built once. */
    afterFrame(() => { fillCounts(); repaintAnchors(stage); paintReference(); });

    /* L00 / L01 / L02 — read ONE sheet. The others stay as a ghost under
       and over it, because a floor plan with nothing around it has lost the
       thing that makes it a floor rather than a drawing.

       ÖSSZES — the exploded axonometric. All three sheets as separated
       layers, which is the only view on the site that shows they are the
       same building rather than three drawings of three buildings. */
    if (id === 'ALL') {
      stage.scene.setLevel(null);
      stage.scene.setExplode(1);
      stage.scene.setFloorLabels(1);
      stage.scene.parkScanAt(null);
      /* The camera has to leave the drawing convention with it: three sheets
         seen from directly above are one illegible sheet. */
      stage.setState('qExploded');
    } else {
      stage.scene.setLevel(id);
      /* A small separation even on a single floor: the sheet being read has
         to sit clear of the two it is being read out of, or the ghosts under
         it are noise on the drawing rather than context beneath it. */
      stage.scene.setExplode(0.42);
      stage.scene.setFloorLabels(1);
      // Part 19 — the plane parks at the selected elevation.
      stage.scene.parkScanAt(id);
      if (stage.state === 'qExploded') stage.setState(reading);
    }
    stage.scene.setExtractStep(-1);
    paintState(stage.state, stage);
  };

  buttons.forEach((b) => b.addEventListener('click', () => go(b.dataset.floor)));
  repaintAnchors(stage);
  // The page opens on the ground floor, stacked, with the labels on.
  stage.scene.setLevel('L00');
  stage.scene.setFloorLabels(1, 0);
  stage.scene.setExplode(0.42, 0);
}

/* The four outputs share ONE drawing. Hovering or focusing an output moves
   the recognition bracket onto the feature that output is derived from,
   instead of giving each output a card of its own. */
function initOutputs(stage) {
  const rows = [...document.querySelectorAll('[data-extract]')];
  if (!rows.length) return;
  const idx = (key) => (stage.scene.annotations?.extracts ?? extracts)
    .findIndex((e) => e.id === key);

  rows.forEach((row) => {
    const target = idx(row.dataset.extract);
    const on = () => {
      if (target < 0) return;
      stage.setState('qStructure', { duration: 0.6 });
      stage.scene.setExtractStep(target);
      rows.forEach((r) => r.classList.toggle('is-on', r === row));
    };
    row.addEventListener('pointerenter', on);
    row.addEventListener('focusin', on);
    row.addEventListener('click', on);
  });
}

/* ------------------------------------------------------------- sample CTA */
/**
 * DROP SAMPLE DRAWING. This is a router into the shared request form, not
 * a second upload path: the file is handed to the real form so that one
 * validator, one endpoint and one set of limits apply everywhere.
 */
function initSample(scanPlane) {
  const zone = document.getElementById('sampleDrop');
  if (!zone) return;

  const go = (files) => {
    const target = document.getElementById('projectMount');
    const input = document.getElementById('fileInput');
    if (files?.length && input) {
      const dt = new DataTransfer();
      [...files].slice(0, 1).forEach((f) => dt.items.add(f));
      input.files = dt.files;
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }
    target?.scrollIntoView({ behavior: env.reducedMotion ? 'auto' : 'smooth', block: 'start' });
    setTimeout(() => document.getElementById('fName')?.focus({ preventScroll: true }),
      env.reducedMotion ? 0 : 700);
  };

  zone.addEventListener('click', () => go(null));
  zone.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(null); }
  });
  ['dragenter', 'dragover'].forEach((t) =>
    zone.addEventListener(t, (e) => { e.preventDefault(); zone.classList.add('is-over'); }));
  ['dragleave', 'drop'].forEach((t) =>
    zone.addEventListener(t, (e) => { e.preventDefault(); zone.classList.remove('is-over'); }));
  zone.addEventListener('drop', (e) => {
    e.preventDefault();
    scanPlane?.passOver(zone, { duration: 1.1, peak: 0.8, pad: 12 });
    go(e.dataTransfer?.files);
  });
}
