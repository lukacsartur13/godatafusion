"""
Material manifest, and the image strip that goes with it.

PHASE 7. The building now has real PBR textures, and the naive place to put
them is inside the GLB. That would be wrong twice over:

  * arch-structure.glb is what MEASURE and QUANTIFY download. Those two modes
    exist to STRIP the world back to measurable structure — they must not pay
    for a plaster finish they immediately discard. Phase 6 got this right by
    splitting the files; embedding textures would quietly undo it.

  * a texture inside a GLB cannot be served at two resolutions, cannot be
    swapped for a KTX2 of the same image, and cannot arrive AFTER the
    geometry. All three are things Part 08, Part 23 and Part 24 ask for.

So the exporter writes UVs and material NAMES, and this module writes down
what each of those names wants. tools/textures/pack.mjs packs the maps;
webgl/archMaterials.js binds them by name at runtime. The GLB keeps its
untextured base colours, which is exactly the right first paint: the
building appears immediately in flat material and resolves into a textured
one when the maps land.
"""

import json
import os

import bpy

#: BSDF input → the manifest channel it becomes on the web.
CHANNELS = (
    ('Base Color', 'map'),
    ('Roughness', 'roughnessMap'),
    ('Metallic', 'metalnessMap'),
    ('Normal', 'normalMap'),
)


def _upstream_image(socket, seen=None):
    """First image node feeding a BSDF input, through whatever the glTF
    importer put in between (Separate Color for the ORM split, Normal Map,
    Mix for a tint). Returns the image datablock or None."""
    if seen is None:
        seen = set()
    if not socket.is_linked:
        return None
    node = socket.links[0].from_node
    if node in seen:
        return None
    seen.add(node)
    if node.type == 'TEX_IMAGE':
        return node.image
    for inp in node.inputs:
        img = _upstream_image(inp, seen)
        if img is not None:
            return img
    return None


def _rgb(socket):
    v = socket.default_value
    return [round(float(v[0]), 4), round(float(v[1]), 4), round(float(v[2]), 4)]


def _export_image(img, out_dir, seen):
    """Write one image out as PNG and return its filename.

    Every map the manifest can reach is PACKED inside the .blend — a glTF
    import brings its textures in, and Blender's importer additionally BUILDS
    images that exist in no download: it recombines Poly Haven's separate
    metal and rough maps into one two-channel image, which is precisely the
    layout MeshStandardMaterial wants. Saving from Blender rather than
    resolving filenames back to tools/polyhaven/downloads is therefore not a
    convenience — it is the only way to get those composites at all.
    """
    key = img.name
    if key in seen:
        return seen[key]
    safe = ''.join(c if (c.isalnum() or c in '._-') else '_' for c in key)
    if not safe.lower().endswith('.png'):
        safe += '.png'
    dest = os.path.join(out_dir, safe)
    prev_path, prev_fmt = img.filepath_raw, img.file_format
    try:
        img.filepath_raw = dest
        img.file_format = 'PNG'
        img.save()
    except RuntimeError as err:                       # noqa: PERF203
        print(f'  ! could not save image {key}: {err}')
        seen[key] = None
        return None
    finally:
        img.filepath_raw, img.file_format = prev_path, prev_fmt
    seen[key] = safe
    return safe


def collect(out_dir=None):
    """One record per material in the file."""
    out = {}
    saved = {}
    if out_dir:
        os.makedirs(out_dir, exist_ok=True)
    for mat in bpy.data.materials:
        if not mat.use_nodes:
            continue
        bsdf = next((n for n in mat.node_tree.nodes if n.type == 'BSDF_PRINCIPLED'), None)
        if bsdf is None:
            continue

        maps = {}
        for inp_name, channel in CHANNELS:
            if inp_name not in bsdf.inputs:
                continue
            img = _upstream_image(bsdf.inputs[inp_name])
            if img is None:
                continue
            # A glTF import PACKS its images, so filepath_from_user() is
            # often empty. The image NAME always survives, and every map this
            # pipeline can see came out of tools/polyhaven/downloads — so the
            # packer resolves by name and the manifest stays portable.
            file = _export_image(img, out_dir, saved) if out_dir else None
            if not file:
                continue
            maps[channel] = dict(name=img.name, file=file,
                                 size=list(img.size))

        emissive_strength = float(bsdf.inputs['Emission Strength'].default_value) \
            if 'Emission Strength' in bsdf.inputs else 0.0

        rec = dict(
            baseColor=_rgb(bsdf.inputs['Base Color']),
            roughness=round(float(bsdf.inputs['Roughness'].default_value), 4),
            metalness=round(float(bsdf.inputs['Metallic'].default_value), 4),
            opacity=round(float(bsdf.inputs['Alpha'].default_value), 4),
            emissive=_rgb(bsdf.inputs['Emission Color']) if emissive_strength else None,
            emissiveStrength=round(emissive_strength, 3),
            maps=maps,
        )
        #: How the maps are addressed. A box-projected surface carries UVs in
        #: METRES, so the web material's repeat is 1/metres and the same
        #: concrete reads at the same physical scale on a 34 m wall and on a
        #: 0.4 m reveal. An asset-owned layout is used as authored.
        if 'gdf_tex_metres' in mat.keys():
            rec['uv'] = 'box'
            rec['metres'] = round(float(mat['gdf_tex_metres']), 3)
            rec['mode'] = mat.get('gdf_tex_mode', 'tint')
            rec['res'] = int(mat.get('gdf_tex_res', 512))
            rec['slug'] = mat.get('gdf_tex_slug', '')
        else:
            rec['uv'] = 'asset'
            rec['res'] = int(mat.get('gdf_tex', 512))
            rec['slug'] = mat.get('gdf_source', '')
            drop = str(mat.get('gdf_drop_maps', '') or '')
            if drop:
                rec['drop'] = drop.split(',')
        out[mat.name] = rec
    return out


def strip_images():
    """Remove every image texture node, leaving the palette's flat values.

    The links are cut rather than the whole node tree rebuilt, so a material
    keeps its base colour, roughness and metalness — which is what the
    untextured first paint renders with, and what a browser that never
    fetches the maps keeps for good.
    """
    removed = 0
    for mat in bpy.data.materials:
        if not mat.use_nodes:
            continue
        tree = mat.node_tree
        for node in list(tree.nodes):
            if node.type in {'TEX_IMAGE', 'TEX_COORD', 'MAPPING', 'NORMAL_MAP',
                             'SEPARATE_COLOR', 'MAP_RANGE'}:
                tree.nodes.remove(node)
                removed += 1
            elif node.type == 'MIX' and node.data_type == 'RGBA':
                tree.nodes.remove(node)
                removed += 1
    for img in list(bpy.data.images):
        if img.users == 0:
            bpy.data.images.remove(img)
    return removed


def write(path, extra=None, out_dir=None):
    data = dict(materials=collect(out_dir))
    if extra:
        data.update(extra)
    with open(path, 'w') as fh:
        json.dump(data, fh, indent=1)
    textured = sum(1 for m in data['materials'].values() if m['maps'])
    return len(data['materials']), textured
