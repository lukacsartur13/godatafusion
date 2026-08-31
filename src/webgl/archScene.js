import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { MeshSurfaceSampler } from 'three/examples/jsm/math/MeshSurfaceSampler.js';
import {
  loadMaterialLibrary, loadEnvironment, makeScanAware, ALBEDO_GAIN, neutralise,
} from './archMaterials.js';
import { EXPLODE_GAP_M, EXPLODE_STEP } from './levels.js';

/* ============================================================
   THE ARCHITECTURAL ENVIRONMENT

   The same site, built rather than massed. Two GLBs come out of
   blender/export_web.py and drop straight into the scene group at
   identity — the metres-to-world-units scale and the podium floor
   offset are baked into their root node, so nothing here has to know
   the building's dimensions.

   PHASE 7 REVERSED THE MATERIAL DECISION.

   Phase 6 threw the imported materials away and rebuilt each one as a flat
   scan-aware surface. The comment defending it ended "the environment ships
   with NO textures at all ... there is nothing for a KTX2/Basis stage to
   compress", which was true and was the problem. Real Poly Haven assets
   arrived in Phase 7 and that pipeline would have discarded everything worth
   downloading.

   Now the GLB's materials are replaced by ones BUILT FROM THE MANIFEST —
   real MeshStandardMaterials with the packed maps bound — and the scan
   response is injected into them (webgl/archMaterials.js) rather than
   substituted for them.

   Three loads, in this order, and none of them blocks the one before:

     1. arch-structure.glb   43 kB, no textures, no UV cost worth naming.
                             The building appears in flat palette material.
     2. arch-furniture.glb   the contents, instanced.
     3. tex/manifest.json    the maps. When these land the flat materials
                             are swapped for textured ones IN PLACE.

   That order is Part 23's progressive quality, and it is why the hero is
   never a blank canvas waiting on a texture.
   ============================================================ */

/** The four layers the service modes switch independently. */
export const ARCH_KEYS = ['arch', 'ceiling', 'furn', 'glass'];

/** The four groups the building explodes into, bottom to top. */
export const LEVEL_KEYS = ['L00', 'L01', 'L02', 'ROOF'];

/* ------------------------------------------------------------------
   THE SECTIONAL CUT — Phase 8 rebuilt it

   Phase 7 opened the south row by CLIPPING the ceiling material against a
   world-Z plane. That worked because there was one storey and its ceiling
   was nothing else's floor. On a stack it is fatal: L00's ceiling IS L01's
   floor slab, and clipping it drops the work floor through the ground floor.

   So the cut is REAL GEOMETRY now. blender/build_environment.py emits the
   piece of slab over each cutaway as its own mesh in `<LEVEL>_CEILING`, and
   the rest of that slab as ordinary structure. Removing the storey's lid is
   then a matter of not drawing one small box, and putting it back — which is
   what an interior camera needs, because a room with its roof lifted off is
   a model of a room — is a matter of drawing it again.

   `cutCloseFor(p)` is the same ramp Phase 7 used and for the same reason:
   the cut opens as the camera leaves and closes as it enters, over the width
   of the facade rather than at a hard threshold, so the section never pops.
   The value is now 0..1 rather than a plane coordinate.

   The cut ROTATES up the building — south-east on L00, one mid-facade bay on
   L01, the whole terrace edge and half the roof on L02 — which is authored
   in webgl/levels.js and needs nothing here.
   ------------------------------------------------------------------ */

/* ------------------------------------------------------------------
   THE EXPLODED VIEW — Phase 8 Part 09

   Metres of extra separation per level gap, at full explosion. 2.70 m is
   0.75 of a floor-to-floor: enough to read each level as its own plate and
   to see the slab edges, not enough to disconnect the building or to lose
   the vertical alignment of the core, which is the whole thing the view is
   supposed to prove. Tuned by looking, per the brief; the number below is
   what the screenshots settled on.
   ------------------------------------------------------------------ */
