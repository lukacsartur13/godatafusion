"""
The environment map.  blender -b --python blender/pack_env.py

Turns the downloaded 1K Radiance HDR into something a web page can actually
afford, and writes it to public/scene/tex/.

WHY IT CAN BE SO SMALL
----------------------
The chosen sky (`kloofendal_overcast_puresky`) is OVERCAST and low-contrast.
That was a lighting decision — Part 09 asks for restrained neutral daylight
and forbids a sunset — but it has a large technical consequence: an overcast
sky has almost no dynamic range above 1.0. There is no sun disc to clip, so
tone-mapping it to LDR loses nearly nothing, and 8-bit is enough.

That is why this ships a 512x256 WebP of about fifteen kilobytes instead of a
1.1 MB .hdr and an RGBELoader. Three's PMREMGenerator convolves it into the
roughness mip chain at load; the source resolution only has to survive that
convolution, and 512 is generous for it. The one thing the environment must
do sharply — put something in the glass — it does from the mip chain, not
from the source pixels.

A dramatic sky WOULD need real HDR here. This one does not, and saying so is
cheaper than shipping the range unused.
"""

import json
import os
import sys

import bpy

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..'))
SRC = os.path.join(ROOT, 'tools', 'polyhaven', 'downloads',
                   'kloofendal_overcast_puresky',
                   'kloofendal_overcast_puresky_1k.hdr')
OUT = os.path.join(ROOT, 'public', 'scene', 'tex')

#: Equirectangular. 2:1 is the format; 512 wide is what survives PMREM.
W, H = 512, 256
#: Mobile gets a quarter of the pixels. The environment is doing ambient and
#: a soft reflection there, never a mirror.
W_LO, H_LO = 256, 128

#: Exposure applied before the LDR conversion. The sky's own scene-referred
#: values sit around 1.0–3.0; this brings the mid-grey down so the bright
#: horizon band is not clipped flat, and archMaterials.js multiplies the
#: intensity back up as a uniform, where it can be tuned without a re-encode.
EXPOSURE = -1.35


def bake(width, height, path):
    img = bpy.data.images.load(SRC, check_existing=False)
    img.scale(width, height)
    sc = bpy.context.scene
    sc.view_settings.view_transform = 'Standard'
    sc.view_settings.exposure = EXPOSURE
    sc.view_settings.look = 'None'
    sc.render.image_settings.file_format = 'PNG'
    sc.render.image_settings.color_mode = 'RGB'
    sc.render.image_settings.color_depth = '8'
    img.save_render(filepath=path, scene=sc)
    bpy.data.images.remove(img)
    return os.path.getsize(path)


def main():
    if not os.path.exists(SRC):
        print('no HDRI downloaded — skipping environment map')
        return
    os.makedirs(OUT, exist_ok=True)
    tmp_hi = os.path.join(OUT, '.env-hi.png')
    tmp_lo = os.path.join(OUT, '.env-lo.png')
    bake(W, H, tmp_hi)
    bake(W_LO, H_LO, tmp_lo)

    # WebP conversion is done with Pillow, which Blender does not ship; the
    # PNGs are handed to tools/textures/pack.py's environment step instead if
    # Pillow is unavailable here.
    sizes = {}
    try:
        sys.path.insert(0, '/usr/local/lib/python3/dist-packages')
        from PIL import Image                          # noqa: PLC0415
        for tier, tmp, name in (('hi', tmp_hi, 'env-512.webp'),
                                ('lo', tmp_lo, 'env-256.webp')):
            dest = os.path.join(OUT, name)
            Image.open(tmp).convert('RGB').save(dest, 'WEBP', quality=88, method=6)
            sizes[tier] = dict(file=name, bytes=os.path.getsize(dest))
            os.remove(tmp)
    except ImportError:
        for tier, tmp, name in (('hi', tmp_hi, 'env-512.png'),
                                ('lo', tmp_lo, 'env-256.png')):
            dest = os.path.join(OUT, name)
            os.replace(tmp, dest)
            sizes[tier] = dict(file=name, bytes=os.path.getsize(dest))

    meta = dict(source='kloofendal_overcast_puresky', sourceRes='1k',
                sourceBytes=os.path.getsize(SRC), exposure=EXPOSURE,
                tiers=sizes)
    with open(os.path.join(OUT, 'env.json'), 'w') as fh:
        json.dump(meta, fh, indent=1)
    print('ENV', json.dumps(meta))


if __name__ == '__main__':
    main()
