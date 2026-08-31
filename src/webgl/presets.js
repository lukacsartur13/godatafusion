import { heightAt } from './field.js';
import { STATIONS, PLAN, planY, roofY } from './geometry.js';

/* ============================================================
   THE PRESET TABLES

   Extracted from scene.js in Phase 3 so the service pages can read the
   same states the homepage narrative reads. `captureClose`, `measureClose`
   and `planTight` are literally the states the three service pages open
   in — a service page is a deeper reading of one homepage state, not a
   second visual system.
   ============================================================ */

export const S0 = STATIONS[0];
export const S0Y = heightAt(S0[0], S0[1]);

/* ---------------- camera presets — [position, target] ---------------- */
export const VIEWS = {
  /* PHASE 7 — the hero was recomposed, not zoomed.
     Phase 6 sat at y 9.2 looking at t.y 0.4: a camera ABOVE the building
     aimed at the middle of the abstract volumes, which is why the furnished
     storey read as a band under a stack of empty boxes and why the frame's
     largest single object was a blank roof.
     Dropping the eye to 4.1 and the target to −0.24 turns the frame through
     about twenty degrees, and three things follow from that one move: the
     facade is seen nearly straight on, so the window openings become
     openings rather than slots; the sectional cut over the south row
     (webgl/archScene.js) is looked INTO rather than across; and the tall
     massing rises out of the frame instead of filling it.
     Chosen from screenshots at 1440x900, not from these numbers — see
     qa/shots/sheet-hero-light.png for the four that were compared. */
  /* PHASE 8 — retuned for a building that is now 12.30 m tall.
     Phase 7 aimed at t.y −0.24, which was the middle of a single 4.92 m
     storey. Three levels put the middle of the building at about +0.34, and
     leaving the target where it was cropped the roof and put the ground
     floor in the centre of the frame — the exact opposite of a composition
     that has to read GROUND + LEVEL 01 + LEVEL 02.
     Chosen from screenshots at 1440x900 against the four options Part 08
     asks for: low axonometric, 3/4 cutaway, elevated axonometric and
     sectional corner. The 3/4 cutaway won on all three counts that matter —
     all three storeys legible, the rotating section looked INTO rather than
     across, and the headline untouched. See qa/shots/p8hero-desk-0*.png. */
  idle:     { p: [12.4,  5.2, 16.4], t: [-0.2,  0.34, 0.0] },
  /* CAPTURE keeps the same eye level. It has to be recognisably the same
     view of the same building with data over it, which is the whole claim
     of the mode — a different camera would make it a different place. */
  capture:  { p: [11.0,  4.8, 15.3], t: [0.0,  0.36, 0.20] },
  /* MEASURE stays terrain-first, and a taller building is a reason to pull
     BACK rather than up: the parcel has to keep the frame it had in Phase 7
     or the mode's subject changes from the ground to the object on it. */
  measure:  { p: [19.4,  8.4, 15.6], t: [0, -0.05, 0] },
  /* Phase 1 sat at y:25 and the drawing read as a distant texture. This is
     tight enough for the plan to be a dominant element, but not so tight
     that the headline crops it — the whole drawing has to be legible AS a
     drawing. The truly close read belongs to the QUANTIFY chapter, where
     the text column is narrow and `planTight` can own the frame. The target
     is offset left of the plan so the drawing renders clear of the type, and
     the tilt is held near 10° off vertical — any more and a horizontal plane
     fills the frame as a trapezoid instead of reading as a drawing. The offset
     is kept on ONE axis too: a diagonal XZ offset renders the rectangular plan
     as a rotated diamond rather than a screen-aligned architectural drawing. */
  /* PHASE 8 — QUANTIFY IN THE HERO IS AN EXPLODED AXONOMETRIC.

     Phase 7's near-vertical camera was the right answer for ONE plan and is
     the wrong answer for three: separation is vertical, and a camera looking
     straight down projects vertical separation to nothing. Held at 10° off
     vertical the three sheets landed exactly on top of each other and the
     mode showed an illegible tangle of three drawings — verified in
     qa/shots/p8state-d1440-quantify.png before this change.

     So the hero tilts to about 50° and the levels separate. That is Part
     13's "ALL — use exploded axonometric", and it is also the only frame on
     the site that shows the three drawings belong to one building.

     The QUANTIFY PAGE keeps the near-vertical camera, because there a
     single floor is selected and a single floor is a DRAWING. */
  quantify: { p: [7.6, 12.2, 12.6], t: [-0.9, 0.62, -0.3] },

  physical:   { p: [16.4,  6.0, 15.8], t: [0, 0.30, 0] },
  cloud:      { p: [11.8,  8.0, 16.0], t: [0.2, 0.75, 0.3] },
  processing: { p: [15.2,  9.4, 15.4], t: [0, 0.45, 0] },
  data:       { p: [12.2, 13.4, 12.6], t: [0, 0.05, 0] },
  /* DECISION is the end of the story, so it has to be the CLEAREST frame on
     the page, not the faintest. Near top-down (≈13° tilt) so the drawing
     reads flat and resolved rather than as an oblique tangle. */
  /* DECISION is the end of the story and has to be the CLEAREST frame on
     the page. One sheet, near top-down — the scroll narrative sets the
     ground floor alone here, so it is a drawing again rather than a stack. */
  decision:   { p: [-0.4, 15.6,  3.2], t: [-0.4, planY('L00'), -0.3] },

  // Camera travels to the primary capture station; the panorama resolves around it.
  /* Close enough for the panorama to resolve around the station, far enough
     that the point cloud stops filling the frame — point size scales with
     1/distance, so a very near camera turns the cloud into a wall. */
  captureClose: { p: [S0[0] + 6.4, S0Y + 4.6, S0[1] + 7.8], t: [S0[0], S0Y + 0.85, S0[1]] },
  measureClose: { p: [11.4, 6.2, 10.0], t: [-0.8, -0.35, -0.6] },
  // The drawing becomes the viewport.
  planTight:    { p: [0.42, 13.59, 3.22], t: [0.42, planY('L01'), 0.42] },

  /* ---- PHASE 3: the service-page states ----
     A service page is a deeper reading of one homepage state, so its
     states are more presets over the SAME layer stack rather than a
     second scene. Adding them here costs the homepage nothing — an
     unweighted preset is an unread table row. */

  // /360-camera/ — the site as a set of capture positions, then inside one.
  capSite:    { p: [12.6, 9.4, 15.2], t: [0.2, 0.45, 0.2] },
  capStation: { p: [S0[0] + 4.9, S0Y + 3.4, S0[1] + 6.0], t: [S0[0], S0Y + 0.9, S0[1]] },
  capReturn:  { p: [8.8, 13.2, 13.0], t: [0.1, 0.10, 0.1] },

  // /teruletfelmeres/ — ground read from a low, raking angle, then resolved.
  /* Close enough that the ground fills the frame and the fog band does not
     eat it: the parcel is 16 units across and the fog starts at 21, so a
     camera 20+ units out washes out the far half of the site. */
  /* PHASE 8 — pulled back and lifted. Phase 7's camera sat 15 units out from
     a 4.9 m object; the same camera against a 12.3 m one puts the building
     across the whole frame and leaves the parcel as a strip under it. */
  mSurface:  { p: [14.8,  7.2, 13.4], t: [-0.3, -0.35, -0.3] },
  mContours: { p: [10.2,  9.8, 10.6], t: [-0.3, -0.45, -0.3] },
  /* Pulled back and lifted from Phase 3's [9.8, 4.8, 8.6]: the cut body
     is a parcel-wide prism, and from a low near camera its top face left
     the frame entirely — the state showed a cut without showing a volume. */
  mVolume:   { p: [14.0,  8.4, 12.2], t: [-0.6, -0.50, -0.4] },
  mExport:   { p: [ 6.6, 13.0,  8.2], t: [-0.3, -0.50, -0.3] },

  // /mennyisegszamitas/ — the drawing owns the frame from the first state.
  qDrawing:   { p: [0.42, 13.59, 3.22], t: [0.42, planY('L01'), 0.42] },
  qIdentify:  { p: [0.42, 12.10, 2.95], t: [0.42, planY('L01'), 0.42] },
  qStructure: { p: [0.42, 12.90, 3.10], t: [0.42, planY('L01'), 0.42] },
  qQuantity:  { p: [0.42, 13.90, 3.30], t: [0.42, planY('L01'), 0.42] },

  /* PHASE 8 — the QUANTIFY page's fifth state, reached only by choosing
     ÖSSZES on the floor selector. Everything else on that page is a DRAWING
     and gets the near-vertical camera; this one is a BUILDING taken apart,
     and vertical separation seen from directly above is no separation at
     all. Same direction as the homepage's QUANTIFY hero, so the two frames
     are recognisably the same view of the same stack. */
  qExploded:  { p: [7.6, 12.2, 12.6], t: [-0.9, 0.62, -0.3] },

  /* ================================================================
     PHASE 11 — THE DATA DESCENT

     Fourteen more rows over the same table. What is different about them
     is that THE JOURNEY DOES NOT READ THE CAMERAS: the descent owns its
     own camera, continuously, from webgl/descent.js, because a route
     through a building is a path and not a set of viewpoints to blend
     between.

     These entries exist so that the blend pass has a camera for every
     weighted name — and so that a journey state has a sane frame if it is
     ever weighted with the path switched off, which is what the QA
     storyboard harness does. They are the path's own anchors.

     The LAYER rows below are the ones that matter, and those the journey
     reads exactly as every other state block on this site does.
     ================================================================ */
  dExterior: { p: [13.60, 5.90, 17.20], t: [-0.20, 0.30, 0.00] },
  dApproach: { p: [-1.30, 0.86, 4.30], t: [-2.00, 0.60, 2.30] },
  dGlass:    { p: [-1.96, 0.585, 2.44], t: [-2.10, 0.55, 1.30] },
  dInterior: { p: [-2.02, 0.5566, 1.92], t: [-2.62, 0.500, 0.98] },
  dCapture:  { p: [-2.32, 0.5566, 1.66], t: [-2.58, 0.478, 2.02] },
  dFloor:    { p: [-2.40, 0.2280, 1.50], t: [-2.41, -0.22, 1.47] },
  dUnder:    { p: [-2.40, -2.40, 1.50], t: [-1.10, -1.62, 0.10] },
  dVolume:   { p: [-4.71, -2.15, 3.99], t: [-0.70, -1.30, 0.00] },
  dAscent:   { p: [-0.40, 0.5375, 1.44], t: [1.70, 0.60, -0.90] },
  dCollapse: { p: [0.14, 12.10, 1.20], t: [0.00, planY('L01'), 0.42] },
  dPlan:     { p: [0.06, 16.60, 0.62], t: [0.00, planY('L01'), 0.42] },
  dApart:    { p: [0.02, 15.97, 4.91], t: [0.00, planY('L01'), 0.42] },
  dField:    { p: [0.02, 15.62, 6.99], t: [0.00, planY('L01'), 0.42] },
  dResolve:  { p: [4.80, 6.40, 21.80], t: [-0.20, 0.30, 0.00] },
};

