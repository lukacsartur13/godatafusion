import * as THREE from 'three';
import { env, dprCap, opaqueContext } from '../core/env.js';

/* ============================================================
   THE 360° VIEWER

   One component, two sources:

     { type: 'world' }              the GoDataFusion demonstration site,
                                    entered at a capture station
     { type: 'equirect', url: … }   a real equirectangular photograph

   Both are the same viewer — same camera, same drag, same touch, same
   keyboard, same station list, same metadata. Only what surrounds the
   camera differs. That is the whole point of the split: when genuine
   client panoramas exist they are added to the station table as
   `{ type:'equirect', url }` and nothing in this file, the page, or the
   UI changes.

   No client footage is invented here. The default source is the same
   BUILDING the homepage draws, and the page labels it DEMO ENVIRONMENT.

   PHASE 7 — THIS IS NOW THE SAME PLACE.

   Phase 6 left this file rendering an unrelated world: the procedural
   massing, shaded into vertex colours, with the site's twelve exterior
   stations pushed out to a 6.8 m radius so the camera would not end up
   inside a grey box. A visitor who opened the viewer was standing on a
   different site from the one the hero had just shown them, and the
   strongest demonstration this company can make — that a room you stood
   in is the room in the plan — was not being made.

   So the procedural world is gone. The viewer loads arch-structure.glb and
   arch-furniture.glb, the same two files the homepage loads, through the
   same webgl/archScene.js, with the same materials, the same Poly Haven
   textures and the same environment map. The stations are the CAPTURE
   STATION empties authored in blender/build_environment.py, standing at
   eye height in the middle of real rooms — reception, meeting room,
   workspace, technical, corridor — rather than on a radius chosen to avoid
   collisions.

   Three consequences worth naming:

     * the browser has already cached both GLBs and every texture from the
       page behind this viewer, so opening it costs geometry upload, not
       download;
     * the scan response is switched OFF per material rather than removed,
       because the viewer is REALITY, not a mode;
     * the sectional cut is released, because the visitor is inside. A room
       with its roof lifted off is a model of a room.
   ============================================================ */

const DEG = Math.PI / 180;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

/* ------------------------------------------------------------------
   the station table
   ------------------------------------------------------------------ */

/**
 * The walking order.
 *
 * PHASE 8 — it is no longer a list. Positions, entry headings, room labels,
 * LEVELS and CP numbers are all solved in Blender against the furnished
 * layout (blender/room_layout.capture_station, blender/config/rooms.py) and
 * travel in the GLB as node extras, because a standing position that clears
 * a meeting table is a fact about the furniture and the furniture is
 * authored there. The order is the order the empties were numbered in, which
 * is the order a capture round would actually walk: arrival, the ground
 * floor, up through the work floor, up to the studio floor.
 *
 * So this file's job is now to GROUP them, not to name them.
 */
const LEVEL_ORDER = ['L00', 'L01', 'L02'];

/** Build the runtime station list from the GLB's own empties. */
function stationsFrom(architecture) {
  return architecture.stations
    .map((st) => ({
      id: st.cp || st.name,
      /* The room label is what makes the same-place claim legible: the
         viewer says TÁRGYALÓ 01 and so does the plan QUANTIFY reads, because
         both come out of the same room rectangle in webgl/levels.js. */
      room: (st.label || st.station || st.name).toUpperCase(),
      roomId: st.room,
      floor: st.level || 'L00',
      x: st.position.x, y: st.position.y, z: st.position.z,
      yaw: (st.yaw ?? 0) * DEG,
      source: { type: 'world' },
    }))
    .sort((a, b) => {
      const d = LEVEL_ORDER.indexOf(a.floor) - LEVEL_ORDER.indexOf(b.floor);
      return d || a.id.localeCompare(b.id);
    });
}

/* Kept for compatibility with anything that imported the old constant; the
   real list is built once the building has loaded. */
