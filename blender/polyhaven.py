"""
External assets: Poly Haven → the master scene.

PHASE 7. Phase 6 authored every object in the building procedurally because
`docs/asset-register.md` recorded "Available: nothing". That conclusion was
wrong: the Poly Haven public API answers, needs no key, and permits
commercial use (see tools/polyhaven/client.mjs for the verified terms). The
downloaded glTFs land in tools/polyhaven/downloads/ and this module brings
the approved ones into the library that `asset_loader.build_library`
realises.

THREE RULES, and they are what keep Phase 6's same-place system intact:

  1. An imported asset REPLACES A LIBRARY ENTRY. It never adds a new one,
     never moves a wall and never changes a room's footprint. The layout
     engine still lays out `meeting_chair`; only the mesh behind that name
     changed. That is why QUANTIFY cannot drift.

  2. Every import is fitted to the FOOTPRINT the layout engine already
     reserved, by UNIFORM scale. A chair authored 40 mm wider than the
     procedural one it replaces would otherwise silently invalidate every
     clearance the Phase 6 layout solved.

  3. Its MATERIALS SURVIVE. The whole point of the exercise is the textures;
     rebuilding them as flat palette colours here would repeat exactly the
     mistake Part 07 of the brief exists to correct.

Orientation: glTF is Y-up, Blender is Z-up, and the importer's conversion
leaves each asset facing whichever way its author modelled it. `YAW` below
is per-asset and was set by looking at blender/out/renders/assets.png, not
by guessing.
"""

import math
import os
import sys

TAU = math.pi * 2

import bpy

HERE = os.path.dirname(os.path.abspath(__file__))
DOWNLOADS = os.path.abspath(os.path.join(HERE, '..', 'tools', 'polyhaven', 'downloads'))

if HERE not in sys.path:
    sys.path.insert(0, HERE)


#: slug → how the imported asset is brought into the library.
#:
#:   replaces  the library entry whose mesh this becomes
#:   tris      decimation target. Chosen per asset from how many pixels it
#:             actually occupies AND from how many of it there are, not as a
#:             fixed ratio.
#:
#:             PHASE 8 RE-COSTED EVERY ONE OF THESE. The Phase 7 targets were
#:             chosen against a single storey: twelve pendants, four plants,
#:             eight meeting chairs. Three floors put 38 pendants, 11 plants
#:             and 20 meeting chairs in the same frame, and the same targets
#:             would have spent 149 k triangles on the contents alone — most
#:             of a 180 k budget on chairs. The globe went 520 → 240, the
#:             plant 3200 → 1400, the meeting chair 1250 → 800. None of them
#:             is visibly different at the distance the hero looks at them
#:             from, which is the test that decides these numbers.
#:   yaw       degrees about Z to bring the asset's front to +Y
#:   fit       'footprint' scales uniformly until the XY box fits inside
#:             FOOTPRINT — the layout is then guaranteed unchanged;
#:             'width' matches the reserved WIDTH and lets the true depth
#:             stand, which is right when the Phase 6 stand-in was thinner
#:             than any real object of that kind (it re-registers the
#:             footprint so the layout validator still sees the truth);
#:             'height' matches the procedural asset's height
#:   origin    'floor' (default) or 'ceiling', for things that hang
#:   stem      metres of suspension to add below the soffit, so a 0.95 m
#:             fixture still reads as a pendant under a 4.3 m slab
#:   tex       texture edge length this asset's maps are packed to
#:   drop_maps map suffixes to discard — a normal map on an object that
#:             occupies twenty pixels is pure download (Part 08)
#: `potted_plant_04` was downloaded and rejected: at 268 mm it is a desk
#: succulent, and the only places it could go are the credenza tops the brief
#: explicitly says not to decorate. Kept in the register as a considered
#: candidate rather than deleted, so the choice is auditable.
IMPORTS = {
    'dining_chair_02': dict(
        replaces='meeting_chair', tris=800, yaw=180, fit='footprint', tex=512,
        note='The only contemporary chair in the library. Tufted leather, '
             'dark timber legs; restrained enough for a boardroom.'),
    'modern_arm_chair_01': dict(
        replaces='lounge_chair', tris=1200, yaw=180, fit='footprint', tex=512,
        note='Light timber frame, dark leather cushions. Reception and lounge '
             'are the interiors the spatial views actually show.'),
    'side_table_01': dict(
        replaces='side_table', tris=900, yaw=0, fit='footprint', tex=256,
        drop_maps=('nor',),
        note='Minimalist oak side table; sits between the two lounge chairs.'),
    'steel_frame_shelves_03': dict(
        replaces='shelving', tris=1100, yaw=0, fit='width', tex=256,
        drop_maps=('nor',),
        note='Black steel frame, warm timber shelves. Against the workspace '
             'north wall.'),
    'modern_ceiling_lamp_01': dict(
        replaces='pendant', tris=240, yaw=0, fit='footprint', tex=256,
        origin='ceiling', stem=1.42,
        drop_maps=('nor',),
        note='Frosted globe on a slim stem. THIRTY-EIGHT instances across '
             'three floors — the single most-repeated object in the '
             'building, so the cheapest.'),
    'potted_plant_02': dict(
        replaces='plant', tris=1400, yaw=0, fit='footprint', tex=256,
        note='Leaf geometry rather than alpha cards, which is why it costs '
             'more than everything else per instance and why there are only '
             'eleven in a building with thirty-one rooms.'),
}