/** The journey's states, in travelling order. One list, three consumers. */
export const DESCENT = [
  'dExterior', 'dApproach', 'dGlass', 'dInterior', 'dCapture', 'dFloor',
  'dUnder', 'dVolume', 'dAscent', 'dCollapse', 'dPlan', 'dApart', 'dField',
  'dResolve',
];

/* ============================================================
   ASPECT-DERIVED FRAMING

   Phase 2 hardcoded the plan cameras for ~16:9. A drawing is a planar
   object with known extents, so the distance that keeps it readable is
   arithmetic, not a magic number: solve the perspective frustum for the
   object's half-extents inside a declared safe area, on BOTH axes, and
   take whichever constraint binds.

   Only the distance is derived. The direction — which is what gives each
   state its character, the 10° tilt and the offset target — stays authored.
   That is why 2560×1080 and 1024×1366 both frame the drawing correctly
   without a single viewport exception in CSS.
   ============================================================ */

/* The plan's true extents INCLUDING its dimension lines, which are part of
   the drawing and must never crop. Derived from PLAN so a change to the
   geometry cannot silently desynchronise the framing. */
const DIM_OFF = 0.85;
const planBounds = () => {
  const x0 = PLAN.X0, x1 = PLAN.X1 + DIM_OFF;
  const z0 = PLAN.Z0, z1 = PLAN.Z1 + DIM_OFF;
  return {
    halfW: (x1 - x0) / 2,
    halfD: (z1 - z0) / 2,
    cx: (x0 + x1) / 2,
    cz: (z0 + z1) / 2,
  };
};

/* `safe` = the fraction of the half-frustum the object may occupy on each
   axis. Smaller x leaves room for the text column; smaller y leaves room
   for the headline above and the metadata baseline below. */
