"""
Export the web scene.

    blender -b blender/out/godatafusion_environment_master.blend \
            --python blender/export_web.py

Produces, into public/scene/:

    arch-structure.glb        shell, ceiling, glazing, capture stations
    arch-furniture.glb        contents, instanced
    arch-furniture-lite.glb   the mobile tier's contents
    materials.json            what each material name wants for a texture

PHASE 7 — UVs are exported now and IMAGES ARE NOT. See texture_manifest.py
for why: the maps are packed separately so that the two modes which download
structure alone still download no finish at all, and so a map can arrive
after the geometry rather than inside it.

Split because the service modes want different things: MEASURE and QUANTIFY
read structure and never need a chair, so they must not pay to download one.
"""

import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
if HERE not in sys.path:
    sys.path.insert(0, HERE)
    sys.path.insert(0, os.path.join(HERE, 'config'))

import bpy

import optimize_scene
import texture_manifest
from rooms import MOBILE_DROP, MOBILE_DROP_LEVELS

OUT = os.path.abspath(os.path.join(HERE, '..', 'public', 'scene'))
MASTER = os.path.join(HERE, 'out', 'godatafusion_environment_master.blend')

COMMON = dict(
    export_format='GLB',
    use_selection=False,
    use_visible=True,
    export_apply=True,
    export_yup=True,
    export_materials='EXPORT',
    export_cameras=False,
    export_lights=False,
    export_animations=False,
    export_skins=False,
    export_morph=False,
    export_tangents=False,
    export_normals=True,
    export_texcoords=True,
    export_extras=True,
    export_gpu_instances=True,
    export_shared_accessors=True,
    # Vertex-position compression. The decoder for EXT_meshopt_compression
    # ships inside three's own meshopt_decoder module — no separate wasm file
    # to serve, unlike Draco, which is why this pipeline uses it.
    export_meshopt_compression_enable=True,
)


def _group_of(ob):
    """Which export set an object belongs to.

    PHASE 8 — the merged shell meshes are now WEB_<LEVEL>_<GROUP>, so the
    level is stripped off here: every level's structure goes in the same
    file. See the note on `main()` for why the split is by ROLE and not by
    storey."""
    if ob.name.startswith('WEB_'):
        parts = ob.name.split('_')
        return parts[-1]
    if ob.name.startswith('CAPTURE_STATION'):
        return 'STRUCTURE'
    if ob.name.startswith('FIN_'):
        return 'DECOR'
    return 'FURNITURE'


def export(path, groups):
    for ob in bpy.data.objects:
        ob.hide_viewport = _group_of(ob) not in groups and ob.name != 'GDF_ENVIRONMENT'
    bpy.ops.export_scene.gltf(filepath=path, **COMMON)
    return os.path.getsize(path)


def build(drop_assets=(), drop_decor=False, drop_levels=()):
    bpy.ops.wm.open_mainfile(filepath=MASTER)
    with open(os.path.join(HERE, 'out', 'build-stats.json')) as fh:
        st = json.load(fh)
    stats = optimize_scene.stage(st['metresPerUnit'], st['floorT'],
                                 drop_assets=drop_assets, drop_decor=drop_decor,
                                 drop_levels=drop_levels)
    return st, stats


def main():
    """PHASE 8 — the split stays by ROLE, not by storey.

    A per-level furniture file was measured and rejected. Every route that
    wants contents at all wants at least two levels of them — the hero
    cutaway opens a room on each floor and the 360 viewer walks all three —
    so a per-level split trades one 300 kB response for three smaller ones
    plus two extra round trips, and costs the browser its single cache entry
    the moment the visitor moves between the homepage and /360-camera/. What
    the phase DOES add is a level drop on the mobile tier: the phone hero is
    a sectional read of the lower building and never contains the project
    floor, so the project floor's contents are not in the file a phone
    fetches. That is a real saving on the route that needs one.
    """
    os.makedirs(OUT, exist_ok=True)
    report = {}

    st, stats = build()
    report['staging'] = stats
    # collected BEFORE the strip — afterwards there is nothing to collect
    total, textured = texture_manifest.write(
        os.path.join(HERE, 'out', 'materials.json'),
        extra=dict(metresPerUnit=st['metresPerUnit']),
        out_dir=os.path.join(HERE, 'out', 'tex-src')) or (0, 0)
    report['materials'] = dict(total=total, textured=textured)
    report['imagesStripped'] = texture_manifest.strip_images()
    report['structure'] = export(os.path.join(OUT, 'arch-structure.glb'),
                                 {'STRUCTURE', 'CEILING', 'GLASS'})
    report['furniture'] = export(os.path.join(OUT, 'arch-furniture.glb'),
                                 {'FURNITURE', 'DECOR'})
    bpy.ops.wm.save_as_mainfile(
        filepath=os.path.join(HERE, 'out', 'godatafusion_environment_web.blend'))

    st, lite = build(drop_assets=set(MOBILE_DROP), drop_decor=True,
                     drop_levels=set(MOBILE_DROP_LEVELS))
    texture_manifest.strip_images()
    report['stagingLite'] = lite
    report['furnitureLite'] = export(os.path.join(OUT, 'arch-furniture-lite.glb'),
                                     {'FURNITURE', 'DECOR'})

    with open(os.path.join(HERE, 'out', 'export-report.json'), 'w') as fh:
        json.dump(report, fh, indent=1)

    print('\n=== EXPORT ===')
    for k in ('structure', 'furniture', 'furnitureLite'):
        print(f'{k:16s} {report[k] / 1024:8.1f} kB')
    s = report['staging']
    print('draw calls      ', s['drawCalls'])
    print('merged tris     ', s['mergedTris'])
    print('furniture       ', s['furnitureInstances'], 'instances of',
          s['furnitureUniqueMeshes'], 'meshes,', s['furnitureTris'], 'tris')
    print('  by level      ', s['furnitureByLevel'])
    print('merged meshes   ', len(s['mergedTris']))
    print('welded verts    ', s['weldedVerts'])
    print('root scale      ', s['scale'], ' floorY', s['floorY'])
    print('materials       ', report['materials']['textured'], 'textured of',
          report['materials']['total'], f"({report['imagesStripped']} image nodes stripped)")


if __name__ == '__main__':
    main()
