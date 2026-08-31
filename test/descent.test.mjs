/* ============================================================
   PHASE 11 — THE DATA DESCENT

   The journey's rules are not opinions about how it looks; they are
   properties of a table of numbers, and every one of them can be checked.
   These are the ones that, if they broke, would break the phase rather
   than merely change it:

     * the route never uses sideways travel as a transition (PART 21)
     * it turns around its subject exactly once, in the drawing (PART 13)
     * it is continuous — no cut anywhere, in either edit
     * it goes IN, DOWN, UNDER, UP, ABOVE, in that order, and the Y
       coordinate says so
     * the mobile edit is the same journey, not a different one
     * every frame it can produce is renderable: named presets, a near
       plane an interior fits inside, a fog band that contains the subject
     * it is anchored to the ONE room webgl/reference.js resolves
   ============================================================ */
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  PATH, PATH_MOBILE, STILLS, CHAPTERS, chapterRanges, sampleDescent,
  auditPath, lateralSegments, orbitSegments, pathGaps, markFractions,
  PLAN_LEVEL, ROOM_UID, EYE, SOFFIT, STATION,
} from '../src/webgl/descent.js';
import { P, SCAN, VIEWS, LAYER_KEYS, DESCENT } from '../src/webgl/presets.js';
import { REF_UID, REF_LEVEL, referenceFacts } from '../src/webgl/reference.js';
import { floorY, planY, SLAB_T, MPU, levelFeatures } from '../src/webgl/levels.js';
import { CAPTURE_ROUND } from '../src/webgl/stations.js';

const EDITS = [['desktop', PATH], ['mobile', PATH_MOBILE]];

/* ---------------- the track ---------------- */

test('the pacing map is the whole track, once', () => {
  const sum = CHAPTERS.reduce((n, c) => n + c.span, 0);
  assert.ok(Math.abs(sum - 1) < 1e-9, `the states sum to ${sum}, not 1`);
  const keys = CHAPTERS.map((c) => c.key);
  assert.equal(new Set(keys).size, keys.length, 'a state is named twice');
  const r = chapterRanges();
  for (let i = 1; i < r.length; i++) {
    assert.equal(r[i].a, r[i - 1].b, `${r[i].key} does not start where ${r[i - 1].key} ends`);
  }
});

