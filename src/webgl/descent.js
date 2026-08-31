import { planY, floorY } from './levels.js';
import { REF_UID } from './reference.js';

/* ============================================================
   PHASE 11 — THE DATA DESCENT

   One route through one building, written down once.

   Everything else on this site is a set of STATES the camera cuts or
   blends between. This is not that. It is a PATH: a list of positions the
   camera actually occupies, in order, with no gaps — outside the building,
   through its glazing, into the reference room, down through the floor
   assembly, under the site, back up through three storeys, above the roof,
   and out again as the perspective flattens into the drawing.

   The rules the path obeys, and the reason this file exists rather than a
   table of side-by-side compositions:

     * IT NEVER MOVES SIDEWAYS AS A TRANSITION. Between any two
       consecutive keys the dominant travel is on Y (down, up) or along
       the view axis (in, through, back). A lateral component exists only
       where a body walking that route would have one. `auditPath()`
       asserts this, and `test/descent.test.mjs` runs it.

     * IT IS CONTINUOUS. Key n's position is key n+1's starting position.
       There is no cut anywhere in the desktop route, so there is nowhere
       the reader can be put down in a different place from the one they
       were just in.

     * IT IS MEASURED, NOT COMPOSED. The window the camera crosses is
       `L01-W01-04`, a real opening in the real wall of L01-R07 — the
       reference room, chosen by the rule in webgl/reference.js. Its sill
       and head are the level's own. The floor it descends through is that
       level's slab. The elevations under the site are the terrain's.

   UNITS are the site's world units throughout, because that is the frame
   the camera, the terrain and the drawing already share. Metres appear
   only in the DOM, and only from the domain that owns them.
   ============================================================ */

/* ---------------- the anchors, derived ---------------- */

/** The reference room, as a rectangle. See webgl/reference.js. */
export const ROOM = { x0: -3.2, x1: -1.6, z0: 0.7666666666666666, z1: 2.3 };
export const ROOM_UID = REF_UID;

/** The pane the camera crosses: `L01-W01-04`, south facade, L01-R07. */
export const WINDOW = { x: -2.0, z: 2.3, side: 'S' };

/** Standing eye height on the work floor: 1.60 m over the finished floor. */
const MPU = 5.349852700125815;
export const EYE = floorY('L01') + 1.6 / MPU;      // ≈ 0.5566

/** Where the descent leaves the room, and therefore where it re-enters it. */
export const DROP = { x: -2.4, z: 1.5 };

/** The capture station in the reference room. Eleventh of the round: CP-11. */
export const STATION = { x: -2.4, y: EYE, z: 1.5333333333333334, id: 'CP-11' };

/** The soffit of L01's slab — where the section line is parked (PART 07). */
export const SOFFIT = floorY('L01') - 0.32 / MPU;

/** The plan the journey resolves into is the reference room's own level. */
export const PLAN_LEVEL = 'L01';
const PY = planY(PLAN_LEVEL);

/* ============================================================
   THE PACING MAP — PART 20

   One table, and it is the reason the type and the camera cannot drift
   apart. Each entry is a block of markup in index.html and a span of the
   journey's progress; the block's HEIGHT is its span times the journey's
   total scroll, and the camera path above is keyed to the SAME numbers.
   Change a span here and the block gets longer, the camera spends longer
   in it, and the two stay in step because there is only one number.

   The shape of it is the brief's pacing map, made arithmetic — and the
   camera path above is written IN these states rather than beside them,
   so re-timing one moves its own keys and nothing else's (see `A`):

     ENTRY            medium        .088
     GLASS            quick         .040   — the shortest block on the page
     INTERIOR         slow          .090
     CAPTURE          medium        .100
     FLOOR CROSSING   quick         .055
     UNDERWORLD       slow          .112   — the longest
     VOLUME           slow          .078
     ASCENT           medium-fast   .098
     PLAN COLLAPSE    slow          .085
     PLAN TYPOGRAPHY  slow          .075
     DISASSEMBLY      medium        .048
     DATA FIELD       medium        .048
     RESOLUTION       quick         .083   — resolution and the statement

   Note that "slow" is not the same as "long": UNDERWORLD is long because
   the camera barely moves in it, and GLASS is short because a body
   crossing a pane of glass is through it in under a second.
   ============================================================ */
export const CHAPTERS = [
  { key: 'entry',    span: 0.088 },
  { key: 'glass',    span: 0.040 },
  { key: 'interior', span: 0.090 },
  { key: 'capture',  span: 0.100 },
  { key: 'floor',    span: 0.055 },
  { key: 'under',    span: 0.112 },
  { key: 'volume',   span: 0.078 },
  { key: 'ascent',   span: 0.098 },
  { key: 'collapse', span: 0.085 },
  { key: 'plan',     span: 0.075 },
  { key: 'apart',    span: 0.048 },
  { key: 'field',    span: 0.048 },
  { key: 'final',    span: 0.083 },
];

/** Cumulative [start, end] of every chapter along the journey. */
export function chapterRanges(list = CHAPTERS) {
  let at = 0;
  return list.map((c) => {
    const a = at; at += c.span;
    return { key: c.key, a, b: at };
  });
}