export const FIT = {
  /* The exploded stack is TALLER than a single sheet by two floor
     separations, and at 50° that height projects into the frame. Pulled in
     on Y so the top plate and the bottom plate both stay inside it. */
  quantify:  { safeX: 0.58, safeY: 0.56 },
  decision:  { safeX: 0.62, safeY: 0.72 },
  planTight: { safeX: 0.78, safeY: 0.74 },
  /* The QUANTIFY page has no competing text column over the canvas, so the
     drawing may take more of the frame than it can on the homepage — but it
     still leaves room for the leader lines that trail off its symbols. */
  qDrawing:   { safeX: 0.80, safeY: 0.76 },
  qIdentify:  { safeX: 0.72, safeY: 0.68 },
  qStructure: { safeX: 0.76, safeY: 0.72 },
  /* QUANTITY is the state where the numbers are the result, so the
     drawing steps back to being the reference under them rather than the
     subject over them. */
  qQuantity:  { safeX: 0.62, safeY: 0.58 },
  /* The exploded stack is two floor separations taller than one sheet, and
     the page has no competing text column over the canvas. */
  qExploded:  { safeX: 0.86, safeY: 0.56 },
};

/**
 * Distance at which a planar object of the given half-extents fits inside
 * `safe` on both axes.
 * @param {number} fovDeg vertical field of view
 * @param {number} aspect width / height
 */
export function fitDistance(fovDeg, aspect, halfW, halfD, safe) {
  const t = Math.tan((fovDeg * Math.PI) / 360);
  const dY = halfD / Math.max(1e-4, t * safe.safeY);
  const dX = halfW / Math.max(1e-4, t * aspect * safe.safeX);
  return Math.max(dY, dX);
}

/**
 * Re-solve the plan camera positions for the current viewport.
 * Mutates a COPY of the view table, so the authored values stay intact.
 * @returns {object} a view table with quantify / decision / planTight refitted
 */
export function fitViews(views, { fov, aspect, fit = FIT }) {
  const { halfW, halfD } = planBounds();
  const out = { ...views };
  for (const key in fit) {
    const v = views[key];
    if (!v) continue;
    const dx = v.p[0] - v.t[0], dy = v.p[1] - v.t[1], dz = v.p[2] - v.t[2];
    const len = Math.hypot(dx, dy, dz) || 1;
    /* The drawing is viewed at a slight tilt, so its depth extent projects
       a little longer than its plan extent. cos of the tilt off vertical
       recovers the projected half-depth exactly. */
    const cos = Math.max(0.2, dy / len);
    const d = fitDistance(fov, aspect, halfW, halfD / cos, fit[key]);
    out[key] = { t: v.t, p: [v.t[0] + (dx / len) * d, v.t[1] + (dy / len) * d, v.t[2] + (dz / len) * d] };
  }
  return out;
}

/**
 * Wide tier: pull IN along the view vector. Only the distance changes, so
 * every authored angle, tilt and target offset survives untouched.
 * @param {number} k <1 closes the camera; 1 is a no-op.
 */
export function wideViews(views, k) {
  if (k >= 0.999) return views;
  const out = {};
  for (const key in views) {
    const v = views[key];
    out[key] = { t: v.t, p: v.p.map((c, i) => v.t[i] + (c - v.t[i]) * k) };
  }
  return out;
}

/** Narrow tier: pull back along the view vector so framing is preserved. */
export function narrowView(v) {
  const t = [v.t[0], v.t[1] + 0.6, v.t[2]];
  return { t, p: v.p.map((c, i) => t[i] + (c - v.t[i]) * 1.36) };
}

export const VIEWS_NARROW = Object.fromEntries(
  Object.entries(VIEWS).map(([k, v]) => [k, narrowView(v)]),
);

/* ============================================================
   PHASE 5 — THE PHONE HERO FRAME

   A phone is not a narrow desktop. The narrow tier above pulls the camera
   BACK so the desktop framing survives a tall frame, which is right for
   every scroll state — and wrong for the one frame that has to teach the
   idea before anything is scrolled. The hero states are therefore aimed at
   the BUILDING CLUSTER rather than at the centre of the parcel, and set at
   the distance that puts that cluster inside the hero's signature window
   (roughly a third of the frame) instead of inside the whole frame.

   Only idle / capture / measure are overridden. QUANTIFY is a drawing and
   its distance is solved by `fitViews`, not authored; everything the scroll
   narrative reads keeps the narrow pull-back unchanged.
   ============================================================ */
/* PHASE 7 Part 20 — the phone hero was retuned, and it is the composition
   that changed rather than the zoom.

   Phase 6 aimed the phone window at the abstract volume cluster from 33
   units out. In a window that is roughly a third of a 390-wide screen, that
   is a small grey diagram: the storey was four pixels tall and the
   furniture was noise. The brief asks instead for ONE READABLE
   ARCHITECTURAL FRAGMENT with furniture identifiable AS furniture.

   So the phone gets the sectional slice, close: the south row with its roof
   cut back, lit from inside. At this distance a visitor can pick out the
   reception desk, the task chair behind it, the two lounge chairs around
   their side table, the plant in the corner and the doors down the
   circulation wall — on a phone, held at arm's length. The abstract volumes
   are still overhead, but they are now the frame rather than the subject.

   MEASURE keeps its pull-back: that state's subject is the ground, and a
   close camera on a phone crops the contour field it exists to show. */
const PHONE_HERO = {
  /* PHASE 8 Part 21 — a phone gets a SECTIONAL SLICE of the lower building,
     not three tiny exploded floors. The camera sits low and close on the
     south-east corner, so what fills the signature window is the ground
     floor's opened rooms with the work floor above them and the project
     floor cropping out of the top of the frame. The visitor reads
     ARCHITECTURE and VERTICALITY without being shown a diagram at 4 px a
     storey — the third level is present as the thing the frame cannot
     contain, which is what says the building is taller than the window. */
  /* PHASE 9 §28 — CROPPED HARDER, AND UP THE BUILDING.
     Phase 8's phone frame fitted all three storeys inside the window with
     room to spare, which is the "tiny full building" the brief warns
     against: the point of a phone frame is that the building is bigger than
     it. The eye comes in ~1.8 units and the target rises to the work
     floor, so what fills the window is the GROUND and WORK floors at a
     readable size with the project floor cropping out of the top — about
     two and a half storeys, and verticality you can see rather than infer.
     Compared at 390×844 against the Phase 8 frame in
     qa/p9/shots/r-phone-hero.png. */
  idle:    { p: [13.80, 5.30, 17.40], t: [-0.30, 0.62, 0.10] },
  capture: { p: [13.10, 5.00, 16.60], t: [-0.25, 0.62, 0.20] },
  measure: { p: [22.40, 13.20, 20.60], t: [-0.5, 1.55, -0.30] },
  /* PHASE 8 Part 21 — a phone reads ONE floor, so on a phone QUANTIFY is a
     DRAWING again and gets the near-vertical camera the desktop gave up
     when it went axonometric to separate three sheets. The distance is
     still solved by `fitViews`; only the direction is authored. */
  quantify: { p: [-1.0, 20.75, 3.4], t: [-1.0, planY('L00'), -0.20] },
};