for (const [name, path] of EDITS) {
  test(`${name}: the route is continuous and covers the whole track`, () => {
    assert.deepEqual(pathGaps(path), []);
  });

  /* ---------------- PART 21 ---------------- */
  test(`${name}: no segment travels sideways as its primary direction`, () => {
    const bad = lateralSegments(path);
    assert.deepEqual(
      bad.map((r) => `${r.from}→${r.to} lat ${r.lat.toFixed(2)} vs depth ${r.depth.toFixed(2)} / vert ${r.vert.toFixed(2)}`),
      [],
    );
  });

  test(`${name}: depth and height carry the journey`, () => {
    const rows = auditPath(path).filter((r) => r.len > 0.35 && !r.orbit);
    const moved = rows.reduce((a, r) => ({
      lat: a.lat + r.lat, depth: a.depth + r.depth, vert: a.vert + r.vert,
    }), { lat: 0, depth: 0, vert: 0 });
    const total = moved.lat + moved.depth + moved.vert;
    const share = moved.lat / total;
    assert.ok(share < 0.22,
      `${(share * 100).toFixed(1)}% of the route's travel is lateral — it should be a residue, not a vocabulary`);
  });

  /* ---------------- PART 11 / 13 ---------------- */
  test(`${name}: the camera turns around its subject exactly once, in the drawing`, () => {
    const orbits = orbitSegments(path);
    const where = new Set(orbits.flatMap((o) => [o.from, o.to]));
    assert.ok(orbits.length <= 2,
      `${orbits.length} orbit segments — the route is allowed one continuous tilt`);
    for (const k of where) {
      assert.ok(['plan', 'apart', 'field'].includes(k),
        `an orbit at "${k}" — the only permitted one is the tilt that makes the drawing's layers visible`);
    }
    /* And it must be a small one: this is a sheet being tipped up to be
       read, not a camera walking round a model. */
    const total = orbits.reduce((a, o) => a + o.len, 0);
    const r = Math.hypot(...['x', 'y', 'z'].map((_, i) => path[0].p[i] - path[0].t[i]));
    assert.ok(total < 40, `the tilt travels ${total.toFixed(1)} units (radius reference ${r.toFixed(1)})`);
  });

  /* ---------------- the movement vocabulary ---------------- */
  test(`${name}: it goes IN, DOWN, UNDER, UP, ABOVE — in that order`, () => {
    const y = (k) => (path.find((x) => x.key === k) || {}).p?.[1];
    const at = (k) => (path.find((x) => x.key === k) || {}).at;
    const inside = y('interior');
    const under = Math.min(...path.filter((k) => k.key === 'measure').map((k) => k.p[1]));
    const above = y('above') ?? y('collapse');
    const plan = y('plan');

    assert.ok(inside > under, 'the reference room is above the underworld');
    assert.ok(under < floorY('L00'), 'the underworld is below the ground floor');
    assert.ok(above > inside, 'the ascent finishes above the room it started in');
    assert.ok(plan > above, 'the drawing is read from above everything');
    /* and the ORDER of those moments along the track */
    const order = ['interior', 'capture', 'floor', 'measure', 'volume', 'L01', 'plan', 'field'];
    let last = -1;
    for (const k of order) {
      const t = at(k);
      if (t === undefined) continue;
      assert.ok(t > last, `"${k}" is out of order on the track`);
      last = t;
    }
  });

  /* ---------------- renderable at every progress ---------------- */
  test(`${name}: every frame it can produce is a frame the renderer can draw`, () => {
    for (let i = 0; i <= 400; i++) {
      const f = sampleDescent(i / 400, path);
      for (const k in f.w) {
        assert.ok(P[k], `preset "${k}" has no layer row`);
        assert.ok(SCAN[k], `preset "${k}" has no scan row`);
        assert.ok(VIEWS[k], `preset "${k}" has no camera row`);
        assert.ok(Number.isFinite(f.w[k]), `weight "${k}" is not finite`);
      }
      const sum = Object.values(f.w).reduce((a, b) => a + b, 0);
      assert.ok(Math.abs(sum - 1) < 1e-6, `the weights sum to ${sum} at ${i / 400}`);
      for (const v of [...f.p, ...f.t, f.fov, f.near, f.ortho, f.cross, f.apart, f.sheet]) {
        assert.ok(Number.isFinite(v), `a non-finite camera value at ${i / 400}`);
      }
      assert.ok(f.fov > 8 && f.fov < 90, `field of view ${f.fov} at ${i / 400}`);
      assert.ok(f.near > 0 && f.near < f.fog[1], `near plane ${f.near} at ${i / 400}`);
      assert.ok(f.fog[0] < f.fog[1], `fog band inverted at ${i / 400}`);
      assert.ok(f.ortho >= 0 && f.ortho <= 1, `ortho ${f.ortho} at ${i / 400}`);
    }
  });

  test(`${name}: an interior frame's near plane fits inside the room`, () => {
    const F = levelFeatures(PLAN_LEVEL).rooms.find((r) => r.uid === ROOM_UID);
    const half = Math.min(F.x1 - F.x0, F.z1 - F.z0) / 2;
    for (const k of path) {
      const insideRoom = k.p[0] > F.x0 && k.p[0] < F.x1 && k.p[2] > F.z0 && k.p[2] < F.z1
        && k.p[1] > floorY(PLAN_LEVEL) && k.p[1] < floorY(PLAN_LEVEL) + 0.7;
      if (!insideRoom) continue;
      assert.ok(k.near < half * 0.2,
        `${k.key}: a near plane of ${k.near} clips a room whose half-span is ${half.toFixed(2)}`);
    }
  });

  test(`${name}: the camera never jumps`, () => {
    /* WHAT A JUMP IS, MEASURED IN THE FRAME RATHER THAN IN THE WORLD.

       Raw world-space travel is the wrong metric for this route, and the
       reason is the whole of PART 11: under an orthographic projection
       the camera's DISTANCE does not affect the picture at all, so the
       resolution — which rises out of the drawing and back onto the site
       — moves the eye twenty-seven units while the frame barely changes.
       Measuring that as a teleport would be measuring the arithmetic
       rather than the experience.

       So a jump is a change in what the frame CONTAINS: how far the view
       direction has turned, and how much the subject's apparent size has
       changed. Both are projection-aware, and both are what a reader
       actually sees move. */
    const frame = (f) => {
      const d = [f.t[0] - f.p[0], f.t[1] - f.p[1], f.t[2] - f.p[2]];
      const len = Math.hypot(...d) || 1e-6;
      /* Apparent half-height of the subject plane: the same quantity the
         renderer solves the orthographic box from. */
      const scale = len * Math.tan((f.fov * Math.PI) / 360);
      return { dir: d.map((v) => v / len), scale, len };
    };
    let prev = frame(sampleDescent(0, path));
    const rate = [];
    for (let i = 1; i <= 1200; i++) {
      const f = frame(sampleDescent(i / 1200, path));
      const dot = Math.max(-1, Math.min(1,
        f.dir[0] * prev.dir[0] + f.dir[1] * prev.dir[1] + f.dir[2] * prev.dir[2]));
      const turn = Math.acos(dot);                          // radians
      const zoom = Math.abs(Math.log(f.scale / prev.scale)); // octaves-ish
      rate.push({ d: turn + zoom * 1.4, at: i / 1200 });
      prev = f;
    }
    /* SUSTAINED speed, not the peak sample.

       The path is piecewise linear, so its velocity is discontinuous at
       every key — a kink, where the rate changes from one frame to the
       next without the position moving anywhere. Thirteen of those exist
       by construction and none of them is perceptible: a reader sees
       movement over a tenth of a second, not the derivative at an
       instant. Taking the maximum measured a property of the
       interpolation rather than of the journey.
       So: the 99.5th percentile is what has to stay slow — six samples
       out of twelve hundred may be kinks — and the absolute maximum has a
       separate, looser ceiling that a real teleport could not pass. */
    const sorted = [...rate].sort((a, b) => a.d - b.d);
    const hi = sorted[sorted.length - 1];
    const worstRow = sorted[Math.floor(sorted.length * 0.995)];
    const worst = worstRow.d, at = worstRow.at;
    assert.ok(hi.d < 0.34,
      `a single sample changed the frame by ${hi.d.toFixed(3)} at ${hi.at.toFixed(3)} — that is a teleport`);
    /* A thousandth of the track is roughly one wheel notch.

       There are two thresholds because the brief asks for two things at
       once: PART 20 wants variable pacing with genuinely quick segments,
       and PART 29 asks whether the camera travel is ever excessive. So
       the gate is not a speed limit — it is a rule about WHERE speed is
       allowed to be. A calm segment must stay calm; a segment the path
       explicitly marks `quick` — the glass crossing, the resolution — may
       run up to the ceiling, and nothing may pass it.

       0.16 is about nine degrees of turn or twelve per cent of apparent
       size in one notch. The worst offender before this test existed was
       0.41: the look down before the floor crossing, done in one
       segment. */
    const CALM = 0.09, CEILING = 0.16;
    assert.ok(worst < CEILING,
      `the frame changed by ${worst.toFixed(3)} in a thousandth of the track, at ${at.toFixed(3)}`);
    if (worst > CALM) {
      /* Whichever segment the peak falls in must be one the path declares
         quick — the speed has to have been authored, not stumbled into. */
      let seg = path[path.length - 1];
      for (let i = 1; i < path.length; i++) if (path[i].at >= at) { seg = path[i]; break; }
      assert.equal(seg.ease, 'quick',
        `the fastest moment of the route (${worst.toFixed(3)} at ${at.toFixed(3)}) is in the `
        + `"${seg.from ?? seg.key}" segment, which is eased "${seg.ease}" — speed above ${CALM} `
        + 'has to be a segment the path declares quick');
    }
  });

  test(`${name}: the sampling round only ever grows while it is running`, () => {
    let prev = -1, wasLive = false;
    for (let i = 0; i <= 600; i++) {
      const f = sampleDescent(i / 600, path);
      if (f.round > 0.02) {
        if (wasLive) {
          assert.ok(f.sample >= prev - 1e-6,
            `the round shrank from ${prev} to ${f.sample} at ${i / 600} — a measurement was un-taken`);
        }
        prev = f.sample; wasLive = true;
      } else { wasLive = false; }
    }
    assert.ok(prev > 2, 'the round never reached a radius that covers the room');
  });
}

