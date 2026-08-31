"""
Master → web staging.

The master scene is authored for legibility: one object per semantic thing,
in metres, at the origin. The web scene is authored for the GPU: as few
draw calls as the layer architecture allows, in the site's world units, at
the site's world position.

Nothing here decimates. The geometry was authored to budget in the first
place, so optimisation is about DRAW CALLS and PLACEMENT, not triangles:

  * structure merges to one mesh, ceiling to a second, glass to a third —
    they are the three things the service modes switch independently
  * furniture stays as linked duplicates so the exporter can write them as
    EXT_mesh_gpu_instancing and Three.js can read them as InstancedMesh
  * duplicate vertices are welded, which is free and shrinks the buffers
  * everything is parented to one root carrying the metres → world-units
    scale and the podium floor offset, so the GLB drops in at identity
"""

import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
if HERE not in sys.path:
    sys.path.insert(0, HERE)

import bpy
import bmesh

from lib_mesh import Part, collection

#: The excavated building pad, in the site's world units. L00's finished
#: floor is this plus the structural slab — the same BASE_Y the level model
#: computes in src/webgl/levels.js, and the reason the GLB drops into the
#: scene at identity.
FLOOR_Y_UNITS = -0.55

#: The four groups the web switches and explodes independently.
LEVEL_IDS = ('L00', 'L01', 'L02', 'ROOF')
GROUPS = ('STRUCTURE', 'CEILING', 'GLASS')


def join_meshes(objs, name, materials, col):
    """Merge objects into one mesh, baking world transforms and remapping
    material slots. Done in plain Python rather than through bpy.ops.join,
    which needs a UI context that does not exist in background mode."""
    part = Part(name)
    for ob in objs:
        me = ob.data
        mw = ob.matrix_world
        slots = [m.name for m in me.materials] or ['MAT_CONCRETE']
        base = len(part.verts)
        part.verts.extend(tuple(mw @ v.co) for v in me.vertices)
        for poly in me.polygons:
            part.faces.append(tuple(base + i for i in poly.vertices))
            part.fmat.append(part.slot(slots[min(poly.material_index, len(slots) - 1)]))
    return part.to_object(materials, col)


def weld(ob, dist=0.0002):
    """Remove doubles. Every box in the model shares corners with the boxes
    beside it, so this is not a rounding exercise — it is most of the file."""
    bm = bmesh.new()
    bm.from_mesh(ob.data)
    before = len(bm.verts)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=dist)
    bm.to_mesh(ob.data)
    ob.data.update()
    after = len(bm.verts)
    bm.free()
    return before, after


def tri_count(ob):
    return sum(len(p.vertices) - 2 for p in ob.data.polygons)