/* ============================================================
   THE PATH

   `at` is progress along the journey's own scroll track, 0 → 1.

   `w`      preset weights — the same blend every other state block on this
            site uses, so the journey's layers are the site's layers.
   `p`/`t`  camera eye and target, world units.
   `fov`    vertical field of view. It WIDENS on the way in (a room is read
            wide) and NARROWS on the way up, which is half of the
            perspective collapse; the projection blend is the other half.
   `near`   the near plane. 0.5 units is 2.7 m, which is most of the way
            across the reference room — an interior segment that keeps the
            exterior near plane is an interior segment with no walls in it.
   `ortho`  0 perspective, 1 orthographic. Blended in the projection matrix.
   `cross`  how far inside the pane of glass the camera is.
   `sample` the 360 round's shell radius, world units. It only ever grows:
            a measurement that has been taken has been taken.
   `round`  whether a round is running at all. Held apart from the radius
            because the two end differently — the shell stops EXPANDING
            when the camera leaves, and stops GATING when the round is
            over, and collapsing them puts the radius back to zero and
            un-samples the room.
   `apart`  how far the drawing has come apart, per PART 13.
   `sheet`  0 the merged per-level sheets, 1 the separable layers of the
            reference level. They draw the same lines, so the crossfade
            between them is invisible; what it buys is that the ascent can
            show three floor plates while the plan phase takes one apart.
   `fog`      [near, far] in world units — the one atmosphere control.
   `exposure`  a stop, relative to the site's own. A camera that walks
               through a window stops down, and this one does too.
   `accent`    how much of the page's accent this frame may take. The
               COLOUR is the page's; this is the dose. See setAccent in
               webgl/scene.js for why a frame the camera is inside cannot
               take the same dose as a frame it is looking at.
   `focus`     which storey the drawing belongs to, or null for all three.
   `solid`     the camera is INSIDE building fabric, so the fabric has to
               be drawn from the inside. See archScene.setInside.
   `cut`       a world Y to PARK the Scan Plane at, or absent to let it
               keep running free. Used for one thing only: the section
               line the floor crossing passes through.
   `scan`      how loudly the Scan Plane answers. Same plane, same phase,
               same pass — this is only its gain, and it comes down where
               the reader is inside the thing being scanned.
   `ease`   how the segment ENDING at this key is timed. This is the pacing
            map: `hold` sits still, `quick` is nearly a cut, `glide` is the
            long even travel that most of the route is made of.
   ============================================================ */

const F_SITE = [21, 54];       // the site's own fog — unchanged from Phase 6
const F_ROOM = [6, 26];        // inside, the far wall is 8 m away
const F_DEEP = [4, 19];        // under the site: everything dissolves close
const F_DRAW = [44, 120];      // a drawing has no atmosphere

/**
 * A key's position on the track, as a fraction of the STATE it belongs to.
 *
 * The path used to carry absolute progress numbers, and the pacing map
 * carried the state lengths — two descriptions of one thing, which drift
 * the moment either is edited. Changing one state's span by twelve
 * thousandths moved every boundary after it and left thirty camera keys
 * pointing at the wrong states.
 *
 * There is one description now. `A('interior', 0.45)` means "forty-five
 * percent of the way through the INTERIOR state", and where that is on the
 * track is arithmetic over CHAPTERS. Re-time a state and its camera keys
 * move with it, because they are expressed IN it.
 */
const A = (() => {
  const r = new Map(chapterRanges().map((c) => [c.key, c]));
  return (key, f) => {
    const c = r.get(key);
    if (!c) throw new Error(`descent: no state named "${key}"`);
    return c.a + (c.b - c.a) * f;
  };
})();

