"""
The asset library.

PHASE 7 — six entries below are now overridden by a real Poly Haven asset
(see blender/polyhaven.py); the rest stay procedural, because the library
genuinely has no contemporary office task chair, no clean workstation desk
and no conference table. Where an override exists, the procedural builder is
still what is called on a machine with no downloads, so a checkout with an
empty tools/polyhaven/downloads/ builds the Phase 6 environment unchanged.

Everything not overridden is authored here, procedurally, at a budget
chosen per object rather than decimated down from someone else's model.

Authoring convention for every asset:
  * origin at FLOOR level, horizontally centred on the object's footprint
  * +Y is the front — the way a chair faces, the side a desk is used from
  * dimensions are real millimetres-honest metres, so the QA renders can be
    checked against a tape measure rather than against taste

Each builder returns a `Part`. FOOTPRINT gives the (x, y) extent used for
collision and clearance testing; CLEARANCE gives the extra depth in front of
an object that must stay free (a chair pulled out, a cabinet door opened).
"""

import math

import bpy

from lib_mesh import Part, xf

TAU = math.pi * 2

#: (width X, depth Y) in metres — the box the layout engine reserves.
FOOTPRINT = {
    'office_chair':   (0.66, 0.66),  'meeting_chair': (0.52, 0.56),
    'lounge_chair':   (0.78, 0.80),  'desk':          (1.60, 0.75),
    'meeting_table':  (3.20, 1.20),  'plan_table':    (2.40, 1.10),
    'side_table':     (0.56, 0.56),  'credenza':      (1.80, 0.46),
    'shelving':       (2.40, 0.40),  'monitor':       (0.62, 0.20),
    'wall_screen':    (1.66, 0.08),  'reception_desk': (3.32, 1.00),
    'pendant':        (0.36, 0.36),  'floor_lamp':    (0.42, 0.42),
    'ceiling_line':   (2.60, 0.11),
    'plant':          (0.60, 0.60),  'equipment_case': (0.82, 0.52),
    'tripod':         (0.70, 0.70),  'plan_frame':    (1.20, 0.06),
    'acoustic':       (1.20, 0.05),  'signage':       (2.20, 0.06),
    'formwork_stack': (2.40, 1.00),  'trestle':       (1.10, 0.62),
}

#: Depth in front (+Y) that must stay clear for the object to be usable.
CLEARANCE = {
    'desk': 0.85, 'credenza': 0.75, 'shelving': 0.80,
    'reception_desk': 0.90, 'plan_table': 0.70, 'equipment_case': 0.60,
}


# ============================================================
# seating
# ============================================================

def office_chair():
    """Task chair. Five-star base, gas column, upholstered shell."""
    p = Part('MESH_office_chair')
    # five-star base — thin tapered arms rather than a modelled spider
    for i in range(5):
        a = TAU * i / 5
        with p.at(xf(loc=(0, 0, 0.035), rz=a)):
            p.box((0, 0.155, 0), (0.055, 0.31, 0.045), 'MAT_METAL')
            p.cyl((0, 0.305, -0.012), 0.026, 0.05, 'MAT_METAL', seg=6)
    p.cyl((0, 0, 0.20), 0.042, 0.33, 'MAT_METAL', seg=8)
    p.cyl((0, 0, 0.375), 0.10, 0.05, 'MAT_METAL', seg=8)
    # seat pan
    p.box((0, 0.01, 0.435), (0.48, 0.46, 0.085), 'MAT_FABRIC_DARK')
    p.box((0, 0.01, 0.392), (0.44, 0.42, 0.02), 'MAT_METAL', faces=('bottom',))
    # back — tilted 8 degrees off vertical
    with p.at(xf(loc=(0, -0.20, 0.48), rx=math.radians(8))):
        p.box((0, 0, 0.27), (0.45, 0.065, 0.50), 'MAT_FABRIC_DARK')
        p.box((0, 0.04, 0.03), (0.09, 0.06, 0.14), 'MAT_METAL')
    # arms
    for s in (-1, 1):
        p.box((s * 0.265, 0.01, 0.60), (0.045, 0.30, 0.035), 'MAT_METAL')
        p.box((s * 0.265, -0.11, 0.52), (0.04, 0.05, 0.19), 'MAT_METAL')
    return p


