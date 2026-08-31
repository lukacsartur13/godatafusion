"""
The controlled material library.

NOTE — this module is imported by `blender/make_docs.py`, which runs under
the SYSTEM python where `bpy` does not exist. Every bpy import here is
therefore function-local, and the tables above must stay importable on their
own. A module-level `import bpy` breaks the docs build silently.

Ten materials for the whole environment. Every surface in the building
resolves to one of these — there is no path by which an imported asset can
introduce a sixty-first slightly different grey, because nothing is imported.

Albedo is authored at REALISTIC values so the Blender QA renders are honest.
The site's dark art direction is applied on the web side as a tonal
compression of these same values (see webgl/archMaterials.js), which is why
the palette does not need a second, darker copy of itself.

PHASE 7 — six of these now carry a real Poly Haven PBR texture set. TEXTURES
below names the set; the maps themselves are NOT embedded in the GLB. They
are packed by tools/textures/pack.mjs, served from public/scene/tex/ and
bound by material name at runtime (webgl/archMaterials.js), which is what
keeps arch-structure.glb small enough that MEASURE and QUANTIFY still pay
nothing for a finish they never show.
"""

# name: (base colour RGB, roughness, metallic, alpha, emission strength,
#        emission colour or None to reuse the base colour)
PALETTE = {
    # -- architecture -------------------------------------------------
    'MAT_CONCRETE':     ((0.455, 0.442, 0.421), 0.86, 0.0, 1.0, 0.0),
    'MAT_WALL':         ((0.606, 0.594, 0.572), 0.93, 0.0, 1.0, 0.0),
    'MAT_GLASS':        ((0.640, 0.678, 0.694), 0.05, 0.0, 0.16, 0.0),
    # -- furniture ----------------------------------------------------
    'MAT_OAK':          ((0.512, 0.394, 0.253), 0.54, 0.0, 1.0, 0.0),
    'MAT_METAL':        ((0.118, 0.124, 0.130), 0.38, 0.90, 1.0, 0.0),
    'MAT_FABRIC_DARK':  ((0.106, 0.114, 0.122), 0.95, 0.0, 1.0, 0.0),
    'MAT_FABRIC_LIGHT': ((0.412, 0.392, 0.360), 0.95, 0.0, 1.0, 0.0),
    'MAT_PLANT':        ((0.132, 0.208, 0.116), 0.72, 0.0, 1.0, 0.0),
    # -- the two surfaces that emit ------------------------------------
    #    A flat shaded scene has no practical lighting unless some surface
    #    carries its own value. These are what make an interior seen from
    #    100 m away read as INHABITED rather than as a dark slot.
    'MAT_SCREEN':       ((0.055, 0.062, 0.070), 0.22, 0.0, 1.0, 1.20,
                         (0.340, 0.402, 0.455)),
    'MAT_LIGHT':        ((0.960, 0.918, 0.842), 0.40, 0.0, 1.0, 4.0),
}

#: material → (Poly Haven slug, maps to use, metres per repeat, albedo mode).
#:
#: MODE is how the map meets the palette colour, and it matters more than it
#: looks. `replace` takes the scan's own albedo, because an oak veneer scan
#: IS the colour of oak and multiplying it by the palette's stand-in oak
#: gives a saturated orange that exists in no timber. `tint` multiplies,
#: which is right for the grey herringbone: one fabric scan becomes both the
#: dark task-chair upholstery and the lighter acoustic finish, and the two
#: stay members of the same palette.
#:
#: The repeat is in METRES, and the UVs are box-projected in metres too, so
#: a 2 m repeat is two metres of wall — the material has real scale rather
#: than a tiling factor someone liked the look of. That is most of why a
#: textured surface reads as a surface at all.
#:
#: `nor` is dropped wherever the shape is genuinely flat (a veneer sheet) or
#: the object is small on screen. `arm` is Poly Haven's packed
#: ambient-occlusion / roughness / metalness image: one fetch, three channels,
#: which is the single biggest texture saving available here.
TEXTURES = {
    'MAT_WALL':         ('white_stucco',         ('nor', 'arm'),          2.60, 'tint'),
    'MAT_CONCRETE':     ('concrete_wall_001',    ('nor', 'arm'),          3.40, 'tint'),
    'MAT_OAK':          ('oak_veneer_02',        ('diff', 'arm'),         1.30, 'replace'),
    'MAT_FABRIC_DARK':  ('poly_wool_herringbone', ('diff', 'nor', 'arm'), 0.55, 'tint'),
    'MAT_FABRIC_LIGHT': ('poly_wool_herringbone', ('diff', 'nor', 'arm'), 0.55, 'tint'),
}

#: Albedo the web build uses under a `replace` map — the map supplies the
#: colour, so the palette entry is only the untextured first-paint fallback.
#: Kept here rather than in the shader so one file states the whole palette.
REPLACE_ALBEDO = {'MAT_OAK': (0.74, 0.66, 0.55)}

#: Texture edge length per material, desktop tier. The two large-area
#: architectural finishes get 1K because a wall is thirty square metres of
#: one image; furniture finishes get 512 because they are not.
TEXTURE_RES = {
    'MAT_WALL': 1024, 'MAT_CONCRETE': 1024,
    'MAT_OAK': 512, 'MAT_FABRIC_DARK': 512, 'MAT_FABRIC_LIGHT': 512,
}

#: Materials whose meshes belong to the GLASS layer rather than STRUCTURE.
GLASS_MATERIALS = ('MAT_GLASS',)


DOWNLOADS = None            # resolved lazily; see _downloads()