export const PATH = [
  /* ---- 01 EXTERIOR — the whole building, at distance ---- */
  { at: A('entry', 0), key: 'exterior', w: { dExterior: 1 }, ease: 'glide',
    p: [13.60, 5.90, 17.20], t: [-0.20, 0.30, 0.00], fov: 31, near: 0.5, accent: 1, fog: F_SITE },
  { at: A('entry', 0.42), key: 'exterior', w: { dExterior: 1 }, ease: 'hold',
    p: [11.80, 5.20, 14.90], t: [-0.35, 0.34, 0.15], fov: 31, near: 0.5, fog: F_SITE },

  /* ---- 02 APPROACH — the camera closes on the south facade ----
     THE KEYS ARE SPACED GEOMETRICALLY, NOT EVENLY.

     A dolly that closes at a constant rate does not LOOK like one:
     apparent size goes as one over distance, so the last third of an
     approach covers as much of the frame's change as the first two thirds
     together. Two evenly spaced keys from eight units out to two put the
     fastest moment of the whole journey at the end of a segment the path
     had called `glide` — speed nobody authored, caught by the frame
     metric in test/descent.test.mjs at 0.135 against a calm limit of 0.09.

     Three keys at a roughly constant RATIO — 8.2, then 4.3, then 2.1
     units off the facade — spread the same approach evenly across what
     the reader actually sees change. */
  { at: A('entry', 0.62), key: 'approach', w: { dApproach: 1 }, ease: 'glide',
    p: [3.20, 2.00, 9.20], t: [-1.30, 0.60, 2.30], fov: 33, near: 0.4, fog: F_SITE },
  { at: A('entry', 0.86), key: 'approach', w: { dApproach: 1 }, ease: 'glide',
    p: [0.30, 1.26, 6.10], t: [-1.65, 0.60, 2.30], fov: 34, near: 0.3, fog: F_SITE },
  { at: A('glass', 0), key: 'approach', w: { dApproach: 1 }, ease: 'glide',
    p: [-1.30, 0.86, 4.30], t: [-2.00, 0.60, 2.30], fov: 36, near: 0.2, fog: F_SITE },

  /* ---- 03 GLASS — at the pane, and then inside it ---- */
  { at: A('glass', 0.55), key: 'glass', w: { dGlass: 1 }, ease: 'quick',
    p: [-1.96, 0.585, 2.44], t: [-2.10, 0.55, 1.30], fov: 42, near: 0.04,
    cross: 1, exposure: 0.60, accent: 0.34, scan: 0.30, fog: F_ROOM },
  { at: A('interior', 0), key: 'glass', w: { dGlass: 1 }, ease: 'quick',
    p: [-2.00, 0.575, 2.14], t: [-2.30, 0.53, 1.20], fov: 38, near: 0.03,
    cross: 0.35, exposure: 0.62, accent: 0.34, scan: 0.45, fog: F_ROOM },

  /* ---- 04 INTERIOR — inside L01-R07 ----
     The frame is the room's LONG diagonal, from just inside the south
     glazing across the table to the far corner where the west facade
     meets the north partition. Aimed at the corner and not at a wall:
     a wall two metres away is a blank rectangle, and the one thing this
     part of the journey has to say is that this is a ROOM. */
  { at: A('interior', 0.3333), key: 'interior', w: { dInterior: 1 }, ease: 'glide',
    p: [-2.06, EYE, 1.94], t: [-2.98, 0.470, 1.02], fov: 40, near: 0.02,
    exposure: 0.60, accent: 0.30, scan: 0.35, fog: F_ROOM },
  { at: A('capture', 0), key: 'interior', w: { dInterior: 1 }, ease: 'hold',
    p: [-2.22, EYE, 1.80], t: [-3.02, 0.462, 1.00], fov: 39, near: 0.02,
    exposure: 0.60, accent: 0.30, scan: 0.35, fog: F_ROOM },

  /* ---- 05 CAPTURE — the round passes through the room ----
     The camera TURNS where it stands, from the far corner back to the
     two glazed facades. It is the one rotation in the journey and it is
     the correct one: a 360 round is a turn, and this is the frame in
     which it is being taken. The eye barely moves — 0.2 world units over
     the whole segment — so nothing slides. */
  { at: A('capture', 0.52), key: 'capture', w: { dCapture: 1 }, ease: 'glide',
    p: [-2.34, EYE, 1.70], t: [-3.05, 0.470, 1.66], fov: 42, near: 0.02,
    sample: 0.05, round: 1, exposure: 0.60, accent: 0.30, scan: 0.35, fog: F_ROOM },
  { at: A('capture', 0.84), key: 'capture', w: { dCapture: 1 }, ease: 'glide',
    p: [-2.38, EYE, 1.58], t: [-2.90, 0.430, 2.12], fov: 44, near: 0.02,
    sample: 1.90, round: 1, exposure: 0.61, accent: 0.32, scan: 0.40, fog: F_ROOM },

  /* ---- 06 FLOOR CROSSING — through the slab, quick ----
     THE LOOK DOWN IS A BEAT, NOT A WHIP.

     PART 07 opens with "the camera looks slightly downward" and then
     descends. The first cut did that whole eighty-five degree pitch in
     one segment worth under two per cent of the track — twenty-three
     degrees per wheel notch, which is a camera being yanked rather than
     a person lowering their eyes. `test/descent.test.mjs` measures the
     change in what the FRAME contains rather than how far the eye moved,
     which is the only way to see it, and refuses anything over five
     degrees a notch. The pitch is shared across three keys now. */
  { at: A('floor', 0), key: 'capture', w: { dCapture: 1 }, ease: 'glide',
    p: [DROP.x, 0.548, DROP.z], t: [-2.72, 0.200, 1.98], fov: 44, near: 0.02,
    sample: 2.60, round: 1, exposure: 0.62, accent: 0.34, scan: 0.45, fog: F_ROOM },
  { at: A('floor', 0.34), key: 'floor', w: { dFloor: 1 }, ease: 'glide',
    p: [DROP.x, 0.330, DROP.z], t: [-2.50, -0.10, 1.62], fov: 44, near: 0.02,
    sample: 3.40, round: 1, exposure: 0.62, accent: 0.34, scan: 0.45, cut: SOFFIT, fog: F_ROOM },
  { at: A('floor', 0.5818), key: 'floor', w: { dFloor: 1 }, ease: 'quick',
    /* Inside the assembly: L01 finished floor is 0.2575, the slab soffit
       0.0598 under it. This eye is between the two. */
    p: [DROP.x, 0.2280, DROP.z], t: [-2.41, -0.22, 1.47], fov: 46, near: 0.015,
    sample: 3.90, round: 0, /* Sixty centimetres of concrete has no light in it.

       This frame was tuned three times and the last correction was to stop
       trying to put a drawing in it. Inside the assembly the camera is
       pressed against the soffit: the slab genuinely does fill the
       viewport (archScene.setInside draws it), and a horizontal section
       line cannot be drawn on a horizontal soffit seen from directly above
       it, because their intersection is the whole plane rather than a
       line. What is truthful here is DARKNESS, briefly, with the two
       labels the model can actually support — and the section plane
       parked at the soffit so that it draws a real band across the walls
       on the frames either side of this one, entering and leaving.

       The fog closes to half a world unit as well, so nothing from the
       storey above or below leaks into a space that has neither. */
    exposure: 0.16, accent: 0.16, scan: 1, cut: SOFFIT, solid: 1,
    fog: [0.12, 0.62] },
  { at: A('floor', 0.8364), key: 'floor', w: { dFloor: 1 }, ease: 'quick',
    p: [DROP.x, -0.120, DROP.z], t: [-2.38, -0.62, 1.44], fov: 42, near: 0.02,
    exposure: 0.46, accent: 0.38, scan: 0.55, cut: SOFFIT, fog: F_ROOM },
  { at: A('under', 0), key: 'floor', w: { dUnder: 1 }, ease: 'glide',
    /* Through L00's floor at −0.4902 and the excavated pad at −0.55. */
    p: [DROP.x, -0.760, DROP.z], t: [-2.20, -1.24, 1.24], fov: 38, near: 0.03,
    exposure: 0.56, accent: 0.26, scan: 0.30, fog: F_DEEP },

  /* ---- 07 UNDERWORLD — under the site ----
     The camera does not travel across to a viewpoint: it KEEPS FALLING,
     and what changes is where it is looking. By the second key it is a
     metre and a half under the lowest ground on the parcel, with the
     terrain overhead as a ceiling and the building above that as a ghost.
     Written as pure Y travel on purpose — see auditPath(). */
  { at: A('under', 0.4911), key: 'measure', w: { dUnder: 1 }, ease: 'glide',
    p: [DROP.x, -1.95, DROP.z], t: [-1.20, -1.55, 0.20], fov: 33, near: 0.1,
    exposure: 0.40, accent: 0.18, scan: 0.26, fog: F_DEEP },
  { at: A('volume', 0), key: 'measure', w: { dUnder: 1 }, ease: 'hold',
    p: [DROP.x, -2.40, DROP.z], t: [-1.10, -1.62, 0.10], fov: 32, near: 0.1,
    exposure: 0.38, accent: 0.18, scan: 0.26, fog: F_DEEP },

  /* ---- 08 VOLUME — the computed cut becomes the subject ----
     Straight back along the horizontal projection of the view axis, which
     is a dolly and has no lateral component by construction — and, like
     the approach, keyed at a constant RATIO rather than at a constant
     distance, because a dolly-back decelerates in apparent size exactly
     as a dolly-in accelerates. 2.1 units off the subject, then 3.4, then
     5.7. */
  { at: A('volume', 0.20), key: 'volume', w: { dVolume: 1 }, ease: 'glide',
    p: [-3.28, -2.31, 2.45], t: [-0.95, -1.50, 0.06], fov: 31, near: 0.1,
    exposure: 0.40, accent: 0.20, scan: 0.34, fog: [5, 22] },
  { at: A('volume', 0.50), key: 'volume', w: { dVolume: 1 }, ease: 'glide',
    p: [-4.71, -2.15, 3.99], t: [-0.70, -1.30, 0.00], fov: 31, near: 0.1,
    exposure: 0.40, accent: 0.18, scan: 0.34, fog: [6, 26] },
  { at: A('volume', 0.85), key: 'volume', w: { dVolume: 1 }, ease: 'hold',
    p: [-4.94, -2.16, 4.24], t: [-0.70, -1.30, 0.00], fov: 31, near: 0.1,
    exposure: 0.40, accent: 0.18, scan: 0.34, fog: [6, 26] },

  /* ---- 09/10/11 ASCENT — up through the levels, in structure ----
     A dolly IN, through the subject and out under the building, which is
     where the rise begins. */
  { at: A('ascent', 0.0306), key: 'ascent', w: { dAscent: 1 }, ease: 'glide',
    p: [-0.40, -0.72, 1.70], t: [1.70, -0.50, -0.90], fov: 40, near: 0.03,
    exposure: 0.50, accent: 0.28, scan: 0.45, fog: [3, 16] },
  { at: A('ascent', 0.2245), key: 'L00', w: { dAscent: 1 }, ease: 'glide',
    p: [-0.40, floorY('L00') + 0.28, 1.52], t: [1.70, 0.02, -0.90], fov: 40, near: 0.03,
    exposure: 0.50, accent: 0.28, scan: 0.45, fog: [3.4, 18] },
  { at: A('ascent', 0.5), key: 'L01', w: { dAscent: 1 }, ease: 'glide',
    p: [-0.40, floorY('L01') + 0.28, 1.44], t: [1.70, 0.60, -0.90], fov: 40, near: 0.03,
    exposure: 0.50, accent: 0.28, scan: 0.45, fog: [3.8, 20] },
  { at: A('ascent', 0.7755), key: 'L02', w: { dAscent: 1 }, ease: 'glide',
    p: [-0.40, floorY('L02') + 0.28, 1.38], t: [1.70, 1.24, -0.90], fov: 40, near: 0.03,
    exposure: 0.50, accent: 0.28, scan: 0.45, fog: [4.2, 22] },

  /* ---- 12 PERSPECTIVE COLLAPSE — the space becomes a drawing ---- */
  /* From here to the drawing the eye stays on the target's own X. Looking
     straight down, the screen's up vector is whatever is left of the world
     up after the view direction is removed from it — so a camera offset
     sideways from a top-down target lands the plan on screen ROTATED, by
     the angle of that offset. It is the "rotated diamond" the presets file
     already warns about, and the fix is not to introduce the offset. */
  { at: A('collapse', 0.3699), key: 'above', w: { dCollapse: 1 }, ease: 'glide',
    p: [0.00, 2.90, 1.90], t: [0.20, 1.05, 0.30], fov: 36, near: 0.1,
    exposure: 0.58, accent: 0.34, focus: 'L01', fog: [10, 40] },
  { at: A('collapse', 0.6712), key: 'collapse', w: { dCollapse: 1 }, ease: 'glide',
    p: [0.42, 7.40, 2.70], t: [0.42, PY, 0.42], fov: 28, near: 0.2,
    ortho: 0.34, exposure: 0.72, accent: 0.50, focus: 'L01', fog: [24, 80] },
  { at: A('plan', 0), key: 'collapse', w: { dCollapse: 1 }, ease: 'glide',
    p: [0.42, 12.10, 1.20], t: [0.42, PY, 0.42], fov: 24, near: 0.4,
    ortho: 0.80, exposure: 0.88, accent: 0.70, focus: 'L01', fog: F_DRAW },

  /* ---- 13 THE DRAWING — orthographic, and the layout system ---- */
  { at: A('plan', 0.48), key: 'plan', sheet: 1, w: { dPlan: 1 }, ease: 'glide',
    p: [0.42, 16.60, 0.62], t: [0.42, PY, 0.42], fov: 21, near: 0.5,
    ortho: 1, accent: 0.85, focus: 'L01', fog: F_DRAW },
  { at: A('apart', 0), key: 'plan', sheet: 1, w: { dPlan: 1 }, ease: 'hold',
    p: [0.42, 16.60, 0.58], t: [0.42, PY, 0.42], fov: 21, near: 0.5,
    ortho: 1, accent: 0.85, focus: 'L01', fog: F_DRAW },

  /* ---- 14 DISASSEMBLY — the sheet comes apart by layer ----
     The camera tilts about 18° off vertical here, and that is the whole
     reason the disassembly can be VERTICAL: seen from straight down, a
     layer lifted off the sheet has not moved at all. */
  { at: A('field', 0), key: 'apart', sheet: 1, w: { dApart: 1 }, ease: 'glide',
    /* 16 degrees off vertical at EXACTLY the plan camera's radius, so the
       frame does not travel — it tips. In an orthographic projection that
       is the only move that can make a vertical separation visible, and it
       is the one orbit the whole route is allowed. */
    p: [0.42, 14.95, 7.56], t: [0.42, PY, 0.42], fov: 21, near: 0.5,
    ortho: 1, apart: 1, accent: 0.85, focus: 'L01', fog: F_DRAW },

  /* ---- 15 DATA FIELD — the drawing has become its own contents ---- */
  { at: A('final', 0), key: 'field', sheet: 1, w: { dField: 1 }, ease: 'hold',
    p: [0.42, 14.42, 8.57], t: [0.42, PY, 0.42], fov: 21, near: 0.5,
    ortho: 1, apart: 1, accent: 0.85, focus: 'L01', fog: F_DRAW },

  /* ---- 16 RESOLUTION — back to the building ----
     A DESCENT onto the site, not a move around to a better angle: the
     camera comes down out of the drawing along the axis it was already
     tipped along, and the building is standing where it was left. */
  { at: A('final', 0.3373), key: 'resolve', sheet: 1, w: { dResolve: 1 }, ease: 'quick',
    p: [2.60, 7.20, 16.40], t: [-0.15, 0.34, 0.10], fov: 27, near: 0.5,
    ortho: 0.10, accent: 0.55, fog: [26, 74] },
  { at: A('final', 1), key: 'final', w: { dResolve: 1 }, ease: 'glide',
    p: [4.80, 6.40, 21.80], t: [-0.20, 0.30, 0.00], fov: 31, near: 0.5,
    ortho: 0, accent: 1, fog: [26, 74] },
];