def meeting_chair():
    """Four-leg stacking chair — deliberately simpler than the task chair."""
    p = Part('MESH_meeting_chair')
    for sx in (-1, 1):
        for sy in (-1, 1):
            p.box((sx * 0.205, sy * 0.195, 0.225), (0.035, 0.035, 0.45), 'MAT_METAL')
    p.box((0, 0, 0.465), (0.47, 0.45, 0.055), 'MAT_FABRIC_LIGHT')
    with p.at(xf(loc=(0, -0.195, 0.49), rx=math.radians(11))):
        p.box((0, 0, 0.24), (0.44, 0.05, 0.42), 'MAT_FABRIC_LIGHT')
    # stretcher rails, front and side — what makes it read as a real chair
    for sy in (-1, 1):
        p.box((0, sy * 0.195, 0.13), (0.40, 0.028, 0.028), 'MAT_METAL')
    return p


def lounge_chair():
    """Low armchair for reception and lounge."""
    p = Part('MESH_lounge_chair')
    for sx in (-1, 1):
        for sy in (-1, 1):
            p.box((sx * 0.30, sy * 0.305, 0.10), (0.04, 0.04, 0.20), 'MAT_OAK')
    p.box((0, 0, 0.245), (0.72, 0.70, 0.13), 'MAT_FABRIC_LIGHT')
    with p.at(xf(loc=(0, -0.30, 0.30), rx=math.radians(15))):
        p.box((0, 0, 0.21), (0.72, 0.10, 0.42), 'MAT_FABRIC_LIGHT')
    for sx in (-1, 1):
        p.box((sx * 0.335, -0.03, 0.375), (0.07, 0.62, 0.13), 'MAT_OAK')
    return p


# ============================================================
# tables and desks
# ============================================================

def desk(width=1.60, depth=0.75):
    p = Part('MESH_desk')
    p.box((0, 0, 0.715), (width, depth, 0.032), 'MAT_OAK')
    for sx in (-1, 1):
        p.box((sx * (width / 2 - 0.09), 0, 0.35), (0.035, depth - 0.10, 0.70), 'MAT_METAL')
        p.box((sx * (width / 2 - 0.09), 0, 0.018), (0.06, depth - 0.06, 0.035), 'MAT_METAL')
    # cable tray — small, but it is the detail that says "workplace"
    p.box((0, -depth / 2 + 0.12, 0.645), (width - 0.40, 0.10, 0.07), 'MAT_METAL')
    return p


def meeting_table(length=3.20, width=1.20):
    p = Part('MESH_meeting_table')
    p.box((0, 0, 0.725), (length, width, 0.045), 'MAT_OAK')
    for sx in (-1, 1):
        x = sx * (length / 2 - 0.45)
        p.box((x, 0, 0.35), (0.06, width - 0.30, 0.70), 'MAT_METAL')
        p.box((x, 0, 0.025), (0.10, width - 0.16, 0.05), 'MAT_METAL')
    p.box((0, 0, 0.60), (length - 1.05, 0.09, 0.09), 'MAT_METAL')
    return p


def plan_table(length=2.40, width=1.10):
    """Standing-height plan table — the centre of the technical room."""
    p = Part('MESH_plan_table')
    p.box((0, 0, 0.935), (length, width, 0.038), 'MAT_OAK')
    for sx in (-1, 1):
        for sy in (-1, 1):
            p.box((sx * (length / 2 - 0.10), sy * (width / 2 - 0.10), 0.458),
                  (0.05, 0.05, 0.915), 'MAT_METAL')
    for sy in (-1, 1):
        p.box((0, sy * (width / 2 - 0.10), 0.22), (length - 0.20, 0.03, 0.03), 'MAT_METAL')
    # a rolled drawing and a flat sheet — abstract, no legible content
    p.cyl((0.62, 0.20, 0.985), 0.038, 0.86, 'MAT_FABRIC_LIGHT', seg=8, r_top=0.038)
    p.plate((-0.45, -0.05, 0.956), (0.84, 0.60, 0), 'MAT_FABRIC_LIGHT')
    return p


def side_table():
    p = Part('MESH_side_table')
    p.cyl((0, 0, 0.015), 0.20, 0.03, 'MAT_METAL', seg=10)
    p.cyl((0, 0, 0.215), 0.028, 0.40, 'MAT_METAL', seg=8)
    p.cyl((0, 0, 0.428), 0.27, 0.026, 'MAT_OAK', seg=14)
    return p


# ============================================================
# storage
# ============================================================

def credenza(width=1.80):
    p = Part('MESH_credenza')
    p.box((0, 0, 0.415), (width, 0.44, 0.61), 'MAT_OAK')
    p.box((0, 0, 0.055), (width - 0.12, 0.38, 0.11), 'MAT_METAL')
    p.box((0, 0, 0.732), (width + 0.03, 0.47, 0.024), 'MAT_OAK')
    # door reveals — two plates, no geometry cost worth speaking of
    for sx in (-1, 1):
        p.plate((sx * width / 4, -0.222, 0.415), (width / 2 - 0.03, 0.50, 0), 'MAT_METAL', axis='y')
    return p


