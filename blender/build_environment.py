"""
Build the GoDataFusion environment master scene — PHASE 8, three levels.

    blender -b --python blender/build_environment.py

The building is NOT designed here. It is READ from the site's own level
model — blender/config/plan-features.json, dumped straight out of
src/webgl/levels.js — and given thickness, height, material and contents.
Every wall stands on a line the QUANTIFY drawing already draws; every door
and window opening is at the coordinate QUANTIFY already counts; every room
carries the id, label and area the room book quotes. That is the whole basis
of the "same place" claim across three floors, and it is mechanical rather
than a matter of care.

WHAT PHASE 8 ADDED

  * three levels instead of one, each with its own floor slab, walls,
    openings, glazing and contents
  * one vertical core through all of them, with a dog-leg stair that
    physically connects L00 → L01 → L02 and a lift shaft beside it
  * a rotating cutaway: a run of facade AND the piece of slab above it are
    removed at a different place on every storey, held on the CEILING layer
    so an interior camera can put them back
  * a roof terrace over the east bay, where L02 is set back
  * per-level collections, so the web can explode the building

COLLECTION CONTRACT (read by optimize_scene.py and export_web.py)

    L00_STRUCTURE  L00_CEILING  L00_GLASS
    L01_STRUCTURE  L01_CEILING  L01_GLASS
    L02_STRUCTURE  L02_CEILING  L02_GLASS
    ROOF_STRUCTURE ROOF_CEILING
    FURNITURE  DECOR  CAPTURE_STATIONS  _ASSET_LIBRARY

`*_STRUCTURE` and `*_GLASS` ride the web's `arch` and `glass` layers.
`*_CEILING` holds ONLY the cutaway pieces — the slab and beams removed to
open the storey below — because on a stack "the ceiling" of a level is the
floor of the level above it, and a layer that dissolved it would drop the
level above through it. See webgl/archScene.js.
"""

import json
import math
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
if HERE not in sys.path:
    sys.path.insert(0, HERE)
    sys.path.insert(0, os.path.join(HERE, 'config'))

import bpy

import lib_mesh
from lib_mesh import Part, collection, reset_scene, link_duplicate
from palette import build_materials
from rooms import SCHEDULE, FINISH_ASSETS
import asset_loader
import room_layout
from room_layout import Room, furnish, door_clearance_rect

# ---------------- dimensions the plan does not carry ----------------
#: Exposed downstand beams on a half-bay grid. The soffit is the largest
#: surface an interior camera sees; without them it is a blank plane.
BEAM_W = 0.40
BEAM_D = 0.55

#: Structural openings between circulation cells are read as openings in the
#: frame rather than as doorways — that is what turns a row of cells into a
#: 34 m spine. Their height is the full clear storey less a downstand.
SPINE_HEAD = 0.55

REPORT = []
STATION_REPORT = []


def load_plan():
    with open(os.path.join(HERE, 'config', 'plan-features.json')) as fh:
        return json.load(fh)


# ============================================================
# range arithmetic — how the cutaway is actually made
# ============================================================

def subtract(span, cuts):
    """span minus a list of cut ranges → list of surviving sub-spans."""
    out = [span]
    # Cut ranges are quoted in plan coordinates, and MY() negates Z — so a
    # range written north-to-south arrives reversed. Normalise rather than
    # trust the caller: a reversed range silently emits the wall TWICE.
    for c0, c1 in ((min(a, b), max(a, b)) for a, b in cuts):
        nxt = []
        for a, b in out:
            if c1 <= a or c0 >= b:
                nxt.append((a, b))
                continue
            if a < c0:
                nxt.append((a, c0))
            if c1 < b:
                nxt.append((c1, b))
        out = nxt
    return [s for s in out if s[1] - s[0] > 0.02]


def wall_run(part, along, const, t0, t1, thickness, z0, z1,
             openings, cuts, mat_fn):
    """One straight wall, opened for its doors and windows and interrupted
    by the cutaway. Emitted as solid segments + lintels + sills, so the
    topology stays quad-clean and no boolean modifier is involved."""
    ops = sorted(openings, key=lambda o: o['pos'])
    solids, cursor = [], t0
    for o in ops:
        a, b = o['pos'] - o['w'] / 2, o['pos'] + o['w'] / 2
        if a > cursor:
            solids.append((cursor, a))
        cursor = max(cursor, b)
    if cursor < t1:
        solids.append((cursor, t1))

    def emit(a, b, za, zb):
        if b - a < 0.02 or zb - za < 0.02:
            return
        mid = (a + b) / 2
        if along == 'x':
            part.box((mid, const, (za + zb) / 2), (b - a, thickness, zb - za), mat_fn(mid, const))
        else:
            part.box((const, mid, (za + zb) / 2), (thickness, b - a, zb - za), mat_fn(const, mid))

    for a, b in solids:
        for sa, sb in subtract((a, b), cuts):
            emit(sa, sb, z0, z1)
    for o in ops:
        a, b = o['pos'] - o['w'] / 2, o['pos'] + o['w'] / 2
        for sa, sb in subtract((a, b), cuts):
            emit(sa, sb, o['z1'], z1)           # lintel
            if o['z0'] > z0 + 0.02:
                emit(sa, sb, z0, o['z0'])        # sill / spandrel