/* ============================================================
   THE MOBILE EDIT — PART 25

   Not the desktop route at a different aspect. A phone is held close,
   read fast and scrolled with a thumb, and the two things that do not
   survive the translation are LONG TRAVEL and SMALL SUBJECTS.

   So this is a CUT of the same journey rather than a compression of it:
   the same nine movements in the same order, with the intermediate frames
   removed and the remaining ones held longer. Where the desktop glides
   through four keys the phone takes two, which turns those segments into
   near-cuts — deliberately, because a cut is legible on a phone and a
   four-second dolly is not.

   Every frame is also CLOSER. The exterior key is 40% nearer than the
   desktop's, the ascent reads ONE level at a time rather than three going
   past, and the interior keeps the desktop's eye position because the
   room is already the right size for the frame. No frame in this list
   contains the whole building at a size a thumb could cover.
   ============================================================ */
export const PATH_MOBILE = [
  { at: A('entry', 0), key: 'exterior', w: { dExterior: 1 }, ease: 'glide',
    p: [9.40, 4.20, 11.60], t: [-0.30, 0.42, 0.10], fov: 40, near: 0.4, fog: F_SITE },
  { at: A('entry', 0.46), key: 'exterior', w: { dExterior: 1 }, ease: 'hold',
    p: [8.20, 3.70, 10.20], t: [-0.40, 0.46, 0.20], fov: 40, near: 0.4, fog: F_SITE },

  { at: A('entry', 0.96), key: 'approach', w: { dApproach: 1 }, ease: 'quick',
    p: [-0.90, 1.05, 4.10], t: [-2.00, 0.62, 2.30], fov: 46, near: 0.2, fog: F_SITE },

  { at: A('glass', 0.85), key: 'glass', w: { dGlass: 1 }, ease: 'quick',
    p: [-2.00, 0.585, 2.42], t: [-2.14, 0.55, 1.20], fov: 52, near: 0.04,
    cross: 1, exposure: 0.52, accent: 0.34, scan: 0.30, fog: F_ROOM },

  { at: A('interior', 0.3556), key: 'interior', w: { dInterior: 1 }, ease: 'glide',
    p: [-2.08, EYE, 1.90], t: [-3.00, 0.470, 1.02], fov: 52, near: 0.02,
    exposure: 0.60, accent: 0.30, scan: 0.35, fog: F_ROOM },
  { at: A('capture', 0), key: 'interior', w: { dInterior: 1 }, ease: 'hold',
    p: [-2.24, EYE, 1.78], t: [-3.04, 0.462, 1.00], fov: 51, near: 0.02,
    exposure: 0.60, accent: 0.30, scan: 0.35, fog: F_ROOM },

  { at: A('capture', 0.56), key: 'capture', w: { dCapture: 1 }, ease: 'glide',
    p: [-2.34, EYE, 1.70], t: [-3.06, 0.470, 1.66], fov: 54, near: 0.02,
    sample: 0.05, round: 1, exposure: 0.60, accent: 0.30, scan: 0.35, fog: F_ROOM },
  { at: A('capture', 0.86), key: 'capture', w: { dCapture: 1 }, ease: 'glide',
    p: [-2.40, EYE, 1.52], t: [-2.96, 0.360, 1.80], fov: 58, near: 0.02,
    sample: 1.90, round: 1, exposure: 0.61, accent: 0.32, scan: 0.40, fog: F_ROOM },
  { at: A('floor', 0), key: 'capture', w: { dCapture: 1 }, ease: 'glide',
    p: [DROP.x, 0.548, DROP.z], t: [-2.86, 0.180, 1.72], fov: 60, near: 0.02,
    sample: 2.80, round: 1, exposure: 0.62, accent: 0.34, scan: 0.45, fog: F_ROOM },

  /* Two keys through the assembly rather than four. On a phone the slab
     is a darkening and a return, and that reads better than a four-frame
     dolly through 60 cm of concrete — but the LOOK DOWN still gets its
     own key, because a pitch that fast is a whip on any screen. */
  { at: A('floor', 0.32), key: 'floor', w: { dFloor: 1 }, ease: 'glide',
    p: [DROP.x, 0.352, DROP.z], t: [-2.54, -0.12, 1.60], fov: 64, near: 0.02,
    sample: 3.40, round: 1, exposure: 0.50, accent: 0.30, scan: 0.70, cut: SOFFIT,
    fog: [0.9, 5] },
  { at: A('floor', 0.62), key: 'floor', w: { dFloor: 1 }, ease: 'quick',
    p: [DROP.x, 0.2280, DROP.z], t: [-2.41, -0.24, 1.47], fov: 66, near: 0.015,
    sample: 3.90, round: 0, exposure: 0.16, accent: 0.16, scan: 1, cut: SOFFIT, solid: 1,
    fog: [0.12, 0.62] },
  { at: A('under', 0), key: 'floor', w: { dUnder: 1 }, ease: 'quick',
    p: [DROP.x, -0.780, DROP.z], t: [-2.20, -1.26, 1.24], fov: 58, near: 0.03,
    exposure: 0.56, accent: 0.26, scan: 0.30, fog: F_DEEP },

  { at: A('under', 0.5089), key: 'measure', w: { dUnder: 1 }, ease: 'glide',
    p: [DROP.x, -1.95, DROP.z], t: [-1.20, -1.55, 0.20], fov: 42, near: 0.1, fog: F_DEEP },
  { at: A('volume', 0), key: 'measure', w: { dUnder: 1 }, ease: 'hold',
    p: [DROP.x, -2.34, DROP.z], t: [-1.10, -1.62, 0.10], fov: 41, near: 0.1, fog: F_DEEP },

  { at: A('volume', 0.2949), key: 'volume', w: { dVolume: 1 }, ease: 'glide',
    p: [-3.90, -2.05, 3.40], t: [-0.70, -1.30, 0.00], fov: 50, near: 0.1,
    exposure: 0.40, accent: 0.18, scan: 0.34, fog: [6, 26] },
  { at: A('volume', 0.6538), key: 'volume', w: { dVolume: 1 }, ease: 'hold',
    p: [-4.10, -2.06, 3.62], t: [-0.70, -1.30, 0.00], fov: 50, near: 0.1,
    exposure: 0.40, accent: 0.18, scan: 0.34, fog: [6, 26] },

  /* The ascent is three CROPS, one storey each, rather than one long rise
     past all three. The camera is inside the plate it is naming. */
  { at: A('ascent', 0.2245), key: 'L00', w: { dAscent: 1 }, ease: 'quick',
    p: [-0.30, floorY('L00') + 0.26, 1.30], t: [1.50, 0.00, -0.70], fov: 62, near: 0.03,
    exposure: 0.50, accent: 0.28, scan: 0.45, fog: [3.4, 16] },
  { at: A('ascent', 0.5), key: 'L01', w: { dAscent: 1 }, ease: 'quick',
    p: [-0.30, floorY('L01') + 0.26, 1.26], t: [1.50, 0.58, -0.70], fov: 62, near: 0.03,
    exposure: 0.50, accent: 0.28, scan: 0.45, fog: [3.8, 18] },
  { at: A('ascent', 0.7755), key: 'L02', w: { dAscent: 1 }, ease: 'quick',
    p: [-0.30, floorY('L02') + 0.26, 1.22], t: [1.50, 1.22, -0.70], fov: 62, near: 0.03,
    exposure: 0.50, accent: 0.28, scan: 0.45, fog: [4.2, 20] },

  { at: A('collapse', 0.7808), key: 'collapse', w: { dCollapse: 1 }, ease: 'glide',
    p: [0.42, 22.00, 7.20], t: [0.42, PY, 0.42], fov: 34, near: 0.2,
    ortho: 0.42, exposure: 0.72, accent: 0.50, focus: 'L01', fog: [24, 80] },

  /* THE DRAWING HAS TO FIT, AND ON A PHONE THAT IS ARITHMETIC.

     The orthographic box is solved from the distance and the field —
     halfHeight = distance x tan(fov/2), halfWidth = that x aspect — so on
     a 0.46 aspect the binding constraint is the WIDTH. The L01 sheet is
     7.25 world units across including its dimension lines, so the box
     needs a half-width of at least 3.63, which needs a half-height of 7.9,
     which at 26 degrees needs a distance of 34. Below that the drawing
     does not crop gracefully: it loses its dimension lines and then its
     east wall. */
  { at: A('plan', 0.5333), key: 'plan', sheet: 1, w: { dPlan: 1 }, ease: 'glide',
    p: [0.42, 37.30, 0.60], t: [0.42, PY, 0.42], fov: 26, near: 0.5,
    ortho: 1, accent: 0.85, focus: 'L01', fog: F_DRAW },
  { at: A('apart', 0), key: 'plan', sheet: 1, w: { dPlan: 1 }, ease: 'hold',
    p: [0.42, 37.30, 0.56], t: [0.42, PY, 0.42], fov: 26, near: 0.5,
    ortho: 1, accent: 0.85, focus: 'L01', fog: F_DRAW },

  /* The same single tilt, at the portrait radius. */
  { at: A('field', 0), key: 'apart', sheet: 1, w: { dApart: 1 }, ease: 'glide',
    p: [0.42, 33.56, 16.64], t: [0.42, PY, 0.42], fov: 26, near: 0.5,
    ortho: 1, apart: 1, accent: 0.85, focus: 'L01', fog: F_DRAW },
  { at: A('final', 0), key: 'field', sheet: 1, w: { dField: 1 }, ease: 'hold',
    p: [0.42, 32.35, 18.92], t: [0.42, PY, 0.42], fov: 26, near: 0.5,
    ortho: 1, apart: 1, accent: 0.85, focus: 'L01', fog: F_DRAW },

  { at: A('final', 0.3373), key: 'resolve', sheet: 1, w: { dResolve: 1 }, ease: 'quick',
    p: [1.60, 5.80, 12.60], t: [-0.15, 0.36, 0.10], fov: 36, near: 0.5,
    ortho: 0.10, accent: 0.55, fog: [26, 74] },
  { at: A('final', 1), key: 'final', w: { dResolve: 1 }, ease: 'glide',
    p: [2.90, 4.60, 15.40], t: [-0.25, 0.34, 0.00], fov: 40, near: 0.4,
    ortho: 0, accent: 1, fog: [26, 74] },
];