def shelving(width=2.40, height=1.85):
    p = Part('MESH_shelving')
    for sx in (-1, 1):
        p.box((sx * (width / 2 - 0.015), 0, height / 2), (0.03, 0.38, height), 'MAT_METAL')
    for i in range(4):
        z = 0.34 + i * 0.47
        p.box((0, 0, z), (width - 0.06, 0.38, 0.026), 'MAT_OAK')
    p.box((0, 0, 0.012), (width, 0.38, 0.024), 'MAT_METAL')
    p.plate((0, 0.19, height / 2), (width - 0.06, 0, height - 0.05), 'MAT_FABRIC_DARK', axis='y')
    return p


def equipment_case():
    p = Part('MESH_equipment_case')
    p.box((0, 0, 0.29), (0.80, 0.50, 0.58), 'MAT_FABRIC_DARK')
    for sx in (-1, 1):
        for sy in (-1, 1):
            p.box((sx * 0.385, sy * 0.235, 0.29), (0.035, 0.035, 0.58), 'MAT_METAL')
    p.box((0, -0.26, 0.46), (0.24, 0.03, 0.05), 'MAT_METAL')
    return p


# ============================================================
# screens and displays
# ============================================================

def monitor():
    p = Part('MESH_monitor')
    p.box((0, 0, 0.015), (0.24, 0.18, 0.03), 'MAT_METAL')
    p.box((0, 0.01, 0.135), (0.05, 0.05, 0.21), 'MAT_METAL')
    with p.at(xf(loc=(0, 0, 0.42), rx=math.radians(-4))):
        p.box((0, 0.012, 0), (0.62, 0.024, 0.37), 'MAT_METAL')
        p.plate((0, -0.002, 0), (0.585, 0, 0.335), 'MAT_SCREEN', axis='y')
    return p


def wall_screen(width=1.66, height=0.95):
    """Wall-mounted presentation display. Origin at the WALL face, +Y into
    the room, so `wall_mounted` placement needs no per-asset offset."""
    p = Part('MESH_wall_screen')
    p.box((0, 0.035, 0), (width, 0.07, height), 'MAT_METAL')
    p.plate((0, 0.072, 0), (width - 0.045, 0, height - 0.045), 'MAT_SCREEN', axis='y')
    return p


def signage():
    """Abstract company wall. Blocks, not words — there is no fake client
    name anywhere in this environment and no legible text at all."""
    p = Part('MESH_signage')
    p.plate((0, 0.02, 0), (2.20, 0, 0.70), 'MAT_WALL', axis='y')
    for i, (w, x) in enumerate(((0.34, -0.78), (0.22, -0.36), (0.46, 0.08), (0.18, 0.46))):
        p.box((x, 0.035, 0.0), (w, 0.03, 0.20), 'MAT_METAL')
    return p


def plan_frame():
    """Framed technical drawing. Deliberately abstract line blocks."""
    p = Part('MESH_plan_frame')
    p.box((0, 0.015, 0), (1.20, 0.03, 0.85), 'MAT_METAL')
    p.plate((0, 0.034, 0), (1.14, 0, 0.79), 'MAT_FABRIC_LIGHT', axis='y')
    return p


def acoustic():
    p = Part('MESH_acoustic')
    p.box((0, 0.025, 0), (1.20, 0.05, 0.60), 'MAT_FABRIC_DARK')
    return p


# ============================================================
# reception
# ============================================================

def reception_desk():
    p = Part('MESH_reception_desk')
    p.box((0, 0, 0.545), (3.20, 0.78, 1.09), 'MAT_OAK')
    p.box((0, 0, 1.115), (3.32, 0.88, 0.05), 'MAT_OAK')
    p.box((0, 0, 0.055), (3.04, 0.66, 0.11), 'MAT_METAL')
    # return leg, so it reads as a counter you stand behind rather than a slab
    p.box((-1.42, -0.72, 0.36), (0.36, 0.72, 0.72), 'MAT_OAK')
    p.box((-1.42, -0.72, 0.735), (0.44, 0.80, 0.032), 'MAT_OAK')
    p.plate((0, 0.392, 0.545), (3.08, 0, 0.98), 'MAT_METAL', axis='y')
    return p


# ============================================================
# lighting
# ============================================================