export const DEMO_STATIONS = [];

export function createPanorama({ canvas, onLook, onStation, onReady, entry } = {}) {
  let renderer;
  try {
    /* Same reasoning as the homepage stage: three hands `alpha: true` to
       getContext() no matter what the renderer flag says, and a viewer
       that fills the window is the last place to pay for a transparent
       drawing buffer. See webgl/scene.js. */
    renderer = new THREE.WebGLRenderer({
      canvas, context: opaqueContext(canvas, { antialias: true }),
      antialias: true, alpha: false, powerPreference: 'high-performance',
    });
  } catch {
    return null;
  }
  if (!renderer.getContext()) return null;

  renderer.setClearColor(0x0a0e11, 1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setPixelRatio(dprCap());
  /* Same response curve as the homepage. The viewer has to look like the
     same renderer showing the same building, not like a second product. */
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  /* Lower than the homepage's 1.06. The homepage exposes for a dark frame
     with a small lit building in it; here the building fills the whole
     viewport, and the same exposure blows every plaster wall to paper
     white — which is the one thing that would make a real room read as a
     render. */
  renderer.toneMappingExposure = 0.86;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(74, 1, 0.02, 200);

  /* ---------------- light ----------------
     The homepage rig, minus the parallax. Interior practicals matter more
     here than anywhere else on the site: the visitor is standing under
     them, and a room lit only by the window it is facing away from is a
     dark room. */
  const sun = new THREE.DirectionalLight(0xfff4e6, 1.25);
  sun.position.set(-7.4, 9.6, 6.1);
  const fill = new THREE.DirectionalLight(0xbcd2e8, 0.40);
  fill.position.set(8.2, 3.4, -6.8);
  /* The environment map is doing most of the ambient work indoors, so the
     hemisphere is only here to keep the undersides of the furniture off
     absolute black. */
  scene.add(sun, fill, new THREE.HemisphereLight(0x9fb4c4, 0x191e22, 0.28));

  /* ---------------- accent, read from the live CSS channel ------------- */
  const accent = new THREE.Color(0x42e8ff);
  function syncAccent() {
    const v = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim();
    const [r, g, b] = v.split(/\s+/).map(Number);
    if ([r, g, b].every(Number.isFinite)) accent.setRGB(r / 255, g / 255, b / 255, THREE.SRGBColorSpace);
  }
  syncAccent();

  /* ================= source A — the building ================= */
  const world = new THREE.Group();
  scene.add(world);

  let architecture = null;
  let stations = [];
  let pending = null;                 // a goTo that arrived before the GLB
  let index = -1;

  const ready = import('./archScene.js')
    .then(({ loadArchitecture }) => loadArchitecture({
      tier: 'full',
      lite: env.narrow,
      /* No point cloud. This viewer is REALITY — the sampled reading of the
         same room is what CAPTURE does on the page behind it, and putting
         a cloud in here as well would say the room is data rather than
         that the room was captured. */
      points: 0,
      renderer,
    }))
    .then(async (a) => {
      architecture = a;
      world.add(a.group);

      /* Every lid goes back on. See archScene.cutCloseFor — the sectional
         cut is a way of drawing the building from OUTSIDE, and the visitor
         is inside it. A room with its slab lifted off is a model of a room,
         which is the exact reading this viewer exists to kill. The building
         is also un-exploded and un-isolated here: there is one state in this
         viewer and it is the room. */
      a.setCutClose(1);
      a.setExplode(0);
      a.setLevelFocus(null);

      if (a.environment) {
        /* Also the BACKGROUND, which is what a window is for: without it
           every opening in the facade is a hole onto the clear colour, and
           the brief's "glass reads as an empty grey opening" is exactly as
           true here as it was on the homepage. */
        scene.environment = a.environment;
        scene.background = a.environment;
        scene.backgroundBlurriness = 0.22;
        scene.backgroundIntensity = 0.85;
      }

      /* Every layer fully present, and no scan. The blend system that
         switches these on the homepage has no meaning here: there is one
         state, and it is the room. */
      a.apply({ arch: 1, ceiling: 1, furn: 1, glass: 1 }, 1);
      const silence = (root) => root.traverse((o) => {
        const m = o.material;
        if (!m || !m.userData?.gdf) return;
        m.userData.gdf.uScan.value = 0;
        m.userData.gdf.uOpacity.value = m.userData.glassy ? 0.42 : 1;
      });
      silence(a.group);

      /* The textured materials replace the flat ones asynchronously, and
         the replacements are built with the scan live and the opacity at
         whatever the last blend wrote — so the same pass has to run again
         once they land. */
      await a.upgrade.catch(() => null);
      a.apply({ arch: 1, ceiling: 1, furn: 1, glass: 1 }, 1);
      silence(a.group);

      /* Practicals, at the rooms that have a pendant over them. Positions
         come from the stations themselves, so a station added in Blender
         gets its light for free. */
      /* PHASE 8 — three floors of rooms, and a practical at the ones with a
         pendant over them. Capped: twenty point lights would recompile every
         material in the building for a difference no single frame shows,
         because a visitor only ever stands in one room at a time. */
      const lit = a.stations.filter(
        (st) => /MEETING|RECEPTION|OPEN_OFFICE|BIM|STUDIO|BOARDROOM|WAITING/.test(st.name),
      ).slice(0, 8);
      for (const st of lit) {
        const l = new THREE.PointLight(0xffe9c8, 1.55, 3.6, 1.7);
        l.position.set(st.position.x, st.position.y + 0.36, st.position.z);
        scene.add(l);
      }

      stations = stationsFrom(a);
      onReady?.(stations);
      /* PHASE 9 Part 14 — WHICH STATION THE VIEWER OPENS ON.
         Decided here, at the one moment the station table exists and before
         a single frame has been drawn, so the viewer never shows a station
         it is about to leave. `entry` is the page's rule (the reference
         room, or whatever `?station=` asked for); a `goTo` that arrived
         while the GLB was still in flight still wins over it, because that
         is a person having pressed something. */
      const want = pending ?? (entry ? Math.max(0, entry(stations)) : 0);
      pending = null;
      index = -1;
      goTo(want, { instant: true });
      invalidate();
      return stations;
    })
    .catch((err) => {
      console.warn('[gdf] 360 environment unavailable', err);
      return [];
    });

  /* ================= source B — a real equirectangular photo ========== */
  const sphere = new THREE.Mesh(
    new THREE.SphereGeometry(40, 60, 40),
    new THREE.MeshBasicMaterial({ side: THREE.BackSide, fog: false }),
  );
  sphere.scale.x = -1;                      // look from the inside
  sphere.visible = false;
  scene.add(sphere);

  const loader = new THREE.TextureLoader();
  let loadedURL = null;
  let savedBackground = null;

  function showEquirect(url) {
    return new Promise((resolve, reject) => {
      if (loadedURL === url) { swap(true); resolve(); return; }
      loader.load(url, (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.minFilter = THREE.LinearFilter;
        tex.generateMipmaps = false;
        sphere.material.map?.dispose();
        sphere.material.map = tex;
        sphere.material.needsUpdate = true;
        loadedURL = url;
        swap(true);
        resolve();
      }, undefined, reject);
    });
  }

  function swap(toPhoto) {
    sphere.visible = toPhoto;
    world.visible = !toPhoto;
    if (toPhoto) {
      savedBackground = savedBackground ?? scene.background;
      scene.background = null;
    } else if (savedBackground) {
      scene.background = savedBackground;
    }
  }

  /* ---------------- look controls ---------------- */
  const look = { yaw: 0, pitch: 0, vYaw: 0, vPitch: 0, fov: 74 };
  const PITCH_MAX = 78 * DEG;
  let dragging = false;
  let last = { x: 0, y: 0 };
  let pointerId = null;

  const onDown = (e) => {
    if (e.button !== undefined && e.button !== 0) return;
    dragging = true;
    pointerId = e.pointerId;
    last = { x: e.clientX, y: e.clientY };
    canvas.setPointerCapture?.(e.pointerId);
    canvas.classList.add('is-dragging');
  };
  const onMove = (e) => {
    if (!dragging || (pointerId !== null && e.pointerId !== pointerId)) return;
    const k = (look.fov / 74) * 0.0042;
    look.vYaw = -(e.clientX - last.x) * k;
    look.vPitch = -(e.clientY - last.y) * k;
    look.yaw += look.vYaw;
    look.pitch = clamp(look.pitch + look.vPitch, -PITCH_MAX, PITCH_MAX);
    last = { x: e.clientX, y: e.clientY };
    invalidate();
  };
  const onUp = (e) => {
    if (pointerId !== null && e.pointerId !== pointerId) return;
    dragging = false;
    pointerId = null;
    canvas.releasePointerCapture?.(e.pointerId);
    canvas.classList.remove('is-dragging');
  };

  canvas.addEventListener('pointerdown', onDown);
  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onUp);
  window.addEventListener('pointercancel', onUp);

  /* A one-finger drag inside the viewer is a look, not a page scroll; the
     page still scrolls everywhere else, and the viewer is never full-page
     on touch without an explicit exit control. */
  canvas.style.touchAction = 'none';

  const onWheel = (e) => {
    e.preventDefault();
    look.fov = clamp(look.fov + Math.sign(e.deltaY) * 4, 38, 96);
    invalidate();
  };
  canvas.addEventListener('wheel', onWheel, { passive: false });

  /* Keyboard: the viewer is a real focusable control, so a keyboard user
     can look around without a pointer. */
  /* Keyboard: the viewer is a real focusable control, so a keyboard user can
     look around and WALK THE ROUND without a pointer.

       ← →            look
       ↑ ↓            tilt
       shift + ← →    previous / next capture station
       shift + ↑ ↓    previous / next FLOOR
       + − =          field of view

     Every one of them calls preventDefault. An arrow that falls through to
     the document scrolls the page — which, in a viewer that sits inline on
     a desktop page, means the thing you were looking at leaves the screen. */
  const KEY_STEP = 6 * DEG;
  const onKey = (e) => {
    if (e.shiftKey) {
      const jump = {
        ArrowRight: () => next(),
        ArrowLeft: () => prev(),
        ArrowDown: () => stepLevel(1),
        ArrowUp: () => stepLevel(-1),
      };
      if (!jump[e.key]) return;
      e.preventDefault();
      jump[e.key]();
      return;
    }
    const map = {
      ArrowLeft: () => { look.yaw += KEY_STEP; },
      ArrowRight: () => { look.yaw -= KEY_STEP; },
      ArrowUp: () => { look.pitch = clamp(look.pitch + KEY_STEP, -PITCH_MAX, PITCH_MAX); },
      ArrowDown: () => { look.pitch = clamp(look.pitch - KEY_STEP, -PITCH_MAX, PITCH_MAX); },
      '+': () => { look.fov = clamp(look.fov - 5, 38, 96); },
      '=': () => { look.fov = clamp(look.fov - 5, 38, 96); },
      '-': () => { look.fov = clamp(look.fov + 5, 38, 96); },
    };
    if (!map[e.key]) return;
    e.preventDefault();
    map[e.key]();
    invalidate();
  };
  canvas.addEventListener('keydown', onKey);

  /* ---------------- stations ---------------- */
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ------------------------------------------------------------------
     PHASE 8.2 — A STATION CHANGE IS A CUT, AND IT IS CUT DELIBERATELY.

     It used to be an instantaneous pose assignment in the click's own
     frame: the pixels went from one room to another between two frames,
     with whatever DOM work the rails were doing landing in the same
     frame. That reads as a freeze followed by a teleport, which is what
     §10 describes.

     It is a short blink now — out over 110 ms, the pose swapped while
     there is nothing on screen, back over 170 ms. That is the capture
     metaphor (the instrument was moved and it took a moment) rather
     than flying the camera through a wall, and it gives the pose swap
     and the rails a frame where nothing is being watched. Opacity only,
     so the fade itself is on the compositor.

     Every pose is precomputed: `st.x/y/z/yaw` are read off the GLB when
     the building loads. Nothing here solves, loads or reconstructs
     anything — except an equirect photo the first time it is asked for,
     which is fetched before the blink ends.
     ------------------------------------------------------------------ */
  const BLINK_OUT = 110;
  const BLINK_IN = 170;
  let blinkTimer = 0;

  async function goTo(i, { instant = false } = {}) {
    if (!stations.length) { pending = i; return; }
    const n = ((i % stations.length) + stations.length) % stations.length;
    if (n === index) return;
    const first = index < 0;
    index = n;
    const st = stations[n];

    const blink = !instant && !first && !reduced;
    if (blink) {
      canvas.classList.add('is-blink');
      await new Promise((r) => { clearTimeout(blinkTimer); blinkTimer = setTimeout(r, BLINK_OUT); });
    }

    if (st.source?.type === 'equirect') {
      try { await showEquirect(st.source.url); }
      catch { swap(false); }                  // a missing photo falls back to the model
    } else {
      swap(false);
    }

    camera.position.set(st.x, st.y, st.z);
    look.yaw = st.yaw ?? 0;
    /* Level, or very close to it. Phase 6 arrived pitched down at the
       ground because the subject was a site; the subject is now a room, and
       a room is read at eye level. The small negative keeps the floor in
       frame so the visitor knows they are standing on something. */
    look.pitch = -0.06;
    look.vYaw = 0;
    look.vPitch = 0;
    invalidate();
    onStation?.(st, n, stations.length);
    /* The rails repaint while the frame is dark, so their DOM work is
       never in a frame the visitor is watching the camera move in. */
    if (blink) {
      requestAnimationFrame(() => { canvas.classList.remove('is-blink'); });
    }
  }

  const next = () => goTo(index + 1);
  const prev = () => goTo(index - 1);

  /* PHASE 8 Part 11 — FLOOR then STATION.
     A twenty-station list is a list; three floors of five to eight stations
     is a building. `goToLevel` jumps to the first station of a level, which
     is the entry the floor selector calls, and `stationsOn` is what the page
     builds its station rail from. */
  const stationsOn = (floor) => stations.filter((st) => st.floor === floor);
  /** Go to a station by its CP id. Returns its index, or −1. */
  function goToStation(id) {
    const i = stations.findIndex((st) => st.id === id);
    if (i >= 0) goTo(i);
    return i;
  }
  /** The index of a station by id, without moving. */
  const indexOfStation = (id) => stations.findIndex((st) => st.id === id);
  function goToLevel(floor) {
    const i = stations.findIndex((st) => st.floor === floor);
    if (i >= 0) goTo(i);
    return i;
  }

  /** Move `d` floors from the one currently being stood on. */
  function stepLevel(d) {
    const here = stations[index]?.floor;
    const list = LEVEL_ORDER.filter((id) => stations.some((s) => s.floor === id));
    const at = list.indexOf(here);
    if (at < 0) return;
    goToLevel(list[(at + d + list.length) % list.length]);
  }

  /* ---------------- loop ---------------- */
  let raf = 0;
  let running = false;
  let dirty = 2;
  const invalidate = () => { dirty = 2; };

  const dir = new THREE.Vector3();
  function draw() {
    dir.set(
      Math.sin(look.yaw) * Math.cos(look.pitch),
      Math.sin(look.pitch),
      Math.cos(look.yaw) * Math.cos(look.pitch),
    );
    camera.lookAt(
      camera.position.x + dir.x,
      camera.position.y + dir.y,
      camera.position.z + dir.z,
    );
    if (Math.abs(camera.fov - look.fov) > 0.01) {
      camera.fov += (look.fov - camera.fov) * 0.22;
      camera.updateProjectionMatrix();
    }
    renderer.render(scene, camera);
    onLook?.(look);
  }

  function frame() {
    raf = requestAnimationFrame(frame);
    if (!running) return;

    if (!dragging && !env.reducedMotion) {
      // A short glide after the finger leaves; never an automatic tour.
      if (Math.abs(look.vYaw) > 1e-5 || Math.abs(look.vPitch) > 1e-5) {
        look.yaw += look.vYaw;
        look.pitch = clamp(look.pitch + look.vPitch, -PITCH_MAX, PITCH_MAX);
        look.vYaw *= 0.90;
        look.vPitch *= 0.90;
        if (Math.abs(look.vYaw) < 1e-5) look.vYaw = 0;
        if (Math.abs(look.vPitch) < 1e-5) look.vPitch = 0;
        dirty = 2;
      }
    }
    if (dirty <= 0 && Math.abs(camera.fov - look.fov) <= 0.01) return;
    dirty--;
    draw();
  }

  function resize() {
    const w = Math.max(1, canvas.clientWidth);
    const h = Math.max(1, canvas.clientHeight);
    renderer.setPixelRatio(dprCap());
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    /* A narrow viewport needs a wider field or the visitor sees a keyhole —
       but only a little. Past ~82° the vertical distortion at the top and
       bottom of a portrait frame is worse than the keyhole it fixes. */
    look.fov = clamp(look.fov, 38, 96);
    camera.fov = w / h < 0.9 ? Math.min(82, look.fov + 6) : look.fov;
    camera.updateProjectionMatrix();
    invalidate();
  }

  const ro = new ResizeObserver(resize);
  ro.observe(canvas);

  return {
    get stations() { return stations; },
    get index() { return index; },
    get station() { return stations[index] || null; },
    get levels() {
      return LEVEL_ORDER
        .map((id) => ({ id, stations: stationsOn(id) }))
        .filter((l) => l.stations.length);
    },
    stationsOn,
    goToStation,
    indexOfStation,
    goToLevel,
    stepLevel,
    get look() { return look; },
    ready,

    /** Replace the station table — this is how real panoramas arrive. */
    setStations(list) { stations = list; index = -1; },

    goTo, next, prev,

    /**
     * @param {number|null} i  a station to open on, or null to let the
     *   viewer's own `entry` rule decide when the building lands.
     *
     * PHASE 9 — `start()` used to default to station 0, and because it is
     * called the moment the visitor presses VIEW 360° — which is usually
     * before the GLB has finished arriving — that zero was parked in
     * `pending` and then beat the entry rule to the punch. A viewer that is
     * simply being switched on has no opinion about which station it is; it
     * says so now by passing nothing.
     */
    start(i = null) {
      syncAccent();
      running = true;
      resize();
      if (index < 0 && i !== null) goTo(i, { instant: true });
      else invalidate();
      if (!raf) raf = requestAnimationFrame(frame);
    },

    stop() {
      running = false;
      cancelAnimationFrame(raf);
      raf = 0;
    },

    resize,

    ...(import.meta.env.DEV ? {
      _debug: {
        scene, camera, renderer, look,
        get architecture() { return architecture; },
        get stations() { return stations; },
      },
    } : {}),

    dispose() {
      this.stop();
      ro.disconnect();
      canvas.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      canvas.removeEventListener('wheel', onWheel);
      canvas.removeEventListener('keydown', onKey);
      architecture?.dispose();
      sphere.geometry.dispose();
      sphere.material.map?.dispose();
      sphere.material.dispose();
      renderer.dispose();
    },
  };
}