/* ============================================================
   REDUCED MOTION — PART 26

   Five frames, cut between. Not the path sampled at five points: a
   travelling camera sampled anywhere is still a travelling camera's
   composition, and what a reader who has asked for no motion needs is
   five pictures each of which is complete on its own.

   Every narrative beat of the journey is present in one of them, and the
   copy is unchanged — only the movement is gone.
   ============================================================ */
export const STILLS = {
  exterior: { w: { dExterior: 1 }, p: [13.60, 5.90, 17.20], t: [-0.20, 0.30, 0.00],
    fov: 31, near: 0.5, ortho: 0, fog: F_SITE },
  interior: { w: { dCapture: 1 }, p: [-2.14, EYE, 1.86], t: [-3.00, 0.470, 1.02],
    fov: 42, near: 0.02, ortho: 0, sample: 3.2, round: 1, exposure: 0.60, accent: 0.30, scan: 0.35, fog: F_ROOM },
  terrain: { w: { dVolume: 1 }, p: [-4.71, -2.15, 3.99], t: [-0.70, -1.30, 0.00],
    fov: 31, near: 0.1, ortho: 0, fog: [6, 26] },
  plan: { sheet: 1, w: { dPlan: 1 }, p: [0.42, 16.60, 0.62], t: [0.42, PY, 0.42],
    fov: 21, near: 0.5, ortho: 1, fog: F_DRAW },
  data: { sheet: 1, w: { dField: 1 }, p: [0.42, 14.42, 8.57], t: [0.42, PY, 0.42],
    fov: 21, near: 0.5, ortho: 1, apart: 1, fog: F_DRAW },
};