def slab_pieces(part, x0, x1, y0, y1, z0, z1, holes, mat):
    """A slab with rectangular holes cut out of it, emitted as boxes.

    Used for the core void (the stair has to pass through the floor) and for
    the cutaway (the slab over the storey below has to come off). The strip
    decomposition is exact and produces no T-junctions along the cut edges,
    which matters because these are the edges the hero's raking camera looks
    straight at.
    """
    if x1 - x0 < 0.02 or y1 - y0 < 0.02:
        return
    holes = [h for h in holes
             if h[0] < x1 - 0.01 and h[1] > x0 + 0.01
             and h[2] < y1 - 0.01 and h[3] > y0 + 0.01]
    if not holes:
        part.box(((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2),
                 (x1 - x0, y1 - y0, z1 - z0), mat)
        return
    # split into horizontal bands on the holes' Y edges, then subtract in X
    ys = sorted({y0, y1} | {v for h in holes for v in (max(y0, h[2]), min(y1, h[3]))})
    for a, b in zip(ys, ys[1:]):
        if b - a < 0.02:
            continue
        mid = (a + b) / 2
        cuts = [(h[0], h[1]) for h in holes if h[2] <= mid <= h[3]]
        for sa, sb in subtract((x0, x1), cuts):
            part.box(((sa + sb) / 2, mid, (z0 + z1) / 2),
                     (sb - sa, b - a, z1 - z0), mat)


# ============================================================

def main():
    data = load_plan()
    mpu = data['metresPerUnit']
    C = data['construction']
    EXT_T, INT_T, SLAB_T = C['ext'], C['int'], C['slab']
    CORE = data['core']
    CORE_T = CORE['t']
    ROOF = data['roof']

    # plan (x, z) → blender (x, y):  +X is plan east, +Y is plan NORTH (-z)
    MX = lambda x: x * mpu
    MY = lambda z: -z * mpu

    reset_scene()
    mats = build_materials()

    cols = {}
    for lid in ('L00', 'L01', 'L02', 'ROOF'):
        for grp in ('STRUCTURE', 'CEILING', 'GLASS'):
            cols[f'{lid}_{grp}'] = collection(f'{lid}_{grp}')
    col_furn = collection('FURNITURE')
    col_decor = collection('DECOR')
    col_lib = collection('_ASSET_LIBRARY')
    col_stations = collection('CAPTURE_STATIONS')

    levels = data['levels']
    by_id = {lv['id']: lv for lv in levels}

    # core rectangle in metres, and its interior
    CX0, CX1 = MX(CORE['x0']), MX(CORE['x1'])
    CY0, CY1 = MY(CORE['z1']), MY(CORE['z0'])      # MY negates: z1 → lower y
    CIX0, CIX1 = CX0 + CORE_T, CX1 - CORE_T
    CIY0, CIY1 = CY0 + CORE_T, CY1 - CORE_T
    CORE_HOLE = (CX0 + 0.02, CX1 - 0.02, CY0 + 0.02, CY1 - 0.02)

    # ------------------------------------------------------------------
    # rooms, in metres, inset by the wall that bounds each edge
    # ------------------------------------------------------------------
    rooms = {}
    for lv in levels:
        for r in lv['rooms']:
            hx0 = (EXT_T if abs(r['x0'] - lv['x0']) < 1e-6 else INT_T) / 2
            hx1 = (EXT_T if abs(r['x1'] - lv['x1']) < 1e-6 else INT_T) / 2
            hy0 = (EXT_T if abs(r['z1'] - lv['z1']) < 1e-6 else INT_T) / 2
            hy1 = (EXT_T if abs(r['z0'] - lv['z0']) < 1e-6 else INT_T) / 2
            room = Room(r['uid'],
                        MX(r['x0']) + hx0, MX(r['x1']) - hx1,
                        MY(r['z1']) + hy0, MY(r['z0']) - hy1,
                        r)
            room.level = lv['id']
            rooms[r['uid']] = room

    # PHASE 9 Part 13 — every room learns which openings are ITS openings.
    # The heading scorer wants to know whether a candidate direction has a
    # window in it, and the only honest source for that is the same list the
    # walls are punched from a few lines below.
    for lv in levels:
        for d in lv['doors']:
            rm = rooms.get(f"{lv['id']}-{d['room']}")
            if rm is not None:
                rm.openings.append((MX(d['x']), MY(d['z']), 'door'))
        for w in lv['windows']:
            if w.get('cut'):
                continue
            rm = rooms.get(f"{lv['id']}-{w['room']}")
            if rm is not None:
                rm.openings.append((MX(w['x']), MY(w['z']), 'window'))

    # ------------------------------------------------------------------
    # per-level fabric
    # ------------------------------------------------------------------
    def elev(lid):
        return by_id[lid]['elevation'] if lid in by_id else ROOF['elevation']

    for i, lv in enumerate(levels):
        lid = lv['id']
        E = lv['elevation']
        CLEAR = lv['clear']
        struct = Part(f'{lid}_WALLS')
        glass = Part(f'{lid}_GLAZING')
        cut_part = Part(f'{lid}_CEILING_CUTAWAY')

        cuts = lv.get('cuts') or {}
        raw_ids = {r['uid'] for r in lv['rooms'] if r.get('finish') == 'raw'}

        def is_raw_near(x, y, _ids=raw_ids):
            for uid in _ids:
                rm = rooms[uid]
                if (rm.x0 - EXT_T - 0.1 <= x <= rm.x1 + EXT_T + 0.1
                        and rm.y0 - EXT_T - 0.1 <= y <= rm.y1 + EXT_T + 0.1):
                    return True
            return False

        wall_mat = lambda x, y: 'MAT_CONCRETE' if is_raw_near(x, y) else 'MAT_WALL'

        # PHASE 8 — the facade is TRIPARTITE, and it is made of two materials
        # rather than of a decision about colour.
        #
        # Phase 7 struck every exterior wall in concrete, which was right for
        # one storey and wrong for three: with the slab edge ALSO in concrete
        # the whole elevation became one continuous grey and nothing said
        # where one level ended and the next began. The ground floor keeps
        # its struck concrete — it is the public floor, it holds the
        # unfinished bay, and a heavy base is what a building of this kind
        # has — and the two office floors are rendered. The 0.32 m band of
        # slab between them is concrete either way, so every storey now reads
        # as a plastered box sitting on a concrete line. That is the whole
        # horizontal composition, and it costs nothing.
        ext_mat = (lambda x, y: 'MAT_CONCRETE') if lid == 'L00' \
            else (lambda x, y: 'MAT_CONCRETE' if is_raw_near(x, y) else 'MAT_WALL')

        # ---- openings, indexed by the wall run they sit on ----
        ops = {}
        door_rects = []
        for d in lv['doors']:
            t = data['doorTypes'][d['type']]
            if d['axis'] == 'v':
                key = ('y', round(MX(d['x']), 3))
                pos = MY(d['z'])
            else:
                key = ('x', round(MY(d['z']), 3))
                pos = MX(d['x'])
            ops.setdefault(key, []).append(
                dict(pos=pos, w=t['w'], z0=E, z1=E + t['h'], kind='door', ref=d))
            door_rects.append(
                (door_clearance_rect(MX(d['x']), MY(d['z']), d['axis'], t['w']), d))
        for o in lv['openings']:
            if o['axis'] == 'v':
                key = ('y', round(MX(o['x']), 3))
                pos = MY(o['z'])
            else:
                key = ('x', round(MY(o['z']), 3))
                pos = MX(o['x'])
            ops.setdefault(key, []).append(
                dict(pos=pos, w=o['w'], z0=E, z1=E + CLEAR - SPINE_HEAD, kind='opening'))
            door_rects.append(
                (door_clearance_rect(MX(o['x']), MY(o['z']), o['axis'], o['w']), o))
        for w in lv['windows']:
            # PHASE 9 — a window the cutaway has removed the wall around is
            # still counted and still drawn on the plan (see
            # src/webgl/levels.js), but there is no wall here to punch.
            if w.get('cut'):
                continue
            t = data['windowTypes'][w['type']]
            if w['axis'] == 'v':
                key = ('y', round(MX(w['x']), 3))
                pos = MY(w['z'])
            else:
                key = ('x', round(MY(w['z']), 3))
                pos = MX(w['x'])
            ops.setdefault(key, []).append(
                dict(pos=pos, w=t['w'], z0=E + w['sill'], z1=E + w['head'],
                     kind='window', ref=w))

        # ---- walls, straight off the derived wall list ----
        for wl in lv['walls']:
            ext = wl['kind'] == 'ext'
            th = EXT_T if ext else INT_T
            mat_fn = ext_mat if ext else wall_mat
            if wl['axis'] == 'v':
                const = MX(wl['coord'])
                t0, t1 = MY(wl['t1']), MY(wl['t0'])
                key = ('y', round(const, 3))
                run_cuts = []
                if ext and abs(wl['coord'] - lv['x1']) < 1e-6:
                    run_cuts = [(MY(a), MY(b)) for a, b in cuts.get('east', [])]
                if ext and abs(wl['coord'] - lv['x0']) < 1e-6:
                    run_cuts = [(MY(a), MY(b)) for a, b in cuts.get('west', [])]
                wall_run(struct, 'y', const, t0, t1, th, E, E + CLEAR,
                         ops.get(key, []), run_cuts, mat_fn)
            else:
                const = MY(wl['coord'])
                t0, t1 = MX(wl['t0']), MX(wl['t1'])
                key = ('x', round(const, 3))
                run_cuts = []
                if ext and abs(wl['coord'] - lv['z1']) < 1e-6:
                    run_cuts = [(MX(a), MX(b)) for a, b in cuts.get('south', [])]
                if ext and abs(wl['coord'] - lv['z0']) < 1e-6:
                    run_cuts = [(MX(a), MX(b)) for a, b in cuts.get('north', [])]
                wall_run(struct, 'x', const, t0, t1, th, E, E + CLEAR,
                         ops.get(key, []), run_cuts, mat_fn)

        # ---- glazing ----
        for w in lv['windows']:
            if w.get('cut'):
                continue
            t = data['windowTypes'][w['type']]
            ww = t['w']
            x, y = MX(w['x']), MY(w['z'])
            if w['axis'] == 'h':
                rc = [(MX(a), MX(b)) for a, b in
                      cuts.get('south' if w['side'] == 'S' else 'north', [])]
                if not subtract((x - ww / 2, x + ww / 2), rc):
                    continue
                glass.box((x, y, E + (w['sill'] + w['head']) / 2),
                          (ww - 0.10, 0.03, w['head'] - w['sill'] - 0.10), 'MAT_GLASS')
            else:
                rc = [(MY(a), MY(b)) for a, b in
                      cuts.get('east' if w['side'] == 'E' else 'west', [])]
                if not subtract((y - ww / 2, y + ww / 2), rc):
                    continue
                glass.box((x, y, E + (w['sill'] + w['head']) / 2),
                          (0.03, ww - 0.10, w['head'] - w['sill'] - 0.10), 'MAT_GLASS')

        # ---- door leaves and linings ----
        for d in lv['doors']:
            t = data['doorTypes'][d['type']]
            ww, hh = t['w'], t['h']
            x, y = MX(d['x']), MY(d['z'])
            th = (EXT_T if d.get('exterior') else INT_T) + 0.03
            if d['axis'] == 'v':
                struct.box((x + 0.05, y - ww / 2 + 0.02, E + hh / 2),
                           (ww - 0.06, 0.045, hh - 0.04), 'MAT_OAK')
                for sy in (-1, 1):
                    struct.box((x, y + sy * (ww / 2 - 0.03), E + hh / 2),
                               (th, 0.06, hh), 'MAT_METAL')
                struct.box((x, y, E + hh - 0.03), (th, ww, 0.06), 'MAT_METAL')
            else:
                struct.box((x - ww / 2 + 0.02, y + 0.05, E + hh / 2),
                           (0.045, ww - 0.06, hh - 0.04), 'MAT_OAK')
                for sx in (-1, 1):
                    struct.box((x + sx * (ww / 2 - 0.03), y, E + hh / 2),
                               (0.06, th, hh), 'MAT_METAL')
                struct.box((x, y, E + hh - 0.03), (ww, th, 0.06), 'MAT_METAL')

        # ---- the level's own floor slab ----
        # L00 stands on the ground; every other level's slab is ALSO the
        # ceiling of the level under it, and is therefore the thing the
        # cutaway removes.
        below = levels[i - 1] if i > 0 else None
        slab_cuts = [(MX(c['x0']), MX(c['x1']), MY(c['z1']), MY(c['z0']))
                     for c in ((below.get('cuts') or {}).get('slab') or [])] if below else []
        holes = list(slab_cuts)
        if i > 0:
            holes.append(CORE_HOLE)
        fx0, fx1 = MX(lv['x0']) - EXT_T / 2, MX(lv['x1']) + EXT_T / 2
        fy0, fy1 = MY(lv['z1']) - EXT_T / 2, MY(lv['z0']) + EXT_T / 2
        if i > 0:
            # the slab spans the footprint of the level BELOW, because east of
            # L02's setback that slab is the roof terrace
            b = below
            fx0, fx1 = MX(b['x0']) - EXT_T / 2, MX(b['x1']) + EXT_T / 2
            fy0, fy1 = MY(b['z1']) - EXT_T / 2, MY(b['z0']) + EXT_T / 2
        slab = Part(f'SLAB_{lid}_FLOOR')
        slab_pieces(slab, fx0, fx1, fy0, fy1, E - SLAB_T, E, holes, 'MAT_CONCRETE')
        slab.to_object(mats, cols[f'{lid}_STRUCTURE'])

        # the pieces that were cut out, kept so an interior camera can put
        # the lid back on — see webgl/archScene.js setCutOpen()
        for (hx0, hx1, hy0, hy1) in slab_cuts:
            cut_part.box(((hx0 + hx1) / 2, (hy0 + hy1) / 2, E - SLAB_T / 2),
                         (hx1 - hx0, hy1 - hy0, SLAB_T), 'MAT_CONCRETE')

        # ---- downstand beams under this level's own soffit ----
        beams = Part(f'{lid}_BEAMS')
        bx0, bx1 = MX(lv['x0']), MX(lv['x1'])
        by0, by1 = MY(lv['z1']), MY(lv['z0'])
        nb = data['bays']['x']
        for k in range(nb + 1):
            x = bx0 + (bx1 - bx0) * k / nb
            zc = E + CLEAR - BEAM_D / 2
            # a beam inside this level's own cut region goes with the slab
            in_cut = [(MX(c['x0']), MX(c['x1']), MY(c['z1']), MY(c['z0']))
                      for c in (cuts.get('slab') or [])]
            spans = subtract((by0, by1), [(h[2], h[3]) for h in in_cut
                                          if h[0] - 0.01 <= x <= h[1] + 0.01])
            for a, b in spans:
                beams.box((x, (a + b) / 2, zc), (BEAM_W, b - a, BEAM_D), 'MAT_CONCRETE')
        beams.to_object(mats, cols[f'{lid}_STRUCTURE'])

        # ---- columns where the facade has been cut away ----
        # Where a facade is removed the frame that carried it must remain, or
        # the section reads as a wall that was never there.
        colp = Part(f'{lid}_COLUMNS')
        for a, b in cuts.get('south', []):
            for xx in (MX(a), MX(b)):
                colp.box((xx, MY(lv['z1']), E + CLEAR / 2), (0.42, 0.42, CLEAR), 'MAT_CONCRETE')
            colp.box(((MX(a) + MX(b)) / 2, MY(lv['z1']), E + CLEAR - 0.30),
                     (MX(b) - MX(a), 0.42, 0.60), 'MAT_CONCRETE')
        for a, b in cuts.get('east', []):
            for yy in (MY(a), MY(b)):
                colp.box((MX(lv['x1']), yy, E + CLEAR / 2), (0.42, 0.42, CLEAR), 'MAT_CONCRETE')
            colp.box((MX(lv['x1']), (MY(a) + MY(b)) / 2, E + CLEAR - 0.30),
                     (0.42, abs(MY(b) - MY(a)), 0.60), 'MAT_CONCRETE')
        if colp.faces:
            colp.to_object(mats, cols[f'{lid}_STRUCTURE'])

        # ---- per-room floor finish plates ----
        # These carry the semantic room names into the GLB and are what a
        # room-level highlight addresses.
        for r in lv['rooms']:
            rm = rooms[r['uid']]
            pt = Part(r['name'])
            pt.box(((rm.x0 + rm.x1) / 2, (rm.y0 + rm.y1) / 2, E + 0.008),
                   (rm.w, rm.d, 0.016), 'MAT_CONCRETE', faces=('top',))
            ob = pt.to_object(mats, cols[f'{lid}_STRUCTURE'])
            ob['gdf_room'] = r['uid']
            ob['gdf_level'] = lid
            ob['gdf_program'] = r['label']

        struct.to_object(mats, cols[f'{lid}_STRUCTURE'])
        glass.to_object(mats, cols[f'{lid}_GLASS'])
        if cut_part.faces:
            cut_part.to_object(mats, cols[f'{lid}_CEILING'])
        rooms_for_doors = [rooms[r['uid']] for r in lv['rooms']]
        for rm in rooms_for_doors:
            rm.doors = [rect for rect, _ in door_rects if _touches(rect, rm)]

    # ------------------------------------------------------------------
    # the roof
    # ------------------------------------------------------------------
    top = levels[-1]
    RE = ROOF['elevation']
    roof = Part('ROOF_SLAB')
    rx0, rx1 = MX(top['x0']) - EXT_T / 2, MX(top['x1']) + EXT_T / 2
    ry0, ry1 = MY(top['z1']) - EXT_T / 2, MY(top['z0']) + EXT_T / 2
    roof_cuts = [(MX(c['x0']), MX(c['x1']), MY(c['z1']), MY(c['z0']))
                 for c in ((top.get('cuts') or {}).get('slab') or [])]
    slab_pieces(roof, rx0, rx1, ry0, ry1, RE - top['slab'], RE,
                roof_cuts, 'MAT_CONCRETE')
    # Parapet round the roof, and a balustrade round the terrace. A terrace
    # without one is a fall, and in the hero it is the line that tells the
    # setback apart from a missing storey.
    P_H = ROOF['parapet']

    def ring(px0, px1, py0, py1, base, h, sides='NSEW'):
        if 'W' in sides:
            roof.box((px0 + 0.15, (py0 + py1) / 2, base + h / 2), (0.30, py1 - py0, h), 'MAT_CONCRETE')
        if 'E' in sides:
            roof.box((px1 - 0.15, (py0 + py1) / 2, base + h / 2), (0.30, py1 - py0, h), 'MAT_CONCRETE')
        if 'S' in sides:
            roof.box(((px0 + px1) / 2, py0 + 0.15, base + h / 2), (px1 - px0 - 0.60, 0.30, h), 'MAT_CONCRETE')
        if 'N' in sides:
            roof.box(((px0 + px1) / 2, py1 - 0.15, base + h / 2), (px1 - px0 - 0.60, 0.30, h), 'MAT_CONCRETE')

    ring(rx0, rx1, ry0, ry1, RE, P_H)
    ter = top.get('terrace')
    if ter:
        tx0, tx1 = MX(ter['x0']), MX(ter['x1']) + EXT_T / 2
        ty0, ty1 = MY(ter['z1']) - EXT_T / 2, MY(ter['z0']) + EXT_T / 2
        ring(tx0, tx1, ty0, ty1, top['elevation'], 1.05, sides='NSE')

    # mechanical volumes and the lift overrun
    for px, py, pw, pd, ph in ((-9.5, 3.0, 5.4, 3.6, 1.10), (-2.4, 8.4, 3.8, 3.0, 1.10)):
        roof.box((px, py, RE + ph / 2), (pw, pd, ph), 'MAT_METAL')
    roof.box(((CIX0 + CIX1) / 2, (CIY0 + CIY1) / 2, RE + 0.95),
             (CIX1 - CIX0, CIY1 - CIY0, 1.90), 'MAT_CONCRETE')
    roof.to_object(mats, cols['ROOF_STRUCTURE'])

    roof_cut_part = Part('ROOF_CEILING_CUTAWAY')
    for (hx0, hx1, hy0, hy1) in roof_cuts:
        roof_cut_part.box(((hx0 + hx1) / 2, (hy0 + hy1) / 2, RE - top['slab'] / 2),
                          (hx1 - hx0, hy1 - hy0, top['slab']), 'MAT_CONCRETE')
    if roof_cut_part.faces:
        roof_cut_part.to_object(mats, cols['ROOF_CEILING'])

    # ------------------------------------------------------------------
    # THE VERTICAL CORE — shaft, stair, lift
    # ------------------------------------------------------------------
    core = Part('STRUCT_CORE')
    stair_tris, stair_report = build_core(core, levels, ROOF, CX0, CX1, CY0, CY1,
                                          CIX0, CIX1, CIY0, CIY1, CORE_T)
    core.to_object(mats, cols['L00_STRUCTURE'])

    # ------------------------------------------------------------------
    # furnishing
    # ------------------------------------------------------------------
    variants = {
        'meeting_table_small': ('meeting_table', dict(length=2.00, width=1.05), (2.00, 1.05)),
        'credenza_small': ('credenza', dict(width=1.30), (1.30, 0.46)),
    }
    lib, external = asset_loader.build_library(mats, col_lib, variants)

    counts = {}
    per_level_counts = {lv['id']: 0 for lv in levels}
    for uid, entries in SCHEDULE.items():
        room = rooms.get(uid)
        if room is None:
            continue
        lv = by_id[room.level]
        entries = _apply_variants(uid, entries)
        placed = furnish(room, entries, ceiling=lv['clear'], report=REPORT)
        for p in placed:
            counts[p.asset] = counts.get(p.asset, 0) + 1
            per_level_counts[room.level] += 1
            idx = counts[p.asset]
            fin = p.asset in FINISH_ASSETS
            grp = 'FIN' if fin else 'FURN'
            ob = link_duplicate(
                lib[p.asset],
                f'{grp}_{room.level}_{p.asset.upper()}_{idx:02d}',
                (p.x, p.y, p.z + lv['elevation']), p.rot,
                col_decor if fin else col_furn)
            ob['gdf_room'] = uid
            ob['gdf_level'] = room.level
            ob['gdf_asset'] = p.asset

    # ------------------------------------------------------------------
    # capture stations — solved per level against the furnished layout
    # ------------------------------------------------------------------
    cp = 0
    #: PHASE 9 Part 10 — the capture round comes from src/webgl/stations.js
    #: via plan-features.json. Python used to hold its own copy of this list,
    #: which meant the web could not print the per-floor station counts
    #: without waiting for the GLB. One list, one side of the fence.
    for uid, name in (tuple(x) for x in data['captureRound']):
        room = rooms.get(uid)
        if room is None:
            continue
        lv = by_id[room.level]
        solved = room_layout.capture_station(room)
        if solved is None:
            STATION_REPORT.append(f'{uid}/{name}: no legal standing position')
            continue
        sx, sy, yaw = solved
        cp += 1
        cid = f'CP-{cp:02d}'
        e = bpy.data.objects.new(f'CAPTURE_STATION_{room.level}_{name}', None)
        e.empty_display_size = 0.5
        e.location = (sx, sy, lv['elevation'] + room_layout.STATION_EYE)
        e['gdf_station'] = name
        e['gdf_cp'] = cid
        e['gdf_room'] = uid
        e['gdf_level'] = room.level
        e['gdf_label'] = room.program['label']
        #: Entry heading in the 360 viewer's own frame — see
        #: room_layout.capture_station for the conversion.
        e['gdf_yaw'] = round(yaw, 2)
        col_stations.objects.link(e)
        STATION_REPORT.append(
            f'{room.level} {cid} {uid}/{name}: ({sx:+.2f}, {sy:+.2f}) '
            f'yaw {yaw:5.1f}  {room.program["label"]}')

    # ------------------------------------------------------------------
    uv_done = 0
    for ob in bpy.data.objects:
        if ob.type == 'MESH':
            uv_done += 1 if lib_mesh.box_uv(ob) else 0

    per_asset = {k: sum(len(p_.vertices) - 2 for p_ in ob.data.polygons)
                 for k, ob in lib.items()}
    room_box = {uid: dict(x0=rm.x0, x1=rm.x1, y0=rm.y0, y1=rm.y1,
                          level=rm.level, zone=rm.program['zone'],
                          label=rm.program['label'], area=rm.program['area'])
                for uid, rm in rooms.items()}
    stats = scene_stats()
    stats.update(dict(
        rooms=room_box, assetTris=per_asset,
        footprint=dict(asset_loader.FOOTPRINT),
        clearance=dict(asset_loader.CLEARANCE),
        assetTotals={k: per_asset[k] * v for k, v in counts.items()},
        metresPerUnit=mpu,
        levels={lv['id']: dict(elevation=lv['elevation'], ftf=lv['ftf'],
                               clear=lv['clear'], area=lv['area'],
                               furniture=per_level_counts[lv['id']])
                for lv in levels},
        roof=ROOF, core=CORE, stairTris=stair_tris, stair=stair_report,
        coreInterior=dict(x=round(CIX1 - CIX0, 3), y=round(CIY1 - CIY0, 3)),
        floorT=data['construction']['slab'],
        furniture=counts, layoutReport=REPORT,
        external=external, stations=STATION_REPORT))
    out = os.path.join(HERE, 'out')
    os.makedirs(out, exist_ok=True)
    with open(os.path.join(out, 'build-stats.json'), 'w') as fh:
        json.dump(stats, fh, indent=1)

    bpy.ops.wm.save_as_mainfile(
        filepath=os.path.join(out, 'godatafusion_environment_master.blend'))

    print('\n=== BUILD ===')
    for lv in levels:
        print(f"{lv['id']} {lv['label']:14s} +{lv['elevation']:5.2f} m  "
              f"clear {lv['clear']:.2f}  {lv['area']:7.1f} m²  "
              f"{len(lv['rooms']):2d} rooms  {len(lv['doors']):2d} doors  "
              f"{len(lv['windows']):2d} windows  "
              f"{per_level_counts[lv['id']]:3d} furniture")
    print(f"ROOF   {ROOF['label']:14s} +{ROOF['elevation']:5.2f} m")
    print(f'CORE   {CIX1 - CIX0:.2f} x {CIY1 - CIY0:.2f} m clear, '
          f'{stair_tris} tris of stair')
    for r in stair_report:
        ok = 'OK ' if (r['connects'] and r['fitsCore']) else '!! '
        print(f"  {ok}{r['frm']}->{r['to']}  rise {r['rise']:.2f} m  "
              f"{r['risers']} x {r['riser'] * 1000:.0f} mm / {r['going'] * 1000:.0f} mm  "
              f"2 flights of {r['widthEach']:.2f} m  run {r['runDepth']:.2f} m  "
              f"arrives +{r['arrivesAt']:.2f} m")
    print(f"objects {stats['objects']}  meshes {stats['meshes']}  "
          f"tris {stats['tris']}  materials {stats['materials']}")
    print(f'box-projected UVs on {uv_done} meshes')
    print('furniture:', counts)
    print('CAPTURE STATIONS:')
    for line in STATION_REPORT:
        print('  ', line)
    if external:
        print('EXTERNAL ASSETS (Poly Haven):')
        for rec in external:
            if rec.get('failed'):
                print(f"   ! {rec['slug']:26s} FAILED {rec['failed'][:60]}")
            else:
                print(f"   {rec['slug']:26s} → {rec['replaces']:15s} "
                      f"{rec['sourceTris']:6d} → {rec['webTris']:5d} tris")
    if REPORT:
        print('LAYOUT REPORT:')
        for line in REPORT:
            print('  ', line)
    else:
        print('LAYOUT REPORT: clean — no placement dropped')


# ============================================================
# the core
# ============================================================

def build_core(part, levels, roof, x0, x1, y0, y1, ix0, ix1, iy0, iy1, t):
    """Shaft, dog-leg stair and lift, through every level.

    The stair is the thing that makes three floors ONE BUILDING rather than
    three plans at three heights, so it is built rather than implied: real
    risers at a real going, two flights and a half-landing per storey, inside
    a shaft that lands on the same plan rectangle on all three levels and
    passes through a hole cut in each slab.

    Riser and going are solved from the actual floor-to-floor, so a change to
    a level's height re-treads the stair instead of leaving it short.
    """
    tris0 = part.tris
    report = []
    #: The stair occupies the west half of the shaft, the lift the east.
    #: A flight is 1.20 m — the width a stair actually is, not half the shaft.
    #: Sizing it as a fraction of the core filled the whole shaft with steps
    #: and left the lift a negative-width box.
    well = 0.10
    fw = min(1.20, (ix1 - ix0 - well - 1.90) / 2)
    sx0 = ix0 + 0.05
    lift_x0 = sx0 + 2 * fw + well + 0.22

    top_e = roof['elevation']
    for i, lv in enumerate(levels):
        E = lv['elevation']
        head = (levels[i + 1]['elevation'] if i + 1 < len(levels) else top_e)
        # --- shaft walls, this storey, with a doorway on the south face ---
        z0, z1 = E, head - lv['slab']
        door_w, door_h = 1.10, 2.10
        cx = (x0 + x1) / 2
        # south wall (min Y), opened for the door
        for a, b in ((x0, cx - door_w / 2), (cx + door_w / 2, x1)):
            if b - a > 0.02:
                part.box(((a + b) / 2, y0 + t / 2, (z0 + z1) / 2),
                         (b - a, t, z1 - z0), 'MAT_CONCRETE')
        part.box((cx, y0 + t / 2, (z0 + door_h + z1) / 2),
                 (door_w, t, z1 - z0 - door_h), 'MAT_CONCRETE')
        # north wall and the two returns
        part.box(((x0 + x1) / 2, y1 - t / 2, (z0 + z1) / 2),
                 (x1 - x0, t, z1 - z0), 'MAT_CONCRETE')
        for sx in (x0 + t / 2, x1 - t / 2):
            part.box((sx, (y0 + y1) / 2, (z0 + z1) / 2),
                     (t, y1 - y0, z1 - z0), 'MAT_CONCRETE')
        # --- lift shaft, this storey ---
        lz1 = head - lv['slab'] if i + 1 <= len(levels) else z1
        part.box(((lift_x0 + ix1) / 2, iy0 + 0.06, E + (lz1 - E) / 2),
                 (ix1 - lift_x0, 0.12, lz1 - E), 'MAT_METAL')

        if i + 1 >= len(levels):
            break

        # --- the flight to the level above ---
        rise = levels[i + 1]['elevation'] - E
        n = max(2, round(rise / 0.181))
        n += n % 2                             # an even count splits in two
        riser = rise / n
        going = 0.29
        half = n // 2
        run = (half - 1) * going
        landing = 1.30
        ya = iy0 + 0.28
        # flight one, climbing north
        for k in range(1, half + 1):
            zt = E + k * riser
            ys = ya + (k - 1) * going
            part.box((sx0 + fw / 2, ys + going / 2, (E + zt) / 2),
                     (fw, going, zt - E), 'MAT_CONCRETE')
        ml = E + half * riser
        part.box((sx0 + (2 * fw + well) / 2, ya + run + going + landing / 2, ml - 0.09),
                 (2 * fw + well, landing, 0.18), 'MAT_CONCRETE')
        # flight two, climbing back south on the far side of the well
        yb = ya + run + going + landing
        for k in range(1, half + 1):
            zt = ml + k * riser
            ys = yb - k * going
            part.box((sx0 + fw + well + fw / 2, ys + going / 2, (ml + zt) / 2),
                     (fw, going, zt - ml), 'MAT_CONCRETE')
        # The flight is solved from the real floor-to-floor, so the top tread
        # lands ON the level above by construction rather than by luck — but
        # this is the one number in the building that would fail silently if
        # it did not, so it is measured and reported.
        arrive = ml + half * riser
        report.append(dict(
            frm=lv['id'], to=levels[i + 1]['id'], rise=round(rise, 3),
            risers=n, riser=round(riser, 4), going=going,
            flights=2, landing=landing,
            arrivesAt=round(arrive, 4),
            connects=abs(arrive - levels[i + 1]['elevation']) < 1e-6,
            runDepth=round(yb - ya, 3),
            fitsCore=(yb + 0.05) <= iy1,
            widthEach=round(fw, 3)))
    return part.tris - tris0, report


def _touches(rect, room):
    return not (rect[1] < room.x0 - 0.05 or rect[0] > room.x1 + 0.05
                or rect[3] < room.y0 - 0.05 or rect[2] > room.y1 + 0.05)


def _apply_variants(uid, entries):
    out = []
    for e in entries:
        e = dict(e)
        if e['asset'] == 'meeting_table' and e.get('length', 3.2) <= 2.2:
            e['asset'] = 'meeting_table_small'
        out.append(e)
    return out


def scene_stats():
    tris = verts = 0
    meshes = set()
    mats = set()
    objs = 0
    for ob in bpy.data.objects:
        if ob.type != 'MESH' or ob.name.startswith('ASSET_'):
            continue
        objs += 1
        me = ob.data
        meshes.add(me.name)
        for m in me.materials:
            if m:
                mats.add(m.name)
    for name in meshes:
        me = bpy.data.meshes[name]
        verts += len(me.vertices)
        tris += sum(len(p.vertices) - 2 for p in me.polygons)
    drawn = 0
    for ob in bpy.data.objects:
        if ob.type != 'MESH' or ob.name.startswith('ASSET_'):
            continue
        drawn += sum(len(p.vertices) - 2 for p in ob.data.polygons)
    return dict(objects=objs, meshes=len(meshes), uniqueTris=tris,
                tris=drawn, verts=verts, materials=len(mats))


if __name__ == '__main__':
    main()
