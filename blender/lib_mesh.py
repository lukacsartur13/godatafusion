"""
Primitive construction, in plain Python.

Every shape the environment needs is emitted as (verts, faces, material index)
lists and handed to `Mesh.from_pydata`. Nothing here calls a bpy.ops operator
or a bmesh.ops primitive: those signatures move between Blender releases, and
this pipeline has to still run on the next one. It also means we author the
exact triangle count of every asset rather than decimating someone else's.

Units are METRES throughout. The conversion to the site's world units happens
once, in export_web.py, and nowhere else.
"""

import math
import contextlib

import bpy
from mathutils import Matrix, Vector

TAU = math.pi * 2


def xf(loc=(0.0, 0.0, 0.0), rx=0.0, ry=0.0, rz=0.0, scale=1.0):
    """Compose a placement matrix. Rotation order Z, Y, X — the order that
    reads naturally for furniture: turn it on the floor, then tilt it."""
    m = Matrix.Translation(Vector(loc))
    if rz:
        m = m @ Matrix.Rotation(rz, 4, 'Z')
    if ry:
        m = m @ Matrix.Rotation(ry, 4, 'Y')
    if rx:
        m = m @ Matrix.Rotation(rx, 4, 'X')
    if scale != 1.0:
        m = m @ Matrix.Scale(scale, 4)
    return m


class Part:
    """An accumulating soup of triangles/quads with per-face material slots."""

    def __init__(self, name):
        self.name = name
        self.verts = []
        self.faces = []
        self.fmat = []          # parallel to faces: index into self.mats
        self.mats = []          # ordered material names
        self._xf = None         # active placement matrix, or None

    @contextlib.contextmanager
    def at(self, matrix):
        """Emit the enclosed primitives through a placement matrix. Nested
        uses compose, so an asset can be authored in its own comfortable
        local frame and then tilted, turned and dropped into a room."""
        prev = self._xf
        self._xf = matrix if prev is None else prev @ matrix
        try:
            yield self
        finally:
            self._xf = prev

    # -- material slots -------------------------------------------------
    def slot(self, mat):
        if mat not in self.mats:
            self.mats.append(mat)
        return self.mats.index(mat)

    def _emit(self, verts, faces, mat):
        base = len(self.verts)
        m = self.slot(mat)
        if self._xf is not None:
            mx = self._xf
            verts = [tuple(mx @ Vector(v)) for v in verts]
        self.verts.extend(verts)
        for f in faces:
            self.faces.append(tuple(base + i for i in f))
            self.fmat.append(m)

    # -- primitives -----------------------------------------------------
    def box(self, center, size, mat, faces='all'):
        """Axis-aligned box. `faces` may drop hidden sides — the cheapest
        optimisation there is, applied at authoring time rather than after."""
        cx, cy, cz = center
        hx, hy, hz = size[0] / 2, size[1] / 2, size[2] / 2
        v = [
            (cx - hx, cy - hy, cz - hz), (cx + hx, cy - hy, cz - hz),
            (cx + hx, cy + hy, cz - hz), (cx - hx, cy + hy, cz - hz),
            (cx - hx, cy - hy, cz + hz), (cx + hx, cy - hy, cz + hz),
            (cx + hx, cy + hy, cz + hz), (cx - hx, cy + hy, cz + hz),
        ]
        all_f = {
            'bottom': (0, 3, 2, 1), 'top': (4, 5, 6, 7),
            'front':  (0, 1, 5, 4), 'back': (2, 3, 7, 6),
            'right':  (1, 2, 6, 5), 'left': (3, 0, 4, 7),
        }
        keys = all_f.keys() if faces == 'all' else faces
        self._emit(v, [all_f[k] for k in keys], mat)

    def prism(self, poly, z0, z1, mat, cap_bottom=True, cap_top=True):
        """Extrude a closed 2D polygon (list of (x, y)) between two heights."""
        n = len(poly)
        v = [(x, y, z0) for x, y in poly] + [(x, y, z1) for x, y in poly]
        f = []
        for i in range(n):
            j = (i + 1) % n
            f.append((i, j, j + n, i + n))
        if cap_bottom:
            f.append(tuple(range(n - 1, -1, -1)))
        if cap_top:
            f.append(tuple(range(n, 2 * n)))
        self._emit(v, f, mat)

    def cyl(self, center, radius, height, mat, seg=12, cap=True, r_top=None):
        """Cylinder / truncated cone about +Z. Segment count is explicit so a
        chair column and a pendant shade can afford different budgets."""
        cx, cy, cz = center
        rt = radius if r_top is None else r_top
        z0, z1 = cz - height / 2, cz + height / 2
        v, f = [], []
        for i in range(seg):
            a = TAU * i / seg
            v.append((cx + math.cos(a) * radius, cy + math.sin(a) * radius, z0))
        for i in range(seg):
            a = TAU * i / seg
            v.append((cx + math.cos(a) * rt, cy + math.sin(a) * rt, z1))
        for i in range(seg):
            j = (i + 1) % seg
            f.append((i, j, j + seg, i + seg))
        if cap:
            f.append(tuple(range(seg - 1, -1, -1)))
            f.append(tuple(range(seg, 2 * seg)))
        self._emit(v, f, mat)

    def plate(self, center, size, mat, axis='z'):
        """Single-sided quad — wall art, screens, signage. 2 triangles."""
        cx, cy, cz = center
        hx, hy, hz = size[0] / 2, size[1] / 2, size[2] / 2
        if axis == 'z':
            v = [(cx - hx, cy - hy, cz), (cx + hx, cy - hy, cz),
                 (cx + hx, cy + hy, cz), (cx - hx, cy + hy, cz)]
        elif axis == 'x':
            v = [(cx, cy - hy, cz - hz), (cx, cy + hy, cz - hz),
                 (cx, cy + hy, cz + hz), (cx, cy - hy, cz + hz)]
        else:
            v = [(cx - hx, cy, cz - hz), (cx + hx, cy, cz - hz),
                 (cx + hx, cy, cz + hz), (cx - hx, cy, cz + hz)]
        self._emit(v, [(0, 1, 2, 3)], mat)

    # -- realisation ----------------------------------------------------
    def to_object(self, materials, collection, matrix=None):
        me = bpy.data.meshes.new(self.name)
        me.from_pydata(self.verts, [], self.faces)
        for name in self.mats:
            me.materials.append(materials[name])
        if len(self.mats) > 1:
            for poly, mi in zip(me.polygons, self.fmat):
                poly.material_index = mi
        me.update()
        me.shade_flat()
        ob = bpy.data.objects.new(self.name, me)
        if matrix is not None:
            ob.matrix_world = matrix
        collection.objects.link(ob)
        return ob

    @property
    def tris(self):
        return sum(len(f) - 2 for f in self.faces)