/* ============================================================
   SAMPLING THE PATH
   ============================================================ */

const EASE = {
  /* Nearly linear. Most of the route is one body moving at one speed, and
     easing every segment turns continuous travel into a series of arrivals. */
  glide: (t) => t,
  /* Sits down at the end of the segment and stays there. */
  hold: (t) => 1 - (1 - t) * (1 - t) * (1 - t),
  /* Leaves fast, lands fast: the closest thing to a cut that is still
     continuous. Used at the glass and inside the slab. */
  quick: (t) => (t < 0.5 ? 4 * t * t * t : 1 - ((-2 * t + 2) ** 3) / 2),
};

const lerp = (a, b, k) => a + (b - a) * k;
const lerp3 = (a, b, k) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];
const num = (k, key, dflt = 0) => (k[key] === undefined ? dflt : k[key]);

/**
 * The journey's state at a progress along its track.
 * Pure: give it the same number twice and it returns the same frame.
 *
 * @param {number} at 0 → 1 along the journey
 * @param {Array} path PATH or PATH_MOBILE
 */
export function sampleDescent(at, path = PATH) {
  const p = Math.max(0, Math.min(1, at));
  let i = 0;
  while (i < path.length - 2 && path[i + 1].at <= p) i++;
  const a = path[i];
  const b = path[Math.min(path.length - 1, i + 1)];
  const span = Math.max(1e-6, b.at - a.at);
  const raw = Math.max(0, Math.min(1, (p - a.at) / span));
  const k = (EASE[b.ease] || EASE.glide)(raw);

  /* Weights blend across the WHOLE segment, so no two adjacent layer sets
     ever cut. The camera uses the segment's own curve; the layers use a
     smoothstep of it, because a layer that changes at the camera's
     acceleration reads as flicker during `quick`. */
  const kw = k * k * (3 - 2 * k);
  const w = {};
  for (const key in a.w) w[key] = (w[key] || 0) + a.w[key] * (1 - kw);
  for (const key in b.w) w[key] = (w[key] || 0) + b.w[key] * kw;

  return {
    key: kw < 0.5 ? a.key : b.key,
    w,
    p: lerp3(a.p, b.p, k),
    t: lerp3(a.t, b.t, k),
    fov: lerp(a.fov, b.fov, k),
    near: lerp(num(a, 'near', 0.5), num(b, 'near', 0.5), k),
    ortho: lerp(num(a, 'ortho'), num(b, 'ortho'), kw),
    cross: lerp(num(a, 'cross'), num(b, 'cross'), k),
    /* A sampling round only ever grows, and it stops GATING before it
       stops existing — see the note on `round` above. */
    sample: lerp(num(a, 'sample', 0), num(b, 'sample', a.sample ?? 0), k),
    round: lerp(num(a, 'round'), num(b, 'round'), kw),
    apart: lerp(num(a, 'apart'), num(b, 'apart'), kw),
    sheet: lerp(num(a, 'sheet'), num(b, 'sheet'), kw),
    fog: [lerp(a.fog[0], b.fog[0], kw), lerp(a.fog[1], b.fog[1], kw)],
    exposure: lerp(num(a, 'exposure', 1), num(b, 'exposure', 1), kw),
    accent: lerp(num(a, 'accent', 1), num(b, 'accent', 1), kw),
    scan: lerp(num(a, 'scan', 1), num(b, 'scan', 1), kw),
    solid: lerp(num(a, 'solid'), num(b, 'solid'), k),
    cut: a.cut === undefined && b.cut === undefined ? null
      : lerp(num(a, 'cut', num(b, 'cut', 0)), num(b, 'cut', num(a, 'cut', 0)), k),
    focus: kw < 0.5 ? (a.focus ?? null) : (b.focus ?? null),
  };
}