export const VIEWS_PHONE = { ...VIEWS_NARROW, ...PHONE_HERO };

/* ============================================================
   PHASE 9 §29 — THE PORTRAIT TABLET TIER

   1024×1366 takes the DESKTOP framing for the hero, and it should: the
   building reads better there than anywhere else on the site. What it must
   not take is the desktop's QUANTIFY camera.

   That camera is tilted to 50° for one reason — the desktop separates the
   three levels and vertical separation seen from above is no separation at
   all. A portrait tablet does not separate them (see main.js: the stack
   explodes at 1100 px and above, because the exploded stack does not fit a
   1024 frame). So the tablet was being shown three sheets stacked exactly
   on top of each other through the camera designed to pull them apart: a
   small, dim tangle in the bottom-right of a very tall frame.

   One override. A single sheet is a DRAWING, and a drawing is read from
   above — which is the phone's answer to the same question, and the same
   camera. Everything else on this tier stays desktop.
   ============================================================ */
export const VIEWS_TABLET = { ...VIEWS, quantify: PHONE_HERO.quantify };
export const FIT_TABLET = { ...FIT, quantify: { safeX: 0.72, safeY: 0.62 } };

/* QUANTIFY is a drawing, so its distance is solved rather than authored —
   and the solver was answering the wrong question on a phone. `safeX: .52`
   reserves half the frame for a text column that does not exist here: the
   window IS the frame, the type is above and below it, and the horizontal
   constraint binds hard on a 0.45 aspect. The result was a plan rendered at
   56 units out, which is a distant sketch rather than a drawing. On a phone
   the drawing may have the window's full width, and only needs to be as tall
   as the window. */
export const FIT_PHONE = {
  ...FIT,
  /* One floor plan, in the window, as large as the window allows. Phase 7's
     0.31 on Y was solved against a drawing that had the whole frame to fall
     back into; with the floor selector doing the work of showing three
     levels one at a time, the one on screen may fill its window. */
  quantify: { safeX: 0.92, safeY: 0.46 },
};

/* ---------------- scan behaviour — [axisX 0|1, width, period, lo, hi, vis] ----
   PHASE 8 Part 18 — the vertical travel was re-solved.

   `ax: 0` has always meant a HORIZONTAL plane travelling up the Y axis, and
   the ranges were inherited from Phase 1, when the object was a terrain with
   a low box on it: −4.0 to 7.5 world units over a scene 2.5 units tall. Four
   fifths of every pass happened where there was nothing, and the pass over
   the building — the part that is the point — took about a fifth of the
   cycle.

   The building is now 12.30 m of real architecture between world Y −0.49 and
   +1.80. The travel is that, plus a little ground under it and a little sky
   over it, so a pass genuinely enters at the roof, crosses L02, crosses L01,
   crosses L00 and leaves through the slab. Same motion, three times the
   meaning. */