def _downloads():
    import os
    here = os.path.dirname(os.path.abspath(__file__))
    return os.path.abspath(os.path.join(here, '..', '..', 'tools',
                                        'polyhaven', 'downloads'))


def _map_path(slug, kind):
    """The downloaded map file, or None. `arm` is Poly Haven's packed
    AO/Roughness/Metalness image; `nor` is their OpenGL-convention normal."""
    import os
    suffix = {'diff': 'Diffuse', 'arm': 'arm', 'nor': 'nor_gl'}[kind]
    path = os.path.join(_downloads(), slug, f'{slug}_{suffix}_1k.jpg')
    return path if os.path.exists(path) else None


def _wire_textures(mat, name, tree, bsdf):
    """Attach the Poly Haven maps for one palette entry.

    These nodes exist so the BLENDER QA renders are honest — the web build
    strips them again (see export_web.py) and binds the packed maps by
    material name at runtime instead, which is what keeps arch-structure.glb
    at 44 kB for the two modes that never show a finish.
    """
    spec = TEXTURES.get(name)
    if not spec:
        return []
    slug, kinds, metres = spec[0], spec[1], spec[2]
    mode = spec[3] if len(spec) > 3 else 'tint'
    used = []

    import bpy                                    # noqa: PLC0415 — see module note
    tc = tree.nodes.new('ShaderNodeTexCoord')
    mapping = tree.nodes.new('ShaderNodeMapping')
    # UVs are emitted in metres (lib_mesh.box_uv), so the scale IS the repeat
    mapping.inputs['Scale'].default_value = (1.0 / metres, 1.0 / metres, 1.0)
    tree.links.new(mapping.inputs['Vector'], tc.outputs['UV'])

    def image(kind, non_color):
        path = _map_path(slug, kind)
        if not path:
            return None
        node = tree.nodes.new('ShaderNodeTexImage')
        node.image = bpy.data.images.load(path, check_existing=True)
        if non_color:
            node.image.colorspace_settings.name = 'Non-Color'
        tree.links.new(node.inputs['Vector'], mapping.outputs['Vector'])
        used.append(kind)
        return node

    if 'diff' in kinds:
        n = image('diff', False)
        if n and mode == 'replace':
            tree.links.new(bsdf.inputs['Base Color'], n.outputs['Color'])
            bsdf.inputs['Base Color'].default_value = (
                *REPLACE_ALBEDO.get(name, (0.7, 0.7, 0.7)), 1.0)
        elif n:
            mix = tree.nodes.new('ShaderNodeMix')
            mix.data_type = 'RGBA'
            mix.blend_type = 'MULTIPLY'
            mix.inputs['Factor'].default_value = 1.0
            mix.inputs[6].default_value = bsdf.inputs['Base Color'].default_value
            tree.links.new(mix.inputs[7], n.outputs['Color'])
            tree.links.new(bsdf.inputs['Base Color'], mix.outputs[2])
    if 'arm' in kinds:
        n = image('arm', True)
        if n:
            sep = tree.nodes.new('ShaderNodeSeparateColor')
            tree.links.new(sep.inputs['Color'], n.outputs['Color'])
            # G is roughness in Poly Haven's ARM packing. Remapped around the
            # palette's authored value so a "matte plaster" stays matte: the
            # map supplies BREAKUP, not the absolute finish.
            rm = tree.nodes.new('ShaderNodeMapRange')
            rm.inputs['From Min'].default_value = 0.0
            rm.inputs['From Max'].default_value = 1.0
            base = bsdf.inputs['Roughness'].default_value
            rm.inputs['To Min'].default_value = max(0.0, base - 0.16)
            rm.inputs['To Max'].default_value = min(1.0, base + 0.16)
            tree.links.new(rm.inputs['Value'], sep.outputs['Green'])
            tree.links.new(bsdf.inputs['Roughness'], rm.outputs['Result'])
    if 'nor' in kinds:
        n = image('nor', True)
        if n:
            nm = tree.nodes.new('ShaderNodeNormalMap')
            nm.inputs['Strength'].default_value = 0.85
            tree.links.new(nm.inputs['Color'], n.outputs['Color'])
            tree.links.new(bsdf.inputs['Normal'], nm.outputs['Normal'])
    return used


def build_materials():
    """Create the palette in the current .blend and return {name: Material}."""
    import bpy
    out = {}
    for name, spec in PALETTE.items():
        rgb, rough, metal, alpha, emit = spec[:5]
        erg = spec[5] if len(spec) > 5 else rgb
        mat = bpy.data.materials.new(name)
        mat.use_nodes = True
        bsdf = mat.node_tree.nodes['Principled BSDF']
        bsdf.inputs['Base Color'].default_value = (*rgb, 1.0)
        bsdf.inputs['Roughness'].default_value = rough
        bsdf.inputs['Metallic'].default_value = metal
        bsdf.inputs['Alpha'].default_value = alpha
        if emit:
            bsdf.inputs['Emission Color'].default_value = (*erg, 1.0)
            bsdf.inputs['Emission Strength'].default_value = emit
        if alpha < 1.0:
            mat.blend_method = 'BLEND'
        used = _wire_textures(mat, name, mat.node_tree, bsdf)
        if used:
            spec_t = TEXTURES[name]
            mat['gdf_tex_slug'] = spec_t[0]
            mat['gdf_tex_maps'] = ','.join(used)
            mat['gdf_tex_metres'] = spec_t[2]
            mat['gdf_tex_mode'] = spec_t[3] if len(spec_t) > 3 else 'tint'
            mat['gdf_tex_res'] = TEXTURE_RES.get(name, 512)
        out[name] = mat
    return out