/* ============================================================
   THE AUDIT — PART 21

   "Explicitly audit every major animated object. Do not use horizontal
   sliding as the primary transition."

   The camera is the major animated object of this phase, so the audit is
   arithmetic rather than an opinion: for every segment of the path,
   compare the LATERAL travel — motion across the view, which is what
   reads as sliding — against the travel along the view axis and on Y.

   A segment passes if the lateral component is not the largest of the
   three, or if the whole segment is short enough that no direction of it
   reads as a transition at all.
   ============================================================ */

const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const norm = (v) => {
  const l = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / l, v[1] / l, v[2] / l];
};

/** Per-segment decomposition of the travel. Used by the test and by QA. */
export function auditPath(path = PATH, { minor = 0.35 } = {}) {
  const rows = [];
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1], b = path[i];
    const move = sub(b.p, a.p);
    const len = Math.hypot(...move);
    /* The view axis at the START of the segment: "forward" is where the
       camera was already looking when it set off. */
    const fwd = norm(sub(a.t, a.p));
    const up = [0, 1, 0];
    const right = norm([
      fwd[1] * up[2] - fwd[2] * up[1],
      fwd[2] * up[0] - fwd[0] * up[2],
      fwd[0] * up[1] - fwd[1] * up[0],
    ]);
    const depth = Math.abs(dot(move, fwd));
    const vert = Math.abs(move[1]);
    const lat = Math.abs(dot(move, right));

    /* ----------------------------------------------------------------
       A TILT IS NOT A SLIDE.

       The one thing the metric above cannot tell apart on its own is a
       camera moving PAST a subject from a camera moving AROUND one. Both
       are lateral in the frame; only the first is the slideshow grammar
       this phase exists to get rid of.

       An orbit is exactly identifiable: the target does not move and the
       radius does not change. Under an orthographic projection it is also
       the only move that can reveal a vertical separation at all, which is
       why the route is allowed precisely one — and why the count is
       asserted rather than left to judgement.
       ---------------------------------------------------------------- */
    const ra = Math.hypot(...sub(a.p, a.t));
    const rb = Math.hypot(...sub(b.p, b.t));
    const targetHeld = Math.hypot(...sub(b.t, a.t)) < 0.02;
    const orbit = len > minor && targetHeld && Math.abs(rb - ra) < ra * 0.04;

    rows.push({
      from: a.key, to: b.key, at: b.at, len,
      depth, vert, lat, orbit,
      /* Short segments are not transitions: below `minor` world units
         nothing about the frame has travelled far enough to read as a
         direction at all. */
      lateralDominant: len > minor && !orbit && lat > depth && lat > vert,
    });
  }
  return rows;
}