export const SCAN = {
  // Idle no longer sweeps forever; the ambient cycle drives one pass per turn.
  idle:       { ax: 0, w: 1.05, period: 15,  lo: -1.5, hi: 3.0,  vis: 0.42 },
  capture:    { ax: 0, w: 0.85, period: 7.5, lo: -1.3, hi: 2.6,  vis: 0.15 },
  measure:    { ax: 0, w: 0.42, period: 10,  lo: -2.0, hi: 2.2,  vis: 0.13 },
  quantify:   { ax: 1, w: 0.75, period: 8.5, lo: -8.5, hi: 8.5,  vis: 0.09 },

  physical:   { ax: 0, w: 1.40, period: 22,  lo: -1.5, hi: 3.2,  vis: 0.03 },
  cloud:      { ax: 0, w: 1.00, period: 9,   lo: -1.4, hi: 2.8,  vis: 0.14 },
  processing: { ax: 0, w: 0.70, period: 8,   lo: -1.4, hi: 3.4,  vis: 0.18 },
  data:       { ax: 0, w: 0.40, period: 11,  lo: -1.2, hi: 3.6,  vis: 0.12 },
  decision:   { ax: 1, w: 0.80, period: 14,  lo: -8.5, hi: 8.5,  vis: 0.05 },

  captureClose: { ax: 0, w: 0.95, period: 8,  lo: -1.3, hi: 2.6, vis: 0.12 },
  measureClose: { ax: 0, w: 0.34, period: 9,  lo: -2.0, hi: 4.2, vis: 0.16 },
  planTight:    { ax: 1, w: 0.62, period: 10, lo: -6.5, hi: 6.5, vis: 0.08 },

  capSite:    { ax: 0, w: 1.05, period: 9,  lo: -1.4, hi: 3.0, vis: 0.16 },
  capStation: { ax: 0, w: 0.90, period: 7,  lo: -1.3, hi: 2.6, vis: 0.13 },
  capReturn:  { ax: 0, w: 0.75, period: 11, lo: -1.3, hi: 2.8, vis: 0.10 },

  mSurface:   { ax: 0, w: 0.90, period: 13, lo: -2.4, hi: 5.0, vis: 0.10 },
  mContours:  { ax: 0, w: 0.38, period: 9,  lo: -2.2, hi: 4.6, vis: 0.18 },
  mVolume:    { ax: 0, w: 0.30, period: 8,  lo: -1.8, hi: 3.4, vis: 0.26 },
  mExport:    { ax: 0, w: 0.46, period: 12, lo: -2.0, hi: 4.6, vis: 0.12 },

  /* The visible plane quad reads as a bloom smear across a drawing rather
     than as a pass over it; the linework's own scan response already says
     where the plane is. Kept low on QUANTIFY, and lowest where the numbers
     are the subject. */
  qDrawing:   { ax: 1, w: 0.66, period: 11, lo: -6.5, hi: 6.5, vis: 0.07 },
  qIdentify:  { ax: 1, w: 0.52, period: 9,  lo: -6.0, hi: 6.0, vis: 0.08 },
  qStructure: { ax: 1, w: 0.44, period: 10, lo: -6.0, hi: 6.0, vis: 0.10 },
  qQuantity:  { ax: 1, w: 0.70, period: 14, lo: -6.5, hi: 6.5, vis: 0.04 },
  /* PART 18 — the exploded state is the one place the plane scans VERTICALLY
     through the levels rather than across a sheet, so its axis flips and its
     travel is the building's own height. */
  qExploded:  { ax: 0, w: 0.30, period: 13, lo: -0.9, hi: 3.0, vis: 0.22 },

  /* PHASE 11 — the journey.

     The plane's TRAVEL is the one thing that has to change most between
     these: outside the building it crosses the whole site, inside the
     reference room it may only cross the room, and in the floor assembly
     it is a 60 cm slice. A plane that keeps its site-wide range while the
     camera is standing in a meeting room spends most of its cycle behind
     the walls and arrives as a flash.

     It is also QUIET through CAPTURE, because there the verb is the
     sampling shell (webgl/materials.js) and two simultaneous readings of
     the same room is the noise Phase 9 already removed once. */
  dExterior: { ax: 0, w: 1.20, period: 20, lo: -1.5, hi: 3.2,  vis: 0.05 },
  dApproach: { ax: 0, w: 1.00, period: 16, lo: -1.2, hi: 3.0,  vis: 0.04 },
  dGlass:    { ax: 0, w: 0.80, period: 10, lo: -0.6, hi: 2.0,  vis: 0.03 },
  dInterior: { ax: 0, w: 0.60, period: 14, lo:  0.10, hi: 1.15, vis: 0.02 },
  dCapture:  { ax: 0, w: 0.50, period: 9,  lo:  0.10, hi: 1.15, vis: 0.05 },
  /* PART 07 — the section cut is drawn ON THE GEOMETRY, not by the quad.

     The plane's `vis` is its own visible disc, and at a crossing the
     camera is at the disc's centre — so at 0.55 the "cut line" was a
     cyan flood over the top half of the frame rather than a line
     (qa/p11/seg/floor-0.5.png, before). What draws the cut is the
     SURFACES answering the plane: `w` 0.10 is a 10 cm band of response,
     which on the slab soffit is a hard line at exactly the elevation the
     camera is about to pass through. The disc itself all but disappears. */
  dFloor:    { ax: 0, w: 0.10, period: 5,  lo: -0.10, hi: 0.55, vis: 0.06 },
  dUnder:    { ax: 0, w: 0.55, period: 13, lo: -2.6, hi: 0.6,  vis: 0.14 },
  dVolume:   { ax: 0, w: 0.40, period: 11, lo: -1.6, hi: 0.8,  vis: 0.22 },
  dAscent:   { ax: 0, w: 0.45, period: 7,  lo: -0.8, hi: 2.0,  vis: 0.16 },
  dCollapse: { ax: 1, w: 0.80, period: 10, lo: -6.5, hi: 6.5,  vis: 0.06 },
  dPlan:     { ax: 1, w: 0.62, period: 12, lo: -6.5, hi: 6.5,  vis: 0.05 },
  dApart:    { ax: 1, w: 0.50, period: 14, lo: -6.5, hi: 6.5,  vis: 0.04 },
  dField:    { ax: 1, w: 0.45, period: 16, lo: -6.5, hi: 6.5,  vis: 0.02 },
  dResolve:  { ax: 0, w: 1.00, period: 18, lo: -1.5, hi: 3.2,  vis: 0.05 },
};

/* ---------------- layer presets ----------------
   terrain massing points pboost edges wire contours plan stations
   panorama volume survey bands

   PHYSICAL was the one state Phase 2 QA called out as reading close to
   empty. It is the state that has to say "mass and material" before
   anything is measured, so it now carries a real silhouette: the massing
   at full weight with its edge lines lifted well above CAPTURE's, the
   terrain solid under it, and the point layer still effectively absent.
   It stays DARKER than CAPTURE overall — the hierarchy is mass versus
   information density, not brightness for its own sake.                */