def collection(name, parent=None):
    col = bpy.data.collections.get(name)
    if col is None:
        col = bpy.data.collections.new(name)
        (parent or bpy.context.scene.collection).children.link(col)
    return col


def reset_scene():
    """Empty file, metric units, nothing inherited from a previous run."""
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    sc.unit_settings.system = 'METRIC'
    sc.unit_settings.scale_length = 1.0
    return sc


def link_duplicate(src, name, location, rotation_z=0.0, collection=None):
    """An object sharing SOURCE mesh data. This is the instancing contract:
    twenty chairs are twenty transforms over one mesh, in the .blend, in the
    exported GLB (EXT_mesh_gpu_instancing) and in the Three.js InstancedMesh."""
    ob = bpy.data.objects.new(name, src.data)
    ob.location = location
    ob.rotation_euler = (0.0, 0.0, rotation_z)
    (collection or bpy.context.scene.collection).objects.link(ob)
    return ob


def box_uv(ob, force=False):
    """Box-project UVs in METRES: one UV unit is one metre of surface.

    PHASE 7. Every procedurally authored surface in this building arrives
    without UVs, because until now nothing was textured. A box projection is
    the right answer for all of them — these are flat architectural planes
    and slab-sided furniture, not organic shapes — and emitting the
    projection in metres rather than normalised to 0..1 is what gives the
    materials REAL SCALE. A wall does not get "a concrete texture"; it gets
    3.4 m of concrete per repeat, and the repeat count follows from how big
    the wall is. That is most of the difference between a textured surface
    and a surface that reads as a material.

    Meshes that carry their own authored UVs (everything imported from Poly
    Haven) are skipped: `gdf_uv` marks who owns the layout.
    """
    me = ob.data
    if me.get('gdf_uv') == 'asset' and not force:
        return 0
    uv = me.uv_layers.get('UVMap') or me.uv_layers.new(name='UVMap')
    verts = me.vertices
    for poly in me.polygons:
        n = poly.normal
        ax, ay, az = abs(n.x), abs(n.y), abs(n.z)
        # dominant axis picks the projection plane; the sign keeps the
        # winding consistent so a normal map is not mirrored across a corner
        if az >= ax and az >= ay:
            i, j, flip = 0, 1, -1.0 if n.z < 0 else 1.0
        elif ax >= ay:
            i, j, flip = 1, 2, -1.0 if n.x < 0 else 1.0
        else:
            i, j, flip = 0, 2, 1.0 if n.y < 0 else -1.0
        for li in poly.loop_indices:
            co = verts[me.loops[li].vertex_index].co
            uv.data[li].uv = (co[i] * flip, co[j])
    me['gdf_uv'] = 'box'
    return len(me.polygons)
