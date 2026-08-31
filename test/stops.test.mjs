/* Run: npm test
   The stop table is the most load-bearing arithmetic on the site and the
   one thing that used to be untestable, because it was computed inline
   from live layout. These cases are the failures Phase 2 could only find
   by scrolling. */

import test from 'node:test';
import assert from 'node:assert/strict';
import { buildStops, validateStops } from '../src/modules/stops.js';
import { readTrack, readScalar } from '../src/modules/track.js';

/** A layout that matches the real homepage proportions at 1920x1080. */
function layout(over = {}) {
  const vh = 1080;
  const hero = { top: 0, height: vh };
  const manifesto = { top: vh, height: 2200 };
  const fusion = { top: vh + 2200, height: 5000 };
  const chTop = vh + 2200 + 5000;
  const chH = 2400;
  const chapters = [
    { id: 'capture', side: -1, enter: { capture: 1 }, close: { captureClose: 1 }, top: chTop, height: chH },
    { id: 'measure', side: 1, enter: { measure: 1 }, close: { measureClose: 1 }, top: chTop + chH, height: chH },
    { id: 'quantify', side: -0.9, enter: { quantify: 1 }, close: { planTight: 1 }, top: chTop + chH * 2, height: chH },
  ];
  const servicesTop = chTop - 600;
  const servicesH = 600 + chH * 3;
  return {
    startY: 0,
    range: servicesTop + servicesH - vh,
    viewportH: vh,
    hero, manifesto, fusion, chapters,
    ...over,
  };
}

test('a healthy layout produces a valid, ordered, in-range table', () => {
  const L = layout();
  const stops = buildStops(L);
  assert.deepEqual(validateStops(stops, L), []);
  assert.ok(stops.length > 12, `expected a full table, got ${stops.length}`);
  assert.equal(stops[0].at, 0);
  assert.equal(stops.at(-1).at, 1);
  for (let i = 1; i < stops.length; i++) assert.ok(stops[i].at >= stops[i - 1].at);
});

test('every chapter owns a span the reader can actually sit inside', () => {
  const stops = buildStops(layout());
  for (const id of ['capture', 'measure', 'quantify']) {
    const own = stops.filter((s) => s.mode === id);
    assert.ok(own.length >= 4, `${id} should contribute 4 stops, got ${own.length}`);
    assert.ok(own.at(-1).at - own[0].at > 0.02, `${id} span is too short`);
  }
});

test('the track is continuous — no progress falls into a gap', () => {
  const stops = buildStops(layout());
  for (let p = 0; p <= 1.0001; p += 0.005) {
    const { weights } = readTrack(stops, Math.min(1, p));
    const sum = Object.values(weights).reduce((a, b) => a + b, 0);
    assert.ok(sum > 0.5, `no state owns the scene at p=${p.toFixed(3)} (sum ${sum})`);
    for (const k in weights) assert.ok(Number.isFinite(weights[k]), `weight ${k} NaN at ${p}`);
    for (const key of ['mix', 'side', 'op', 'blur']) {
      assert.ok(Number.isFinite(readScalar(stops, p, key, 0)), `${key} NaN at ${p}`);
    }
  }
});

test('a collapsed chapter (zero height, still hidden) is reported, not shipped', () => {
  const L = layout();
  L.chapters = L.chapters.map((c, i) => (i === 1 ? { ...c, height: 0 } : c));
  const problems = validateStops(buildStops(L), L);
  assert.ok(problems.some((p) => p.includes('measure')), problems.join(' | '));
});

test('a page shorter than one viewport is reported', () => {
  const L = layout({ range: 0 });
  const problems = validateStops(buildStops(L), L);
  assert.ok(problems.some((p) => p.includes('range')), problems.join(' | '));
});

test('a non-finite measurement is caught rather than propagated as NaN', () => {
  const L = layout();
  L.chapters[0].top = NaN;
  const problems = validateStops(buildStops(L), L);
  assert.ok(problems.length > 0);
});

test('an optional section that is absent simply drops out', () => {
  const L = layout({ manifesto: null, fusion: null });
  const stops = buildStops(L);
  assert.deepEqual(validateStops(stops, L), []);
  assert.equal(stops.filter((s) => 'fstate' in s).length, 0);
});

test('the accent is a step function that never regresses', () => {
  const stops = buildStops(layout());
  const stepValue = (p) => {
    let v = null;
    for (const s of stops) { if (s.at > p) break; if ('mode' in s) v = s.mode; }
    return v;
  };

  /* Nearest-stop lookup used to lag a whole chapter, because one chapter's
     closing stop and the next one's opening stop share a scroll position.
     The step function must resolve forwards, and once it has moved on it
     must never fall back. */
  const order = ['capture', 'measure', 'quantify'];
  let seen = -1;
  for (let p = 0; p <= 1.0001; p += 0.002) {
    const v = stepValue(Math.min(1, p));
    if (v === null) { assert.equal(seen, -1, `accent returned to idle at p=${p.toFixed(3)}`); continue; }
    const idx = order.indexOf(v);
    assert.notEqual(idx, -1, `unknown mode "${v}"`);
    assert.ok(idx >= seen, `accent went backwards to ${v} at p=${p.toFixed(3)}`);
    seen = idx;
  }
  assert.equal(seen, 2, 'the track should end owned by QUANTIFY');
  assert.equal(stepValue(1), 'quantify');
});