export const P = {
  /* PHASE 7 — massing and edges come down hard in the two states that show
     the BUILDING. They were .98/.84, which made the abstract volumes the
     brightest thing in the hero and left the architecture competing with a
     diagram of itself. At .42 they read as what they are: the rest of the
     scheme, held as a wireframe over the one storey that has been built.
     Every other preset keeps its Phase 6 weight — MEASURE still needs the
     mass to strip, and the scroll narrative still opens on a solid one. */
  idle:       { terrain: .95, massing: .42, points: .50, pboost: .80, edges: .42, wire: .16, contours: .17, plan: .035, planAux: .035, stations: .10, panorama: 0,   volume: 0,   survey: .04, bands: 0 },
  /* PHASE 9 §09 — CAPTURE IS 70% PLACE AND 30% DATA.
     Phase 8's weights put the sample at .82 with a 1.5 boost over the whole
     parcel, which turned the frame into cyan static with a building
     somewhere behind it (qa/p9/shots/before-lap-home-capture.png) — the one
     failure the brief names by hand. The SAMPLE came down and the STATIONS
     went up, which is the correct trade: a capture round is documented by
     where the tripod stood, not by how much noise it made. */
  capture:    { terrain: .80, massing: .34, points: .30, pboost: .82, edges: .40, wire: .09, contours: .05, plan: .02,  planAux: .02, stations: 1,   panorama: .30, volume: 0,   survey: .06, bands: 0 },
  /* PHASE 9 §15 — MEASURE IS TERRAIN-FIRST AND IT WAS NOT.
     The three-level building at .42 of the `arch` layer is three times the
     ghost Phase 7 tuned against a single storey, and it filled the frame
     over a set of contours nobody could read. The GROUND comes up — terrain,
     contours and survey — and everything belonging to the object on it goes
     down. See the ARCH table below for the other half of the same change. */
  measure:    { terrain: .74, massing: .22, points: .10, pboost: .70, edges: .92, wire: .18, contours: 1,   plan: .04,  planAux: .04, stations: .04, panorama: 0,   volume: .34, survey: .70, bands: 1 },
  // Massing dissolves much further than Phase 1 (.12/.16) so the drawing wins.
  quantify:   { terrain: .07, massing: .04, points: .09, pboost: .55, edges: .34, wire: .02, contours: 0,   plan: 1,    planAux: .10, stations: .02, panorama: 0,   volume: 0,   survey: 0,   bands: 0 },

  physical:   { terrain: 1,   massing: 1,   points: .06, pboost: .50, edges: .96, wire: .40, contours: .20, plan: 0,    planAux: 0, stations: 0,   panorama: 0,   volume: 0,   survey: 0,   bands: .16 },
  cloud:      { terrain: .24, massing: .14, points: 1,   pboost: 1.5, edges: .20, wire: .06, contours: .03, plan: 0,    planAux: 0, stations: .78, panorama: .35, volume: 0,   survey: .08, bands: 0 },
  processing: { terrain: .40, massing: .28, points: .46, pboost: 1.2, edges: .88, wire: .52, contours: .42, plan: .32,  planAux: .14, stations: .30, panorama: 0,   volume: .18, survey: .34, bands: .4 },
  data:       { terrain: .10, massing: .05, points: .22, pboost: .80, edges: .34, wire: .10, contours: 1,   plan: .70,  planAux: .20, stations: .05, panorama: 0,   volume: .34, survey: .88, bands: .8 },
  decision:   { terrain: .04, massing: .02, points: .05, pboost: .40, edges: .18, wire: 0,   contours: .10, plan: 1,    planAux: 0,   stations: 0,   panorama: 0,   volume: 0,   survey: .16, bands: 0 },

  captureClose: { terrain: .40, massing: .34, points: .80, pboost: 1.30, edges: .30, wire: .08, contours: .04, plan: 0,  planAux: 0, stations: 1,   panorama: 1,   volume: 0,   survey: .05, bands: 0 },
  measureClose: { terrain: .50, massing: .18, points: .24, pboost: .90, edges: .60, wire: .16, contours: 1,   plan: .03, planAux: .03, stations: .04, panorama: 0,  volume: .55, survey: 1,   bands: 1 },
  planTight:    { terrain: .05, massing: .02, points: .06, pboost: .40, edges: .24, wire: 0,   contours: 0,   plan: 1,   planAux: 0, stations: 0,   panorama: 0,  volume: 0,   survey: 0,   bands: 0 },

  /* ---- /360-camera/ ---------------------------------------------------
     01 CAPTURE — the physical site, with every capture position marked.
     02 ORGANIZE — the positions become the structure; the site recedes.
     03 RETURN — the record, revisitable: stations and survey links over a
        dissolved site. Nothing here is a new layer; it is the same object
        read three ways. */
  capSite:    { terrain: .92, massing: .96, points: .30, pboost: .70, edges: .88, wire: .16, contours: .08, plan: 0,   planAux: .04, stations: 1,   panorama: .30, volume: 0,   survey: .10, bands: 0 },
  capStation: { terrain: .78, massing: .62, points: .95, pboost: 1.45, edges: .58, wire: .30, contours: .14, plan: 0,   planAux: 0,   stations: 1,   panorama: 1,   volume: 0,   survey: .10, bands: 0 },
  capReturn:  { terrain: .40, massing: .22, points: .52, pboost: 1.05, edges: .32, wire: .26, contours: .22, plan: .18, planAux: .10, stations: 1,   panorama: .22, volume: 0,   survey: .70, bands: .35 },

  /* ---- /teruletfelmeres/ ---------------------------------------------
     Four readings of one piece of ground: the surface itself, the
     topographic line system derived from it, the earth volume between two
     levels, and the same data reduced to what leaves the office. */
  /* The terrain SURFACE carries this page, not the linework: a contour at
     one device pixel is half a CSS pixel on a retina display, and the ground
     disappears. `bands` draws the elevation interval into the surface shader
     itself, which is what makes a MEASURE frame read as surveyed ground
     rather than as a wireframe box in the dark. */
  /* PHASE 4. These four used to differ mostly by opacity, and `wire: 1` on
     SURFACE meant the state whose subject is the terrain MASS rendered as an
     edge-to-edge wireframe carpet with no silhouette. Each state now has one
     dominant layer and the others step back:
       SURFACE   the shaded ground itself — the grid all but gone
       CONTOURS  line density; the surface recedes so the lines can be read
       VOLUME    the cut prism; the contour thicket drops out of its way
       EXPORT    the reduced deliverable — survey and contours, little else */
  mSurface:   { terrain: 1,   massing: .18, points: .18, pboost: .70, edges: .34, wire: .16, contours: .14, plan: 0,  planAux: .04, stations: .06, panorama: 0, volume: 0,   survey: .14, bands: .30 },
  mContours:  { terrain: .58, massing: .05, points: .12, pboost: .55, edges: .10, wire: .10, contours: 1,   plan: 0,  planAux: .04, stations: .04, panorama: 0, volume: 0,   survey: .42, bands: .85 },
  mVolume:    { terrain: .62, massing: .06, points: .14, pboost: .60, edges: .12, wire: .10, contours: .34, plan: 0,  planAux: .03, stations: .04, panorama: 0, volume: 1,   survey: .58, bands: .45 },
  mExport:    { terrain: .22, massing: .03, points: .10, pboost: .40, edges: .08, wire: .08, contours: .72, plan: .10, planAux: .06, stations: .03, panorama: 0, volume: .12, survey: 1,   bands: .40 },

  /* ---- /mennyisegszamitas/ -------------------------------------------
     DRAWING → IDENTIFY → STRUCTURE → QUANTITY. The plan never leaves the
     frame; what changes is how much of the rest of the model is admitted
     and how hard the scan reads the linework. */
  /* PHASE 4 — the four states are a hierarchy, not four opacities:
       DRAWING    the cleanest sheet — the plan and its dimension lines
       IDENTIFY   one symbol at a time; the site context steps back
       STRUCTURE  relationships resolve; the survey layer becomes the subject
       QUANTITY   noise drops away so the NUMBERS are the final result —
                  the drawing recedes to a reference under the table */
  qDrawing:   { terrain: .03, massing: .02, points: .04, pboost: .35, edges: .16, wire: 0, contours: 0,   plan: 1, planAux: .22, stations: 0, panorama: 0, volume: 0, survey: 0,   bands: 0 },
  qIdentify:  { terrain: .02, massing: .02, points: .05, pboost: .40, edges: .12, wire: 0, contours: 0,   plan: .94, planAux: .06, stations: 0, panorama: 0, volume: 0, survey: .10, bands: 0 },
  qStructure: { terrain: .02, massing: .01, points: .04, pboost: .35, edges: .08, wire: 0, contours: .04, plan: 1, planAux: .05, stations: 0, panorama: 0, volume: 0, survey: .88, bands: .4 },
  qQuantity:  { terrain: .01, massing: .01, points: .02, pboost: .26, edges: .05, wire: 0, contours: 0,   plan: .52, planAux: 0,   stations: 0, panorama: 0, volume: 0, survey: .14, bands: 0 },
  /* All three sheets at full weight, and a trace of the building behind them
     so the stack is legibly a BUILDING taken apart rather than three
     drawings that happen to be offset. */
  qExploded:  { terrain: .03, massing: .03, points: .06, pboost: .40, edges: .20, wire: 0, contours: 0,   plan: 1,  planAux: .06, stations: 0, panorama: 0, volume: 0, survey: 0,   bands: 0 },

  /* ---- PHASE 11 — THE DATA DESCENT ----------------------------------

     One place, read continuously rather than switched between. The layer
     hierarchy is PLACE FIRST for as long as the camera is in the world and
     DATA FIRST only once the perspective has collapsed, which is the whole
     argument of the journey stated in weights:

       EXTERIOR..CAPTURE   the building is at full material strength and
                           the survey layers are barely present. CAPTURE
                           adds a sample to a room it does not obscure —
                           .34 of the point layer, not Phase 8's .82.
       FLOOR               the assembly, and nothing else. The site
                           disappears because it cannot be seen from
                           inside 60 cm of concrete.
       UNDER..VOLUME       the GROUND is the subject and the building is a
                           ghost overhead — the same trade MEASURE makes,
                           taken further because here the camera is under it.
       ASCENT              structure. The shell drops to a third and the
                           edge layer goes to full: what rises past the
                           camera is walls, slabs, openings and the core.
       COLLAPSE..FIELD     the drawing, and then the drawing's contents.
       RESOLVE             material reality again, at distance.            */
  dExterior: { terrain: 1,   massing: .50, points: .04, pboost: .45, edges: .82, wire: .22, contours: .12, plan: 0,   planAux: .02, stations: .06, panorama: 0,   volume: 0,   survey: .04, bands: 0 },
  dApproach: { terrain: .90, massing: .30, points: .04, pboost: .45, edges: .70, wire: .12, contours: .06, plan: 0,   planAux: 0,   stations: .10, panorama: 0,   volume: 0,   survey: .03, bands: 0 },
  dGlass:    { terrain: .50, massing: .10, points: .05, pboost: .50, edges: .45, wire: .04, contours: .02, plan: 0,   planAux: 0,   stations: .10, panorama: .08, volume: 0,   survey: 0,   bands: 0 },
  dInterior: { terrain: .18, massing: .04, points: .05, pboost: .55, edges: .22, wire: 0,   contours: 0,   plan: 0,   planAux: 0,   stations: .12, panorama: .10, volume: 0,   survey: 0,   bands: 0 },
  dCapture:  { terrain: .16, massing: .03, points: .34, pboost: 1.15, edges: .26, wire: 0,  contours: 0,   plan: 0,   planAux: 0,   stations: .55, panorama: .34, volume: 0,   survey: 0,   bands: 0 },
  /* Inside 60 cm of concrete there is nothing to see but the assembly, so
     everything that is not the assembly leaves. The plan weight is what
     draws the slab's own edge across the frame as the camera passes it. */
  /* PART 07 — "expose a minimal technical cross-section only during the
     passage". The first tuning showed nothing: inside a solid slab there
     is, correctly, nothing to see, and a frame with nothing in it does not
     read as fast movement however fast the camera is going. Measured on
     the 1x recording, the floor crossing was the SLOWEST-changing state
     in the whole journey (qa/p11/rec/motion.json) — the opposite of the
     pacing map.

     What passes the camera instead is the DRAWING of the two floors it is
     between. L01's sheet sweeps up out of frame as the camera leaves it
     and L00's rises to meet it, which is a cross-section made of the
     building's own plans rather than of an invented layer build-up. */
  dFloor:    { terrain: .04, massing: .01, points: .08, pboost: .55, edges: .30, wire: 0,   contours: 0,   plan: .92, planAux: 0,   stations: .04, panorama: 0,   volume: 0,   survey: .06, bands: 0 },
  /* PART 08 — "deep, dark, topographic, measured. Not sci-fi."

     The first tuning gave the underworld `terrain: .95` with `bands: 1`,
     and the elevation banding in the surface shader is ADDITIVE accent —
     so a hillside filling the frame from underneath came out as a
     saturated lime field with the contour lines invisible inside it
     (qa/p11/story/desk/07-underworld.png, before). What makes ground read
     as SURVEYED is the opposite balance: the surface dark and matte, and
     the LINES on it — contours, survey marks, the terrain grid — carrying
     the whole reading. Half the terrain weight, a third of the banding,
     and the line layers left where they were. */
  dUnder:    { terrain: .38, massing: .04, points: .06, pboost: .55, edges: .30, wire: .26, contours: .52, plan: .05, planAux: .03, stations: .02, panorama: 0,   volume: .16, survey: .60, bands: .12 },
  /* The cut prism is the SUBJECT here, so the contour thicket drops out of
     its way — the same trade the MEASURE page's own VOLUME state makes. */
  dVolume:   { terrain: .34, massing: .04, points: .06, pboost: .50, edges: .16, wire: .12, contours: .22, plan: .03, planAux: .02, stations: .02, panorama: 0,   volume: .66, survey: .46, bands: .10 },
  /* PART 10 — X-RAY, WHICH IS LINEWORK AND NOT A TRANSLUCENT SOLID.

     `edges` is the procedural massing's outline, and with the GLB source
     running the massing no longer contains the building — so weighting it
     at 1 for the ascent bought a bright outline of two outbuildings and
     nothing else. What actually draws the structure the camera is rising
     through is the LEVEL DRAWINGS: each storey's plan is its walls, its
     openings and its core, at that storey's own elevation, and rising
     past three of them is rising past three floor plates. The shell stays
     just present enough to say the plates belong to a building. */
  dAscent:   { terrain: .14, massing: .05, points: .05, pboost: .45, edges: .30, wire: .04, contours: .06, plan: .62, planAux: .05, stations: .04, panorama: 0,   volume: 0,   survey: .16, bands: 0 },
  dCollapse: { terrain: .06, massing: .02, points: .04, pboost: .40, edges: .22, wire: .02, contours: .03, plan: .92, planAux: .10, stations: .02, panorama: 0,   volume: 0,   survey: .10, bands: 0 },
  dPlan:     { terrain: .02, massing: .01, points: .02, pboost: .30, edges: .10, wire: 0,   contours: 0,   plan: 1,   planAux: .10, stations: 0,   panorama: 0,   volume: 0,   survey: .04, bands: 0 },
  dApart:    { terrain: .02, massing: .01, points: .02, pboost: .30, edges: .06, wire: 0,   contours: 0,   plan: 1,   planAux: .06, stations: 0,   panorama: 0,   volume: 0,   survey: .03, bands: 0 },
  dField:    { terrain: .01, massing: 0,   points: .02, pboost: .30, edges: .03, wire: 0,   contours: 0,   plan: .34, planAux: .03, stations: 0,   panorama: 0,   volume: 0,   survey: .08, bands: 0 },
  dResolve:  { terrain: .80, massing: .38, points: .05, pboost: .45, edges: .72, wire: .18, contours: .12, plan: .12, planAux: .04, stations: .04, panorama: 0,   volume: 0,   survey: .05, bands: 0 },
};

