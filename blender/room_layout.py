"""
The furnishing system.

Placement is RULE-BASED, not a table of hand-authored transforms: a room
knows its own bounds, its doors and its walls, and each layout rule turns an
entry in the schedule into transforms that respect them. That is what makes
the layout survive a change to the plan — move a partition in geometry.js and
the desks move with it instead of ending up inside a wall.

Blender axes here: +X is plan EAST, +Y is plan NORTH (the site's -Z), +Z up.
Everything is metres.
"""

import math

from asset_loader import FOOTPRINT, CLEARANCE

# Height at which wall-mounted assets hang (centre of the object).
MOUNT_H = {'wall_screen': 1.92, 'plan_frame': 1.78, 'acoustic': 1.74, 'signage': 2.05}

# Clear depth in front of a door leaf that furniture may not occupy.
DOOR_CLEAR_DEPTH = 1.20
DOOR_CLEAR_MARGIN = 0.30

SIDE_NORMAL = {'n': (0.0, -1.0), 's': (0.0, 1.0), 'e': (-1.0, 0.0), 'w': (1.0, 0.0)}


class Room:
    """One cell of the plan grid, in metres, already inset by wall thickness."""

    def __init__(self, rid, x0, x1, y0, y1, program):
        self.id = rid
        self.x0, self.x1, self.y0, self.y1 = x0, x1, y0, y1
        self.program = program
        self.doors = []          # clearance rectangles, filled by build_environment
        self.placed = []         # Placement objects, in schedule order
        #: (x, y, kind) of every door and window this room owns, in metres,
        #: filled by build_environment from the SAME opening list the fabric
        #: is punched with. PHASE 9 Part 13 scores a heading partly on whether
        #: it has an opening in it, and an opening the walls do not have is
        #: not an opening.
        self.openings = []

    @property
    def cx(self): return (self.x0 + self.x1) / 2

    @property
    def cy(self): return (self.y0 + self.y1) / 2

    @property
    def w(self): return self.x1 - self.x0

    @property
    def d(self): return self.y1 - self.y0

    def wall_line(self, side):
        """(coordinate of the wall face, inward unit normal)."""
        if side == 'n': return self.y1, (0.0, -1.0)
        if side == 's': return self.y0, (0.0, 1.0)
        if side == 'e': return self.x1, (-1.0, 0.0)
        return self.x0, (1.0, 0.0)


#: Objects that are MEANT to stand inside another object's use clearance —
#: a chair pulled up to a desk is not a collision, it is the point of the desk.
SEATING = ('office_chair', 'meeting_chair', 'lounge_chair')


class Placement:
    __slots__ = ('asset', 'x', 'y', 'z', 'rot', 'group', 'floor', 'ox', 'oy', 'tries')

    def __init__(self, asset, x, y, z=0.0, rot=0.0, group='FURNITURE', floor=True,
                 tries=None):
        self.asset, self.x, self.y, self.z, self.rot = asset, x, y, z, rot
        self.group, self.floor = group, floor
        self.ox, self.oy = x, y
        #: Candidate offsets from the authored position, in preference order.
        #: A cabinet slides ALONG its wall to clear a door; a plant tries the
        #: other corners; everything else edges toward the middle of the room.
        self.tries = tries

    def aabb(self):
        """Axis-aligned box of the rotated footprint, plus its use clearance
        projected in the object's facing direction."""
        w, d = FOOTPRINT.get(self.asset, (0.4, 0.4))
        c, s = abs(math.cos(self.rot)), abs(math.sin(self.rot))
        hw = (w * c + d * s) / 2
        hd = (w * s + d * c) / 2
        return self.x - hw, self.x + hw, self.y - hd, self.y + hd

    def clearance_box(self):
        cl = CLEARANCE.get(self.asset)
        if not cl:
            return None
        w, d = FOOTPRINT[self.asset]
        fx, fy = math.sin(-self.rot), math.cos(self.rot)
        cxp = self.x + fx * (d / 2 + cl / 2)
        cyp = self.y + fy * (d / 2 + cl / 2)
        c, s = abs(math.cos(self.rot)), abs(math.sin(self.rot))
        hw = (w * c + cl * s) / 2
        hd = (w * s + cl * c) / 2
        return cxp - hw, cxp + hw, cyp - hd, cyp + hd