/**
 * Where the keys named `names` fall inside the state `key`, as fractions
 * of it. The ascent's three level marks are typeset from this: a mark that
 * peaks anywhere else is a level number appearing beside a different floor,
 * and the only way to be sure it does not is to read the camera path.
 */
export function markFractions(key, names, path = PATH) {
  const c = chapterRanges().find((r) => r.key === key);
  if (!c) return names.map(() => 0.5);
  return names.map((n) => {
    const k = path.find((x) => x.key === n);
    return k ? Math.max(0, Math.min(1, (k.at - c.a) / (c.b - c.a))) : 0.5;
  });
}

/** Every segment whose primary direction is sideways. Should be empty. */
export const lateralSegments = (path = PATH) =>
  auditPath(path).filter((r) => r.lateralDominant);

/** Every segment that turns around the subject. At most one, in the plan. */
export const orbitSegments = (path = PATH) =>
  auditPath(path).filter((r) => r.orbit);

/** Is the route continuous — does each key start where the last one ended? */
export function pathGaps(path = PATH, tol = 1e-9) {
  const bad = [];
  for (let i = 1; i < path.length; i++) {
    if (path[i].at < path[i - 1].at - tol) {
      bad.push(`key ${i} (${path[i].key}) runs backwards along the track`);
    }
  }
  if (Math.abs(path[0].at) > tol) bad.push('the path does not start at 0');
  if (Math.abs(path[path.length - 1].at - 1) > tol) bad.push('the path does not end at 1');
  return bad;
}
