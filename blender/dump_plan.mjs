/**
 * Single source of truth bridge.
 *
 * The architectural model must be the SAME building the QUANTIFY drawings
 * count. Rather than re-deriving three levels' worth of walls, doors and
 * windows in Python — which would silently drift the day someone edits a
 * room rectangle — we import the site's own level module and dump exactly
 * what it computes.
 *
 *     node blender/dump_plan.mjs > blender/config/plan-features.json
 */
import {
  LEVELS, allFeatures, buildingQuantities, DOOR_TYPES, WINDOW_TYPES,
  CORE, CORE_T, ROOF, MPU, SLAB_T, EXT_T, INT_T, clearOf,
  BAY_X, BAY_Z, BAYS_X, BAYS_Z, X0, X1, Z0, Z1, L02_X1, BASE_Y,
} from '../src/webgl/levels.js';
import { STATIONS } from '../src/webgl/geometry.js';
import { CAPTURE_ROUND } from '../src/webgl/stations.js';
import { SITE } from '../src/webgl/field.js';

const levels = allFeatures().map((f) => ({
  id: f.id,
  name: f.level.name,
  label: f.level.label,
  elevation: f.level.elevation,
  ftf: f.level.ftf,
  slab: f.level.slab,
  clear: clearOf(f.level),
  x0: f.level.x0, x1: f.level.x1, z0: f.level.z0, z1: f.level.z1,
  winSill: f.level.winSill, winHead: f.level.winHead, winSillLow: f.level.winSillLow,
  cuts: f.level.cuts || {},
  terrace: f.level.terrace || null,
  area: f.area,
  rooms: f.rooms.map((r) => ({
    id: r.id, uid: r.uid, name: r.name, kind: r.kind, zone: r.zone,
    label: r.label, finish: r.finish || null,
    x0: r.x0, x1: r.x1, z0: r.z0, z1: r.z1, area: r.area,
  })),
  doors: f.doors,
  openings: f.openings,
  windows: f.windows,
  walls: f.walls,
}));

process.stdout.write(JSON.stringify({
  site: SITE,
  metresPerUnit: MPU,
  baseY: BASE_Y,
  footprint: { X0, X1, Z0, Z1, L02_X1 },
  bays: { x: BAYS_X, z: BAYS_Z, bx: BAY_X, bz: BAY_Z },
  core: { ...CORE, t: CORE_T },
  construction: { slab: SLAB_T, ext: EXT_T, int: INT_T },
  doorTypes: DOOR_TYPES,
  windowTypes: WINDOW_TYPES,
  roof: ROOF,
  levels,
  quantities: buildingQuantities(),
  stations: STATIONS,
  /* PHASE 9 Part 10 — the capture round, in walking order. It used to be a
     second copy of this list in blender/config/rooms.py; the web needs the
     per-floor counts before the GLB arrives, so the list moved to
     src/webgl/stations.js and travels here with everything else. */
  captureRound: CAPTURE_ROUND,
}, null, 1));
