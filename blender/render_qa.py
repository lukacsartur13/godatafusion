"""
QA renders of the environment master.

    blender -b blender/out/godatafusion_environment_master.blend \
            --python blender/render_qa.py

Nine frames: the five interiors the brief calls for, the exterior cutaway,
the plan-from-above, and the two data readings (structure without contents,
plan without structure) that CAPTURE / MEASURE / QUANTIFY are built on.
The last three are rendered from the SAME scene with layers switched off —
which is the point being demonstrated, not a convenience.
"""

import json
import math
import os
import sys

import bpy
from mathutils import Vector

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, 'out', 'renders')

# metres; matches build_environment
EYE = 1.62


def lighting():
    """Daylight plus practicals. Believable, not a showroom."""
    w = bpy.data.worlds.new('W')
    bpy.context.scene.world = w
    w.use_nodes = True
    bg = w.node_tree.nodes['Background']
    bg.inputs[0].default_value = (0.34, 0.40, 0.48, 1.0)
    bg.inputs[1].default_value = 0.55

    sun_data = bpy.data.lights.new('SUN', 'SUN')
    sun_data.energy = 3.1
    sun_data.angle = math.radians(2.2)
    sun_data.color = (1.0, 0.96, 0.90)
    sun = bpy.data.objects.new('SUN', sun_data)
    sun.rotation_euler = (math.radians(52), 0, math.radians(-128))
    bpy.context.scene.collection.objects.link(sun)

    # a soft fill through the cut, so the interior is not lit only by the sun
    fill_data = bpy.data.lights.new('FILL', 'AREA')
    fill_data.energy = 5200
    fill_data.size = 22.0
    fill_data.color = (0.86, 0.90, 1.0)
    fill = bpy.data.objects.new('FILL', fill_data)
    fill.location = (26.0, -22.0, 9.0)
    fill.rotation_euler = (math.radians(64), 0, math.radians(48))
    bpy.context.scene.collection.objects.link(fill)


def camera(name, loc, target, lens=28.0, ortho=None):
    cd = bpy.data.cameras.new(name)
    cd.lens = lens
    cd.clip_start = 0.05
    cd.clip_end = 400
    if ortho:
        cd.type = 'ORTHO'
        cd.ortho_scale = ortho
    ob = bpy.data.objects.new(name, cd)
    ob.location = loc
    d = Vector(target) - Vector(loc)
    ob.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()
    bpy.context.scene.collection.objects.link(ob)
    return ob


def show(names, on):
    for c in bpy.data.collections:
        if c.name in names:
            c.hide_render = not on


def render(cam, path, samples=48):
    sc = bpy.context.scene
    sc.camera = cam
    sc.render.filepath = path
    sc.render.image_settings.file_format = 'PNG'
    sc.eevee.taa_render_samples = samples
    bpy.ops.render.render(write_still=True)


def main():
    os.makedirs(OUT, exist_ok=True)
    sc = bpy.context.scene
    sc.render.engine = 'BLENDER_EEVEE'
    sc.render.resolution_x = 1280
    sc.render.resolution_y = 800
    sc.render.film_transparent = False
    sc.view_settings.view_transform = 'AgX'
    sc.view_settings.look = 'AgX - Base Contrast'
    lighting()

    with open(os.path.join(HERE, 'out', 'build-stats.json')) as fh:
        st = json.load(fh)
    mpu = st['metresPerUnit']
    MX = lambda x: x * mpu
    MY = lambda z: -z * mpu
    CLEAR = st['clearHeight']

    R = st['rooms']

    def pt(rid, fx, fy, z=EYE):
        r = R[rid]
        return (r['x0'] + fx * (r['x1'] - r['x0']),
                r['y0'] + fy * (r['y1'] - r['y0']), z)

    # Interiors: stand in the room, look across it. Fractions are of the
    # room's own box, so these frames survive a change to the plan grid.
    shots = [
        ('01-reception', 'R-11', (0.88, 0.10), (0.30, 0.60), 1.35, 22),
        ('02-meeting',   'R-09', (0.86, 0.14), (0.30, 0.62), 1.30, 22),
        ('03-workspace', 'R-02', (0.12, 0.86), (0.62, 0.30), 1.25, 22),
        ('04-corridor',  'R-08', (0.92, 0.50), (-2.20, 0.50), 1.70, 24),
        ('05-technical', 'R-03', (0.14, 0.88), (0.60, 0.32), 1.35, 22),
    ]
    for name, rid, a, b, tz, lens in shots:
        cam = camera(name, pt(rid, *a), pt(rid, b[0], b[1], tz), lens)
        render(cam, os.path.join(OUT, name))

    # 06 exterior / cutaway — the site's OWN idle camera, converted to metres,
    # so this frame and the homepage hero look at the building from one place.
    floor_y = -0.4939            # world-unit height of the finished floor
    to_m = lambda v: v * mpu
    eye = (to_m(13.2), -to_m(17.6), to_m(9.2 - floor_y))
    aim = (0.0, 0.0, to_m(0.4 - floor_y))
    # Same direction as the homepage idle camera, moved in along its own
    # axis so the cut is legible at QA size. Direction is what carries the
    # same-place claim; distance is a framing decision.
    near = tuple(aim[i] + (eye[i] - aim[i]) * 0.55 for i in range(3))
    cam = camera('06-cutaway', near, aim, 40.0)
    render(cam, os.path.join(OUT, '06-cutaway'))

    # 07 top — the roof comes off, which is what QUANTIFY does to the building
    show({'CEILING'}, False)
    cam = camera('07-top', (0, 0, 160), (0, 0, 0), ortho=42.0)
    render(cam, os.path.join(OUT, '07-top'))

    # 08 MEASURE — the cutaway frame with the contents taken out
    show({'FURNITURE', 'DECOR'}, False)
    show({'CEILING'}, True)
    cam = camera('08-measure', near, aim, 40.0)
    render(cam, os.path.join(OUT, '08-measure'))

    # 09 QUANTIFY — structure alone, read from directly above as a plan
    show({'CEILING', 'GLASS'}, False)
    cam = camera('09-quantify', (0, 0, 160), (0, 0, 0), ortho=42.0)
    render(cam, os.path.join(OUT, '09-quantify'))
    show({'FURNITURE', 'GLASS', 'CEILING', 'DECOR'}, True)
    print('RENDERS ->', OUT)


if __name__ == '__main__':
    main()