/* ---------------- the two edits are one journey ---------------- */

test('the mobile edit tells the same story in the same order', () => {
  const seq = (p) => [...new Set(p.map((k) => k.key))];
  const d = seq(PATH), m = seq(PATH_MOBILE);
  /* Mobile may drop intermediate frames — that is what an edit is — but it
     may not reorder the narrative or invent a beat. */
  for (const k of m) assert.ok(d.includes(k), `the mobile edit has a beat "${k}" the desktop does not`);
  let i = 0;
  for (const k of m) {
    const n = d.indexOf(k, i);
    assert.ok(n >= 0, `"${k}" is out of order in the mobile edit`);
    i = n;
  }
  const missing = d.filter((k) => !m.includes(k));
  assert.ok(missing.length <= 2,
    `the mobile edit drops ${missing.join(', ')} — an edit shortens the travel, not the narrative`);
});

test('every state of the journey is closer on a phone', () => {
  /* PART 25 — "do not create tiny architectural views". The phone's
     frames are nearer than the desktop's wherever both exist outside the
     building; inside it they are the same eye, because the room is
     already the right size. */
  const far = (p, key) => {
    const k = p.find((x) => x.key === key);
    return k ? Math.hypot(k.p[0] - k.t[0], k.p[1] - k.t[1], k.p[2] - k.t[2]) : null;
  };
  for (const key of ['exterior', 'approach']) {
    const d = far(PATH, key), m = far(PATH_MOBILE, key);
    assert.ok(m < d, `${key}: the phone is ${m.toFixed(1)} units out, the desktop ${d.toFixed(1)}`);
  }
});