def overlap(a, b, tol=0.02):
    return (a[0] < b[1] - tol and b[0] < a[1] - tol
            and a[2] < b[3] - tol and b[2] < a[3] - tol)


# ============================================================
# layout rules
# ============================================================

def _slide(axis, reach=4.2, step=0.35):
    """Offsets along one axis, alternating either side of the authored spot."""
    out = [(0.0, 0.0)]
    k = step
    while k <= reach:
        out += ([(k, 0.0), (-k, 0.0)] if axis == 'x' else [(0.0, k), (0.0, -k)])
        k += step
    return out


def _face_into(side):
    """Rotation for an object standing against `side`, facing the room."""
    return {'n': math.pi, 's': 0.0, 'e': math.pi / 2, 'w': -math.pi / 2}[side]


def rule_center(room, e, ctx):
    return [Placement(e['asset'], room.cx, room.cy, rot=e.get('face', 0.0))]


def rule_at_point(room, e, ctx):
    dx, dy = e['at']
    return [Placement(e['asset'], room.cx + dx, room.cy + dy, z=e.get('z', 0.0),
                      rot=e.get('face', 0.0), floor=e.get('floor', True))]


def rule_wall(room, e, ctx):
    side = e['side']
    coord, (nx, ny) = room.wall_line(side)
    w, d = FOOTPRINT[e['asset']]
    gap = e.get('gap', 0.06)
    out = []
    n = e['count']
    span = e.get('spacing', w + 0.30)
    for i in range(n):
        t = (i - (n - 1) / 2) * span
        if side in ('n', 's'):
            x, y = room.cx + t, coord + ny * (d / 2 + gap)
        else:
            x, y = coord + nx * (d / 2 + gap), room.cy + t
        out.append(Placement(e['asset'], x, y, rot=_face_into(side),
                             tries=_slide('x' if side in ('n', 's') else 'y')))
    return out


def rule_wall_mounted(room, e, ctx):
    side = e['side']
    coord, (nx, ny) = room.wall_line(side)
    z = MOUNT_H.get(e['asset'], 1.80)
    n = e['count']
    span = e.get('spacing', FOOTPRINT[e['asset']][0] + 0.25)
    out = []
    for i in range(n):
        t = (i - (n - 1) / 2) * span
        if side in ('n', 's'):
            x, y = room.cx + t, coord
        else:
            x, y = coord, room.cy + t
        out.append(Placement(e['asset'], x, y, z=z, rot=_face_into(side), floor=False,
                             tries=_slide('x' if side in ('n', 's') else 'y')))
    return out


def rule_corner(room, e, ctx):
    cn = e.get('corner', 'nw')
    inset = e.get('inset', 0.85)
    order = [cn] + [c for c in ('nw', 'ne', 'sw', 'se') if c != cn]
    pts = []
    for k in (1.0, 2.0, 3.0):
        for c in order:
            pts.append((room.x1 - inset * k if 'e' in c else room.x0 + inset * k,
                        room.y1 - inset * k if 'n' in c else room.y0 + inset * k))
    x, y = pts[0]
    return [Placement(e['asset'], x, y, rot=e.get('face', 0.0),
                      tries=[(px - x, py - y) for px, py in pts])]


def rule_ceiling_row(room, e, ctx):
    n = e['count']
    span = min(room.w * 0.62, 2.6 * (n - 1) if n > 1 else 0) / max(n - 1, 1)
    out = []
    for i in range(n):
        x = room.cx + (i - (n - 1) / 2) * span
        out.append(Placement(e['asset'], x, room.cy, z=ctx['ceiling'],
                             group='FURNITURE', floor=False))
    return out