/* ------------------------------------------------------------------
   Regression: the chapter boundary must never run backwards.

   A screen recording showed the MEASURE chapter wearing CAPTURE's cyan and
   a wall of full-strength point cloud across its copy. The cause was in the
   table, not the renderer: the hand-off stop was placed before its own
   chapter's start, which put it inside the PREVIOUS chapter's span, and the
   previous chapter's closing stop then sorted after it. The reader got
   captureClose — near camera, points at full weight — after the MEASURE
   headline was already on screen.
   ------------------------------------------------------------------ */

test('a chapter never falls back into its predecessor at the boundary', () => {
  const L = layout();
  const stops = buildStops(L);
  assert.deepEqual(validateStops(stops, L), []);

  const order = ['capture', 'measure', 'quantify'];
  let high = -1;
  for (const s of stops) {
    if (typeof s.mode !== 'string') continue;
    const idx = order.indexOf(s.mode);
    assert.ok(idx >= high, `mode fell back to "${s.mode}" at ${s.at.toFixed(4)}`);
    high = idx;
  }

  // and no weight map may reintroduce a previous chapter's close state
  const closes = { capture: 'captureClose', measure: 'measureClose' };
  const firstOf = (key) => stops.findIndex((s) => key in s.w);
  assert.ok(firstOf('measure') > stops.findLastIndex((s) => closes.capture in s.w) - 1,
    'captureClose must not appear after measure has started');
  for (let i = 0; i < stops.length; i++) {
    if (!(closes.capture in stops[i].w)) continue;
    const later = stops.slice(0, i).some((s) => 'measure' in s.w || 'measureClose' in s.w);
    assert.ok(!later, `captureClose reappears at ${stops[i].at.toFixed(4)} after MEASURE began`);
  }
});

test('sub-pixel disagreement between siblings cannot invert the boundary', () => {
  /* getBoundingClientRect() is sub-pixel and offsetHeight is not, so a
     chapter's computed bottom and its successor's measured top can differ
     by a fraction of a pixel in either direction. Neither may reorder the
     table. */
  for (const drift of [-0.9, -0.4, 0, 0.4, 0.9]) {
    const L = layout();
    L.chapters[1].top += drift;
    L.chapters[2].top += drift * 2;
    const stops = buildStops(L);
    assert.deepEqual(validateStops(stops, L), [], `drift ${drift}`);
    for (let i = 1; i < stops.length; i++) {
      assert.ok(stops[i].at >= stops[i - 1].at, `drift ${drift}: stops out of order`);
    }
  }
});

test('the reader is never shown two chapters\' states at once', () => {
  const stops = buildStops(layout());
  const CHAPTER_STATES = ['capture', 'captureClose', 'measure', 'measureClose', 'quantify', 'planTight'];
  for (let p = 0.6; p <= 1.0001; p += 0.002) {
    const { weights } = readTrack(stops, Math.min(1, p));
    const live = CHAPTER_STATES.filter((k) => (weights[k] || 0) > 0.02);
    // a morph blends two ADJACENT states; it must never blend a chapter's
    // close with a non-adjacent chapter's state
    const idx = live.map((k) => CHAPTER_STATES.indexOf(k));
    if (idx.length > 1) {
      assert.ok(Math.max(...idx) - Math.min(...idx) === 1,
        `at p=${p.toFixed(3)} the scene blends ${live.join(' + ')}`);
    }
  }
});

/* ------------------------------------------------------------------
   Regression: a chapter change must be a morph, not a cut.

   Adjacent chapters used to share one scroll position, so the blend
   between them had zero distance — captureClose at 0.8005 and measure at
   0.8005 reads as a hard swap however smoothly each state is built. And
   the state was keyed to the chapter's box top, which the reader passes a
   third of a viewport AFTER its headline is already being read.
   ------------------------------------------------------------------ */

test('every chapter boundary is crossed by a real blend, not a cut', () => {
  const stops = buildStops(layout());
  const pairs = [['captureClose', 'measure'], ['measureClose', 'quantify']];

  for (const [from, to] of pairs) {
    const blended = [];
    for (let p = 0; p <= 1.0001; p += 0.0005) {
      const { weights } = readTrack(stops, Math.min(1, p));
      if ((weights[from] || 0) > 0.05 && (weights[to] || 0) > 0.05) blended.push(p);
    }
    assert.ok(blended.length > 0, `${from} → ${to} is a cut: no progress blends the two`);
    const width = blended.at(-1) - blended[0];
    assert.ok(width > 0.01,
      `${from} → ${to} blends over only ${(width * 100).toFixed(2)}% of the track`);

    // and the midpoint is a genuine half-and-half, not a near-instant flip
    const mid = blended[Math.floor(blended.length / 2)];
    const { weights } = readTrack(stops, mid);
    assert.ok(weights[from] > 0.25 && weights[to] > 0.25,
      `${from} → ${to} never reaches a balanced frame`);
  }
});

test('a chapter takes over while its own type is being read', () => {
  /* The chapter box opens with padding above its headline, so keying the
     state to the box edge changes the scene long after the reader has
     changed chapter. The state must begin BEFORE the box top arrives. */
  const L = layout();
  const stops = buildStops(L);
  const rawTop = (c) => (c.top - L.startY) / L.range;

  for (let i = 1; i < L.chapters.length; i++) {
    const c = L.chapters[i];
    const first = stops.find((s) => s.mode === c.id);
    assert.ok(first.at < rawTop(c),
      `chapter "${c.id}" only starts at ${first.at.toFixed(4)}, after its box top ${rawTop(c).toFixed(4)}`);
    const lead = (rawTop(c) - first.at) * L.range;
    assert.ok(lead > L.viewportH * 0.15 && lead < L.viewportH * 1.2,
      `chapter "${c.id}" leads its box top by ${Math.round(lead)}px — expected roughly a third of a viewport`);
  }
});