/* ============================================================
   PHASE 6 — THE ARCHITECTURAL LAYERS

   Four more rows over the SAME preset table: the building's shell, its
   ceiling, its contents and its glazing. They are separate because the
   three services want different combinations of them, and that is the
   whole argument the phase makes:

     CAPTURE    shell + contents. A place, with things in it.
     MEASURE    shell, contents gone, ceiling nearly gone. What is left
                is what can be measured.
     QUANTIFY   the roof comes off and the shell goes with it, because
                by then the drawing IS the building.

   `ceiling` is switched apart from `arch` for exactly one reason: the
   QUANTIFY camera rises, and a roof that stays on hides the plan the
   whole mode is about.

   Weights are authored, not derived from `massing`. The architectural
   shell is not simply a better-looking mass — in MEASURE it is MORE
   present than the massing ever was (that is the point of removing the
   furniture), and in the MEASURE page's terrain states it is LESS, so
   the ground stays the subject.                                        */
const ARCH = {
  idle:       { arch: .98, ceiling: .90, furn: .95, glass: 1 },
  capture:    { arch: .95, ceiling: .80, furn: 1,   glass: .88 },
  /* PHASE 8 — the building came down from .55.
     Three storeys of ghost is three times as much building over the same
     terrain, and Part 12 is explicit that MEASURE must not become
     building-dominant. What is left is enough to say WHERE the mass sits on
     the parcel and nothing more. */
  /* `furn: 0`, not .04. Part 12 says the furniture DISAPPEARS in MEASURE,
     and 4% of 103 000 triangles is a rendering cost with no reading
     attached to it — invisible, and the most expensive thing in the scene. */
  measure:    { arch: .24, ceiling: .05, furn: 0, glass: .10 },
  quantify:   { arch: .06, ceiling: 0,   furn: 0,   glass: .02 },

  physical:   { arch: 1,   ceiling: 1,   furn: 1,   glass: 1 },
  cloud:      { arch: .30, ceiling: .18, furn: .34, glass: .20 },
  processing: { arch: .48, ceiling: .30, furn: .34, glass: .26 },
  data:       { arch: .12, ceiling: .02, furn: 0,   glass: .06 },
  decision:   { arch: .04, ceiling: 0,   furn: 0,   glass: .01 },

  /* Inside the building rather than over it, so the ceiling steps back far
     enough to see under, and the contents carry the frame. */
  captureClose: { arch: .55, ceiling: .30, furn: .80, glass: .40 },
  measureClose: { arch: .45, ceiling: .10, furn: 0,   glass: .16 },
  planTight:    { arch: .04, ceiling: 0,   furn: 0,   glass: .01 },

  capSite:    { arch: .96, ceiling: .88, furn: .92, glass: .82 },
  capStation: { arch: .70, ceiling: .34, furn: .95, glass: .45 },
  capReturn:  { arch: .34, ceiling: .14, furn: .30, glass: .18 },

  /* The MEASURE page's subject is the ground. The building is context here,
     and PHASE 8 halved every one of these: .34 of a 4.9 m storey is a low
     translucent block on a hillside, and .34 of a 12.3 m building is a
     translucent block that fills the frame. Same weight, three times the
     volume — so the weight had to change or the mode's subject would have. */
  mSurface:   { arch: .17, ceiling: .03, furn: 0, glass: .06 },
  mContours:  { arch: .07, ceiling: .01, furn: 0, glass: .03 },
  mVolume:    { arch: .08, ceiling: .01, furn: 0, glass: .03 },
  mExport:    { arch: .04, ceiling: 0,   furn: 0,   glass: .01 },

  qDrawing:   { arch: .04, ceiling: 0, furn: 0, glass: .01 },
  qIdentify:  { arch: .03, ceiling: 0, furn: 0, glass: .01 },
  qStructure: { arch: .04, ceiling: 0, furn: 0, glass: .01 },
  qQuantity:  { arch: .02, ceiling: 0, furn: 0, glass: 0 },
  qExploded:  { arch: .10, ceiling: 0, furn: 0, glass: .03 },

  /* PHASE 11 — the journey.

     `ceiling` is the cutaway, and the cutaway is governed by where the
     camera IS rather than by which state is weighted — see
     archScene.cutCloseFor. The weights here only say how much lid there
     is to close: full for every state the camera is inside, and gone from
     ASCENT onward, where a roof would hide the plates the rise is about.

     `furn` is the one that carries PART 10. It is at full strength for
     every frame the visitor is standing in the room, and it recedes to
     nothing over the ascent, because the argument changes at that point
     from "this is a place" to "this is a structure". */
  dExterior: { arch: 1,   ceiling: 1,   furn: .95, glass: 1 },
  dApproach: { arch: 1,   ceiling: 1,   furn: 1,   glass: 1 },
  dGlass:    { arch: 1,   ceiling: 1,   furn: 1,   glass: 1 },
  dInterior: { arch: 1,   ceiling: 1,   furn: 1,   glass: .90 },
  dCapture:  { arch: 1,   ceiling: 1,   furn: 1,   glass: .85 },
  dFloor:    { arch: 1,   ceiling: 1,   furn: .55, glass: .30 },
  dUnder:    { arch: .07, ceiling: 0,   furn: 0,   glass: .02 },
  dVolume:   { arch: .08, ceiling: 0,   furn: 0,   glass: .02 },
  dAscent:   { arch: .22, ceiling: 0,   furn: .03, glass: .08 },
  dCollapse: { arch: .12, ceiling: 0,   furn: 0,   glass: .02 },
  dPlan:     { arch: .03, ceiling: 0,   furn: 0,   glass: 0 },
  dApart:    { arch: .02, ceiling: 0,   furn: 0,   glass: 0 },
  dField:    { arch: .01, ceiling: 0,   furn: 0,   glass: 0 },
  dResolve:  { arch: .92, ceiling: .88, furn: .70, glass: .92 },
};

for (const name of Object.keys(P)) {
  Object.assign(P[name], ARCH[name] || { arch: 0, ceiling: 0, furn: 0, glass: 0 });
}

export const LAYER_KEYS = Object.keys(P.idle);