/* The separation, and how far each level travels in it. One table, in
   webgl/levels.js — see PHASE 9 §06 there for why it is not linear. */
const EXPLODE_GAP = EXPLODE_GAP_M;

const FILES = {
  structure: 'arch-structure.glb',
  furniture: 'arch-furniture.glb',
  furnitureLite: 'arch-furniture-lite.glb',
};

const url = (f) => `${import.meta.env.BASE_URL}scene/${f}`;

/** Which level a GLB node NAME declares, from the naming contract in
    blender/optimize_scene.py: `WEB_L01_STRUCTURE`, `FURN_L02_DESK`,
    `CAPTURE_STATION_L00_RECEPTION`. */
function levelOf(name) {
  const m = /(?:^|_)(L0\d|ROOF)(?:_|$)/.exec(name || '');
  return m && LEVEL_KEYS.includes(m[1]) ? m[1] : null;
}

/** …and which level a NODE belongs to. An instanced furniture mesh is named
    by the exporter, not by us; the level is on the family empty above it, so
    the answer is the nearest ancestor that declares one. */
function levelOfNode(o) {
  for (let n = o; n; n = n.parent) {
    const lid = levelOf(n.name);
    if (lid) return lid;
  }
  return 'L00';
}

/* ------------------------------------------------------------------
   the fallback material — what paints before the manifest lands
   ------------------------------------------------------------------ */

/**
 * The GLB's own material, made scan-aware but left untextured.
 *
 * This is not a degraded mode to be embarrassed about: it is the palette
 * exactly as authored in blender/config/palette.py, correctly lit by the
 * environment, and on a slow link it is what the visitor sees for a second
 * or two before the grain arrives. It is also what a browser that fails to
 * fetch the manifest keeps for good.
 */
function fallbackMaterial(src, envMap) {
  const mat = new THREE.MeshStandardMaterial();
  mat.name = src.name || 'UNNAMED';
  mat.color.copy(src.color ?? new THREE.Color(0.6, 0.6, 0.6)).multiplyScalar(ALBEDO_GAIN);
  mat.roughness = src.roughness ?? 0.85;
  mat.metalness = src.metalness ?? 0;
  mat.envMap = envMap;
  if (src.emissive && src.emissive.getHex() !== 0) {
    mat.emissive.copy(src.emissive);
    mat.emissiveIntensity = Math.min(1.8, 0.55 + (src.emissiveIntensity ?? 1) * 0.32);
  }
  const glassy = src.transparent || (src.opacity ?? 1) < 1;
  if (glassy) {
    mat.opacity = src.opacity ?? 0.2;
    mat.depthWrite = false;
  }
  if (!glassy) neutralise(mat);
  makeScanAware(mat, {
    scan: glassy ? 0.55 : mat.emissive.getHex() ? 0.25 : 1,
    glass: glassy ? 0.92 : 0,
  });
  mat.userData.glassy = glassy ? (src.opacity ?? 0.2) : 0;
  return mat;
}

/* ------------------------------------------------------------------
   EXTERIOR CONTEXT — Phase 7 Part 11
   ------------------------------------------------------------------ */

/**
 * A paved apron at the building's own floor level.
 *
 * The Phase 6 building read as floating, and the brief's fix is explicitly
 * minimal: prevent the void, do not build a city. So this is one plane —
 * an external terrace running past the facade to the edge of the fog — and
 * nothing else. No street, no trees, no cars, no horizon dome.
 *
 * A horizon dome was considered and rejected. The canvas is TRANSPARENT
 * over the page's near-black ground, which is what lets the type and the
 * object share one surface; a sky sphere would replace that background with
 * a grey gradient and make the hero a picture pasted onto the page instead
 * of an object standing in it. The environment map still puts a sky in the
 * glass and on the metal, which is the part of a horizon that was actually
 * doing work.
 *
 * It fades with the `arch` layer, so MEASURE and QUANTIFY — where the
 * terrain and the drawing are the argument — lose it exactly as they lose
 * the walls.
 */
