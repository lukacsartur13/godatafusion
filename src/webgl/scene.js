import * as THREE from 'three';
import gsap from 'gsap';
import { env, dprCap, opaqueContext } from '../core/env.js';
import { SITE } from './field.js';
import {
  buildTerrain, buildMassing, buildTerrainWire, buildContours,
  buildPlan, buildStations, buildPanorama, buildPointCloud,
  buildSurvey, buildVolumeBox, buildBracket, buildPlanAux, buildStandIn,
  buildCloudSource,
  buildStationMarks, PLAN, LEVEL_IDS, MPU, planY, roofY, floorY,
  levelFeatures, EXPLODE_GAP_M, EXPLODE_STEP, CORE, BASE_Y,
  buildPlanLayers, PLAN_LAYERS,
} from './geometry.js';
import { usesArchitecture, archTier } from '../core/sceneSource.js';
/* The preset tables live in presets.js so the service pages open in the
   same states this narrative passes through. */
import {
  VIEWS, VIEWS_NARROW, VIEWS_PHONE, VIEWS_TABLET, FIT_PHONE, FIT_TABLET,
  SCAN, P, LAYER_KEYS, S0, S0Y, fitViews, wideViews,
} from './presets.js';
import {
  scanUniforms, makeSurfaceMaterial, makeLineMaterial,
  makePointsMaterial, makeScanPlaneMaterial,
} from './materials.js';
import { createAnnotations, createLevelLabels } from './annotations.js';

/* ============================================================
   ONE construction site. One scene. Many readings of it.

   Everything the page can ask for — the three hero service modes and
   the nine narrative states of the scroll — is a named PRESET over the
   same layer stack. A weight map is blended in a single pass, so nothing
   can ever be half in one state and half in another, and any two states
   morph into each other for free.
   ============================================================ */

const QUALITY = {
  high: { seg: 128, wireStep: 1.0, wireSub: 0.25, contourRes: 150, contourLevels: 13,
          pts: { terrain: 20000, massing: 13000 }, size: 1.55 },
  low:  { seg: 72,  wireStep: 2.0, wireSub: 0.5,  contourRes: 92,  contourLevels: 9,
          pts: { terrain: 6500, massing: 4200 },  size: 1.75 },
};


/* ============================================================
   THE AMBIENT IDLE CYCLE
   Before the visitor touches anything, the object must already say
   REALITY → DATA. Not a fourth service mode and not a screensaver: a
   ~26 s restrained loop through the representations we already own.
     solid → sparse wire → point cloud → one scan pass → data lines → solid
   Values are multipliers on the idle preset, so the whole cycle is
   scaled by the idle weight and simply dissolves the moment a service
   takes over — and resumes, mid-phase, when the service is released.
   ============================================================ */
/* PHASE 4 — the cycle was legible as a sequence: solid, then wireframe,
   then points, then reset. It now overlaps. The mass holds at ~80% while
   the first points emerge, the wireframe resolves UNDER it rather than
   after it, the Scan Plane crosses while both are present, and the contour
   and plan layers peak AFTER the pass has gone by — so what survives a scan
   is the extracted information, which is the claim the whole site makes.
   Longer and shallower, too: this is meant to be noticed only on the second
   look, not to perform. */
/* Below this width the hero is the phone composition — its own camera
   framing and its own signature window. Must agree with the same
   breakpoint in styles/hero.css and modules/heroWindow.js. */
const PHONE_W = 700;
/* The share of the frame height the phone hero window occupies in the
   composition VIEWS_PHONE was authored against. */
const PHONE_SPAN = 0.355;

const AMBIENT_PERIOD = 34;
const AMBIENT = [
  { t: 0,    terrain: 1,    massing: 1,    points: .50,  edges: .85,  wire: .45,  contours: .35,  plan: .55,  sv: 0,   st: 0 },
  { t: .14,  terrain: 1,    massing: .98,  points: .68,  edges: .98,  wire: .80,  contours: .48,  plan: .70,  sv: 0,   st: 0 },
  { t: .28,  terrain: .96,  massing: .82,  points: 1.05, edges: 1.25, wire: 1.45, contours: .70,  plan: .95,  sv: .03, st: 0 },
  { t: .42,  terrain: .84,  massing: .58,  points: 1.55, edges: 1.05, wire: 1.20, contours: .85,  plan: 1.15, sv: .07, st: .12 },
  { t: .56,  terrain: .70,  massing: .40,  points: 1.70, edges: .92,  wire: 1.00, contours: 1.10, plan: 1.45, sv: .55, st: .40 },
  { t: .66,  terrain: .68,  massing: .40,  points: 1.45, edges: .95,  wire: 1.05, contours: 1.60, plan: 2.10, sv: 1,   st: .70 },
  { t: .78,  terrain: .74,  massing: .50,  points: 1.10, edges: 1.15, wire: 1.20, contours: 2.30, plan: 3.00, sv: .22, st: 1 },
  { t: .90,  terrain: .90,  massing: .80,  points: .78,  edges: 1.00, wire: .75,  contours: 1.25, plan: 1.40, sv: 0,   st: 1 },
  { t: 1,    terrain: 1,    massing: 1,    points: .50,  edges: .85,  wire: .45,  contours: .35,  plan: .55,  sv: 0,   st: 1 },
];
const AMB_KEYS = ['terrain', 'massing', 'points', 'edges', 'wire', 'contours', 'plan', 'sv', 'st'];
const smooth = (t) => t * t * (3 - 2 * t);

function ambientAt(phase, out) {
  let i = 0;
  while (i < AMBIENT.length - 2 && AMBIENT[i + 1].t <= phase) i++;
  const a = AMBIENT[i], b = AMBIENT[i + 1];
  const k = smooth(Math.min(1, Math.max(0, (phase - a.t) / (b.t - a.t))));
  for (const key of AMB_KEYS) out[key] = a[key] + (b[key] - a[key]) * k;
  return out;
}

/**
 * The page's own background colour, as a THREE.Color.
 *
 * Phase 8.1 made the hero canvas opaque, which means the renderer is now
 * responsible for painting the colour the page used to show through it.
 * Reading `--bg` rather than hardcoding it keeps the two in step: a theme
 * change moves both, or neither.
 */
function pageBackground(el = document.documentElement) {
  const c = new THREE.Color(0x080a0b);
  try {
    const v = getComputedStyle(el).getPropertyValue('--bg').trim();
    if (v) c.set(v);
  } catch { /* no computed style (SSR, detached) — the literal stands */ }
  return c;
}