#: Assets whose emissive character must be re-established after import: the
#: pendant's glass globe is a LIGHT in this building, and an imported
#: frosted-glass material is not emissive.
EMISSIVE_HINT = {
    'modern_ceiling_lamp_01': ('glass', (0.960, 0.918, 0.842), 3.0),
}


def available():
    """Slugs whose download is actually on disk. The build must still run on
    a machine that has never fetched an asset — the procedural library is the
    fallback, exactly as the Phase 6 scene was."""
    out = {}
    for slug, spec in IMPORTS.items():
        path = os.path.join(DOWNLOADS, slug, f'{slug}.gltf')
        if os.path.exists(path):
            out[slug] = spec
    return out


def _import_gltf(path):
    """Import and return the objects that arrived, with transforms applied."""
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=path)
    fresh = [o for o in bpy.data.objects if o not in before]
    meshes = [o for o in fresh if o.type == 'MESH']
    for ob in meshes:
        ob.matrix_world = ob.matrix_world.copy()
    return fresh, meshes


def _bake_transforms(meshes):
    """Bake each object's world matrix into its vertices. Done by hand rather
    than through bpy.ops.object.transform_apply, which needs a UI context
    that does not exist in background mode."""
    for ob in meshes:
        mw = ob.matrix_world.copy()
        ob.data.transform(mw)
        ob.matrix_world.identity()


def _join(meshes, name):
    """One object out of many, preserving material slots."""
    import bmesh
    keep = meshes[0]
    bm = bmesh.new()
    slots = []

    def slot(mat):
        if mat is None:
            mat = bpy.data.materials.get('MAT_CONCRETE')
        if mat not in slots:
            slots.append(mat)
        return slots.index(mat)

    for ob in meshes:
        me = ob.data
        remap = [slot(m) for m in (me.materials or [None])]
        tmp = bmesh.new()
        tmp.from_mesh(me)
        layer_uv_src = tmp.loops.layers.uv.active
        # carry UVs across; without them every imported texture is wasted
        dst_uv = bm.loops.layers.uv.get('UVMap') or bm.loops.layers.uv.new('UVMap')
        vmap = {}
        for v in tmp.verts:
            vmap[v.index] = bm.verts.new(v.co)
        bm.verts.ensure_lookup_table()
        for f in tmp.faces:
            try:
                nf = bm.faces.new([vmap[v.index] for v in f.verts])
            except ValueError:
                continue
            nf.material_index = remap[min(f.material_index, len(remap) - 1)]
            nf.smooth = f.smooth
            if layer_uv_src:
                for lsrc, ldst in zip(f.loops, nf.loops):
                    ldst[dst_uv].uv = lsrc[layer_uv_src].uv
        tmp.free()

    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    for m in slots:
        me.materials.append(m)
    ob = bpy.data.objects.new(name, me)
    return ob


def _tris(ob):
    return sum(len(p.vertices) - 2 for p in ob.data.polygons)


def _decimate(ob, target):
    """Collapse to a triangle budget. `target` is a COUNT, not a ratio, so
    the budget is stated in the units Part 21 argues in."""
    have = _tris(ob)
    if have <= target:
        return have, have
    m = ob.modifiers.new('dec', 'DECIMATE')
    m.decimate_type = 'COLLAPSE'
    m.ratio = max(0.01, target / have)
    m.use_collapse_triangulate = True
    dg = bpy.context.evaluated_depsgraph_get()
    baked = bpy.data.meshes.new_from_object(ob.evaluated_get(dg))
    baked.name = ob.data.name + '_dec'
    old = ob.data
    ob.modifiers.clear()
    ob.data = baked
    if old.users == 0:
        bpy.data.meshes.remove(old)
    return have, _tris(ob)