function buildApron(bounds) {
  const margin = 5.6;
  const w = (bounds.max.x - bounds.min.x) + margin * 2;
  const d = (bounds.max.z - bounds.min.z) + margin * 2;
  const g = new THREE.PlaneGeometry(w, d, 1, 1);
  g.rotateX(-Math.PI / 2);
  g.translate(
    (bounds.min.x + bounds.max.x) / 2,
    /* Just under the slab soffit. Coincident with it would z-fight along
       the whole facade, which is the most visible edge in the hero. */
    bounds.min.y - 0.004,
    (bounds.min.z + bounds.max.z) / 2,
  );
  /* UVs in METRES, to match blender/lib_mesh.box_uv — the apron then takes
     the same concrete at the same physical scale as the building's own
     slab, rather than at whatever scale a 0..1 plane would give it. */
  const uv = g.attributes.uv;
  const mpu = 5.3498;
  for (let i = 0; i < uv.count; i++) {
    uv.setXY(i, uv.getX(i) * w * mpu, uv.getY(i) * d * mpu);
  }
  uv.needsUpdate = true;
  return g;
}

/* ------------------------------------------------------------------
   point sampling — CAPTURE reads the interior, not just the shell
   ------------------------------------------------------------------ */

function samplePoints(meshes, total) {
  const pos = new Float32Array(total * 3);
  const rnd = new Float32Array(total);
  const layer = new Float32Array(total);
  const tmp = new THREE.Vector3();
  const m4 = new THREE.Matrix4();

  let seed = 20240117;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };

  /* Area-weighted, so a 34 m wall gets the samples a 0.5 m chair does not.
     Without this the cloud is a dense fog of furniture over a bare floor. */
  const areas = meshes.map((m) => m.area);
  const sum = areas.reduce((a, b) => a + b, 0) || 1;

  let w = 0;
  for (let mi = 0; mi < meshes.length && w < total; mi++) {
    const { geometry, matrices } = meshes[mi];
    const want = mi === meshes.length - 1
      ? total - w
      : Math.min(total - w, Math.round((areas[mi] / sum) * total));
    if (want <= 0) continue;
    const proxy = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial());
    let sampler;
    try {
      sampler = new MeshSurfaceSampler(proxy).build();
    } catch {
      proxy.material.dispose();
      continue;
    }
    const per = Math.max(1, Math.ceil(want / matrices.length));
    for (let t = 0; t < matrices.length && w < total; t++) {
      m4.copy(matrices[t]);
      for (let i = 0; i < per && w < total; i++) {
        sampler.sample(tmp);
        tmp.applyMatrix4(m4);
        const k = w * 3;
        pos[k] = tmp.x + (rand() - 0.5) * 0.012;
        pos[k + 1] = tmp.y + (rand() - 0.5) * 0.012;
        pos[k + 2] = tmp.z + (rand() - 0.5) * 0.012;
        rnd[w] = rand();
        layer[w] = 1;
        w++;
      }
    }
    proxy.material.dispose();
  }

  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos.subarray(0, w * 3), 3));
  g.setAttribute('aRand', new THREE.BufferAttribute(rnd.subarray(0, w), 1));
  g.setAttribute('aLayer', new THREE.BufferAttribute(layer.subarray(0, w), 1));
  g.computeBoundingSphere();
  return g;
}

/**
 * Gather sampleable meshes, BUCKETED BY LEVEL.
 *
 * Phase 7 sampled the whole building into one cloud. A single cloud cannot be
 * exploded — the building separates and its own sampled reading stays behind
 * in one piece — so the samples are collected per level, and the caller puts
 * each level's cloud in that level's group.
 *
 * Matrices are taken at load time, while `group` is still unparented, so they
 * are already relative to the architecture group rather than to the world.
 */