def stage(mpu, floor_t=0.32, drop_assets=(), drop_decor=False, drop_levels=()):
    """Build the web staging scene in place and return a stats dict."""
    mats = {m.name: m for m in bpy.data.materials}
    scale = 1.0 / mpu
    floor_y = FLOOR_Y_UNITS + floor_t / mpu

    src = {c.name: [ob for ob in c.objects] for c in bpy.data.collections}
    web = collection('WEB')

    # PHASE 8 — merged PER LEVEL rather than once for the building.
    #
    # Phase 7 merged the whole shell into one mesh, which was the right answer
    # for one storey and is the wrong answer for three: the exploded view, the
    # level isolation QUANTIFY needs and the floor-by-floor scan all move one
    # level and leave the others where they are, and none of that is possible
    # if L00's walls and L02's walls are the same draw call. Eleven merged
    # meshes instead of three is eight more draw calls for the whole building
    # — a price worth paying once, not per frame.
    merged = {}
    welded = {'before': 0, 'after': 0}
    for lid in LEVEL_IDS:
        for grp in GROUPS:
            objs = [o for o in src.get(f'{lid}_{grp}', []) if o.type == 'MESH']
            if not objs:
                continue
            ob = join_meshes(objs, f'WEB_{lid}_{grp}', mats, web)
            b, a = weld(ob)
            welded['before'] += b
            welded['after'] += a
            ob['gdf_level'] = lid
            merged[f'{lid}_{grp}'] = ob

    # furniture keeps its instancing; only the drop lists change
    kept = []
    for cname in ('FURNITURE', 'DECOR'):
        if drop_decor and cname == 'DECOR':
            continue
        for ob in src.get(cname, []):
            if ob.get('gdf_asset') in drop_assets:
                continue
            if ob.get('gdf_level') in drop_levels:
                continue
            web.objects.link(ob)
            for c in bpy.data.collections:
                if c is not web and ob.name in c.objects:
                    c.objects.unlink(ob)
            kept.append(ob)

    stations = []
    for ob in src.get('CAPTURE_STATIONS', []):
        web.objects.link(ob)
        for c in bpy.data.collections:
            if c is not web and ob.name in c.objects:
                c.objects.unlink(ob)
        stations.append(ob)

    # one root carries the unit conversion and the podium offset
    root = bpy.data.objects.new('GDF_ENVIRONMENT', None)
    root.empty_display_size = 1.0
    web.objects.link(root)
    root.scale = (scale, scale, scale)
    #: A node's translation is applied AFTER its scale, so this offset is in
    #: the site's WORLD UNITS, not in the metres everything under it uses.
    #: Dividing it by the scale — the intuitive move — buries the building
    #: 2.4 units under the terrain.
    root.location = (0.0, 0.0, floor_y)
    #: Parented WITHOUT matrix_parent_inverse. That matrix exists to cancel a
    #: parent's transform so a child does not move when it is parented, which
    #: is the exact opposite of what is wanted here: the root transform IS
    #: the metres-to-world-units conversion and every child must inherit it.
    for ob in list(merged.values()) + stations:
        ob.parent = root

    # Instances get a parent empty PER ASSET FAMILY. The glTF exporter names
    # the EXT_mesh_gpu_instancing node after the shared parent, so this is
    # the semantic naming the phase requires.
    #
    # NOT per level per asset. That was tried, to let one storey's contents
    # rise with it in the exploded view — and it tripled the instanced draw
    # calls, from 24 families to 72, for a capability nothing uses: the
    # furniture layer is at ZERO in every state that explodes. QUANTIFY,
    # DECISION and the DATA chapter all put the contents away before the
    # building comes apart, because a plan drawing does not have chairs in
    # it. Each instance still carries `gdf_level`, which is what the mobile
    # tier filters on, so the level is not lost — only the extra draw call.
    families = {}
    for ob in kept:
        asset = ob.get('gdf_asset') or 'misc'
        fam = families.get(asset)
        if fam is None:
            fam = bpy.data.objects.new(f'FURN_{asset.upper()}', None)
            web.objects.link(fam)
            fam.parent = root
            families[asset] = fam
        ob.parent = fam

    # everything else leaves the file
    for c in bpy.data.collections:
        if c is web:
            continue
        for ob in list(c.objects):
            bpy.data.objects.remove(ob, do_unlink=True)
        bpy.data.collections.remove(c)

    unique = {ob.data.name for ob in kept}
    per_level = {}
    for ob in kept:
        k = ob.get('gdf_level') or 'L00'
        per_level[k] = per_level.get(k, 0) + 1
    # A draw call is a PRIMITIVE, not an object: a chair with a fabric slot
    # and a metal slot is two. Instancing collapses the count across copies,
    # so this is (merged primitives) + (primitives per unique asset mesh).
    prims = sum(max(1, len(o.data.materials)) for o in merged.values())
    seen, fprims = set(), 0
    for ob in kept:
        if ob.data.name in seen:
            continue
        seen.add(ob.data.name)
        fprims += max(1, len(ob.data.materials))
    return dict(
        drawCalls=prims + fprims,
        drawCallsStructure=prims, drawCallsFurniture=fprims,
        mergedTris={k: tri_count(v) for k, v in merged.items()},
        furnitureInstances=len(kept),
        furnitureUniqueMeshes=len(unique),
        furnitureTris=sum(tri_count(o) for o in kept),
        furnitureByLevel=per_level,
        stations=len(stations),
        weldedVerts=welded,
        scale=scale, floorY=floor_y,
    )