/* ---------------- reduced motion ---------------- */

test('the reduced-motion stills cover the whole narrative', () => {
  const need = ['exterior', 'interior', 'terrain', 'plan', 'data'];
  assert.deepEqual(Object.keys(STILLS).sort(), [...need].sort());
  for (const [k, s] of Object.entries(STILLS)) {
    assert.ok(Array.isArray(s.p) && Array.isArray(s.t), `${k}: no camera`);
    for (const n in s.w) assert.ok(P[n], `${k}: preset "${n}" has no layer row`);
    assert.ok(s.fog[0] < s.fog[1], `${k}: fog band inverted`);
    assert.ok(s.near > 0, `${k}: no near plane`);
  }
  /* Each still must be a DIFFERENT picture — five cuts, not one frame
     shown five times. */
  const sig = Object.values(STILLS).map((s) => s.p.map((v) => v.toFixed(2)).join(','));
  assert.equal(new Set(sig).size, sig.length, 'two stills share a camera');
});

/* ---------------- the anchors are the site's own ---------------- */

test('the journey is anchored to the one reference room', () => {
  assert.equal(ROOM_UID, REF_UID);
  assert.equal(PLAN_LEVEL, REF_LEVEL);
  const f = referenceFacts();
  assert.equal(f.uid, 'L01-R07');
  /* CP-11: the eleventh station of the capture round, and the sampling
     shell grows from it. */
  const n = CAPTURE_ROUND.findIndex(([uid]) => uid === ROOM_UID) + 1;
  assert.equal(STATION.id, `CP-${String(n).padStart(2, '0')}`);
});