export function createScene({ canvas, stage, annoContainer, callouts, route = 'home' }) {
  const narrow = env.narrow;
  const q = QUALITY[narrow ? 'low' : 'high'];
  /* PHASE 6 — the architectural source is an enhancement layered over the
     procedural one, so the procedural scene is built either way. What the
     flag changes is only whether the three levels are drawn as an abstract
     stepped mass or replaced by the building that occupies it. */
  const arch = usesArchitecture();

  /* ---------------- renderer ----------------

     PHASE 8.1 — THE TWO ATTRIBUTES THAT COST THE HERO HALF ITS FRAMES.

     The mode-switch stutter was never in the mode switch. Measured on an
     Apple M4 against the production build, the hero ran at 30 fps AT IDLE,
     with nothing hovered and the main thread 90% empty: p50 33,1 ms while a
     trivial full-screen WebGL clear loop in the same browser held 16,7 ms.
     A transition then added its style work on top of a frame that was
     already a whole vsync over budget, which is what turns a 33 ms cadence
     into the 50/66/83 ms gaps in the recording.

     Two context attributes, measured one at a time:

       alpha:true  + antialias:true   p50 33,1  p95 50,0  max 50,6   ← shipped
       alpha:false + antialias:true   p50 18,6  p95 49,8  max 52,0
       alpha:true  + antialias:false  p50 16,7  p95 33,4  max 82,5
       alpha:false + antialias:false  p50 16,7  p95 18,6  max 18,8

     `alpha:true` is the expensive one. A transparent canvas cannot be handed
     to the compositor as a finished quad — it has to be blended into the
     page's own raster every frame, and this canvas is full-viewport. The
     transparency bought nothing: `.stage` is fixed at inset 0 under all
     content, so the only thing behind the canvas is the page background. The
     canvas now clears to that exact colour instead, and composites opaque.

     `antialias:true` is a 4x MSAA resolve over the same full-viewport
     surface. It is dropped, and the pixel budget it was eating goes back to
     the adaptive resolution tuner below — which had been pinned at its
     LOWEST rung (pixelRatio 1) trying to pay for MSAA, and can now hold
     device resolution. Rendering the linework at 2x with no MSAA is a
     better-looking frame than rendering it at 1x with MSAA, and it is the
     trade the file already argued for: this hero has no hairlines in it.

     Mobile was already `antialias:false`; this is a desktop change.

     PHASE 12.1 — MSAA IS BACK ON. The 8.1 trade above was measured with
     the transparent drawing buffer still in place, and it is the alpha
     channel that cost the half-frame; with the opaque context the 4x
     resolve is 1–2 ms on an M4 at 2x. What it buys is every edge of the
     building: read straight out of the drawing buffer at device pixels,
     each diagonal slab edge, window reveal and ribbon line was a hard
     staircase, and the point sprites were single hard pixels — "nagyon
     pixeles" is the fair description, and it is worse still at the
     tuner's lower rungs and on a 1x monitor. Samples on the default
     framebuffer are requested on the context itself (opaqueContext), which
     is the only place three respects them once it is handed a context.
     The resolution tuner below still pays for it where a machine cannot:
     a 1.5x MSAA frame is a smoother picture than a 2x aliased one. */
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas, context: opaqueContext(canvas, { antialias: true }), antialias: true, alpha: false,
      powerPreference: 'high-performance', stencil: false,
    });
  } catch {
    return null;
  }
  if (!renderer.getContext()) return null;

  /* The clear colour IS the page background, read from the live token so it
     can never drift from `--bg`. An opaque canvas that clears to a different
     colour than the page behind it is a visible seam. */
  /* Read off the STAGE, not the root: the stage carries the ground tone
     (light in the homepage hero, dark elsewhere) — see .stage in hero.css. */
  renderer.setClearColor(pageBackground(stage), 1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setPixelRatio(dprCap());
  /* PHASE 7 — the building is lit PBR now and needs a response curve; the
     nine procedural layers do not and must not get one. Both are satisfied
     for free: `tonemapping_fragment` is a chunk of three's BUILT-IN shaders
     only, so a raw ShaderMaterial never sees it. The terrain, massing,
     linework and point cloud render byte-identically to Phase 6 while the
     architecture gains a filmic shoulder. */
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.06;
  /* PHASE 8 — no clipping planes any more. Phase 7 cut the hero's section
     by clipping the ceiling material; on a three-level stack that would
     delete the floor of the level standing on it, so the cut is real
     geometry now and the flag it needed is gone with it. See
     webgl/archScene.js. */

  const scene = new THREE.Scene();

  /* ---------------- light ----------------
     Three sources, and no more. An architectural interior seen through a
     window from eighty metres does not need a lighting rig; it needs the
     planes to separate. Lights live on the SCENE rather than on `group`, so
     the ambient yaw turns the building under a fixed sun rather than
     carrying the sun around with it.

     They are created BEFORE the architecture arrives on purpose: a light
     added afterwards changes NUM_DIR_LIGHTS and recompiles every material
     that has already been built. */
  const sun = new THREE.DirectionalLight(0xfff4e6, 2.05);
  /* Matched to the sun in blender/render_qa.py — 52 degrees up, from the
     south-west — so the web frame and the Blender QA render disagree about
     renderer, not about where the light is coming from. */
  sun.position.set(-7.4, 9.6, 6.1);
  const fill = new THREE.DirectionalLight(0xbcd2e8, 0.62);
  fill.position.set(8.2, 3.4, -6.8);
  /* Sky/ground hemisphere, at low strength. The environment map already
     supplies most of the ambient; this only keeps the undersides of things
     from going to absolute black where the IBL cannot reach them. */
  const ambient = new THREE.HemisphereLight(0x9fb4c4, 0x14181b, 0.42);
  scene.add(sun, fill, ambient);

  /* ---------------- practicals ----------------
     Three point lights, at the three rooms the hero's sectional cut opens.
     The pendants are emissive, and an emissive surface in three lights
     NOTHING — it is a bright pixel, not a lamp. Without these the opened
     rooms are lit only by a sky that the roof over the rest of the building
     is blocking, and an office at dusk with no light in it does not read as
     occupied, which is the one thing the hero has to say.

     Positions are the room centres from blender/out/build-stats.json,
     converted at metresPerUnit = 5.3499 and raised to soffit height. Three,
     not twelve: a point light per pendant would be twelve more uniforms for
     a difference no frame shows, and the brief is explicit that lighting
     must stay restrained rather than become cinematic. */
  /* PHASE 8 — one practical per level, at the room that level's cutaway
     opens. Three lights for three floors rather than three for one: the
     hero now looks into a room on every storey, and a storey with no light
     in it reads as an empty shell stacked on an occupied one, which is the
     opposite of what the vertical composition is for. Positions are the
     opened rooms' centres in world units, at soffit height for that level. */
  const practicals = [
    [1.6, planY('L00') + 0.62, 1.53],    // L00 · lounge, under the SE cutaway
    [-1.2, planY('L01') + 0.55, 1.53],   // L01 · focus rooms, mid-facade cut
    [0.6, planY('L02') + 0.55, 1.15],    // L02 · plan review, at the terrace
  ].map(([x, y, z]) => {
    const l = new THREE.PointLight(0xffe9c8, 2.6, 4.6, 1.6);
    l.position.set(x, y, z);
    scene.add(l);
    return l;
  });
  const camera = new THREE.PerspectiveCamera(31, 1, 0.5, 140);
  const group = new THREE.Group();
  scene.add(group);

  /* ---------------- geometry ---------------- */
  const gTerrain = buildTerrain(q.seg);
  const gMassing = buildMassing({ skipBuilding: arch });
  /* What the point cloud is sampled from and what the edge lines outline.
     In the procedural source that IS the massing; in the architectural one
     the massing is two outbuildings, so the stand-in envelope stands in for
     the building it is about to be replaced by. */
  const gCloud = buildCloudSource({ arch });
  const gVolume = buildVolumeBox();

  /* Phase 2 QA: the ground read as absence rather than as ground, which is
     what made PHYSICAL look empty and left the massing floating. Lifted just
     far enough to have material presence — still well below the massing, so
     the mass/information hierarchy is unchanged. */
  const terrain = new THREE.Mesh(gTerrain, makeSurfaceMaterial({
    dark: [0.052, 0.062, 0.068], light: [0.300, 0.324, 0.332], opacity: 0.95, bands: 0,
  }));
  terrain.renderOrder = 0;

  const massing = new THREE.Mesh(gMassing, makeSurfaceMaterial({
    dark: [0.038, 0.048, 0.052], light: [0.40, 0.425, 0.432], opacity: 1,
  }));
  massing.renderOrder = 1;

  /* PHASE 4 — the VOLUME state is the one measurement on this site a
     visitor can move, and the prism it moves was rendering at 24% of a very
     dark grey: the state whose subject IS the earth volume showed no mass at
     all. Lifted until the cut body reads against the ground under it, while
     staying translucent enough that the terrain is still legible through it. */
  const volume = new THREE.Mesh(gVolume, makeSurfaceMaterial({
    dark: [0.058, 0.076, 0.078], light: [0.26, 0.31, 0.31], opacity: 0,
  }));
  /* The cut prism is always translucent, and its top face sits ABOVE the
     floor plan. Writing depth would silently punch the whole drawing out of
     QUANTIFY over the building footprint — which is exactly what it did. */
  volume.material.depthWrite = false;
  volume.renderOrder = 1;

  /* The stand-in. In the procedural source the building is the abstract
     massing and this mesh does not exist; in the architectural source it is
     the STEPPED THREE-LEVEL VOLUME the GLB crossfades out of, so the frame is
     never empty while the building is in flight, never breaks if it fails,
     and — new in Phase 8 — already has the right silhouette at 200 ms. */
  const standIn = arch ? new THREE.Mesh(buildStandIn(), makeSurfaceMaterial({
    dark: [0.038, 0.048, 0.052], light: [0.40, 0.425, 0.432], opacity: 1,
  })) : null;
  if (standIn) standIn.renderOrder = 1;

  const points = new THREE.Points(
    buildPointCloud(gTerrain, gCloud, q.pts),
    makePointsMaterial({ color: [0.72, 0.79, 0.81], size: q.size, opacity: 0.55 }),
  );
  points.renderOrder = 2;

  const edges = new THREE.LineSegments(
    new THREE.EdgesGeometry(gCloud, 18),
    makeLineMaterial({ color: [0.86, 0.88, 0.87], opacity: 0.3, tint: 0.8, boost: 0.9 }),
  );
  addOrder(edges.geometry);
  edges.renderOrder = 3;

  const volumeEdges = new THREE.LineSegments(
    new THREE.EdgesGeometry(gVolume),
    makeLineMaterial({ color: [0.80, 0.85, 0.85], opacity: 0, tint: 0.75, boost: 1.3 }),
  );
  addOrder(volumeEdges.geometry);
  volumeEdges.renderOrder = 3;

  /* PHASE 4 — tint is how far a line layer travels toward the page accent.
     At 1 every line becomes pure accent, which is what turned the MEASURE
     terrain into a lime carpet and the QUANTIFY plan into glowing orange
     rather than drawn linework. The measurement layers (survey, stations)
     keep tint 1 because there the colour IS the reading; the substrate
     layers keep their own near-neutral value with an accent cast. */
  const wire = new THREE.LineSegments(
    buildTerrainWire(q.wireStep, q.wireSub),
    makeLineMaterial({ color: [0.42, 0.47, 0.48], opacity: 0.1, tint: 0.5, boost: 0.9 }),
  );
  wire.renderOrder = 3;

  const contours = new THREE.LineSegments(
    buildContours(q.contourLevels, q.contourRes),
    makeLineMaterial({ color: [0.36, 0.42, 0.43], opacity: 0.05, tint: 0.68, boost: 1.0 }),
  );
  contours.renderOrder = 3;

  const survey = new THREE.LineSegments(
    buildSurvey(),
    makeLineMaterial({ color: [0.56, 0.63, 0.64], opacity: 0, tint: 1, boost: 1.5 }),
  );
  survey.renderOrder = 4;

  /* ---------------- the level groups ----------------
     PHASE 8. Everything that belongs to ONE storey and has to move with it
     — its plan drawing, its capture-station marks, its sampled point cloud —
     lives in a group per level, in world units. The architecture's own
     groups live inside the GLB and are addressed in metres; both are driven
     by the same `setExplode` so the drawing never separates from the
     building it was extruded from. That is the whole exploded view. */
  const EXPLODE_GAP = EXPLODE_GAP_M / MPU;   // metres → world units
  const LEVEL_KEYS = [...LEVEL_IDS, 'ROOF'];
  const levelGroups = {};
  for (const lid of LEVEL_KEYS) {
    const g = new THREE.Group();
    g.name = `PLAN_LEVEL_${lid}`;
    levelGroups[lid] = g;
    group.add(g);
  }

  /* One drawing per level, each at its own elevation. The QUANTIFY floor
     selector fades between them; the exploded view separates them; and all
     three come out of the same `buildPlan(level)`. */
  const planMeshes = {};
  const planWeight = {};              // per-level plan opacity multiplier
  for (const lid of LEVEL_IDS) {
    const mesh = new THREE.Mesh(
      buildPlan(lid),
      /* PHASE 9 §20 — THE DRAWING IS NEUTRAL; THE ANALYSIS IS THE ACCENT.

         Phase 8 tinted the whole sheet 52% toward the mode colour, which
         made every wall, every door swing and every dimension string the
         same orange as the thing being counted — a glowing interface rather
         than a drawing (qa/p9/shots/before-lap-quant-L01.png). The brief is
         explicit: accent belongs to the data currently being read and
         nothing else. So the linework is paper-white with a trace of the
         mode in it, and what carries the colour is the recognition bracket,
         the extraction labels and the scan pass — all of which are ABOUT the
         analysis rather than about the building. */
      makeLineMaterial({ color: [0.93, 0.93, 0.92], opacity: 0.04, tint: 0.14, boost: 0.80, ribbon: true }),
    );
    mesh.renderOrder = 4;
    mesh.frustumCulled = false;
    planMeshes[lid] = mesh;
    planWeight[lid] = 1;
    levelGroups[lid].add(mesh);
  }
  /** The ground floor's drawing is the one every legacy caller means. */
  const plan = planMeshes.L00;

  /* ==================================================================
     PHASE 11 — THE DRAWING, AS SEPARABLE LAYERS.

     `planMeshes` is one sheet per level, because everywhere else on this
     site a plan is read as a sheet. PART 13 needs the opposite: the same
     drawing, split by what each line MEANS, so that door symbols can
     detach from walls without the walls moving.

     Six more meshes over the reference room's own level. They draw the
     same content the merged sheet draws — same rooms, same openings, same
     dimensions, from webgl/levels.js — so nothing here is a second
     description of the plan, and they are invisible outside the journey
     because `journey.sheet` is 0 everywhere else.

     They sit on `group` rather than in a level group: the journey never
     explodes the building, and a layer that is being taken off the sheet
     must not also be carrying the storey's separation.
     ================================================================== */
  const planLayerGeo = buildPlanLayers('L01');
  const planLayers = PLAN_LAYERS.map((key, i) => {
    const mesh = new THREE.Mesh(
      planLayerGeo[key],
      makeLineMaterial({
        color: [0.93, 0.93, 0.92], opacity: 0,
        /* Annotation reads cooler than structure, exactly as on the merged
           sheet: the accent belongs to what is being measured. */
        tint: key === 'dims' || key === 'zones' ? 0.42 : 0.14,
        boost: key === 'walls' ? 0.80 : 0.60,
        ribbon: true,
      }),
    );
    mesh.name = `PLAN_LAYER_${key.toUpperCase()}`;
    mesh.renderOrder = 3;
    mesh.frustumCulled = false;
    mesh.visible = false;
    group.add(mesh);
    return { key, mesh, i };
  });

  /* How far each layer travels when the drawing comes apart, in world
     units per unit of `apart`. Structure does not move — everything else
     is lifted OFF it, which is what makes the separation read as a layer
     key rather than as an explosion. The step is small on purpose: PART 13
     asks for technical disassembly, not for objects flying. */
  const APART_LIFT = { walls: 0, doors: 0.55, windows: 1.00, rooms: 1.50, zones: 2.10, dims: 2.70 };

  const planAux = new THREE.Mesh(
    buildPlanAux(),
    makeLineMaterial({ color: [0.62, 0.66, 0.66], opacity: 0.03, tint: 0.42, boost: 0.75, ribbon: true }),
  );
  planAux.renderOrder = 4;

  const stations = new THREE.LineSegments(
    buildStations(),
    makeLineMaterial({ color: [0.5, 0.56, 0.57], opacity: 0.1, tint: 1, boost: 1.3 }),
  );
  stations.renderOrder = 4;

  const panorama = new THREE.LineSegments(
    buildPanorama(S0[0], S0[1], S0Y + 0.62, 2.1),
    makeLineMaterial({ color: [0.4, 0.48, 0.5], opacity: 0, tint: 1, boost: 1.2 }),
  );
  panorama.renderOrder = 4;

  /* The recognition bracket: parks on whichever plan symbol QUANTIFY is
     currently reading. Scaled per feature, so it frames the real extents. */
  const bracket = new THREE.Mesh(
    buildBracket(),
    makeLineMaterial({ color: [1, 1, 1], opacity: 0, tint: 1, boost: 0, ribbon: true }),
  );
  bracket.position.set(0, PLAN.y + 0.03, 0);
  bracket.renderOrder = 5;

  const scanPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(SITE.size * 1.9, SITE.size * 1.9),
    makeScanPlaneMaterial(),
  );
  scanPlane.renderOrder = 6;

  /* ================================================================
     PHASE 9 §06 — THE VERTICAL DATUM

     A building that has opened itself is still one building, and what says
     so is that every plate is still measured from the same line. This is
     that line: a single vertical run at the centre of the CORE — the one
     rectangle that is at the same plan position on all three levels — with
     a short tick at each level's own elevation.

     It is architectural rather than UI. It has no label, no arrow and no
     handle; it exists only while the building is separated, and at rest it
     is not drawn at all. The ticks travel with the plates, so what the line
     actually shows is how far each storey has been lifted OFF the datum,
     which is the one piece of information the exploded view cannot show by
     itself.
     ================================================================ */
  const datum = (() => {
    const cx = (CORE.x0 + CORE.x1) / 2;
    const cz = (CORE.z0 + CORE.z1) / 2;
    const TICK = 0.86;                        // world units, ≈4.6 m
    const KEYS = [...LEVEL_IDS, 'ROOF'];
    // one spine + one tick per level
    const pos = new Float32Array((1 + KEYS.length) * 6);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = makeLineMaterial({
      color: [0.86, 0.88, 0.90], opacity: 0, tint: 0.30, boost: 0.5,
    });
    const mesh = new THREE.LineSegments(g, mat);
    mesh.name = 'DATUM';
    mesh.visible = false;
    mesh.renderOrder = 5;
    const set = (i, ax, ay, az, bx, by, bz) => {
      pos.set([ax, ay, az, bx, by, bz], i * 6);
    };
    return {
      mesh,
      /** @param {number} t 0 stacked (not drawn), 1 fully separated */
      update(t) {
        const on = t > 0.02;
        mesh.visible = on;
        if (!on) return;
        const base = BASE_Y;
        const top = roofY() + (lift.ROOF || 0);
        set(0, cx, base, cz, cx, top, cz);
        KEYS.forEach((lid, n) => {
          const y = (lid === 'ROOF' ? roofY() : planY(lid)) + (lift[lid] || 0);
          set(n + 1, cx, y, cz, cx + TICK, y, cz);
        });
        g.attributes.position.needsUpdate = true;
        /* Never at full strength: it is a datum, not a diagram. */
        mat.uniforms.uOpacity.value = Math.min(1, t) * 0.52 * archMix;
      },
    };
  })();

  group.add(terrain, massing, volume, points, edges, volumeEdges, wire, contours,
            survey, planAux, stations, panorama, bracket, scanPlane, datum.mesh);
  if (standIn) group.add(standIn);

  /* ---------------- the architectural environment ----------------
     Fetched, never awaited. Nothing above depends on it: if it is slow the
     scene runs as the procedural one until it lands, and if it never lands
     the procedural one is simply what the site is. */
  let architecture = null;
  let archMix = 0;                    // crossfade, 0 = stand-in owns the frame
  const archPoints = [];              // one sampled cloud per level
  const archStations = [];            // the capture marks, one mesh per level
  if (arch) {
    import('./archScene.js')
      .then(({ loadArchitecture }) => loadArchitecture({
        tier: archTier(route),
        lite: narrow,
        points: narrow ? 2600 : 7200,
        renderer,
        onUpgrade: () => invalidate(),
      }))
      .then((a) => {
        architecture = a;
        group.add(a.group);
        /* The convolved sky also becomes the scene environment, which is
           what puts a horizon in the glass and a gradient on the metal.
           Nothing else in the scene reads it — the procedural layers are
           raw ShaderMaterials and ignore it entirely. */
        if (a.environment) scene.environment = a.environment;
        /* One sampled cloud per level, each in that level's group, so
           CAPTURE's reading of the building explodes with the building. */
        for (const [lid, geo] of Object.entries(a.pointGeometries)) {
          const pts = new THREE.Points(geo, makePointsMaterial({
            color: [0.72, 0.79, 0.81], size: q.size, opacity: 0.55,
          }));
          pts.renderOrder = 2;
          pts.frustumCulled = false;
          pts.material.uniforms.uPR.value = renderer.getPixelRatio();
          (levelGroups[lid] || group).add(pts);
          archPoints.push(pts);
        }
        /* The building's own capture positions, marked PER LEVEL. The twelve
           exterior stations still describe the site; these describe the
           rooms, which is what CAPTURE actually sells. They ride the same
           `stations` weight, so no preset needs to know they exist. */
        for (const lid of LEVEL_KEYS) {
          const pts = a.stations.filter((st) => st.level === lid);
          if (!pts.length) continue;
          const marks = new THREE.LineSegments(
            buildStationMarks(pts.map((st) => st.position)),
            makeLineMaterial({ color: [0.5, 0.56, 0.57], opacity: 0, tint: 1, boost: 1.3 }),
          );
          marks.renderOrder = 4;
          marks.frustumCulled = false;
          levelGroups[lid].add(marks);
          archStations.push(marks);
        }
        applyExplode();
        if (groundLight) applyGround();   // the GLB's own clouds and marks arrived after the sweep

        const fade = { v: 0 };
        if (env.reducedMotion) { archMix = 1; invalidate(); warmModes(); return; }
        gsap.to(fade, {
          v: 1, duration: 1.15, ease: 'power2.inOut',
          onUpdate: () => { archMix = fade.v; invalidate(); },
          onComplete: warmModes,
        });
      })
      .catch((err) => {
        console.warn('[gdf] architectural environment unavailable — '
          + 'staying on the procedural scene', err);
      });
  }

  const LINES = [edges, volumeEdges, wire, contours, survey, planAux, stations, panorama,
                 ...Object.values(planMeshes)];
  const annos = annoContainer ? createAnnotations(annoContainer, callouts || {}) : null;
  const floorLabels = annoContainer ? createLevelLabels(annoContainer) : null;

  /* ---------------- state ---------------- */
  const hero = { capture: 0, measure: 0, quantify: 0 };
  const narr = {};                            // narrative preset weights
  const mixState = { narrative: 0, side: 1 }; // 0 = hero owns the scene, 1 = scroll owns it
  const W = {};                               // resolved blend, reused each frame
  const L = {};                               // resolved layer values, reused each frame
  const amb = {};
  const setW = { capture: 0, measure: 0, quantify: 0, extract: 0 };

  /* Framing is re-solved whenever the viewport changes, not per frame.
     `fitViews` only touches the plan states; everything else keeps its
     authored camera. See webgl/presets.js. */
  /* ------------------------------------------------------------------
     PHASE 8.2 — THE FIT IS SOLVED AT THE ENDPOINTS, NOT EVERY FRAME.

     `refit` re-solves the plan states' camera distance against the
     usable half-frame, and the usable half-frame depends on which side
     the text column is on. `draw()` called it on every frame where
     `mixState.side` had moved — so the whole of a 1,1 s side transition
     ran three `fitViews` solves per frame, inside the tween, which is
     the one place §07 says a camera solver may not be.

     `side` only ever travels between 0 and ±1, and the solve depends on
     its MAGNITUDE, so there are exactly two answers. Both are computed
     on resize and the frames in between interpolate between them.
     ------------------------------------------------------------------ */
  let fitOpen = VIEWS;              // side 0 — the object has the whole frame
  let fitAside = VIEWS;             // |side| 1 — the text column has its half
  let fittedNarrow = VIEWS_NARROW, fittedPhone = VIEWS_PHONE;
  /* PHONE < 700: its own hero framing (see VIEWS_PHONE). NARROW < 900: the
     desktop framing, pulled back for a tall frame. */
  const views = () => (rect.width < PHONE_W ? fittedPhone
    : rect.width < 900 ? fittedNarrow : fitOpen);

  /* The view offset slides the rendered content sideways by 15% of the frame
     width, which is 30% of a half-frame — so that much of the horizontal
     room is gone on the crowded side. Folding it into the aspect the fit
     solves against is what stops the drawing clipping at 1440x1200 and
     1024x768, where the horizontal constraint binds and the old 15% figure
     under-counted by exactly a factor of two. */
  function refit(w, h) {
    /* PHASE 4 — an ultra-wide frame is not a 1440 frame with more margin.
       The vertical FOV is fixed, so at 2560x1080 the object holds the same
       height in a frame twice as wide and reads as a small model floating in
       a large canvas. Closing the camera on the very wide tiers gives the
       extra width to the OBJECT. The plan states are exempt: `fitViews`
       re-solves those from the aspect, which is the whole point of it. */
    const ar = w / h;
    /* PHASE 9 §30 — an ultra-wide frame gets MORE building, not more margin.
       Phase 4 closed the camera to 0.82 at 2.15:1, which was tuned against a
       single 4.9 m storey; against a 12.3 m building on the same frame the
       object still read as a model in the middle-right of a very large
       canvas (qa/p9/shots/before-wide-home-idle.png). 0.74 gives the extra
       width to the architecture, which is what the brief asks for, without
       the headline losing its half of the frame — the two are on opposite
       sides of it. */
    const k = ar >= 2.15 ? 0.74 : ar >= 1.9 ? 0.86 : 1;
    /* §29 — between 900 and 1100 the hero is a desktop and QUANTIFY is not.
       See VIEWS_TABLET in presets.js for why that is one override rather
       than a whole tier. */
    const tablet = w >= 900 && w < 1100;
    const wide = wideViews(tablet ? VIEWS_TABLET : VIEWS, k);
    const fitTable = tablet ? FIT_TABLET : undefined;
    const solve = (usable) => (w / h) * (w >= 900 ? usable : 1);
    fitOpen = fitViews(wide, { fov: camera.fov, aspect: solve(1), fit: fitTable });
    fitAside = fitViews(wide, { fov: camera.fov, aspect: solve(0.70), fit: fitTable });
    fittedNarrow = fitViews(VIEWS_NARROW, { fov: camera.fov, aspect: solve(1) });
    fittedPhone = fitViews(VIEWS_PHONE, { fov: camera.fov, aspect: solve(1), fit: FIT_PHONE });
  }

  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  const camPos = new THREE.Vector3(), camTgt = new THREE.Vector3();
  const tmpA = new THREE.Vector3(), tmpB = new THREE.Vector3(), tmpC = new THREE.Vector3();
  const axisVec = new THREE.Vector3(0, 1, 0);
  const planeQ = new THREE.Quaternion();

  let rect = { width: 1, height: 1 };
  let elapsed = 0;
  /* ------------------------------------------------------------------
     PHASE 8.2 — THE SCAN PLANE HAS ONE PHASE.

     It used to have two. `cycleT` free-ran at the blended service
     period; `ambPhase` drove a SECOND, unrelated phase through the
     ambient table's `st` column; and `applyBlend` crossfaded between
     the two POSITIONS by the idle weight:

         t = ambT * idleW + cycleT * (1 - idleW)

     Those are two numbers with no relationship to each other. Entering
     a mode takes idleW from 1 to 0 over a second, so `t` travelled from
     wherever the ambient pass happened to be to wherever the free
     cycle happened to be — a full-width sweep of the band across the
     frame, at a speed nothing in the scene was doing. That is the Scan
     Plane visibly jumping.

     There is one phase now. It ADVANCES; it is never assigned. Its
     rate is what blends — the ambient table contributes the derivative
     of its own `st` curve, the services contribute 1/period — so the
     ambient choreography keeps its authored timing and the handover in
     either direction is continuous by construction. Nothing can move
     the band except time.
     ------------------------------------------------------------------ */
  let scanPhase = 0.42;       // THE scan phase, 0..1
  let ambPhase = 0;           // ambient idle phase, 0..1
  let ambScanPrev = null;     // last ambient `st`, for its per-frame delta
  let beatHold = false;       // a deliberate beat owns the ambient phase
  let frameCenter = 0.5;      // where the phone hero window sits in the frame
  let frameZoom = 1;          // ...and how tall it is, relative to the authored frame
  let running = true;
  let visible = true;
  let active = true;          // false while the stage sits behind opaque sections
  let dirtyFrames = 3;
  const invalidate = () => { dirtyFrames = 3; };
  let raf = 0;
  let introRunning = false;
  let scanOverride = false;   // a deliberate pulse owns the plane position
  let extractStep = -1;
  let appliedSide = null;
  /* Dev-only camera override. QA needs to park the camera inside a room to
     produce matched before/after interior frames; the blend pass would
     otherwise overwrite the position every draw. Never set in production. */
  let camOverride = null;
  /* PHASE 8 state.
     `explode` 0 stacked → 1 separated. `focusLevel` is the storey QUANTIFY
     and CAPTURE are reading, or null for the whole building. `labels` is how
     present the world-space floor indicators are. */
  const state = {
    resolve: 1, camZoom: 1, planeVis: 1, bracket: 0, pulse: 0,
    explode: 0, labels: 0,
    /* PHASE 13 — `drawing` 0 leaves the composed frame, 1 leaves the plan's
       line network and nothing else. `callouts` scales every projected
       label family at once. Both are written per frame by the reader's
       scroll, never tweened — see setDrawingOnly / setCallouts. */
    drawing: 0, callouts: 1,
  };

  /* ==================================================================
     PHASE 11 — THE JOURNEY OWNS THE CAMERA.

     Every other state on this site is a WEIGHTED BLEND of authored
     viewpoints, and that is right for them: a mode change is a change of
     reading, and the shortest line between two readings is the correct
     one. A route through a building is not that. It is a path a body
     takes, and a path cannot be reconstructed by interpolating between
     the places it passes — interpolate between "outside the south facade"
     and "standing in the meeting room" and the camera goes through the
     wall beside the window rather than through the window.

     So when `journey.active` the blend still resolves the LAYERS, and the
     camera comes from webgl/descent.js instead. Everything else about the
     frame — which layers are on, how the scan plane behaves, what the
     annotations think is legible — is the same machinery as always.

     `near` and `fov` travel with the path because an interior needs both:
     0.5 world units of near plane is 2.7 m, which is most of the way
     across the reference room, and 31° of vertical field inside an 8 m
     room shows a wall.
     ================================================================== */
  const journey = {
    active: false,
    p: [0, 0, 0], t: [0, 0, 0],
    fov: 31, near: 0.5, ortho: 0,
    cross: 0, sample: 0, apart: 0, sheet: 0, accent: 1, scan: 1, cut: null, solid: 0,
    fog: [21, 54],
  };
  const orthoM = new THREE.Matrix4();
  let accentMix = 0;                  // the page's own accent strength
  let accentRGB = [176, 188, 190];    // display accent — the dark ground
  let accentInk = [84, 96, 104];      // the same service as ink — the light ground

  /* ------------------------------------------------------------------
     PHASE 12.1 — THE GROUND.

     The homepage hero stands on a light ground now (styles/hero.css).
     Every procedural layer in this scene was drawn as light ink on black:
     white-grey lines, an additive point cloud, surfaces that go from
     near-black to mid-grey. On #F5F6F7 those are invisible or wrong.

     One switch, read from the stage's own tone so the DOM is the single
     authority, and it swaps what has to swap and nothing else:

       clear colour   the stage's --bg
       line work      the same grey, inverted (paper-white → ink)
       point cloud    additive light dust → normal-blended graphite grains
       surfaces       the dark/lit pair mirrored, so a lit face is still
                      the brighter one
       accent         the service's INK variant (store.js), because cyan
                      and lime are headline colours on black and 1,5:1 on
                      white
       scan plane     normal blending — an additive glow on white is white

     The building is lit PBR and needs nothing: concrete reads as concrete
     on either ground. The fog is alpha, so it already fades to whatever
     the clear colour is. Layers that load later (the GLB's own point
     clouds and station marks) are swept by the same pass when they land.
     ------------------------------------------------------------------ */
  let groundLight = stage?.dataset?.tone === 'light';
  const asSRGB = (c) => { const o = {}; c.getRGB(o, THREE.SRGBColorSpace); return [o.r, o.g, o.b]; };
  const fromSRGB = (c, [r, g, b]) => c.setRGB(r, g, b, THREE.SRGBColorSpace);
  const inv = (rgb) => rgb.map((v) => 1 - v);

  function applyAccent() {
    const rgb = groundLight ? accentInk : accentRGB;
    scanUniforms.uAccent.value.setRGB(rgb[0] / 255, rgb[1] / 255, rgb[2] / 255, THREE.SRGBColorSpace);
    scanUniforms.uAccentMix.value = accentMix * (journey.active ? journey.accent : 1);
  }

  function applyGround() {
    renderer.setClearColor(pageBackground(stage), 1);
    scene.traverse((o) => {
      const m = o.material;
      const u = m?.uniforms;
      if (!u) return;
      const g = (m.userData.ground ??= {});          // the colours as authored
      if (u.uDraw && u.uColor) {                      // line work
        g.color ??= asSRGB(u.uColor.value);
        fromSRGB(u.uColor.value, groundLight ? inv(g.color) : g.color);
      } else if (u.uSize && u.uColor) {               // point cloud
        g.color ??= asSRGB(u.uColor.value);
        fromSRGB(u.uColor.value, groundLight ? [0.16, 0.20, 0.22] : g.color);
        m.blending = groundLight ? THREE.NormalBlending : THREE.AdditiveBlending;
      } else if (u.uDark && u.uLight) {               // solid surfaces
        g.dark ??= asSRGB(u.uDark.value);
        g.light ??= asSRGB(u.uLight.value);
        fromSRGB(u.uDark.value, groundLight ? inv(g.light) : g.dark);
        fromSRGB(u.uLight.value, groundLight ? inv(g.dark) : g.light);
      } else if (m === scanPlane.material) {
        m.blending = groundLight ? THREE.NormalBlending : THREE.AdditiveBlending;
      }
    });
    applyAccent();
    invalidate();
  }
  let yawGain = 1;                    // how much ambient yaw the scene is allowed
  /* CP-11, the reference room's capture station: the room's plan centre at
     standing eye height on its own level. Derived, not placed — the same
     rectangle webgl/reference.js resolves and webgl/levels.js owns. */
  const J_STATION = (() => {
    const r = levelFeatures('L01').rooms.find((x) => x.id === 'R07');
    return r
      ? [(r.x0 + r.x1) / 2, floorY('L01') + 1.6 / MPU, (r.z0 + r.z1) / 2]
      : [-2.4, floorY('L01') + 1.6 / MPU, 1.5333];
  })();
  let focusLevel = null;
  const lift = {};                    // level id → world-unit lift, for labels

  /* ==================================================================
     PHASE 8.2 — ONE MODE TRANSITION, ONE PROGRESS.

     Until now a mode change started FIVE tweens in the same frame and
     hoped they would agree: the hero weights over 1,00 s on
     power2.inOut, the level separation over 1,15 s on power3.inOut, the
     floor labels over 0,50 s on power2.out, the accent over 0,85 s on
     power2.out and the telemetry figures over 0,70 s. Five clocks with
     three curves. Nothing was synchronised — they merely started
     together, and they drifted apart immediately, which is what makes a
     transition read as several things happening near each other rather
     than as one object changing state.

     There is one clock now. `modeTx.p` runs 0 → 1 over MODE_DUR on
     MODE_EASE, and the weights, the separation and the labels are all
     DERIVED from it. The CSS side (the atmosphere layers and the accent
     marks) uses the same duration and the matching curve, declared once
     in tokens.css.

     INTERRUPTION is the reason it is built this way. `modeFrom` is
     snapshotted from the LIVE VALUES at the instant the new transition
     is asked for — never from a preset's start state — so switching
     mode at 30% of the previous switch continues from exactly the frame
     on screen. There is no rewind and nothing to snap back to.
     ================================================================== */
  const MODE_DUR = 0.85;
  const MODE_EASE = 'power2.inOut';
  const modeFrom = { capture: 0, measure: 0, quantify: 0, explode: 0, labels: 0 };
  const modeTo = { capture: 0, measure: 0, quantify: 0, explode: 0, labels: 0 };
  const modeTx = { p: 1 };

  function applyModeProgress() {
    const p = modeTx.p;
    const mix = (k) => modeFrom[k] + (modeTo[k] - modeFrom[k]) * p;
    hero.capture = mix('capture');
    hero.measure = mix('measure');
    hero.quantify = mix('quantify');
    const ex = mix('explode');
    state.labels = mix('labels');
    if (ex !== state.explode) { state.explode = ex; applyExplode(); }
    invalidate();
  }

  /** Move every level — building, drawing, marks and points — by the same
      separation, so nothing in the exploded view drifts off its own storey. */
  function applyExplode() {
    for (const lid of LEVEL_KEYS) {
      /* PHASE 9 §06 — the same non-linear travel the architecture uses, so
         the drawing, the station marks and the point sample stay on the
         plate they belong to. One table, in webgl/archScene.js. */
      const y = state.explode * EXPLODE_GAP * (EXPLODE_STEP[lid] ?? 0);
      levelGroups[lid].position.y = y;
      lift[lid] = y;
    }
    architecture?.setExplode(state.explode);
    datum.update(state.explode);
  }

  /** Which storey is being read. null releases the isolation. */
  function applyFocus() {
    for (const lid of LEVEL_KEYS) {
      planWeight[lid] = !focusLevel || focusLevel === lid ? 1 : 0.16;
    }
    architecture?.setLevelFocus(focusLevel);
  }

  /** PART 13 — isolate one storey. Shared by `setLevel` and `setMode`. */
  function applySetLevel(id) {
    const next = id && LEVEL_KEYS.includes(id) ? id : null;
    if (next === focusLevel) return;
    focusLevel = next;
    applyFocus();
    // the recognition bracket belongs to the sheet being read
    bracket.position.y = planY(focusLevel || 'L00') + (lift[focusLevel || 'L00'] || 0) + 0.03;
    annos?.setLevel?.(focusLevel || 'L00');
    invalidate();
  }
  let currentPeriod = SCAN.idle.period;

  /* ------------------------------------------------------------------
     ADAPTIVE RESOLUTION

     The hero is FILL-RATE BOUND on a retina laptop, and that is invisible
     from a QA machine: the same scene, the same 84 draw calls, costs 1,18 ms
     at 1,1 megapixels and 4,07 ms at the 4,4 megapixels a 14" MacBook
     actually renders. On a 120 Hz panel the budget is 8,33 ms, and the
     browser still has to composite that 4,4 Mpx canvas afterwards.

     Guessing a fixed pixel ratio would be trading sharpness on machines that
     never needed it. So the scene measures itself instead: a rolling median
     of real frame deltas, and the resolution steps down when the machine
     cannot hold the refresh rate and back up when it comfortably can. It
     settles within a couple of seconds, moves at most once every 1,2 s, and
     needs a MARGIN of improvement before stepping back up so it cannot
     oscillate between two rungs.

     A 3D hero has no fine text in it — the linework is ribbon geometry with
     real world width, not hairlines — so 1,5x on a 2x display is a trade a
     visitor does not see, and a stutter is one they do.
     ------------------------------------------------------------------ */
  const DPR_STEPS = [1, 1.25, 1.5, 1.75, 2];
  const maxDpr = dprCap();
  let dprIndex = DPR_STEPS.reduce(
    (best, v, i) => (v <= maxDpr + 1e-6 ? i : best), 0);
  let pixelRatio = DPR_STEPS[dprIndex];
  const dtRing = new Float32Array(45);
  let dtAt = 0;
  let dtFilled = 0;
  let lastStepAt = -1e9;
  let upBlockedUntil = -1e9;
  /* PHASE 8.1 — a step up that has to be taken back again is a FAILED
     recovery, and two of those mean the machine genuinely cannot hold the
     higher rung. Counting total up-steps instead (Phase 7) meant the tuner
     could never return to the resolution it started at: the load itself —
     GLB parse, texture upload, first paint — walks it down three or four
     rungs, and it was then allowed only two back. On a machine that can now
     hold device resolution that is a permanently soft frame. */
  let reversals = 0;
  let lastStepWasUp = false;
  /* ------------------------------------------------------------------
     PHASE 8.2 — THE TUNER MAY NOT MOVE DURING AN INTERACTION.

     A mode change, a floor change or a camera move costs a few frames
     more than an idle one. That is the transition, not the machine
     failing: reacting to it drops the internal resolution in the middle
     of the very motion the visitor is watching, which reads as the
     image jumping, and then puts it back 8 s later, which reads as it
     jumping again. Measured on the shipped build, an ordinary
     four-mode sequence moved the drawing buffer 1440x900 → 1800x1125 →
     1440x900 with no change in what the machine could do.

     So every transition takes a LOCK. The tuner is silent while any of
     them is in flight and for 400 ms after the last one lands, which is
     long enough for the frame deltas to be describing the steady state
     again rather than the tail of the motion.
     ------------------------------------------------------------------ */
  let qualityHoldUntil = 0;
  /**
   * Declare a transition. One call site for everything a transition is
   * not allowed to do: change the internal resolution, and force a
   * layout to re-measure the text it dodges.
   * @param {number} ms how long the transition being started will run.
   */
  function holdQuality(ms) {
    qualityHoldUntil = Math.max(qualityHoldUntil, performance.now() + ms + 500);
    holding = true;
    annos?.holdMeasurement?.(ms + 200);
    floorLabels?.holdMeasurement?.(ms + 200);
  }
  /* A step has to be asked for TWICE IN A ROW, in either direction. One
     evaluation that happens to land on the tail of a transition is not
     evidence, and neither is one quiet second after a stall.

     PHASE 8.2 — the step UP needs this more than the step down. The
     shipped tuner would recover to the next rung on a single
     comfortable sample and then discover it could not hold it, so an
     ordinary four-mode sequence moved the drawing buffer 1440x900 →
     1800x1125 → 1440x900: two visible changes of sharpness, in an
     interaction, for no change in what the machine could do. Two
     consecutive votes is ~2,4 s of agreement, and a step down now
     blocks any recovery for twelve seconds rather than eight. */
  let downVotes = 0;
  let upVotes = 0;
  /* Whether a hold is in force. Releasing one has to DISCARD the frame
     history as well as lift the block: the rolling median still holds
     the transition's own frames at that moment, so a tuner that starts
     deciding the instant the hold lifts is deciding on exactly the
     frames the hold existed to ignore. That is how a transition was
     still able to talk the resolution down 250 ms after it ended. */
  let holding = false;

  /** [10th percentile, median] frame delta over the ring, in ms. */
  function frameStats() {
    const n = Math.min(dtFilled, dtRing.length);
    if (n < dtRing.length) return null;
    const a = Array.from(dtRing.subarray(0, n)).sort((x, y) => x - y);
    return { p10: a[Math.floor(n * 0.1)] * 1000, med: a[n >> 1] * 1000 };
  }

  /* ------------------------------------------------------------------
     PHASE 8.3 · Part 21 — A 60 fps RENDER CADENCE WAS TESTED AND IS NOT
     HERE, because the measurement said it was not needed.

     The brief asks whether serving this loop every OTHER vsync on a
     120 Hz panel would present more evenly than letting it free-run. It
     was built, shipped into a build and A/B'd against the uncapped page
     on the 120 Hz display this phase was profiled on. Once the three
     render surfaces and the transparent drawing buffer were gone, the
     hero draws 120,0 frames a second with ONE HUNDRED PERCENT of its
     intervals at 8,3 ms and a worst frame of 10,9 ms. There is no
     jitter left for a cadence rule to smooth, and a rule that can only
     take frames away from a scene that is already meeting every vsync
     is complexity with a downside and no upside.

     The 86 fps mixed cadence that motivated it turned out to be
     eighty-four leaked headless QA browsers from an earlier session
     sharing the GPU. Measure the machine, not the mess on it.
     ------------------------------------------------------------------ */

  function setPixelRatio(next) {
    if (Math.abs(next - pixelRatio) < 1e-3) return;
    pixelRatio = next;
    renderer.setPixelRatio(next);
    renderer.setSize(rect.width, rect.height, false);
    points.material.uniforms.uPR.value = next;
    for (const pts of archPoints) pts.material.uniforms.uPR.value = next;
    dtFilled = 0;
    invalidate();
  }

  /**
   * One step per call, at most.
   *
   * The target is not a constant. A fixed "slower than 21 ms" rule is right
   * for a 60 Hz panel and useless on a 120 Hz one, where dropping to 60 fps
   * is exactly the stutter being complained about and 16,7 ms passes the
   * test. So the refresh interval is READ OFF THE MACHINE: the 10th
   * percentile of recent frames is what it manages when nothing is in the
   * way, and the median is what it is actually managing. Half again as long
   * as its own best frame means frames are being dropped.
   *
   * The percentile is clamped, so one anomalously short delta cannot
   * convince the tuner that the display runs at 300 Hz.
   *
   * GOING BACK UP IS DELIBERATELY HARD. A resolution that flaps between two
   * rungs every couple of seconds is more distracting than the stutter it is
   * trying to fix, so a step down blocks any step up for eight seconds, the
   * frame has to be genuinely comfortable rather than merely adequate, and
   * after two recoveries the tuner stops trying and settles low.
   */
  function tuneResolution(now) {
    if (introRunning || env.reducedMotion) return;
    /* Locked for the length of any transition, plus a settling window. */
    if (now < qualityHoldUntil) return;
    if (holding) {
      holding = false;
      dtFilled = 0;                 // measure the steady state, not the tail
      downVotes = 0; upVotes = 0;
      lastStepAt = now;
      return;
    }
    if (now - lastStepAt < 1200) return;
    const f = frameStats();
    if (!f) return;
    const refresh = Math.min(20, Math.max(6.5, f.p10));

    if (f.med > refresh * 1.5 && dprIndex > 0) {
      /* Twice in a row, or it is not the machine. */
      upVotes = 0;
      if (++downVotes < 2) { lastStepAt = now - 900; return; }
      downVotes = 0;
      if (lastStepWasUp) reversals += 1;
      lastStepWasUp = false;
      dprIndex -= 1;
      lastStepAt = now;
      upBlockedUntil = now + 12000;
      setPixelRatio(DPR_STEPS[dprIndex]);
      return;
    }
    downVotes = 0;
    if (now < upBlockedUntil || reversals >= 2) { upVotes = 0; return; }
    /* PHASE 8.1 — 1,05 was unreachable. `refresh` is the TENTH PERCENTILE of
       recent deltas, so asking the median to sit within 5% of it is asking
       rAF for less jitter than rAF has: at a solid 60 Hz, p10 lands near
       16,2 ms and the median at 16,7 ms, which is 1,03 on a good sample and
       1,06 on the next one. The tuner therefore almost never recovered, and
       a scene walked down four rungs by a slow LOAD stayed there. 1,15 is
       still comfortably inside the 1,5 that triggers a step down, so the
       hysteresis band is intact. */
    if (f.med < refresh * 1.15 && DPR_STEPS[dprIndex + 1] <= maxDpr + 1e-6) {
      if (++upVotes < 2) { lastStepAt = now - 900; return; }
      upVotes = 0;
      dprIndex += 1;
      lastStepWasUp = true;
      lastStepAt = now;
      setPixelRatio(DPR_STEPS[dprIndex]);
    } else {
      upVotes = 0;
    }
  }

  /* ---------------- sizing ---------------- */
  function viewOffset(w, h) {
    // Push the object away from whichever side the live text column occupies.
    const s = mixState.side;
    if (w < 900) {
      /* PHASE 5 — the phone hero has a signature WINDOW now, and the object
         is the subject inside it. `frameCenter` is where that window's
         centre sits as a fraction of the frame height (0.5 = dead centre),
         measured from the live layout by modules/heroWindow.js. Rendering
         is offset by the difference, so the mass lands in the window at
         every phone height instead of at a hardcoded lift.

         Above 700 (small tablets) there is no window; the Phase 4 lift is
         still the right answer there. */
      const off = w < PHONE_W ? -(frameCenter - 0.5) * h : h * 0.06;
      camera.setViewOffset(w, h, 0, off, w, h);
    } else if (Math.abs(s) < 0.02) {
      camera.clearViewOffset();
    } else {
      camera.setViewOffset(w, h, -w * 0.15 * s, h * 0.02, w, h);
    }
    appliedSide = w < 900 ? 0 : s;
  }

  function resize() {
    const w = Math.max(1, stage.clientWidth);
    const h = Math.max(1, stage.clientHeight);
    rect = { width: w, height: h };
    renderer.setPixelRatio(pixelRatio);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    if (w >= 900) {
      scanUniforms.uFogNear.value = 21; scanUniforms.uFogFar.value = 54;
    } else {
      // Narrow viewports pull the camera back; the fog band has to follow.
      scanUniforms.uFogNear.value = 30; scanUniforms.uFogFar.value = 78;
    }
    refit(w, h);
    viewOffset(w, h);
    camera.updateProjectionMatrix();
    points.material.uniforms.uPR.value = renderer.getPixelRatio();
    for (const pts of archPoints) pts.material.uniforms.uPR.value = renderer.getPixelRatio();
    annos?.measure();
    invalidate();
  }

  /* ---------------- the single blend pass ---------------- */
  function resolveWeights() {
    const m = mixState.narrative;
    for (const k in P) W[k] = 0;
    if (m < 1) {
      const c = hero.capture, mm = hero.measure, qy = hero.quantify;
      const idle = Math.max(0, 1 - c - mm - qy);
      const k = 1 - m;
      W.idle += idle * k; W.capture += c * k; W.measure += mm * k; W.quantify += qy * k;
    }
    if (m > 0) {
      let sum = 0;
      for (const k in narr) sum += narr[k] || 0;
      if (sum > 0) for (const k in narr) W[k] += ((narr[k] || 0) / sum) * m;
      else W.idle += m;
    }
    return W;
  }

  /* ------------------------------------------------------------------
     PHASE 8.1 — WARM THE MODE PATH BEFORE THE VISITOR TOUCHES IT.

     With the renderer and the style recalc fixed, one cost was left, and
     only on the FIRST activation of each mode: a single 92 ms animation
     frame, of which 84 ms was plain JavaScript. Not a shader compile (zero
     measured), not an upload (12 kB, 0 ms), not layout (0,9 ms) — just the
     blend path and every material in the building being walked with
     non-zero weights for the very first time, with V8 still deoptimising
     and re-optimising it underneath. The second activation of the same mode
     cost 2 ms. That is the definition of a cold path.

     So it is warmed once, off-screen, the moment the building has finished
     fading in. Every mode's weights — and the half-way weights the
     transition actually spends its time at — are pushed through the real
     blend, along with the exploded and level-isolated states, and the true
     state is restored before the function returns. Nothing renders in
     between: this is one synchronous task inside one frame, not a sequence
     of visible flashes.
     ------------------------------------------------------------------ */
  let warmed = false;
  function warmModes() {
    if (warmed) return;
    warmed = true;
    const save = {
      c: hero.capture, m: hero.measure, q: hero.quantify,
      explode: state.explode, level: focusLevel, labels: state.labels,
    };
    const set = (c, m, q) => { hero.capture = c; hero.measure = m; hero.quantify = q; applyBlend(); };
    /* The three destinations, and the crossfades between them — a mode
       transition spends almost all of its time at neither end. */
    set(1, 0, 0); set(0, 1, 0); set(0, 0, 1);
    set(0.5, 0.5, 0); set(0, 0.5, 0.5); set(0.5, 0, 0.5);
    set(0, 0, 0);
    /* The vertical verbs QUANTIFY reaches for. */
    state.explode = 0.9; applyExplode();
    focusLevel = 'L00'; applyFocus();
    state.labels = 1;
    set(0, 0, 1);
    /* Back to exactly where we were. */
    state.explode = save.explode; applyExplode();
    focusLevel = save.level; applyFocus();
    state.labels = save.labels;
    set(save.c, save.m, save.q);
    invalidate();
  }

  function applyBlend() {
    resolveWeights();

    for (const key of LAYER_KEYS) L[key] = 0;
    let ax = 0, sw = 0, per = 0, lo = 0, hi = 0, vis = 0;
    for (const name in W) {
      const w = W[name];
      if (w <= 0.0001) continue;
      const pr = P[name], sc = SCAN[name];
      for (const key of LAYER_KEYS) L[key] += pr[key] * w;
      ax += sc.ax * w; sw += sc.w * w; per += sc.period * w;
      lo += sc.lo * w; hi += sc.hi * w; vis += sc.vis * w;
    }

    /* Ambient idle, scaled by how much of the scene is still idle. */
    const idleW = W.idle;
    let scanGain = 1;
    if (idleW > 0.001 && !env.reducedMotion) {
      ambientAt(ambPhase, amb);
      const f = (v) => 1 + (v - 1) * idleW;
      L.terrain *= f(amb.terrain);
      L.massing *= f(amb.massing);
      L.points *= f(amb.points);
      L.edges *= f(amb.edges);
      L.wire *= f(amb.wire);
      L.contours *= f(amb.contours);
      L.plan *= f(amb.plan);
      scanGain = 1 + (amb.sv - 1) * idleW;
      vis *= scanGain;
    }

    /* ------------------------------------------------------------------
       PHASE 13 — THE DRAWING, ALONE.

       `planTight` is already almost this: the plan at 1, and a remainder
       of terrain at .05, massing at .02, points at .06, edges at .24 and
       a trace of the architectural shell. That remainder is what makes
       the state read as a building seen from above rather than as a
       DRAWING, and at the end of the third chapter the page needs the
       drawing — the numbers that land on it were counted off a sheet,
       not measured off a model.

       So one value fades everything that is not the plan. It is a
       multiplier on the resolved layer set rather than a new preset,
       because the state it reduces is whatever the reader happens to be
       in: the same control would work anywhere, and there is nothing to
       keep in step with the blend.
       ------------------------------------------------------------------ */
    if (state.drawing > 0.001) {
      const keep = 1 - state.drawing;
      for (const key of LAYER_KEYS) if (key !== 'plan') L[key] *= keep;
    }

    /* ------------------------------------------------------------------
       PHASE 8 — A LAYER AT ZERO OPACITY IS STILL A DRAW CALL.

       Nine of the eleven procedural layers are at or near zero in any given
       state — QUANTIFY draws the terrain at .07 and the contours at 0, IDLE
       draws the volume prism and the panorama sphere at 0 — and every one of
       them was being submitted, transformed and blended to nothing, on every
       frame, in every mode. With three levels the scene reached 154 draw
       calls and ~3.5 ms of CPU submission per frame, which is 42% of the
       budget on a 120 Hz display before the GPU has done anything.

       `hide()` is the whole fix: set the opacity as before, and take the
       object out of the render list when there is nothing to see. The
       threshold is below what a single 8-bit alpha step can express, so
       nothing that could have been visible is ever skipped.
       ------------------------------------------------------------------ */
    const hide = (obj, v) => { obj.visible = v > 0.0035; return v; };

    terrain.material.uniforms.uOpacity.value = hide(terrain, L.terrain);
    terrain.material.uniforms.uBands.value = L.bands;
    massing.material.uniforms.uOpacity.value = hide(massing, L.massing);
    volume.material.uniforms.uOpacity.value = hide(volume, L.volume * 0.46);
    volumeEdges.material.uniforms.uOpacity.value = hide(volumeEdges, L.volume * 0.85);
    // Only fully-opaque surfaces may write depth; anything translucent that
    // does will occlude the line layers drawn after it.
    terrain.material.depthWrite = L.terrain > 0.8;
    massing.material.depthWrite = L.massing > 0.8;

    /* The stand-in fades out by exactly as much as the building has faded
       in, so the volume is never drawn twice and never drawn not at all. */
    if (standIn) {
      /* The `massing` weight was cut to .42 in Phase 7 so the ABSTRACT
         VOLUMES would stop competing with the architecture. Those volumes
         are gone from this source now and the only thing left on that layer
         is two outbuildings, which still want .42 — but the stand-in is the
         BUILDING, and a building drawn at 42% while the GLB is in flight (or
         has failed) is a grey ghost where a hero should be. It gets the same
         weight scaled back up to solid. */
      const w = Math.min(1, L.massing * 2.3) * (1 - archMix);
      standIn.material.uniforms.uOpacity.value = hide(standIn, w);
      standIn.material.depthWrite = w > 0.8;
    }
    if (architecture) architecture.apply(L, archMix);

    points.material.uniforms.uOpacity.value = hide(points, L.points * state.resolve);
    points.material.uniforms.uBoost.value = L.pboost;
    /* The interior sample belongs to the building, so it arrives with it.
       This is what makes CAPTURE's cloud describe a ROOM rather than the
       outside of a box — and per level, a FLOOR rather than a building. */
    for (const pts of archPoints) {
      const lid = pts.parent?.name?.replace('PLAN_LEVEL_', '') ?? 'L00';
      pts.material.uniforms.uOpacity.value =
        hide(pts, L.points * state.resolve * archMix * (planWeight[lid] ?? 1));
      pts.material.uniforms.uBoost.value = L.pboost;
    }

    edges.material.uniforms.uOpacity.value = hide(edges, L.edges);
    wire.material.uniforms.uOpacity.value = hide(wire, L.wire);
    contours.material.uniforms.uOpacity.value = hide(contours, L.contours);
    survey.material.uniforms.uOpacity.value = hide(survey, L.survey);
    /* Every level's drawing carries the same `plan` weight, scaled by the
       floor selector. QUANTIFY reading L01 is not a different layer — it is
       the same layer with two of its three sheets stepped back. */
    for (const lid of LEVEL_IDS) {
      const m = planMeshes[lid];
      m.material.uniforms.uOpacity.value =
        hide(m, L.plan * planWeight[lid] * (1 - journey.sheet));
    }
    planAux.material.uniforms.uOpacity.value = hide(planAux, L.planAux);

    /* ------------------------------------------------------------------
       PHASE 11 — the same drawing, in six pieces.

       `journey.sheet` crossfades between the MERGED sheets above and the
       separable layers below. Both draw identical geometry, so the
       crossfade itself is invisible; what it buys is that the ascent can
       show three floor plates while the plan phase can take one of them
       apart, without either needing a second copy of the drawing.
       ------------------------------------------------------------------ */
    for (const { key, mesh } of planLayers) {
      const w = L.plan * journey.sheet
        /* Annotation lifts LAST and reads lightest; structure holds the
           sheet together and stays at full weight throughout. */
        * (key === 'zones' ? 0.30 : key === 'dims' ? 0.72 : 1);
      mesh.material.uniforms.uOpacity.value = hide(mesh, w);
      mesh.position.y = journey.apart * APART_LIFT[key];
    }
    stations.material.uniforms.uOpacity.value = hide(stations, L.stations);
    for (const marks of archStations) {
      const lid = marks.parent?.name?.replace('PLAN_LEVEL_', '') ?? 'L00';
      marks.material.uniforms.uOpacity.value =
        hide(marks, L.stations * archMix * (planWeight[lid] ?? 1));
    }
    panorama.material.uniforms.uOpacity.value = hide(panorama, L.panorama);

    /* The recognition bracket only exists while a drawing is being read.
       This summed the HOMEPAGE's plan states only, so on /mennyisegszamitas/
       — whose states are qDrawing / qIdentify / qStructure / qQuantity — the
       bracket has been multiplied by zero since the page was built, and the
       recognition sequence the whole page is about has been drawing a label
       with nothing under it. Found while tracing one room from the 360
       viewer to its quantity for Part 26. */
    const quantifyish = W.quantify + W.planTight + W.decision + W.qExploded
      + W.qDrawing + W.qIdentify + W.qStructure + W.qQuantity;
    bracket.material.uniforms.uOpacity.value =
      hide(bracket, state.bracket * Math.min(1, quantifyish));

    /* ---- camera basis ----
       Two pre-solved tables and one interpolation, rather than a solver
       call. `sideK` is how much of the frame the text column has taken;
       at 0 and 1 this is exactly what `refit` computed, and in between
       it is the straight line between them. */
    const desktop = rect.width >= 900;
    const V = desktop ? fitOpen : views();
    const V2 = desktop ? fitAside : V;
    const sideK = desktop ? Math.min(1, Math.abs(mixState.side)) : 0;
    camPos.set(0, 0, 0); camTgt.set(0, 0, 0);
    for (const name in W) {
      const w = W[name];
      if (w <= 0.0001) continue;
      const a = V[name], b = V2[name];
      for (let i = 0; i < 3; i++) {
        const pv = a.p[i] + (b.p[i] - a.p[i]) * sideK;
        const tv = a.t[i] + (b.t[i] - a.t[i]) * sideK;
        if (i === 0) { camPos.x += pv * w; camTgt.x += tv * w; }
        else if (i === 1) { camPos.y += pv * w; camTgt.y += tv * w; }
        else { camPos.z += pv * w; camTgt.z += tv * w; }
      }
    }
    camPos.multiplyScalar(state.camZoom * frameZoom);

    /* PHASE 11 — the path replaces the blended basis outright. It is
       applied HERE rather than in `draw` so that everything downstream
       which reads the camera basis — the sectional cut, the annotation
       projector, the floor labels — sees the frame that is actually
       going to be rendered. */
    if (journey.active) { camPos.fromArray(journey.p); camTgt.fromArray(journey.t); }

    // scan configuration
    axisVec.set(ax, 1 - ax, 0).normalize();
    scanUniforms.uScanAxis.value.copy(axisVec);
    scanUniforms.uScanWidth.value = sw;

    /* ----------------------------------------------------------------
       THE AXIS GATE.

       CAPTURE and MEASURE scan along Y; QUANTIFY scans along X, over a
       travel five times as long. Blending between them rotates the band
       through 90° and re-scales its range WHILE IT IS ON SCREEN, which
       is a teleport however smooth the interpolation is.

       `ax` is 0 or 1 in every preset, so a blended value between them
       is exactly the measure of how much the active states disagree
       about which way the plane points. The band is faded out across
       that disagreement and back in on the far side: the axis turns and
       the range re-scales while there is nothing to see, and the new
       pass enters as itself. It is derived from the same weights as
       everything else, so it cannot fall out of step with the
       transition it belongs to.
       ---------------------------------------------------------------- */
    const disagree = 4 * ax * (1 - ax);          // 0 at either axis, 1 half way
    /* Steep on purpose. The travel is 4,2 world units on the Y axis and
       17 on the X one, so the RANGE re-scales as fast as the axis turns
       — and a gate that only closes at the half-way point leaves the
       band visible through the first and last fifth of that re-scaling,
       which measured 22 world units per second of visible travel. At
       2,2 the gate is shut by the time the axis has turned a tenth of
       the way, which is before the range has moved enough to see. */
    const axisGate = 1 - smooth(Math.min(1, disagree * 2.2));
    /* Reduced motion holds one frame, which means the Scan Plane is PARKED
       rather than passing — and a stationary band as wide as the terrain
       stops reading as a scan and becomes a flood of accent across the whole
       surface. The plane still marks where it is; it just stops shouting. */
    currentPeriod = per || SCAN.idle.period;

    /* A pass fades in as it enters and out as it leaves, so the wrap
       from the far end back to the near one is not a jump. Six percent
       of the travel at each end — enough to cover the discontinuity,
       short enough that the pass is still a pass. */
    const edge = Math.min(1, scanPhase / 0.06) * Math.min(1, (1 - scanPhase) / 0.06);
    /* A PARKED plane has no ends to fade at — the fade exists to hide the
       wrap from the far end of a travel back to the near one, and a plane
       that is not travelling never wraps. */
    const gate = journey.cut !== null
      ? axisGate : axisGate * smooth(Math.max(0, Math.min(1, edge)));

    /* PHASE 11 — the plane's GAIN travels with the path too.

       Outside the building the Scan Plane crosses an object; under the
       site it crosses the camera. At full gain the contour set overhead
       flares every time the pass reaches it, and a survey of a hillside
       becomes a light show — which is exactly the "not sci-fi" the brief
       rules out. The plane is still there, still on the one phase, still
       passing; it simply stops shouting where the reader is inside what
       it is passing through. */
    scanUniforms.uScanGain.value =
      Math.max(scanGain * gate, state.pulse)
      * (journey.active ? journey.scan : 1)
      * (env.reducedMotion ? 0.30 : 1);

    if (!introRunning && !scanOverride) {
      scanUniforms.uScanPos.value = lo + (hi - lo) * scanPhase;
    }
    scanPlane.material.uniforms.uOpacity.value = hide(scanPlane,
      Math.max(vis * gate, state.pulse * 0.32) * state.planeVis * (env.reducedMotion ? 0.5 : 1));

    planeQ.setFromUnitVectors(tmpA.set(0, 0, 1), axisVec);
    scanPlane.quaternion.copy(planeQ);
    scanPlane.position.copy(axisVec).multiplyScalar(scanUniforms.uScanPos.value);

    // annotation set weights
    /* Which callout family is legible right now. The service-page presets
       feed the same four sets, so a page-specific anchor list needs no new
       plumbing — only its own entries. */
    setW.capture = W.capture + W.cloud + W.captureClose + W.capSite + W.capStation + W.capReturn;
    setW.measure = W.measure + W.measureClose + W.data + W.mSurface + W.mContours + W.mVolume + W.mExport;
    setW.quantify = W.quantify + W.decision + W.qDrawing + W.qQuantity;
    setW.extract = W.planTight + W.qIdentify + W.qStructure + W.qQuantity;
    /* PHASE 11 PART 18 — no projected captions inside the journey. The
       callouts are a device of a frame that is being LOOKED AT; the
       journey is a frame that is being travelled through, and its text is
       DOM composed on the block's own field. Two label systems over one
       building is what the phase is removing, not adding to. */
    if (journey.active) for (const k in setW) setW[k] = 0;
    /* PHASE 13 — and the same, by degree, for a frame that is resolving
       into its drawing: the captions are a device of a composed view, and
       they have to be gone before the block's own typography arrives. */
    if (state.callouts < 0.999) for (const k in setW) setW[k] *= state.callouts;
  }

  /* ==================================================================
     PHASE 11 PART 11 — PERSPECTIVE COLLAPSE.

     "The user should physically feel the space becoming a drawing."

     Two things do that, and they are deliberately separate because they
     are felt at different points in the movement.

     THE FIELD NARROWS. `fov` runs 40° during the ascent to 21° over the
     roof while the camera dollies back to keep the building the same size
     in frame. That is a real long-lens compression and it is what removes
     the convergence from the vertical edges — the "reduced perspective"
     stage, and it happens while the building is still a building.

     THE PROJECTION FLATTENS. Then the projection matrix itself is
     interpolated toward an orthographic one framing the SAME half-height
     at the target plane, so nothing changes size at the moment of the
     change: what leaves is the perspective divide, and what is left is a
     drawing. At `ortho` 1 there is no vanishing point anywhere in the
     frame and a floor plan is what an orthographic projection of a
     building from above IS — not a picture that resembles one.

     Element-wise interpolation of two projection matrices is exact at
     both ends and monotonic between them; there is no third matrix and no
     second camera, which is why this costs nothing when `ortho` is 0.
     ================================================================== */
  function applyJourneyProjection() {
    const dist = Math.max(0.05, camPos.distanceTo(camTgt));
    camera.fov = journey.fov;
    camera.near = journey.near;
    /* The far plane follows the subject. 0.015 near against a fixed far of
       140 is a depth ratio of nine thousand, and the interior segments are
       exactly where a heightfield 30 units behind the wall must not
       z-fight through it. Nothing beyond the fog's far distance is
       visible, so there is nothing out there to lose. */
    camera.far = Math.max(60, Math.min(200, dist * 4 + 30));
    camera.updateProjectionMatrix();
    if (journey.ortho <= 0.0005) return;
    const halfH = dist * Math.tan((camera.fov * Math.PI) / 360);
    const halfW = halfH * camera.aspect;
    orthoM.makeOrthographic(-halfW, halfW, halfH, -halfH, camera.near, camera.far);
    const a = camera.projectionMatrix.elements;
    const b = orthoM.elements;
    for (let i = 0; i < 16; i++) a[i] += (b[i] - a[i]) * journey.ortho;
    camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
  }

  /* ---------------- loop ---------------- */
  const clock = new THREE.Clock();

  /** Resolve the blend and draw. Separated from the loop so a frame can be
      forced on demand — reduced motion needs that, and so does inspection. */
  function draw(animated) {
    applyBlend();

    if (rect.width >= 900 && Math.abs((appliedSide ?? 0) - mixState.side) > 0.01) {
      /* The side moved, so the rendered content slides with it. The FIT
         does not have to be re-solved for that — see `refit` — so this
         is a view offset and a projection matrix, and no solver. */
      viewOffset(rect.width, rect.height);
      camera.updateProjectionMatrix();
    }

    // orbit-style parallax around the blended camera basis
    camera.position.copy(camPos);
    if (camOverride) {
      if (architecture) {
        architecture.setCutClose(architecture.cutCloseFor(
          { x: camOverride.p[0], y: camOverride.p[1], z: camOverride.p[2] }));
      }
      if (camOverride.interior) {
        /* A pure-REALITY frame: the survey layers are what the interior
           shot exists to look past, so they are silenced rather than
           blended down. QA only. */
        for (const l of LINES) l.material.uniforms.uOpacity.value = 0;
        points.material.uniforms.uOpacity.value = 0;
        for (const pts of archPoints) pts.material.uniforms.uOpacity.value = 0;
        scanPlane.material.uniforms.uOpacity.value = 0;
        terrain.material.uniforms.uOpacity.value = 0;
        for (const k in setW) setW[k] = 0;
        annos?.update(camera, group, rect, setW, annoOpts);
        floorLabels?.update(camera, group, rect, 0, lift, focusLevel);
      }
      camera.position.fromArray(camOverride.p);
      camTgt.fromArray(camOverride.t);
      camera.lookAt(camTgt);
      renderer.render(scene, camera);
      return;
    }
    /* PHASE 11 — no pointer parallax inside the journey. The parallax is
       a LATERAL offset of up to 1.35 world units, which is fine over a
       hero that is being looked at and completely wrong inside a room
       that is being walked through: it puts the camera through the wall
       at the near plane, and it is sideways motion nobody asked for
       (PART 21). The path is the only thing that moves the camera here. */
    if (animated && !journey.active) {
      tmpA.copy(camTgt).sub(camPos).normalize();               // forward
      tmpB.crossVectors(tmpA, tmpC.set(0, 1, 0)).normalize();  // right
      tmpC.crossVectors(tmpB, tmpA).normalize();               // up
      camera.position.addScaledVector(tmpB, pointer.x * 1.35);
      camera.position.addScaledVector(tmpC, pointer.y * 0.95);
    }
    /* PHASE 11 — WHICH WAY IS UP IN A PLAN.

       Looking straight down, the screen's up vector is what is left of the
       world up once the view direction has been removed from it — and as
       the view approaches vertical that remainder approaches zero and the
       roll becomes whatever the last few thousandths of the camera offset
       happened to be. A drawing that arrives on screen at seventeen
       degrees is the "rotated diamond" this codebase has warned about
       since Phase 2.

       So as the view goes vertical the up vector is handed over to the
       plan's own convention: NORTH IS UP, which on this site is −Z. The
       blend is over the last eight degrees of tilt, where the two answers
       already agree to within a degree, so nothing rolls. */
    if (journey.active) {
      tmpA.copy(camTgt).sub(camPos).normalize();
      const vert = Math.abs(tmpA.y);
      const k = Math.max(0, Math.min(1, (vert - 0.876) / 0.11));
      camera.up.set(0, 1 - k * k * (3 - 2 * k), -(k * k * (3 - 2 * k))).normalize();
    } else if (camera.up.y !== 1) {
      camera.up.set(0, 1, 0);
    }
    camera.lookAt(camTgt);
    if (journey.active) applyJourneyProjection();

    /* The sectional cut follows the camera — open while the building is
       being looked AT, closed once it is being stood IN. See
       archScene.cutCloseFor. */
    if (architecture) architecture.setCutClose(architecture.cutCloseFor(camera.position));

    renderer.render(scene, camera);
    if (frameSubs.size) for (const fn of frameSubs) fn();
    if (rect.width >= 620) {
      annos?.update(camera, group, rect, setW, annoOpts);
      /* The labels stand off the drawing's NEAR-LEFT corner, not over it: a
         floor indicator laid across the plan it names is the one place it
         must never be.

         They are also gated at 900, not at 620. Below 900 the hero has no
         left/right split — the type runs the full width and the object sits
         BEHIND it as atmosphere — so there is no half of the frame for a
         label to stand in. At 860 they landed straight across the lede and
         the START PROJECT button, in the one band the responsive sweep had
         not covered. A floor indicator is a device of the split composition;
         where the composition is not split, there is nothing for it to
         label from. */
      if (rect.width >= 900) {
        /* PHASE 9 §05 — the anchor stays on the near-LEFT corner.

           It was tried on the right for the exploded state, where the upper
           plates rise into the headline's band and two of the four labels
           were being dodged out of existence. On the right they collide with
           the telemetry column instead, which is a worse trade: that column
           is live text a visitor is reading, and the headline is not. What
           fixed the exploded state was the de-collision pass in
           createLevelLabels, not a different corner. */
        floorLabels?.update(camera, group, rect, state.labels, lift, focusLevel,
          [PLAN.X0 - 0.55, PLAN.Z1 + 0.55]);
      } else {
        floorLabels?.update(camera, group, rect, 0, lift, focusLevel);
      }
    }
  }

  /* DEV-only. QA has to sample the values a frame was DRAWN FROM, and
     any observer registered from outside is a second rAF callback whose
     order against this one is not defined — which makes a one-frame
     ambiguity look like a velocity spike. Replaced with a literal at
     build time, so this is absent in production. */
  let drawTap = null;

  /* ------------------------------------------------------------------
     PHASE 11 PART 18 — DOM THAT FOLLOWS GEOMETRY, CORRECTLY.

     A world point can only be projected to screen with the camera
     matrices of a frame that has actually been RENDERED: `lookAt` writes
     a quaternion, and the matrixWorld it implies does not exist until the
     renderer builds it. Projecting from a scroll handler therefore reads
     the PREVIOUS frame's camera — which is invisible while the camera is
     drifting and catastrophic across a transition, because the previous
     frame can be most of the way up a staircase while this one is a
     top-down orthographic plan. Measured: the four room-placed words
     landed within 46 px of each other at the centre of the frame
     (qa/p11/probe.png, before this).

     So a consumer that places DOM against geometry subscribes HERE and is
     called immediately after the draw it is describing. One callback,
     invoked once a frame, only while something is subscribed. */
  const frameSubs = new Set();

  function frame() {
    raf = requestAnimationFrame(frame);
    /* The RAW delta is what the tuner needs. `dt` below is clamped for the
       animation — a 150 ms hitch must not teleport the ambient cycle — and
       feeding that clamped value to the resolution tuner told it every stall
       was a 50 ms frame, which is exactly the shape of "this machine cannot
       keep up" it is built to react to. */
    const rawDt = clock.getDelta();
    const dt = Math.min(rawDt, 0.05);
    if (!running || !visible || !active) return;
    /* PHASE 8.1 — a STALL is not a rendering cost. A GLB parse, a texture
       upload or a garbage collection produces one enormous delta that has
       nothing to do with how many pixels this scene is filling, and feeding
       it to the median is how the tuner used to talk itself down to its
       lowest rung during load and stay there. Anything past four refresh
       intervals restarts the measurement instead of joining it. */
    /* PHASE 8.2 — the old guard CLEARED the ring on any frame past four
       refresh intervals, which meant a machine that was genuinely
       running at 15 fps could never accumulate 45 consecutive samples
       and the tuner deadlocked at whatever rung the load had left it
       on. A stall is an OUTLIER, so the sample is dropped and the
       measurement carries on — and the threshold is raised to a length
       no amount of fill rate can produce: 120 ms is a parse, an upload
       or a collection, not a frame. */
    if (rawDt <= 0.120) {
      dtRing[dtAt] = rawDt;
      dtAt = (dtAt + 1) % dtRing.length;
      dtFilled++;
    }
    tuneResolution(performance.now());

    const animated = !env.reducedMotion;
    if (animated) {
      elapsed += dt;
      // The ambient loop keeps turning under an active service, but slowly, so
      // releasing a mode never drops the visitor back into an unrelated phase.
      if (!beatHold) ambPhase = (ambPhase + (dt / AMBIENT_PERIOD) * (0.18 + 0.82 * W.idle)) % 1;

      /* THE ONE SCAN PHASE. Both sources contribute a RATE and the
         phase integrates them, so it is continuous across every
         handover between the ambient cycle and a service — and across
         every interruption of one by another. */
      ambientAt(ambPhase, amb);
      let ambRate = 0;
      if (ambScanPrev !== null) {
        let d = amb.st - ambScanPrev;
        if (d < -0.5) d += 1;                 // the ambient pass wrapped
        ambRate = Math.max(0, d) / Math.max(1e-6, dt);
      }
      ambScanPrev = amb.st;
      const idleShare = Math.max(0, Math.min(1, W.idle));
      const rate = idleShare * ambRate + (1 - idleShare) / (currentPeriod || 1);
      scanPhase = (scanPhase + rate * dt) % 1;
      scanUniforms.uTime.value = elapsed;
      pointer.x += (pointer.tx - pointer.x) * Math.min(1, dt * 3.2);
      pointer.y += (pointer.ty - pointer.y) * Math.min(1, dt * 3.2);
      /* The ambient yaw gives the object life — but a floor plan seen from
         above is a DRAWING, and a rotating drawing reads as a skewed diamond
         rather than as a plan. Damp the rotation by however much of the
         scene is currently a plan. */
      /* PHASE 8 — `data` and `qExploded` joined the list.
         The damping exists because a rotating drawing reads as a skewed
         diamond rather than as a plan. Phase 8 made DATA a plan state — it
         is where the building comes apart into three sheets — and added
         qExploded, and neither was damped, so the exploded stack swung
         through the ambient yaw and arrived on screen as a lozenge. */
      const planar = Math.min(1, (W.quantify || 0) + (W.decision || 0) + (W.planTight || 0)
        + (W.data || 0) + (W.qExploded || 0)
        + (W.qDrawing || 0) + (W.qIdentify || 0) + (W.qStructure || 0) + (W.qQuantity || 0));
      /* PHASE 11 — and it must not turn AT ALL inside the journey.

         The yaw is 0.042 rad of life given to an object being looked at
         from outside. Inside the reference room the camera is 0.8 world
         units from the wall, and the same 0.042 rad swings that wall
         nearly a metre across the frame — the building turning around the
         visitor, which is the one thing a walk through a building must
         never do. It also puts a rotation into a route whose whole claim
         is that it only ever goes in, down, through and up.

         Eased rather than switched, so entering and leaving the journey
         does not snap the exterior frame. */
      yawGain += ((journey.active ? 0 : 1) - yawGain) * Math.min(1, dt * 3.4);
      group.rotation.y = Math.sin(elapsed * 0.13) * 0.042 * (1 - 0.94 * planar) * yawGain;
    } else if (dirtyFrames <= 0) {
      return;   // reduced motion: hold the last frame until something changes
    }

    draw(animated);
    if (import.meta.env.DEV && drawTap) drawTap();
    dirtyFrames--;
  }

  const annoOpts = { dodge: true, top: 132 };

  function addOrder(geo) {
    if (geo.getAttribute('aOrder')) return;
    const n = geo.getAttribute('position').count;
    const order = new Float32Array(n);
    for (let i = 0; i < n; i += 2) { const t = i / n; order[i] = t; order[i + 1] = t; }
    geo.setAttribute('aOrder', new THREE.BufferAttribute(order, 1));
  }

  /* ---------------- lifecycle ---------------- */
  const ro = new ResizeObserver(resize);
  ro.observe(stage);

  const io = new IntersectionObserver(
    ([e]) => { visible = e.isIntersecting; if (visible) invalidate(); },
    { rootMargin: '160px' },
  );
  io.observe(stage);

  const onVisibility = () => { running = !document.hidden; invalidate(); };
  document.addEventListener('visibilitychange', onVisibility);

  const onPointer = (e) => {
    if (env.reducedMotion) return;
    pointer.tx = (e.clientX / window.innerWidth) * 2 - 1;
    pointer.ty = (e.clientY / window.innerHeight) * 2 - 1;
  };
  if (env.finePointer) window.addEventListener('pointermove', onPointer, { passive: true });

  resize();
  applyBlend();
  raf = requestAnimationFrame(frame);

  if (groundLight) applyGround();     // the authored palettes are the dark ones

  /* ---------------- public API ---------------- */
  return {
    get weights() { return W; },
    /** The live callout projector — QUANTIFY re-anchors it per floor. */
    get annotations() { return annos; },

    /**
     * Hero service modes — THE authoritative mode transition.
     *
     * Everything the hero changes when a mode is entered is named here
     * and driven by one progress: the blend weights, the level
     * separation, the floor labels and which storey is being read. A
     * caller that wants a mode wants all four; splitting them across
     * four call sites is what let them drift apart.
     *
     * @param {string|null} id
     * @param {{explode?:number, labels?:number, level?:string|null}} [to]
     */
    setMode(id, to = {}) {
      /* PHASE 11 — THE JOURNEY IS NOT A MODE.

         `setMode` is how the hero rail and the scroll accent tell the
         scene which SERVICE is being read, and it carries the whole
         apparatus of that idea with it: the hero's own weight blend, the
         level separation, the floor labels. The journey sets the page
         accent as it travels — the round is cyan, the ground is lime, the
         drawing is orange — and that write reaches this method through
         the store, which would put three exploded floor plates and a set
         of world-space level tags into the middle of a meeting room.

         The accent itself is not affected: it arrives through
         `setAccent`, which is a uniform and belongs to the page's colour
         rather than to the scene's state. */
      if (journey.active) return;
      /* The transition begins FROM WHAT IS ON SCREEN. Reading the live
         values rather than a stored start state is the whole of
         interruptibility: at 30% of a CAPTURE transition these are the
         30% values, and the next one continues from them. */
      modeFrom.capture = hero.capture;
      modeFrom.measure = hero.measure;
      modeFrom.quantify = hero.quantify;
      modeFrom.explode = state.explode;
      modeFrom.labels = state.labels;

      modeTo.capture = id === 'capture' ? 1 : 0;
      modeTo.measure = id === 'measure' ? 1 : 0;
      modeTo.quantify = id === 'quantify' ? 1 : 0;
      modeTo.explode = Math.max(0, Math.min(1, to.explode ?? 0));
      modeTo.labels = Math.max(0, Math.min(1, to.labels ?? 0));

      /* The isolated storey is a discrete choice, not a ramp — it is
         which sheet is being read, and there is no half-way between two
         of them. It changes at the start so the drawing the transition
         is travelling towards is the right one. */
      if ('level' in to) applySetLevel(to.level);

      const dur = env.reducedMotion ? 0.2 : MODE_DUR;
      holdQuality(dur * 1000);
      modeTx.p = 0;
      gsap.to(modeTx, {
        p: 1, duration: dur, ease: MODE_EASE, overwrite: true,
        onUpdate: applyModeProgress, onComplete: applyModeProgress,
      });
      applyModeProgress();
    },

    /** Scroll-driven narrative state. Weights need not be normalised. */
    setNarrative(map) {
      for (const k in P) narr[k] = 0;
      for (const k in map) if (k in P) narr[k] = map[k];
      invalidate();
    },

    /** Hand the scene from the hero mode system to the scroll, or back. */
    setNarrativeMix(v, duration = 0.9) {
      if (duration === 0) { mixState.narrative = v; invalidate(); return; }
      holdQuality(duration * 1000);
      gsap.to(mixState, {
        narrative: v,
        duration: env.reducedMotion ? 0.15 : duration,
        ease: 'power2.inOut', overwrite: 'auto', onUpdate: invalidate,
      });
    },

    /** −1 puts the object left of centre, +1 right. Follows the text column. */
    setFocusSide(v, duration = 1.1) {
      if (duration === 0) { mixState.side = v; invalidate(); return; }
      holdQuality(duration * 1000);
      gsap.to(mixState, {
        side: v,
        duration: env.reducedMotion ? 0 : duration,
        ease: 'power2.inOut', overwrite: 'auto', onUpdate: invalidate,
      });
    },

    /** One deliberate scan pass, in world space. Used at narrative beats. */
    pulse({ duration = 1.4, from, to } = {}) {
      if (env.reducedMotion) return gsap.timeline();
      const sc = SCAN.idle;
      const a = from ?? sc.hi;
      const b = to ?? sc.lo;
      scanOverride = true;
      const tl = gsap.timeline({
        onUpdate: invalidate,
        onComplete: () => { scanOverride = false; },
      });
      tl.fromTo(scanUniforms.uScanPos, { value: a }, { value: b, duration, ease: 'power2.inOut' }, 0)
        .fromTo(state, { pulse: 0 }, { pulse: 1, duration: duration * 0.22 }, 0)
        .to(state, { pulse: 0, duration: duration * 0.4 }, duration * 0.6);
      return tl;
    },

    /* ==================================================================
       PHASE 8 — THE VERTICAL API

       Four verbs, and every mode on the site is a combination of them:
       separate the levels, read one level, name the levels, put the scan
       plane at a level. They are on the scene rather than in each caller
       because the homepage hero, the QUANTIFY page and the CAPTURE page all
       want the same four things and must not each invent them.
       ================================================================== */

    /**
     * PART 09 — the exploded level view.
     * @param {number} v 0 stacked, 1 fully separated (2.70 m per gap).
     */
    setExplode(v, duration = 1.15) {
      const to = Math.max(0, Math.min(1, v));
      if (env.reducedMotion || duration === 0) {
        state.explode = to; applyExplode(); invalidate(); return;
      }
      /* One owner. `setMode` derives the separation from `modeTx`, so a
         standalone caller has to take it off that clock rather than
         animate the same number from a second one. */
      gsap.killTweensOf(modeTx);
      modeFrom.explode = modeTo.explode = to;
      holdQuality(duration * 1000);
      gsap.to(state, {
        explode: to, duration, ease: MODE_EASE, overwrite: 'auto',
        onUpdate: () => { applyExplode(); invalidate(); },
      });
    },
    get explode() { return state.explode; },

    /**
     * PART 13 — read one storey, or release the isolation.
     *
     * The others do not disappear. A floor plan with nothing under it has
     * lost the thing that makes it a FLOOR, so they step back to a ghost
     * rather than out of the frame — which is also what keeps the same-place
     * claim legible while a single level is being read.
     *
     * @param {string|null} id  'L00' | 'L01' | 'L02' | null
     */
    setLevel(id) { applySetLevel(id); },
    get level() { return focusLevel; },

    /** PART 17 — the world-space floor indicators. */
    setFloorLabels(v, duration = MODE_DUR) {
      if (env.reducedMotion || duration === 0) {
        state.labels = v; invalidate(); return;
      }
      gsap.killTweensOf(modeTx);
      modeFrom.labels = modeTo.labels = v;
      gsap.to(state, { labels: v, duration, ease: MODE_EASE, overwrite: 'auto', onUpdate: invalidate });
    },

    /**
     * PART 19 — park the scan plane at a level.
     *
     * Selecting a floor and having the plane arrive at its elevation is what
     * makes the gesture read as taking a SLICE through a building rather
     * than as turning a layer on. Passing null hands the plane back to the
     * free-running cycle.
     */
    parkScanAt(id, duration = 0.9) {
      if (id === null) { scanOverride = false; invalidate(); return; }
      const y = planY(id) + (lift[id] || 0) + 0.28;
      scanOverride = true;
      if (env.reducedMotion || duration === 0) {
        scanUniforms.uScanPos.value = y; invalidate(); return;
      }
      gsap.to(scanUniforms.uScanPos, {
        value: y, duration, ease: 'power2.inOut', overwrite: 'auto', onUpdate: invalidate,
      });
    },

    /** Elevations the labels print, so a caller can print the same ones. */
    get levels() {
      return LEVEL_KEYS.map((id) => ({ id, y: id === 'ROOF' ? roofY() : planY(id) }));
    },

    /**
     * PART 26 — trace ONE room to its quantity.
     *
     * Give it a room uid (`L01-R07`) and the mode reads that room: its
     * storey is isolated, the recognition bracket parks on its rectangle and
     * the label quotes its real area. It is the last link in
     * REALITY → 360 → FLOOR → PLAN → QUANTITY, and the reason it can exist
     * at all is that the 360 station, the plan symbol and this rectangle are
     * the same object in webgl/levels.js.
     *
     * @returns {{id:string,label:string,area:number,level:string}|null}
     */
    focusRoom(uid) {
      const lid = (uid || '').split('-')[0];
      if (!LEVEL_IDS.includes(lid)) return null;
      const room = levelFeatures(lid).rooms.find((r) => r.uid === uid);
      if (!room) return null;
      this.setLevel(lid);
      const e = annos?.setRoomExtract(room);
      /* Only this room's label. Arriving here from the 360 viewer is one
         question — "what IS this room?" — and the other four recognitions
         are answers to questions nobody asked yet. */
      if (e) { extractStep = -1; this.setExtractStep(e.index, true); }
      invalidate();
      return { id: room.uid, label: room.label, area: room.area, level: lid };
    },

    /**
     * QUANTIFY recognition sequence: park the bracket on feature n.
     * @param {number} n
     * @param {boolean} only  reveal ONLY n — see §22 and `focusRoom`.
     */
    setExtractStep(n, only = false) {
      if (n === extractStep && !only) return;
      extractStep = n;
      annos?.setExtract(n, only);
      const e = annos?.extracts?.[n];
      if (!e) {
        gsap.to(state, { bracket: 0, duration: 0.35, onUpdate: invalidate });
        return;
      }
      const dur = env.reducedMotion ? 0 : 0.55;
      const by = (e.y ?? PLAN.y) + (lift[e.level || 'L00'] || 0) + 0.03;
      gsap.to(bracket.position, { x: e.f.x, y: by, z: e.f.z, duration: dur, ease: 'power3.inOut', onUpdate: invalidate });
      gsap.to(bracket.scale, { x: e.box[0] / 2, z: e.box[1] / 2, duration: dur, ease: 'power3.inOut', onUpdate: invalidate });
      gsap.fromTo(state, { bracket: 0 }, { bracket: 1, duration: dur * 0.7 || 0.001, onUpdate: invalidate });
    },

    /** Which text column the callouts must dodge. */
    setAvoid(el, opts) {
      annos?.setAvoid(el);
      floorLabels?.setAvoid(el);
      if (opts) Object.assign(annoOpts, opts);
    },

    /* ------------------------------------------------------------------
       MEASURE's cut level.

       The excavation prism is authored at the building pad. Given a floor
       and a top in world Y it is stretched across the whole parcel and cut
       at that level, so the solid the visitor sees is the solid the m³
       readout was integrated over. Never called by the homepage; the prism
       keeps its authored transform there.
       ------------------------------------------------------------------ */
    setVolumeLevel(topY, floorY) {
      const gy0 = SITE.padY, gy1 = 0.58;
      const sy = Math.max(0.001, (topY - floorY) / (gy1 - gy0));
      const sx = SITE.size / (SITE.pad.x1 - SITE.pad.x0);
      const sz = SITE.size / (SITE.pad.z1 - SITE.pad.z0);
      const py = floorY - gy0 * sy;
      volume.scale.set(sx, sy, sz);
      volume.position.y = py;
      volumeEdges.scale.set(sx, sy, sz);
      volumeEdges.position.y = py;
      // The Scan Plane reads the cut, so the gesture and the number agree.
      scanOverride = true;
      scanUniforms.uScanPos.value = topY;
      invalidate();
    },

    /* ------------------------------------------------------------------
       PHASE 5 — the phone hero window.

       `setFrameCenter` tells the renderer where the window the object is
       supposed to occupy sits in the frame, so the camera aims at it
       instead of at a hardcoded lift. `heroBeat` is the first-contact
       transformation: ONE run of the ambient cycle's solid → scan → data
       arc, fast enough to be read before the first scroll, handed back to
       the calm free-running loop at the far end. It is not a new
       animation — it is the loop the object already runs, played once at
       reading speed. Nothing is added to the scene to make it happen.
       ------------------------------------------------------------------ */
    setFrameCenter(f, span) {
      const v = Math.max(0.15, Math.min(0.9, f));
      /* The window is a grid remainder, so it is 42% of the frame on a 932px
         phone and 32% on an 800px one. The camera follows: the object holds
         the same share of the WINDOW at every height instead of the same
         share of the viewport, which is what makes all four widths read as
         composed rather than as one design with more or less slack.
         PHONE_SPAN is the span the views in VIEWS_PHONE were authored for. */
      const z = span ? Math.max(0.84, Math.min(1.14, PHONE_SPAN / span)) : 1;
      if (Math.abs(v - frameCenter) < 0.002 && Math.abs(z - frameZoom) < 0.004) return;
      frameCenter = v;
      frameZoom = z;
      viewOffset(rect.width, rect.height);
      camera.updateProjectionMatrix();
      invalidate();
    },

    /** @returns {gsap.core.Timeline} so a caller can sequence against it. */
    heroBeat({ from = 0, to = 0.80, duration = 3.2, delay = 0 } = {}) {
      const tl = gsap.timeline({ delay });
      if (env.reducedMotion) { ambPhase = to; ambScanPrev = null; invalidate(); return tl; }
      beatHold = true;
      const carrier = { p: from };
      ambPhase = from;
      ambScanPrev = null;      // a jumped phase has no meaningful derivative
      tl.to(carrier, {
        p: to, duration, ease: 'power1.inOut',
        onUpdate: () => { ambPhase = carrier.p; invalidate(); },
      }, 0)
        .add(() => { beatHold = false; });
      return tl;
    },

    /** Suspend rendering while the stage is hidden behind opaque sections. */
    /**
     * How far the frame is reduced to its drawing: 0 the composed scene,
     * 1 the plan's line network and nothing else. Written per frame from
     * the reader's scroll, so it takes a value rather than a duration —
     * a tween here would be a second clock against the first.
     */
    setDrawingOnly(v) {
      const n = v < 0 ? 0 : v > 1 ? 1 : v;
      if (Math.abs(n - state.drawing) < 0.002) return;
      state.drawing = n;
      invalidate();
    },

    /** How present every projected callout family is. 0 hides all of them. */
    setCallouts(v) {
      const n = v < 0 ? 0 : v > 1 ? 1 : v;
      if (Math.abs(n - state.callouts) < 0.002) return;
      state.callouts = n;
      invalidate();
    },

    setActive(v) {
      if (active === v) return;
      active = v;
      if (v) { clock.getDelta(); invalidate(); }
    },

    setAccent(rgb, mix, ink = null) {
      accentRGB = rgb;
      if (ink) accentInk = ink;
      accentMix = mix;
      /* PHASE 11 — the accent is a DOSE inside the journey.

         On the rest of the page the accent tints one object in a mostly
         empty dark frame, and full strength is right there. Inside the
         journey the tinted thing is the entire viewport — the underside
         of a hillside, the inside of a room, three storeys of structure
         going past — and the same mix turns a measured terrain survey
         into a flood of lime. Measured at 1440x900: MEASURE's ground read
         as a saturated green field with the contour lines invisible
         inside it (qa/p11/story/desk/07-underworld.png, before this).

         So the path carries how much of the accent each frame may take.
         The COLOUR never changes — the page is still lime under the site
         and orange in the drawing, and the tracker and the type say so —
         only how much of it lands on geometry that fills the screen. */
      applyAccent();
      invalidate();
    },

    /**
     * PHASE 12.1 — which ground the canvas stands on. `true` is the light
     * hero; everything the scene draws in ink swaps its palette. Called by
     * modules/narrative.js where the switch cannot be seen.
     */
    setGround(light) {
      light = !!light;
      if (light === groundLight) return;
      groundLight = light;
      applyGround();
    },

    /** Opening choreography: data resolves, one scan pass, geometry draws on. */
    intro() {
      const tl = gsap.timeline();
      if (env.reducedMotion) {
        state.resolve = 1; state.camZoom = 1; state.planeVis = 1;
        points.material.uniforms.uResolve.value = 1;
        for (const pts of archPoints) pts.material.uniforms.uResolve.value = 1;
        LINES.forEach((l) => { l.material.uniforms.uDraw.value = 1; });
        invalidate();
        return tl;
      }

      introRunning = true;
      state.resolve = 0; state.camZoom = 1.18; state.planeVis = 0;
      points.material.uniforms.uResolve.value = 0;
      points.material.uniforms.uScatter.value = 2.6;
      LINES.forEach((l) => { l.material.uniforms.uDraw.value = 0; });
      scanUniforms.uScanPos.value = 7.4;
      scanUniforms.uScanWidth.value = 1.5;

      tl.to(scanUniforms.uScanPos, { value: -2.6, duration: 1.55, ease: 'power2.inOut' }, 0)
        .to(state, { planeVis: 1.6, duration: .35 }, 0)
        .to(state, { planeVis: 1, duration: .9 }, .55)
        .to(points.material.uniforms.uResolve, { value: 1, duration: 1.5, ease: 'power2.out' }, 0.12)
        .to(state, { resolve: 1, duration: 1.2, ease: 'power1.out' }, 0.12)
        .to(LINES.map((l) => l.material.uniforms.uDraw), { value: 1, duration: 1.25, ease: 'power2.out', stagger: 0.05 }, 0.35)
        .to(state, { camZoom: 1, duration: 2.1, ease: 'power2.out' }, 0)
        .add(() => { introRunning = false; }, 1.6);

      return tl;
    },

    /* ==================================================================
       PHASE 11 — THE DATA DESCENT

       One entry point. The journey module measures the scroll, samples
       the path in webgl/descent.js and hands the resulting frame here;
       this decides what the renderer does with it. Nothing about the
       path is decided in this file, and nothing about the renderer is
       decided in that one.
       ================================================================== */

    /**
     * @param {object|null} j a sampled frame from webgl/descent.js, or
     *   null to hand the camera back to the preset blend.
     */
    setJourney(j) {
      if (!j) {
        if (!journey.active) return;
        journey.active = false;
        journey.cross = 0; journey.sample = 0; journey.apart = 0; journey.sheet = 0;
        journey.accent = 1; journey.scan = 1; journey.cut = null; journey.solid = 0;
        architecture?.setInside(false);
        scanOverride = false;
        scanUniforms.uAccentMix.value = accentMix;
        applySetLevel(null);
        scanUniforms.uCross.value = 0;
        scanUniforms.uSampleG.value = 0;
        terrain.material.side = THREE.FrontSide;
        camera.fov = 31; camera.near = 0.5; camera.far = 140;
        renderer.toneMappingExposure = 1.06;
        /* The site's own fog band, as `resize` sets it. The journey moved
           it to four world units to build the underworld; leaving it there
           would fog the hero out at the top of the page. */
        if (rect.width >= 900) {
          scanUniforms.uFogNear.value = 21; scanUniforms.uFogFar.value = 54;
        } else {
          scanUniforms.uFogNear.value = 30; scanUniforms.uFogFar.value = 78;
        }
        refit(rect.width, rect.height);
        viewOffset(rect.width, rect.height);
        camera.updateProjectionMatrix();
        invalidate();
        return;
      }
      const entering = !journey.active;
      journey.active = true;
      journey.p = j.p; journey.t = j.t;

      /* ----------------------------------------------------------------
         THE JOURNEY OWNS THE WHOLE FRAME, NOT ONLY THE CAMERA.

         The layers come through the SAME weight map and the SAME blend
         pass every other state on this site uses — there is no second
         renderer path — but they must be written every frame rather than
         tweened, because the reader's scroll is the clock and a tween
         would be a second one.

         Three things the rest of the page leaves switched on have to be
         taken off it explicitly on entry, because each of them is a
         device of the COMPOSED page rather than of the travelled one:

           the level separation   a building being inspected from outside
           the floor labels       a label standing beside its own storey
           the callouts           captions pinned to a frame

         All three are correct in the hero and all three are wrong at
         head height in a meeting room, where the journey's own DOM
         typography is the only text there should be.
         ---------------------------------------------------------------- */
      Object.keys(narr).forEach((k) => { delete narr[k]; });
      Object.assign(narr, j.w);
      mixState.narrative = 1;
      if (entering) {
        gsap.killTweensOf(mixState);
        gsap.killTweensOf(state);
        gsap.killTweensOf(modeTx);
        hero.capture = hero.measure = hero.quantify = 0;
        modeFrom.capture = modeTo.capture = 0;
        modeFrom.measure = modeTo.measure = 0;
        modeFrom.quantify = modeTo.quantify = 0;
        modeFrom.explode = modeTo.explode = 0;
        modeFrom.labels = modeTo.labels = 0;
        state.explode = 0; applyExplode();
        state.labels = 0;
        applySetLevel(null);
      }
      journey.fov = j.fov; journey.near = j.near;
      journey.ortho = j.ortho ?? 0;
      journey.cross = j.cross ?? 0;
      journey.sample = j.sample ?? 0;
      journey.apart = j.apart ?? 0;
      journey.sheet = j.sheet ?? 0;
      journey.accent = j.accent ?? 1;
      journey.scan = j.scan ?? 1;

      /* ----------------------------------------------------------------
         PART 07 — THE SECTION CUT, PARKED WHERE THE SLAB IS.

         The Scan Plane free-runs on a phase, which is right everywhere
         else: a pass is a pass and it happens when it happens. It is
         wrong for a floor crossing, where the plane has one job and one
         position — the soffit the camera is about to go through — and a
         line that arrives four seconds early is not a section cut, it is
         a coincidence.

         So the path may PARK it. The camera then descends onto a
         stationary horizontal line, the line opens across the frame, goes
         edge-on at the moment of crossing, and closes underneath. That is
         a section drawing performed rather than illustrated, and it is
         made of the plane the site already has. */
      journey.solid = j.solid ?? 0;
      architecture?.setInside(journey.solid > 0.5);
      journey.cut = j.cut ?? null;
      if (journey.cut !== null) {
        scanOverride = true;
        scanUniforms.uScanPos.value = journey.cut;
      } else if (scanOverride && j.cut === null) {
        scanOverride = false;
      }
      scanUniforms.uAccentMix.value = accentMix * journey.accent;

      /* Which storey the drawing belongs to. Null through the ascent,
         where three floor plates passing the camera IS the reading; L01
         from the moment the perspective starts to collapse, because a
         plan is ONE sheet and three of them stacked in an orthographic
         top view is the illegible tangle Phase 8 already diagnosed. */
      if ((j.focus ?? null) !== focusLevel) applySetLevel(j.focus ?? null);

      /* ----------------------------------------------------------------
         EXPOSURE, BECAUSE A CAMERA GOING INSIDE STOPS DOWN.

         The site's exposure is solved for an architectural exterior at
         dusk: a dark parcel, a lit building, one sun. Take that same
         exposure through a window and the interior is white — every
         surface in frame is a near-white plaster wall two metres away,
         lit by a sun that is now inside the room with it, and the tone
         mapping has nothing left to roll off.

         So exposure travels with the path, exactly as a real camera's
         does when it walks through a door. It is one renderer property
         and it costs nothing.
         ---------------------------------------------------------------- */
      renderer.toneMappingExposure = 1.06 * (j.exposure ?? 1);

      /* The path's own atmosphere. It is the SAME two uniforms the whole
         site fogs with, so the underworld is not a second fog system —
         it is this one pulled in to four world units, which is what makes
         a space that is a metre and a half under the ground read as
         enclosed rather than as the site with the lights off. */
      scanUniforms.uFogNear.value = j.fog[0];
      scanUniforms.uFogFar.value = j.fog[1];

      /* PART 04 — the glass crossing, in the vertex stage. */
      scanUniforms.uCross.value = journey.cross;

      /* PART 06 — the 360 round, as a sphere growing from CP-11. */
      const round = j.round ?? 0;
      scanUniforms.uSampleG.value = round;
      if (round > 0.001) {
        scanUniforms.uSampleC.value.set(J_STATION[0], J_STATION[1], J_STATION[2]);
        scanUniforms.uSampleR.value = journey.sample;
        /* The shell thickens as it grows, exactly as a measurement's own
           uncertainty does with distance from the instrument. */
        scanUniforms.uSampleW.value = 0.16 + journey.sample * 0.10;
      }

      /* PART 08 — under the site the ground is looked at from beneath, and
         a single-sided heightfield seen from below is not there at all. */
      terrain.material.side = journey.p[1] < BASE_Y - 0.02
        ? THREE.DoubleSide : THREE.FrontSide;

      /* The journey never uses the split composition, so the view offset
         the hero and the chapters need must not be left on the camera. */
      if (appliedSide !== 0 || rect.width < 900) {
        camera.clearViewOffset();
        appliedSide = 0;
      }
      invalidate();
    },
    get journeyActive() { return journey.active; },

    /**
     * A world point in stage pixels, or null if it is behind the camera.
     *
     * PART 18 — "text should occasionally relate spatially to geometry,
     * but readable text stays DOM." This is the whole of that contract:
     * the scene will say where a room is on screen and the DOM decides
     * what to put there. Nothing is rendered into WebGL that a reader has
     * to read.
     */
    project(x, y, z) {
      tmpA.set(x, y, z).applyMatrix4(group.matrixWorld).project(camera);
      if (tmpA.z > 1) return null;
      return {
        x: (tmpA.x * 0.5 + 0.5) * rect.width,
        y: (-tmpA.y * 0.5 + 0.5) * rect.height,
      };
    },

    /**
     * Run `fn` immediately after every rendered frame, with the camera in
     * exactly the state that frame was drawn from. Returns an unsubscribe.
     * See `project` — the two exist for each other.
     */
    onFrame(fn) {
      frameSubs.add(fn);
      return () => frameSubs.delete(fn);
    },

    requestRender: invalidate,

    /* Development-only inspection handle. `import.meta.env.DEV` is replaced
       with a literal at build time, so the whole block is dead code — and
       therefore absent — in production. */
    ...(import.meta.env.DEV ? {
      _debug: {
        state, mixState, hero, weights: W, layers: L,
        get ambient() { return ambPhase; },
        set ambient(v) { ambPhase = v; ambScanPrev = null; invalidate(); },
        get scanPos() { return scanUniforms.uScanPos.value; },
        render: () => draw(!env.reducedMotion),
        camera, renderer, pointer, views: VIEWS, viewsPhone: VIEWS_PHONE,
        /* The BLENDED camera basis, before the pointer parallax and the
           lookAt are applied. This is the value the mode transition
           owns; `camera.position` additionally carries a parallax that
           follows the pointer, which is a different (and deliberate)
           motion and must not be measured as if it were this one. */
        camBasis: camPos,
        /** Called immediately after every draw, with the frame's own state. */
        tap(fn) { drawTap = fn; },
        viewsNarrow: VIEWS_NARROW, presets: P,
        /** Re-solve the framing after VIEWS has been edited in place. */
        reframe() {
          refit(rect.width, rect.height);
          viewOffset(rect.width, rect.height);
          camera.updateProjectionMatrix();
          invalidate();
        },
        lights: { sun, fill, ambient, practicals },
        objects: { terrain, massing, volume, volumeEdges, points, edges, wire,
                   contours, survey, plan, planAux, stations, panorama, bracket, scanPlane,
                   standIn, planMeshes, levelGroups,
                   get archPoints() { return archPoints; } },
        get architecture() { return architecture; },
        get archMix() { return archMix; },
        set archMix(v) { archMix = v; invalidate(); },
        source: arch ? 'architectural' : 'procedural',
        get pixelRatio() { return pixelRatio; },
        get frameStats() { return frameStats(); },
        setPixelRatio,
        scene,
        /** Park the camera for a matched QA frame. null releases it. */
        look(p, t, fov, interior) {
          camOverride = p ? { p, t, interior } : null;
          if (fov) { camera.fov = fov; camera.updateProjectionMatrix(); }
          invalidate();
        },
      },
    } : {}),

    dispose() {
      cancelAnimationFrame(raf);
      ro.disconnect(); io.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pointermove', onPointer);
      annos?.dispose();
      floorLabels?.dispose();
      scene.traverse((o) => {
        o.geometry?.dispose?.();
        o.material?.dispose?.();
      });
      renderer.dispose();
    },
  };
}