def _normalise(ob, spec, footprint, ref_height=None):
    """Bring an imported asset onto the library's authoring convention:
    origin at floor level (or at the soffit for things that hang), centred on
    its own footprint, +Y front, and scaled to the slot the layout engine
    already reserved.

    Returns (scale, true_footprint). A 'width' fit hands back the object's
    REAL plan extent so the caller can re-register it — the alternative is a
    validator that believes a 0.72 m deep shelf is 0.40 m deep, which is how
    furniture ends up inside a wall."""
    from mathutils import Matrix

    yaw_deg = spec.get('yaw', 0)
    if yaw_deg:
        ob.data.transform(Matrix.Rotation(math.radians(yaw_deg), 4, 'Z'))

    def box():
        xs = [v.co.x for v in ob.data.vertices]
        ys = [v.co.y for v in ob.data.vertices]
        zs = [v.co.z for v in ob.data.vertices]
        return (min(xs), max(xs), min(ys), max(ys), min(zs), max(zs))

    x0, x1, y0, y1, z0, z1 = box()
    w, d, h = x1 - x0, y1 - y0, z1 - z0
    fw, fd = footprint
    fit = spec.get('fit', 'footprint')

    if fit == 'height' and ref_height:
        k = ref_height / h if h > 1e-6 else 1.0
    elif fit == 'width':
        k = fw / w if w > 1e-6 else 1.0
    else:
        # UNIFORM: a chair squashed on one axis to hit a footprint is a
        # worse lie than a chair 3% narrower than its slot.
        k = min(fw / w if w > 1e-6 else 1.0, fd / d if d > 1e-6 else 1.0)
    ob.data.transform(Matrix.Scale(k, 4))

    x0, x1, y0, y1, z0, z1 = box()
    cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
    if spec.get('origin') == 'ceiling':
        # hangs: origin at the soffit, body pushed down by the suspension
        drop = spec.get('stem', 0.0)
        ob.data.transform(Matrix.Translation((-cx, -cy, -z1 - drop)))
        if drop > 0:
            _add_stem(ob, drop)
    else:
        ob.data.transform(Matrix.Translation((-cx, -cy, -z0)))

    x0, x1, y0, y1, _, _ = box()
    return k, (round(x1 - x0, 3), round(y1 - y0, 3))


def _add_stem(ob, drop, radius=0.008):
    """A suspension rod from the soffit down to the imported fixture. Poly
    Haven's lamp is modelled for a domestic ceiling; this building's soffit is
    at 4.32 m, and a fixture floating 3.5 m up is not a pendant. The rod is
    ours; the fixture is theirs, and the register says so."""
    import bmesh
    bm = bmesh.new()
    bm.from_mesh(ob.data)
    uv = bm.loops.layers.uv.active or bm.loops.layers.uv.new('UVMap')
    seg = 4
    rings = []
    for z in (0.0, -drop):
        ring = [bm.verts.new((math.cos(TAU * i / seg) * radius,
                              math.sin(TAU * i / seg) * radius, z))
                for i in range(seg)]
        rings.append(ring)
    bm.verts.ensure_lookup_table()
    for i in range(seg):
        j = (i + 1) % seg
        try:
            f = bm.faces.new((rings[0][i], rings[0][j], rings[1][j], rings[1][i]))
        except ValueError:
            continue
        f.material_index = 0
        for n, loop in enumerate(f.loops):
            loop[uv].uv = (n / 4.0, 0.0)
    bm.to_mesh(ob.data)
    bm.free()
    ob.data.update()


def _tag_materials(ob, slug, spec):
    """Rename the imported materials into the register's namespace and record
    what the web pipeline needs to know about each one."""
    for mat in ob.data.materials:
        if mat is None:
            continue
        if not mat.name.startswith('PH_'):
            mat.name = f'PH_{slug}__{mat.name}'
        mat['gdf_source'] = slug
        mat['gdf_tex'] = spec.get('tex', 512)
        mat['gdf_drop_maps'] = ','.join(spec.get('drop_maps', ()))
    hint = EMISSIVE_HINT.get(slug)
    if not hint:
        return
    needle, rgb, strength = hint
    for mat in ob.data.materials:
        if mat is None or needle not in mat.name.lower():
            continue
        bsdf = next((n for n in mat.node_tree.nodes if n.type == 'BSDF_PRINCIPLED'), None)
        if not bsdf:
            continue
        bsdf.inputs['Emission Color'].default_value = (*rgb, 1.0)
        bsdf.inputs['Emission Strength'].default_value = strength
        mat['gdf_emissive'] = strength


def load(slug, spec, col, footprint, ref_height=None):
    """Import one approved asset and return the library object for it."""
    path = os.path.join(DOWNLOADS, slug, f'{slug}.gltf')
    fresh, meshes = _import_gltf(path)
    if not meshes:
        for ob in fresh:
            bpy.data.objects.remove(ob, do_unlink=True)
        raise RuntimeError(f'{slug}: glTF contained no mesh')

    _bake_transforms(meshes)
    ob = _join(meshes, f'MESH_{spec["replaces"]}')
    col.objects.link(ob)
    for o in fresh:
        bpy.data.objects.remove(o, do_unlink=True)

    src_tris, dec_tris = _decimate(ob, spec['tris'])
    scale, true_fp = _normalise(ob, spec, footprint, ref_height)
    ob.data.shade_smooth()
    #: the imported UV layout is the asset's own; box_uv must not overwrite it
    ob.data['gdf_uv'] = 'asset'
    _tag_materials(ob, slug, spec)
    ob.name = f'ASSET_{spec["replaces"]}'
    ob['gdf_polyhaven'] = slug
    ob.hide_render = True
    ob.hide_viewport = True

    return ob, dict(slug=slug, replaces=spec['replaces'], sourceTris=src_tris,
                    webTris=dec_tris, scale=round(scale, 4),
                    footprint=true_fp,
                    refits=spec.get('fit', 'footprint') == 'width',
                    materials=[m.name for m in ob.data.materials if m],
                    tex=spec.get('tex', 512),
                    dropMaps=list(spec.get('drop_maps', ())))