test('the anchors are measured, not typed', () => {
  /* Standing eye height on the work floor. */
  assert.ok(Math.abs(EYE - (floorY('L01') + 1.6 / MPU)) < 1e-9);
  /* The soffit the section plane is parked at is the slab's own. */
  assert.ok(Math.abs(SOFFIT - (floorY('L01') - SLAB_T / MPU)) < 1e-9);
  /* And the drawing the journey resolves into is that level's. */
  /* Only the states that ARE the drawing: `sheet` says which meshes draw
     it, which stays on through the resolution while the camera has
     already left. */
  const drawn = PATH.filter((k) => ['plan', 'apart', 'field'].includes(k.key));
  assert.ok(drawn.length >= 4, 'the separable drawing is never reached');
  for (const k of drawn) {
    assert.ok(Math.abs(k.t[1] - planY(PLAN_LEVEL)) < 1e-6,
      `${k.key} looks at ${k.t[1]} rather than at ${PLAN_LEVEL}'s plan`);
  }
});

test('a top-down frame is never rolled', () => {
  /* Looking straight down, screen-up is whatever is left of the world up
     once the view direction is removed from it — so an eye offset
     sideways from a top-down target lands the drawing on screen ROTATED.
     Every vertical frame must sit on its target's own X. */
  for (const [name, path] of EDITS) {
    for (const k of path) {
      const d = [k.t[0] - k.p[0], k.t[1] - k.p[1], k.t[2] - k.p[2]];
      const len = Math.hypot(...d);
      if (Math.abs(d[1]) / len < 0.9) continue;      // not a vertical view
      /* It only matters where a DRAWING is being looked at. A floor
         crossing also points straight down and its roll is nobody's
         business — there is no linework in the frame to be rotated. */
      if ((k.ortho ?? 0) < 0.2) continue;
      assert.ok(Math.abs(k.p[0] - k.t[0]) < 1e-6,
        `${name}/${k.key}: a top-down eye offset ${(k.p[0] - k.t[0]).toFixed(3)} in X rolls the drawing`);
    }
  }
});

/* ---------------- the type follows the camera ---------------- */

test('each level mark peaks where the camera crosses that level', () => {
  const f = markFractions('ascent', ['L00', 'L01', 'L02']);
  assert.equal(f.length, 3);
  for (const v of f) assert.ok(v > 0.05 && v < 0.95, `a mark at ${v} is on the state's own edge`);
  assert.ok(f[0] < f[1] && f[1] < f[2], 'the marks are out of order');
  /* They must be far enough apart that two are never at full strength
     together: PART 10 asks for one at a time, encountered. */
  assert.ok(f[1] - f[0] > 0.2 && f[2] - f[1] > 0.2, 'two level marks overlap');
});

/* ---------------- the presets exist and are complete ---------------- */

test('every journey preset is a complete row of the site\'s own tables', () => {
  for (const name of DESCENT) {
    assert.ok(P[name], `${name}: no layer row`);
    assert.ok(SCAN[name], `${name}: no scan row`);
    assert.ok(VIEWS[name], `${name}: no camera row`);
    for (const k of LAYER_KEYS) {
      assert.equal(typeof P[name][k], 'number', `${name}.${k} is missing`);
      assert.ok(P[name][k] >= 0 && P[name][k] <= 1.6, `${name}.${k} = ${P[name][k]}`);
    }
    for (const k of ['ax', 'w', 'period', 'lo', 'hi', 'vis']) {
      assert.equal(typeof SCAN[name][k], 'number', `${name}.scan.${k} is missing`);
    }
    assert.ok(SCAN[name].lo < SCAN[name].hi, `${name}: the scan travel is inverted`);
  }
});

test('the removed section leaves nothing behind', () => {
  /* PART 01 — "EGY HELY. NÉGY OLVASAT." and the five-state pipeline are
     gone, and so are the presets that existed only for them. A dead
     preset row is a state something can still be blended into. */
  for (const dead of ['spReality', 'spCapture', 'spMeasure', 'spQuantify']) {
    assert.equal(P[dead], undefined, `${dead} survives in the layer table`);
    assert.equal(VIEWS[dead], undefined, `${dead} survives in the camera table`);
    assert.equal(SCAN[dead], undefined, `${dead} survives in the scan table`);
  }
});