def rule_desk_bank(room, e, ctx):
    """Back-to-back desk pairs, aligned with the room's long axis and set so
    both users' chairs stay clear of the room's circulation edge."""
    n = e['count']
    spacing = e.get('spacing', 2.10)
    w, d = FOOTPRINT[e['asset']]
    cols = max(1, (n + 1) // 2)
    out = []
    for i in range(n):
        col, row = i % cols, i // cols
        x = room.cx + (col - (cols - 1) / 2) * spacing
        y = room.cy + (0.5 - row) * d
        out.append(Placement(e['asset'], x, y, rot=0.0 if row == 0 else math.pi))
    ctx['desks'] = out
    return out


def rule_at_desks(room, e, ctx):
    out = []
    for i, dsk in enumerate(ctx.get('desks', [])[:e['count']]):
        off = e.get('offset', 0.86)
        fx, fy = math.sin(-dsk.rot), math.cos(dsk.rot)
        out.append(Placement(e['asset'], dsk.x + fx * off, dsk.y + fy * off,
                             rot=dsk.rot + math.pi))
    return out


def rule_on_desks(room, e, ctx):
    """Monitors sit on desks and inherit the workstation's orientation."""
    desks = ctx.get('desks', [])
    duals = set(e.get('duals', ()))
    out, made = [], 0
    for i, dsk in enumerate(desks):
        n_here = 2 if i in duals else 1
        for k in range(n_here):
            if made >= e['count']:
                break
            side = (k - (n_here - 1) / 2) * 0.68
            fx, fy = math.sin(-dsk.rot), math.cos(dsk.rot)
            rx, ry = math.cos(dsk.rot), math.sin(dsk.rot)
            x = dsk.x - fx * 0.24 + rx * side
            y = dsk.y - fy * 0.24 + ry * side
            out.append(Placement(e['asset'], x, y, z=ctx['desk_top'],
                                 rot=dsk.rot + math.pi, floor=False))
            made += 1
    return out


def rule_around_table(room, e, ctx):
    """Chairs distributed round the table already placed in this room,
    oriented to face it, offset by the table half-depth plus clearance."""
    tbl = ctx.get('table')
    if tbl is None:
        return []
    L, W = FOOTPRINT.get(ctx['table_asset'], (3.2, 1.2))
    L = ctx.get('table_length', L)
    cl = e.get('clearance', 0.62)
    n = e['count']
    per_side = n // 2
    ends = n - per_side * 2
    out = []
    for s in (1, -1):
        for i in range(per_side):
            t = (i - (per_side - 1) / 2) * (L / max(per_side, 1))
            out.append(Placement(e['asset'], tbl.x + t, tbl.y + s * (W / 2 + cl),
                                 rot=math.pi if s > 0 else 0.0))
    for j in range(ends):
        s = 1 if j == 0 else -1
        out.append(Placement(e['asset'], tbl.x + s * (L / 2 + cl), tbl.y,
                             rot=-math.pi / 2 if s > 0 else math.pi / 2))
    return out


def rule_pair_facing(room, e, ctx):
    gap = e.get('gap', 1.4)
    face = e.get('face', 0.0)
    dx, dy = math.sin(-face), math.cos(face)
    out = []
    for s in (1, -1):
        out.append(Placement(e['asset'], room.cx + dx * gap / 2 * s,
                             room.cy + dy * gap / 2 * s,
                             rot=face + (math.pi if s > 0 else 0.0)))
    return out


RULES = {
    'center': rule_center, 'at_point': rule_at_point, 'wall': rule_wall,
    'wall_mounted': rule_wall_mounted, 'corner': rule_corner,
    'ceiling_row': rule_ceiling_row, 'desk_bank': rule_desk_bank,
    'at_desks': rule_at_desks, 'on_desks': rule_on_desks,
    'around_table': rule_around_table, 'pair_facing': rule_pair_facing,
}


# ============================================================
# validation — walls, doors, each other
# ============================================================

def furnish(room, schedule, ceiling, desk_top=0.731, report=None):
    """Run the schedule for one room and return validated placements."""
    ctx = {'ceiling': ceiling, 'desk_top': desk_top}
    accepted = []
    report = report if report is not None else []

    for e in schedule:
        rule = RULES[e['layout']]
        cands = rule(room, e, ctx)
        if e['asset'].startswith(('meeting_table', 'plan_table')) and cands:
            ctx['table'] = cands[0]
            ctx['table_asset'] = e['asset']
            ctx['table_length'] = e.get('length', FOOTPRINT[e['asset']][0])
        for p in cands:
            ok, why = _resolve(room, p, accepted)
            if ok:
                accepted.append(p)
            else:
                report.append(f'{room.id}: dropped {p.asset} — {why}')
    room.placed = accepted
    return accepted


def _resolve(room, p, accepted):
    """Seat a placement legally by walking its candidate offsets, which the
    layout rule chose to suit the object: a cabinet slides ALONG its wall to
    clear a door swing, a plant tries the other corners, and anything else
    edges toward the middle of the room. Ceiling- and wall-mounted objects
    skip floor collision but must still not hang over a doorway."""
    tries = p.tries
    if tries is None:
        vx, vy = room.cx - p.ox, room.cy - p.oy
        n = math.hypot(vx, vy) or 1.0
        tries = [(0.0, 0.0)] + [(vx / n * k * 0.14, vy / n * k * 0.14)
                                for k in range(1, 8)]
    why = 'unresolved'
    for dx, dy in tries:
        p.x, p.y = p.ox + dx, p.oy + dy
        why = _violation(room, p, accepted)
        if why is None:
            return True, None
    p.x, p.y = p.ox, p.oy
    return False, why


def _violation(room, p, accepted):
    box = p.aabb()
    if p.floor:
        if (box[0] < room.x0 - 0.01 or box[1] > room.x1 + 0.01
                or box[2] < room.y0 - 0.01 or box[3] > room.y1 + 0.01):
            return 'intersects wall'
        cb = p.clearance_box()
        if cb and (cb[0] < room.x0 - 0.05 or cb[1] > room.x1 + 0.05
                   or cb[2] < room.y0 - 0.05 or cb[3] > room.y1 + 0.05):
            return 'no use clearance'
    for d in room.doors:
        if overlap(box, d):
            return 'blocks a door'
        if p.floor:
            cb = p.clearance_box()
            if cb and overlap(cb, d):
                return 'use clearance crosses a door'
    for q in accepted:
        if q.floor != p.floor:
            continue
        # Both mounted, but a pendant at 4.3 m and a monitor at 0.7 m share
        # no space. Only test objects whose heights actually overlap.
        if abs(q.z - p.z) > 0.9:
            continue
        if overlap(box, q.aabb()):
            return f'intersects {q.asset}'
        cb, qb = p.clearance_box(), q.clearance_box()
        if cb and q.asset not in SEATING and overlap(cb, q.aabb()):
            return f'use clearance blocked by {q.asset}'
        if qb and p.asset not in SEATING and overlap(qb, box):
            return f'blocks use of {q.asset}'
    return None


def door_clearance_rect(x, y, axis, width):
    """The rectangle in front of (and behind) a door leaf. Doors are swing
    doors on the plan, so the zone is taken on both sides of the wall."""
    half = width / 2 + DOOR_CLEAR_MARGIN
    if axis == 'v':      # door in a wall of constant X — opens along X
        return (x - DOOR_CLEAR_DEPTH, x + DOOR_CLEAR_DEPTH, y - half, y + half)
    return (x - half, x + half, y - DOOR_CLEAR_DEPTH, y + DOOR_CLEAR_DEPTH)


# ============================================================
# capture stations — PHASE 7 Part 18
# ============================================================

#: How far a standing position must stay off a wall. A camera 300 mm from
#: plaster produces one grey frame, whatever it is pointed at.
STATION_WALL_CLEAR = 0.95
#: …and off anything standing on the floor.
STATION_OBJECT_CLEAR = 0.42
#: Eye height, metres. A mast-extended tripod is what site documentation
#: actually uses, and it is close enough to standing eye level that the
#: rooms read the way a visitor would see them.
STATION_EYE = 1.62

#: Assets that do not obstruct a standing person. A pendant is over your
#: head and a wall screen is behind your shoulder; neither is a reason to
#: refuse a capture position, and treating them as obstacles is what pushes
#: a station out of a small room entirely.
STATION_IGNORE = ('pendant', 'ceiling_line', 'wall_screen', 'plan_frame',
                  'acoustic', 'signage', 'monitor')

#: PHASE 9 Part 13 — waist-high or lower, so it is a SUBJECT in the near
#: field rather than something in the way. A meeting table 1.1 m in front of
#: the camera is the reason to stand there; a bookcase 1.1 m in front of it
#: is a wall with shelves on it, and the scorer has to tell them apart.
LOW_SUBJECTS = ('desk', 'meeting_table', 'side_table', 'meeting_chair',
                'lounge_chair', 'office_chair', 'bench')


def _obstacles(room):
    """Floor-standing footprints in this room, as AABBs."""
    out = []
    for p in room.placed:
        if not p.floor or p.asset in STATION_IGNORE:
            continue
        out.append(p.aabb())
    return out


def capture_station(room):
    """Solve one standing capture position for a furnished room.

    PHASE 7 — the Phase 6 stations were eight hand-typed coordinates, and
    five of them were the room's centre point. That was harmless while the
    rooms were empty; once the rooms have a table in the middle of them it
    puts the camera INSIDE the table, and the 360 viewer opens on a plank
    filling the lower third of the frame.

    So the position is solved instead: sample the room, reject anything too
    close to a wall, to a door swing or to a piece of furniture, and score
    what survives. The score wants two things at once — room to stand, and
    something worth looking at — which is why it rewards clearance but
    subtracts distance from the furniture centroid. A position in the middle
    of an empty corner scores badly even though nothing is near it.

    Returns (x, y, yaw_deg) in Blender metres, or None if the room has no
    legal standing position at all.
    """
    obs = _obstacles(room)
    focus = [p for p in room.placed if p.floor and p.asset not in STATION_IGNORE]
    #: PHASE 8 — a CORRIDOR is not solved, it is COMPOSED.
    #:
    #: The Phase 7 rule was "stand where there is room, aim at the furniture",
    #: and it is right for a room. A corridor is not a room: L02's is 25.7 m
    #: long and 2.9 m deep, and the one plant standing in it is against the
    #: long wall — so the solver walked to the plant and pointed the camera at
    #: plaster 2.8 m away. A corridor has exactly one useful viewpoint and
    #: everybody already knows what it is: stand near one end, on the centre
    #: line, and look ALONG it. That is what a person walking it sees and it
    #: is the only heading that shows the doors.
    corridor = (room.program.get('kind') == 'CIRC'
                and max(room.w / room.d, room.d / room.w) > 2.2)
    if corridor:
        obs = _obstacles(room)
        along_x = room.w >= room.d
        span = (room.x0, room.x1) if along_x else (room.y0, room.y1)
        cross = room.cy if along_x else room.cx
        # start a little in from the near end and walk toward the far one
        # until the position is clear of whatever is standing in the way
        for t in (0.14, 0.20, 0.27, 0.34, 0.42, 0.50):
            a = span[0] + (span[1] - span[0]) * t
            x, y = (a, cross) if along_x else (cross, a)
            if all(not (a0 - STATION_OBJECT_CLEAR <= x <= a1 + STATION_OBJECT_CLEAR
                        and b0 - STATION_OBJECT_CLEAR <= y <= b1 + STATION_OBJECT_CLEAR)
                   for a0, a1, b0, b1 in obs) \
               and not any(rx0 <= x <= rx1 and ry0 <= y <= ry1
                           for rx0, rx1, ry0, ry1 in room.doors):
                fx, fy = (span[1], cross) if along_x else (cross, span[1])
                yaw = math.degrees(math.atan2(fx - x, -(fy - y)))
                return x, y, (yaw + 360.0) % 360.0
        # nothing clear on the centre line: fall through to the room solver

    obs = _obstacles(room)
    focus = [p for p in room.placed if p.floor and p.asset not in STATION_IGNORE]
    if focus:
        fx = sum(p.x for p in focus) / len(focus)
        fy = sum(p.y for p in focus) / len(focus)
    else:
        # An empty room — a circulation cell — has no subject, so the heading
        # is architectural instead: look ALONG the spine, toward the middle
        # of the building. Facing the centre of an empty cell would point the
        # camera at a blank wall two metres away.
        fx, fy = 0.0, room.cy

    x0 = room.x0 + STATION_WALL_CLEAR
    x1 = room.x1 - STATION_WALL_CLEAR
    y0 = room.y0 + STATION_WALL_CLEAR
    y1 = room.y1 - STATION_WALL_CLEAR
    if x1 <= x0 or y1 <= y0:
        return None

    best, best_score = None, -1e9
    steps = 21
    for i in range(steps):
        for j in range(steps):
            x = x0 + (x1 - x0) * i / (steps - 1)
            y = y0 + (y1 - y0) * j / (steps - 1)

            clear = min(
                (min(x - a0, a1 - x, y - b0, b1 - y) * -1
                 if (a0 <= x <= a1 and b0 <= y <= b1)
                 else max(a0 - x, x - a1, b0 - y, y - b1, 0.0))
                for a0, a1, b0, b1 in obs) if obs else 4.0
            if clear < STATION_OBJECT_CLEAR:
                continue
            if any(rx0 <= x <= rx1 and ry0 <= y <= ry1
                   for rx0, rx1, ry0, ry1 in room.doors):
                continue

            # room to stand, minus how far the subject has been left behind
            reach = math.hypot(x - fx, y - fy)
            score = min(clear, 1.6) * 1.0 - reach * 0.55
            if score > best_score:
                best_score, best = score, (x, y)

    if best is None:
        return None
    x, y = best

    # Entry heading: look at what is in the room.
    #
    # Converted here rather than on the web, because the two frames disagree
    # in a way that is easy to get backwards. Blender: +X plan east, +Y plan
    # north. World: X_w = X_b / mpu, Z_w = -Y_b / mpu. The viewer builds its
    # direction as (sin y, cos y) in (X_w, Z_w), so a Blender heading of
    # atan2(dx, dy) becomes atan2(dx, -dy) in the viewer's frame.
    return x, y, solve_heading(room, x, y)


# ------------------------------------------------------------------ headings
#: How wide a lens the 360 viewer opens with, in degrees. The scorer reasons
#: about what would actually be IN the frame, so it has to know.
HEADING_FOV = 74.0
#: Nothing further than this adds to the sense of depth — a 14 m view and a
#: 30 m view read the same through a 74 degree lens.
HEADING_DEPTH_CAP = 14.0


def _ray_to_rect(x, y, dx, dy, x0, x1, y0, y1):
    """Distance from (x, y) along (dx, dy) to the rectangle's boundary."""
    t = 1e9
    if dx > 1e-9:
        t = min(t, (x1 - x) / dx)
    elif dx < -1e-9:
        t = min(t, (x0 - x) / dx)
    if dy > 1e-9:
        t = min(t, (y1 - y) / dy)
    elif dy < -1e-9:
        t = min(t, (y0 - y) / dy)
    return max(0.0, t)


def _ray_to_aabb(x, y, dx, dy, box):
    """Slab test. Distance along the ray to the box, or None if it misses."""
    a0, a1, b0, b1 = box
    tmin, tmax = 0.0, 1e9
    for p, d, lo, hi in ((x, dx, a0, a1), (y, dy, b0, b1)):
        if abs(d) < 1e-9:
            if p < lo or p > hi:
                return None
            continue
        t1, t2 = (lo - p) / d, (hi - p) / d
        if t1 > t2:
            t1, t2 = t2, t1
        tmin = max(tmin, t1)
        tmax = min(tmax, t2)
        if tmin > tmax:
            return None
    return tmin if tmax >= 0 else None


def solve_heading(room, x, y, steps=72):
    """PHASE 9 Part 13 — WHICH WAY A CAPTURE STATION SHOULD FACE.

    Phase 7's rule was "point at the centroid of the furniture", and it is
    right often enough to have survived two phases. It is wrong in the two
    cases that matter most: a room whose furniture stands against one wall
    aims the camera at that wall, and a room with a single object in it aims
    the camera at the object with nothing behind it. Both open the 360 viewer
    on plaster, which is exactly what Part 13 says must not happen.

    So the heading is SCORED rather than derived. Seventy-two candidates, one
    every five degrees, each asked five questions about what would be in the
    frame:

        depth        how far the view runs before a wall or a solid stops it
        openness     how far the walls are to the SIDES of the frame, which is
                     what stops half the picture being a surface 1 m away
        content      furniture inside the lens cone at a readable distance
        openings     a window or a door in the cone: the thing that says this
                     is a room in a building rather than a box
        obstruction  anything solid closer than 1.4 m, which is a penalty and
                     not a subject

    The weights were tuned against the twenty real stations and the frames
    they produce, not in the abstract. The brief is explicit that the
    algorithm may not choose blindly, and it did not: `qa/p9/headings.mjs`
    renders every station from its solved heading and `qa/p9/HEADINGS.md`
    records what the review found.

    Returns a heading in the 360 viewer's own frame, in degrees.
    """
    obs = _obstacles(room)
    subjects = [p for p in room.placed
                if p.floor and p.asset not in STATION_IGNORE]
    half = math.radians(HEADING_FOV / 2)
    cos_half = math.cos(half)
    # Where the room's contents actually are. Phase 7 aimed straight at this
    # and got a wall; the scorer uses it as ONE term among six, so a heading
    # can only win by having the subject in it AND somewhere to look past it.
    if subjects:
        gx = sum(p.x for p in subjects) / len(subjects)
        gy = sum(p.y for p in subjects) / len(subjects)
    else:
        gx, gy = room.cx, room.cy

    best, best_score = None, -1e9
    for i in range(steps):
        a = 2 * math.pi * i / steps
        dx, dy = math.cos(a), math.sin(a)

        wall = _ray_to_rect(x, y, dx, dy, room.x0, room.x1, room.y0, room.y1)
        near = 1e9
        for p, box in zip(
                [q for q in room.placed
                 if q.floor and q.asset not in STATION_IGNORE], obs):
            if p.asset in LOW_SUBJECTS:
                continue          # you see OVER it; it does not end the view
            t = _ray_to_aabb(x, y, dx, dy, box)
            if t is not None:
                near = min(near, t)
        depth = min(wall, near)

        # The two edges of the frame. A corridor looked at along its length
        # still has a wall 1.4 m to each side and that is what makes the
        # picture; a room looked at into its far corner puts its walls a long
        # way off on both sides.
        sides = []
        for s in (-1, 1):
            ea = a + s * half
            sides.append(_ray_to_rect(x, y, math.cos(ea), math.sin(ea),
                                      room.x0, room.x1, room.y0, room.y1))
        openness = min(sides)

        content = 0.0
        blocked = 0.0
        for p in subjects:
            vx, vy = p.x - x, p.y - y
            dist = math.hypot(vx, vy)
            if dist < 1e-6:
                continue
            cos = (vx * dx + vy * dy) / dist
            if cos < cos_half:
                continue
            if dist < 1.4:
                if p.asset in LOW_SUBJECTS:
                    # Foreground, not obstruction: it earns a little, and it
                    # does not veto the direction the room is read from.
                    content += cos * 0.55
                else:
                    blocked += (1.4 - dist) * cos
                continue
            content += cos * max(0.0, 1.0 - (dist - 1.4) / 11.0)

        opening = 0.0
        for ox, oy, kind in room.openings:
            vx, vy = ox - x, oy - y
            dist = math.hypot(vx, vy) or 1e-6
            cos = (vx * dx + vy * dy) / dist
            if cos < cos_half:
                continue
            opening += (1.0 if kind == 'window' else 0.6) * cos

        # How centred the room's own subject is in the frame. A meeting room
        # whose table is at the edge of the picture is a photograph of a wall
        # with a table in the corner of it.
        vx, vy = gx - x, gy - y
        gd = math.hypot(vx, vy)
        aim = ((vx * dx + vy * dy) / gd) if gd > 1e-6 else 0.0

        score = (
            1.85 * min(depth, HEADING_DEPTH_CAP) / HEADING_DEPTH_CAP
            + 0.85 * min(openness, HEADING_DEPTH_CAP) / HEADING_DEPTH_CAP
            + 1.30 * min(content, 3.0) / 3.0
            + 1.10 * max(0.0, aim)
            + 0.65 * min(opening, 2.5) / 2.5
            - 2.20 * blocked
        )
        # A view that ends on a wall inside 2.6 m is not a view of a room.
        if depth < 2.6:
            score -= (2.6 - depth) / 2.6 * 1.4
        if score > best_score:
            best_score, best = score, a

    a = best if best is not None else 0.0
    dx, dy = math.cos(a), math.sin(a)
    # Blender: +X plan east, +Y plan north. World: X_w = X_b / mpu and
    # Z_w = -Y_b / mpu, and the viewer builds its direction as
    # (sin yaw, cos yaw) in (X_w, Z_w) -- so the sign of Y flips.
    yaw = math.degrees(math.atan2(dx, -dy))
    return (yaw + 360.0) % 360.0