def pendant(drop=1.55):
    """Ceiling pendant. `drop` is measured from the soffit; the emissive disc
    is what gives the interior practical light in a flat-shaded scene."""
    p = Part('MESH_pendant')
    p.cyl((0, 0, -drop / 2), 0.008, drop, 'MAT_METAL', seg=4, cap=False)
    p.cyl((0, 0, -drop - 0.11), 0.175, 0.22, 'MAT_METAL', seg=12, r_top=0.075)
    p.cyl((0, 0, -drop - 0.222), 0.168, 0.012, 'MAT_LIGHT', seg=12)
    return p


def ceiling_line(length=2.60):
    """Surface linear luminaire for the circulation spine. A pendant is a
    room light; a 34 m spine wants a line, and the emissive strip is what
    makes the middle of the building read as lit from the site's camera.
    """
    p = Part('MESH_ceiling_line')
    p.box((0, 0, -0.06), (length, 0.11, 0.12), 'MAT_METAL')
    p.box((0, 0, -0.126), (length - 0.06, 0.085, 0.012), 'MAT_LIGHT')
    return p


def floor_lamp():
    p = Part('MESH_floor_lamp')
    p.cyl((0, 0, 0.012), 0.19, 0.024, 'MAT_METAL', seg=12)
    p.cyl((0, 0, 0.76), 0.016, 1.50, 'MAT_METAL', seg=6)
    p.cyl((0, 0, 1.62), 0.20, 0.24, 'MAT_METAL', seg=12, r_top=0.145)
    p.cyl((0, 0, 1.502), 0.185, 0.012, 'MAT_LIGHT', seg=12)
    return p


# ============================================================
# greenery and site equipment
# ============================================================

def plant():
    """Pot plant. Blades rather than modelled foliage: from the site's camera
    distances a leaf is one pixel, and a sculpted ficus is 40k wasted triangles."""
    p = Part('MESH_plant')
    p.cyl((0, 0, 0.21), 0.19, 0.42, 'MAT_CONCRETE', seg=12, r_top=0.225)
    p.cyl((0, 0, 0.41), 0.20, 0.03, 'MAT_FABRIC_DARK', seg=10)
    blades = ((0.00, 0.40, 1.06), (0.62, 0.28, 0.88), (1.20, 0.46, 0.96),
              (1.85, 0.24, 0.72), (2.44, 0.38, 1.00), (3.02, 0.30, 0.82),
              (3.66, 0.44, 0.90), (4.25, 0.26, 0.68), (4.86, 0.36, 0.98),
              (5.42, 0.32, 0.78), (5.92, 0.22, 0.62))
    for a, lean, h in blades:
        with p.at(xf(loc=(0, 0, 0.40), rz=a, rx=-lean)):
            p.box((0, 0.06, h / 2), (0.105, 0.014, h), 'MAT_PLANT')
            with p.at(xf(loc=(0, 0.06, h), rx=-0.55)):
                p.box((0, 0.11, 0.02), (0.17, 0.26, 0.012), 'MAT_PLANT')
    return p


def tripod():
    """Capture-equipment silhouette. Reads as a survey instrument; it is not
    a model of any actual product."""
    p = Part('MESH_tripod')
    for i in range(3):
        with p.at(xf(rz=TAU * i / 3)):
            with p.at(xf(loc=(0, 0.03, 1.02), rx=math.radians(15))):
                p.box((0, 0.24, -0.51), (0.035, 0.035, 1.05), 'MAT_METAL')
    p.cyl((0, 0, 1.10), 0.045, 0.20, 'MAT_METAL', seg=8)
    p.box((0, 0, 1.26), (0.16, 0.16, 0.12), 'MAT_METAL')
    p.box((0, 0, 1.38), (0.11, 0.11, 0.13), 'MAT_FABRIC_DARK')
    p.cyl((0, 0, 1.455), 0.048, 0.05, 'MAT_SCREEN', seg=10)
    return p


# ============================================================
# the raw construction zone
# ============================================================

def formwork_stack():
    p = Part('MESH_formwork_stack')
    for i in range(5):
        p.box((0.02 * i, 0.015 * i, 0.033 + i * 0.062), (2.36, 0.96, 0.058), 'MAT_OAK')
    return p


def trestle():
    p = Part('MESH_trestle')
    for sy in (-1, 1):
        for sx in (-1, 1):
            with p.at(xf(loc=(sx * 0.44, sy * 0.26, 0), ry=-sx * 0.20)):
                p.box((0, 0, 0.39), (0.05, 0.05, 0.78), 'MAT_METAL')
    p.box((0, 0, 0.80), (1.06, 0.10, 0.06), 'MAT_METAL')
    return p