function collect(root, out, { density = 1 } = {}) {
  const box = new THREE.Box3();
  root.updateMatrixWorld(true);
  root.traverse((o) => {
    if (!o.isMesh) return;
    const lid = levelOfNode(o);
    const bucket = out[lid] || (out[lid] = []);
    const matrices = [];
    if (o.isInstancedMesh) {
      const m = new THREE.Matrix4();
      for (let i = 0; i < o.count; i++) {
        o.getMatrixAt(i, m);
        matrices.push(new THREE.Matrix4().multiplyMatrices(o.matrixWorld, m));
      }
    } else {
      matrices.push(o.matrixWorld.clone());
    }
    box.setFromBufferAttribute(o.geometry.attributes.position);
    const s = box.getSize(new THREE.Vector3());
    // cheap area proxy: the surface of the object's own bounding box
    const area = 2 * (s.x * s.y + s.y * s.z + s.z * s.x) * matrices.length * density;
    bucket.push({ geometry: o.geometry, matrices, area });
  });
  return out;
}

/* ------------------------------------------------------------------ */

function loadOne(loader, file) {
  return new Promise((res, rej) => loader.load(url(file), res, undefined, rej));
}

/**
 * @param {'full'|'structure'} tier  what this route actually needs. MEASURE
 *   and QUANTIFY read structure and never need a chair, so they must not pay
 *   to download one.
 * @param {boolean} lite  the reduced contents set for the mobile tier.
 * @param {number} points  point budget for the interior sample.
 * @param {THREE.WebGLRenderer} renderer  needed to convolve the environment.
 */