# ============================================================

BUILDERS = {
    'office_chair': office_chair, 'meeting_chair': meeting_chair,
    'lounge_chair': lounge_chair, 'desk': desk, 'meeting_table': meeting_table,
    'plan_table': plan_table, 'side_table': side_table, 'credenza': credenza,
    'shelving': shelving, 'monitor': monitor, 'wall_screen': wall_screen,
    'signage': signage, 'plan_frame': plan_frame, 'acoustic': acoustic,
    'reception_desk': reception_desk, 'pendant': pendant,
    'floor_lamp': floor_lamp, 'plant': plant, 'tripod': tripod,
    'ceiling_line': ceiling_line,
    'equipment_case': equipment_case, 'formwork_stack': formwork_stack,
    'trestle': trestle,
}


def bevel(ob, width=0.008, segments=1, angle=40.0):
    """Apply a single-segment chamfer and bake it in.

    Nine thousand triangles is a twentieth of the phase's budget, so the
    cheapest available quality is spending a little of it on arrises: a flat
    box catches no light along its edges and reads as a placeholder, and one
    bevel segment is the difference between a block and a made object.
    """
    import bpy
    m = ob.modifiers.new('bevel', 'BEVEL')
    m.width = width
    m.segments = segments
    m.limit_method = 'ANGLE'
    m.angle_limit = angle * 3.14159265 / 180.0
    m.harden_normals = False
    dg = bpy.context.evaluated_depsgraph_get()
    baked = bpy.data.meshes.new_from_object(ob.evaluated_get(dg))
    baked.name = ob.data.name + '_bev'
    old = ob.data
    ob.modifiers.clear()
    ob.data = baked
    if old.users == 0:
        bpy.data.meshes.remove(old)
    return ob


def build_library(materials, col, variants=None, external=True):
    """Realise one master object per asset type (plus any parameter variants).
    Everything placed in a room is a LINKED DUPLICATE of one of these, which
    is what makes the instancing claim true all the way to the GLB.

    `external` brings in the approved Poly Haven replacements. The imported
    mesh takes over the library ENTRY — same name, same footprint, same
    layout — so nothing downstream of here can tell the difference, and the
    plan QUANTIFY reads is untouched. Returns (lib, report)."""
    import polyhaven

    swaps = polyhaven.available() if external else {}
    by_entry = {spec['replaces']: (slug, spec) for slug, spec in swaps.items()}
    report = []

    lib = {}
    for name, fn in BUILDERS.items():
        part = fn()
        ob = part.to_object(materials, col)
        ob.name = f'ASSET_{name}'
        bevel(ob)
        ob.hide_render = True
        ob.hide_viewport = True
        lib[name] = ob

        if name not in by_entry:
            continue
        slug, spec = by_entry[name]
        # the procedural asset's own height is the reference a 'height' fit
        # matches, so a pendant keeps hanging exactly where it hung
        zs = [v.co.z for v in ob.data.vertices]
        ref_h = max(zs) - min(zs) if zs else None
        try:
            imported, rec = polyhaven.load(slug, spec, col, FOOTPRINT[name], ref_h)
        except Exception as err:                      # noqa: BLE001
            print(f'  ! {slug} failed to import ({err}); keeping procedural')
            report.append(dict(slug=slug, replaces=name, failed=str(err)))
            continue
        rec['proceduralTris'] = sum(len(pp.vertices) - 2 for pp in ob.data.polygons)
        bpy.data.objects.remove(ob, do_unlink=True)
        lib[name] = imported
        # A 'width' fit keeps the reserved WIDTH and takes the object's real
        # depth. The layout validator has to be told, or it will happily push
        # a 0.72 m deep shelf through a wall it thinks is 0.32 m away.
        if rec.get('refits') and rec.get('footprint'):
            FOOTPRINT[name] = tuple(rec['footprint'])
        report.append(rec)
    for key, spec in (variants or {}).items():
        base, kwargs = spec[0], spec[1]
        part = BUILDERS[base](**kwargs)
        part.name = f'MESH_{key}'
        ob = part.to_object(materials, col)
        ob.name = f'ASSET_{key}'
        bevel(ob)
        ob.hide_render = True
        ob.hide_viewport = True
        lib[key] = ob
        FOOTPRINT[key] = spec[2] if len(spec) > 2 else FOOTPRINT[base]
        if base in CLEARANCE:
            CLEARANCE.setdefault(key, CLEARANCE[base])
    return lib, report