export async function loadArchitecture({
  tier = 'full', lite = false, points = 8000, renderer = null, onUpgrade = null,
} = {}) {
  const loader = new GLTFLoader();
  loader.setMeshoptDecoder(MeshoptDecoder);

  const group = new THREE.Group();
  group.name = 'ARCHITECTURE';

  /* Materials are bucketed by LAYER and, inside a layer, tagged with the
     level they belong to. Both are needed at once: the service modes switch
     layers, and the exploded view and QUANTIFY's floor selector switch
     levels, and a material shared between two levels can do neither. */
  const layers = { arch: [], ceiling: [], furn: [], glass: [] };
  /* The meshes each layer owns, so a layer that resolves to nothing can be
     taken out of the render list rather than blended to nothing. QUANTIFY
     sets `furn` to 0 and was still submitting 46 draw calls and 103 000
     triangles of chairs behind a drawing. */
  const meshesByLayer = { arch: [], ceiling: [], furn: [], glass: [] };
  const stations = [];
  const sampleSources = {};                // level → [{geometry, matrices, area}]
  const meshesByMaterial = new Map();      // `${layer}|${level}|${name}` → [mesh, …]
  const built = new Map();                 // the same key → the live material
  let meshes = 0;
  let tris = 0;

  /* The environment is fetched first and awaited, because every material
     built below wants it and assigning envMap later would recompile all of
     them. It is 4.6 kB — see blender/pack_env.py. */
  let environment = null;
  if (renderer) {
    try {
      environment = await loadEnvironment(renderer, { base: import.meta.env.BASE_URL, tier: lite ? 'lo' : 'hi' });
    } catch (err) {
      console.warn('[gdf] environment map unavailable', err);
    }
  }
  const envMap = environment?.texture ?? null;

  const adopt = (scene, defaultLayer) => {
    scene.traverse((o) => {
      if (o.name.startsWith('CAPTURE_STATION')) {
        const p = new THREE.Vector3();
        o.getWorldPosition(p);
        /* The empty carries the level and room it stands in, the room's own
           label, its CP number and the entry heading solved against the
           furnished layout — see blender/room_layout.capture_station. All of
           it travels as glTF node extras, so the 360 viewer never has to
           re-derive a position the plan already knows. */
        const x = o.userData || {};
        stations.push({
          name: o.name.replace('CAPTURE_STATION_', ''),
          position: p,
          level: x.gdf_level ?? levelOfNode(o),
          cp: x.gdf_cp ?? null,
          station: x.gdf_station ?? null,
          room: x.gdf_room ?? null,
          label: x.gdf_label ?? null,
          yaw: typeof x.gdf_yaw === 'number' ? x.gdf_yaw : null,
        });
      }
      if (!o.isMesh) return;
      meshes++;
      const g = o.geometry;
      const count = (g.index ? g.index.count : g.attributes.position.count) / 3;
      tris += count * (o.isInstancedMesh ? o.count : 1);

      const src = Array.isArray(o.material) ? o.material[0] : o.material;
      const glassy = src.transparent || (src.opacity ?? 1) < 1;
      const key = o.name.includes('CEILING') ? 'ceiling'
        : glassy ? 'glass'
          : defaultLayer;
      const level = levelOfNode(o);

      const id = `${key}|${level}|${src.name}`;
      let mat = built.get(id);
      if (!mat) {
        mat = fallbackMaterial(src, envMap);
        mat.userData.gdfLevel = level;
        /* A cut piece is a slab seen from underneath as often as from
           above, and once it is put back the interior camera is under it. */
        if (key === 'ceiling') mat.side = THREE.DoubleSide;
        built.set(id, mat);
        layers[key].push(mat);
        meshesByMaterial.set(id, []);
      }
      meshesByMaterial.get(id).push(o);
      meshesByLayer[key].push(o);
      o.material = mat;
      o.renderOrder = key === 'glass' ? 2 : 1;
      o.frustumCulled = false;
    });
  };

  const structure = await loadOne(loader, FILES.structure);
  adopt(structure.scene, 'arch');
  group.add(structure.scene);

  /* ---------------- the level groups ----------------
     Everything under the GLB's own root is re-parented into one group per
     level. The root carries the metres → world-units scale and the pad
     offset, so a level group sitting inside it is addressed in METRES —
     which is why the exploded view can be written as "2.70 m of extra
     separation" rather than as a number nobody could check. */
  const envRoot = structure.scene.getObjectByName('GDF_ENVIRONMENT')
    || structure.scene.children[0] || structure.scene;
  const levelGroups = {};
  for (const lid of LEVEL_KEYS) {
    const g = new THREE.Group();
    g.name = `LEVEL_${lid}`;
    levelGroups[lid] = g;
    envRoot.add(g);
  }
  const regroup = (parent) => {
    for (const child of [...parent.children]) {
      if (child.name.startsWith('LEVEL_')) continue;
      levelGroups[levelOf(child.name) || 'L00'].add(child);
    }
  };
  regroup(envRoot);

  group.updateMatrixWorld(true);
  collect(structure.scene, sampleSources);

  /* The apron rides the `arch` layer and reuses the structure's own concrete
     material, so it is grounded in the same finish as the slab it extends. */
  const bounds = new THREE.Box3().setFromObject(structure.scene);
  const apronKey = [...built.keys()].find((k) => k.startsWith('arch|L00|MAT_CONCRETE'))
    || [...built.keys()][0];
  const apronMat = built.get(apronKey);
  let apron = null;
  if (apronMat) {
    apron = new THREE.Mesh(buildApron(bounds), apronMat);
    apron.name = 'EXTERIOR_APRON';
    apron.renderOrder = 0;
    apron.frustumCulled = false;
    group.add(apron);
    meshesByMaterial.get(apronKey)?.push(apron);
    meshesByLayer.arch.push(apron);
  }

  if (tier === 'full') {
    const furniture = await loadOne(
      loader, lite ? FILES.furnitureLite : FILES.furniture,
    );
    adopt(furniture.scene, 'furn');
    group.add(furniture.scene);
    const fRoot = furniture.scene.getObjectByName('GDF_ENVIRONMENT')
      || furniture.scene.children[0] || furniture.scene;
    furniture.scene.updateMatrixWorld(true);
    /* PHASE 7 — the furniture is real geometry, and area-weighting a plant
       against a 34 m wall buries the wall. CAPTURE has to read as a SAMPLED
       ROOM, not as a cloud of chairs, so the contents are weighted down
       before the sampler ever sees them. */
    collect(furniture.scene, sampleSources, { density: 0.45 });
    regroup(fRoot);
  }

  /* One cloud per level, so CAPTURE's sampled reading explodes with the
     building instead of staying behind on the ground. The budget is split
     by level in proportion to how much surface each holds. */
  const pointGeometries = {};
  if (points > 0) {
    const totalArea = Object.values(sampleSources)
      .reduce((s, list) => s + list.reduce((a, m) => a + m.area, 0), 0) || 1;
    for (const lid of LEVEL_KEYS) {
      const list = sampleSources[lid];
      if (!list || !list.length) continue;
      const share = list.reduce((a, m) => a + m.area, 0) / totalArea;
      const n = Math.max(200, Math.round(points * share));
      pointGeometries[lid] = samplePoints(list, n);
    }
  }

  /* ---------------- the texture upgrade ----------------
     Deliberately NOT awaited. The building is already on screen in flat
     palette material by the time this resolves; when it does, each mesh
     swaps to the textured material built from the manifest. */
  let library = null;
  /* MEASURE and QUANTIFY ask for `structure` and get NO MAPS. Those two
     modes exist to strip the world back to measurable geometry, and the
     building is already down behind the contours and the drawing. */
  const upgrade = tier === 'full'
    ? loadMaterialLibrary({
      base: import.meta.env.BASE_URL, tier: lite ? 'lo' : 'hi', envMap,
      anisotropy: Math.min(8, renderer?.capabilities?.getMaxAnisotropy?.() ?? 4),
    })
      .then((lib) => {
        library = lib;
        for (const [id, list] of meshesByMaterial) {
          const [layerKey, level, name] = id.split('|');
          const source = lib.materials.get(name);
          if (!source) continue;
          /* Cloned per LAYER AND PER LEVEL, then re-extended: a clone copies
             the onBeforeCompile closure by reference, so it would otherwise
             share the previous material's opacity uniform and no level could
             ever fade on its own. Textures are shared by the clone, so this
             costs no memory. */
          const mat = source.clone();
          mat.envMap = envMap;
          makeScanAware(mat, {
            scan: source.userData.gdf.uScan.value,
            glass: source.userData.gdf.uGlass.value,
          });
          mat.userData.glassy = source.userData.glassy ?? 0;
          mat.userData.gdfLevel = level;
          if (layerKey === 'ceiling') mat.side = THREE.DoubleSide;

          const old = built.get(id);
          const bucket = layers[layerKey];
          const at = bucket.indexOf(old);
          if (at >= 0) bucket[at] = mat;
          built.set(id, mat);
          for (const mesh of list) mesh.material = mat;
          old.dispose();
        }
        onUpgrade?.(lib.stats);
        return lib.stats;
      })
      .catch((err) => {
        console.warn('[gdf] material textures unavailable — '
          + 'staying on the flat palette', err);
        return null;
      })
    : Promise.resolve(null);

  /* ---------------- level state ---------------- */
  /** 0 = stacked, 1 = fully exploded. */
  let explode = 0;
  /** 1 = the section is closed (an interior camera), 0 = open (the hero). */
  let cutClose = 0;
  /** Per-level visibility multiplier — QUANTIFY's floor selector. */
  const levelWeight = { L00: 1, L01: 1, L02: 1, ROOF: 1 };

  function applyExplode() {
    for (const lid of LEVEL_KEYS) {
      levelGroups[lid].position.y = explode * EXPLODE_GAP * EXPLODE_STEP[lid];
    }
  }

  /** Last `visible` written per layer, so the walk runs only on a change. */
  const liveWas = { arch: null, ceiling: null, furn: null, glass: null };
  /** Which way the shell is being looked at. See `setInside`. */
  let insideSide = THREE.FrontSide;

  return {
    group,
    levelGroups,
    stations,
    pointGeometries,
    environment: envMap,
    upgrade,
    apron,
    bounds,

    /* ---------------- Part 09 — the exploded level view ---------------- */
    /** @param {number} t 0 stacked, 1 fully separated. */
    setExplode(t) {
      explode = Math.max(0, Math.min(1, t));
      applyExplode();
    },
    get explode() { return explode; },
    /** Metres of lift a level has at the current explosion. */
    liftOf(lid) { return explode * EXPLODE_GAP * (EXPLODE_STEP[lid] ?? 0); },
    /** Metres of separation between consecutive levels at full explosion. */
    get explodeGap() { return EXPLODE_GAP; },
    /** How far each level travels, as a multiple of the gap. */
    get explodeStep() { return EXPLODE_STEP; },

    /* ---------------- Part 13 — level isolation ---------------- */
    /**
     * @param {string|null} id  the level to read; null shows all of them.
     * @param {number} ghost    how present the others stay. Not zero: a floor
     *   plan with nothing under it loses the thing that makes it a FLOOR.
     */
    setLevelFocus(id, ghost = 0.14) {
      for (const lid of LEVEL_KEYS) {
        levelWeight[lid] = !id || lid === id ? 1 : ghost;
      }
      // The roof follows the top floor: isolating L02 with a lid on it is
      // isolating a box.
      if (id && id !== 'L02') levelWeight.ROOF = Math.min(levelWeight.ROOF, ghost);
      if (id === 'L02') levelWeight.ROOF = ghost;
    },

    /** Close or open the sectional cut. 1 puts every lid back on. */
    setCutClose(v) { cutClose = Math.max(0, Math.min(1, v)); },

    /* ---------------- PHASE 11 PART 07 — inside the construction --------
       "The slab fills the viewport."

       It does not, by default, and the reason is correct: a building is
       modelled as solids and solids are back-face culled, so a camera
       INSIDE 60 cm of concrete sees straight through it to whatever is on
       the far side. The floor crossing was rendering an empty grey field
       for exactly this reason.

       One property, on one layer, for the two seconds the camera is in
       the assembly: the shell becomes double-sided, its interior faces
       are drawn, and three flips their normals for the lighting on its
       own. Nothing is added to the scene and nothing recompiles — `side`
       is cull state, not a shader define — so this costs a walk over the
       arch layer's materials twice per crossing and nothing per frame. */
    setInside(v) {
      const next = v ? THREE.DoubleSide : THREE.FrontSide;
      if (insideSide === next) return;
      insideSide = next;
      for (const mat of layers.arch) mat.side = next;
    },

    /**
     * How closed the cut should be for a camera at `p`.
     *
     * A section is a way of DRAWING the building from outside, and a drawing
     * convention has to stop at the point where the viewer walks in. A
     * visitor standing in a room — at a capture station, in the 360 viewer,
     * or in CAPTURE's close camera — must have a soffit over their head. So
     * the cut opens as the camera leaves and closes as it enters, over the
     * width of the facade rather than at a hard threshold.
     */
    cutCloseFor(p) {
      const hx = (bounds.max.x - bounds.min.x) / 2;
      const hz = (bounds.max.z - bounds.min.z) / 2;
      const cx = (bounds.min.x + bounds.max.x) / 2;
      const cz = (bounds.min.z + bounds.max.z) / 2;
      // 0 at the building centre, 1 at the facade, >1 outside
      const d = Math.max(Math.abs(p.x - cx) / hx, Math.abs(p.z - cz) / hz);
      const above = p.y > bounds.max.y;
      const outside = above ? 1 : Math.min(1, Math.max(0, (d - 0.94) / 0.5));
      return 1 - outside;
    },

    get stats() {
      return {
        meshes,
        tris,
        materials: built.size,
        stations: stations.length,
        levels: LEVEL_KEYS.length,
        textures: library?.stats.textures ?? 0,
        texturePayload: library?.stats.payloadBytes ?? 0,
        envBytes: environment?.stats.bytes ?? 0,
      };
    },

    /**
     * @param {object} L resolved layer weights from the scene's blend pass
     * @param {number} mix crossfade in, 0 while the procedural stand-in still
     *   owns the frame and 1 once the building has taken over
     */
    /* Apron rides the `arch` layer but is not in meshesByLayer's traversal
       (it is built after adopt), so it is registered explicitly below. */
    apply(L, mix) {
      for (const key of ARCH_KEYS) {
        /* PHASE 9 §07 — THE CONTENTS STEP BACK AS THE BUILDING OPENS.

           The choreography the brief asks for ends with "furniture
           de-emphasises, level labels resolve, technical structure becomes
           clearer". Separated, what the visitor is being shown is the
           STRUCTURE of the building — plates, cores, openings — and a
           hundred chairs at full strength are what stops that reading. They
           do not disappear: a floor plate with nothing on it is a slab, and
           the point of this view is that these are rooms. */
        const base = (L[key] ?? 0) * mix
          * (key === 'furn' ? 1 - 0.55 * explode : 1);
        /* Below one 8-bit alpha step there is nothing a viewer could see, so
           the layer leaves the render list entirely. */
        const live = key === 'ceiling' ? base * cutClose > 0.0035 : base > 0.0035;
        /* PHASE 8.2 — WRITE ONLY WHEN IT CHANGES. `mesh.visible` was
           being assigned on every mesh of every layer on every frame:
           several hundred property writes a frame for a value that
           changes twice per transition. It is a boolean, so remembering
           the last one costs nothing and the walk disappears except on
           the two frames it is actually about. */
        if (liveWas[key] !== live) {
          liveWas[key] = live;
          for (const mesh of meshesByLayer[key]) mesh.visible = live;
        }
        for (const mat of layers[key]) {
          const lw = levelWeight[mat.userData.gdfLevel] ?? 1;
          /* The cutaway pieces are the ONLY thing on the ceiling layer, and
             what governs them is not a mode — it is whether the camera is
             inside the building. */
          const w = key === 'ceiling' ? base * lw * cutClose : base * lw;
          const glassy = mat.userData.glassy;
          /* PHASE 9 §03 — THE FACADE IS THE ENCLOSURE.

             The Phase 8 multiplier was 1.6, which put a 0.2-opacity pane on
             screen at 0.19 and made every window opening read as a VOID. The
             cutaway was never the reason the hero looked like a doll's house
             — measured, it removes 14% of the facade run and 20% of the slab
             area (qa/p9/enclosure.mjs), well inside the brief's 25–40%
             exposure. What was missing was glass. At 3.0 the same pane
             carries a reflection off the environment map and the bays read as
             GLAZED BAYS, which is what gives the building mass without
             closing a single opening. */
          const v = glassy ? w * glassy * 3.0 : w;
          mat.userData.gdf.uOpacity.value = v;
          // Only fully opaque surfaces may write depth, or they occlude the
          // line layers drawn after them. Same rule as the massing.
          if (!glassy) mat.depthWrite = w > 0.8;
        }
      }
    },

    dispose() {
      group.traverse((o) => {
        o.geometry?.dispose?.();
        if (Array.isArray(o.material)) o.material.forEach((m) => m.dispose());
        else o.material?.dispose?.();
      });
      for (const g of Object.values(pointGeometries)) g.dispose();
      library?.dispose();
      environment?.dispose();
    },
  };
}
