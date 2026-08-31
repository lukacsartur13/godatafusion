#!/usr/bin/env python3
"""
Texture packing.  python3 tools/textures/pack.py

Reads blender/out/materials.json + blender/out/tex-src/, and writes
public/scene/tex/ plus the runtime manifest webgl/archMaterials.js binds by
material name.

WHY THIS EXISTS RATHER THAN GLB-EMBEDDED TEXTURES
-------------------------------------------------
Three things the brief asks for are impossible once an image is inside a GLB:
serving it at two resolutions (Part 24), serving it AFTER the geometry so the
hero paints immediately (Part 23), and swapping the encoding without
re-exporting from Blender (Part 08). All three fall out for free once the
maps are separate files addressed by material name.

RESOLUTION
----------
Per material, from blender/config/palette.py and blender/polyhaven.py — never
one global number. A wall is thirty square metres of one image and gets 1K; a
pendant globe twelve metres from the camera is a few hundred pixels and gets
256. The mobile tier halves everything again. This is Part 08's "would the
user notice if this were half the resolution", answered per surface.

ENCODING
--------
WebP, quality tuned per channel class:

  * albedo   sRGB, perceptual, tolerates aggressive quantisation
  * normal   a VECTOR, not a picture. Chroma subsampling on a normal map
             bends the surface; encoded near-lossless and always last to be
             dropped from the budget.
  * arm      three unrelated masks in three channels. Cross-channel
             artefacts are what turn a roughness map into blotches, so this
             is encoded above albedo quality and below normal.

KTX2/Basis (Part 08) is the better answer for GPU memory and is wired here
behind `--ktx2`: if a `toktx` from Khronos' KTX-Software is on PATH, this
script writes .ktx2 beside the .webp and the manifest advertises both, and
webgl/archMaterials.js prefers the .ktx2 when KTX2Loader reports transcoder
support. No toktx is installed on this machine and none is fetched by this
script, so the shipped build is WebP — see docs/asset-register.md for the
measured consequence.
"""

import json
import os
import shutil
import subprocess
import sys

from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
SRC = os.path.join(ROOT, 'blender', 'out', 'tex-src')
MANIFEST_IN = os.path.join(ROOT, 'blender', 'out', 'materials.json')
OUT = os.path.join(ROOT, 'public', 'scene', 'tex')

#: channel class → (webp quality, is the data linear rather than a picture)
QUALITY = {
    'map': (76, False),
    'roughnessMap': (86, True),
    'metalnessMap': (86, True),
    'normalMap': (94, True),
}

#: The mobile tier. Halved, floored — below 128 a tiling material stops
#: carrying any grain at all and the download saved is a few kilobytes.
LO_DIVISOR = 2
LO_FLOOR = 128

#: Normal maps cap here regardless of what the material asked for.
#:
#: Not an arbitrary budget cut. A normal map on a BOX-PROJECTED surface is
#: tiled — the wall material repeats every 2.6 m, so a 512 map already puts
#: ~197 texels on every metre of wall, and a 1440-wide hero frame never
#: resolves more than about 100. The 1K versions measured 444 kB and 253 kB,
#: which was 53% of the whole texture payload for detail no viewport can
#: show. Albedo and ARM keep the material's own resolution.
NORMAL_CAP = 512

WANT_KTX2 = '--ktx2' in sys.argv
TOKTX = shutil.which('toktx')


def stem_of(filename):
    """A stable, readable id for one source image."""
    s = filename
    for suffix in ('.png', '.jpg', '.jpeg'):
        while s.lower().endswith(suffix):
            s = s[: -len(suffix)]
    return ''.join(c if (c.isalnum() or c in '-_') else '-' for c in s).strip('-')


def encode(src_path, stem, channel, res):
    """One source image → one WebP (and optionally one KTX2) at `res`."""
    name = f'{stem}-{res}.webp'
    dest = os.path.join(OUT, name)
    quality, linear = QUALITY.get(channel, (80, False))

    im = Image.open(src_path)
    # An alpha channel that is entirely opaque is a third of the file for
    # nothing. Only the leaf cutouts genuinely need one.
    if im.mode in ('RGBA', 'LA'):
        alpha = im.getchannel('A')
        if alpha.getextrema() == (255, 255):
            im = im.convert('RGB')
    elif im.mode != 'RGB':
        im = im.convert('RGB')

    if im.size != (res, res):
        im = im.resize((res, res), Image.LANCZOS)
    im.save(dest, 'WEBP', quality=quality, method=6)

    out = {'webp': name, 'bytes': os.path.getsize(dest)}

    if WANT_KTX2 and TOKTX:
        png = os.path.join(OUT, f'.{stem}-{res}.png')
        im.save(png, 'PNG')
        k = f'{stem}-{res}.ktx2'
        cmd = [TOKTX, '--t2', '--encode', 'uastc' if linear else 'etc1s',
               '--genmipmap']
        if not linear:
            cmd += ['--assign_oetf', 'srgb']
        cmd += [os.path.join(OUT, k), png]
        try:
            subprocess.run(cmd, check=True, capture_output=True)
            out['ktx2'] = k
            out['ktx2Bytes'] = os.path.getsize(os.path.join(OUT, k))
        except (subprocess.CalledProcessError, OSError) as err:
            print(f'  ! toktx failed for {k}: {err}')
        finally:
            os.remove(png)
    return out


def env_to_webp():
    """Finish blender/pack_env.py's job.

    Blender's bundled Python has no Pillow, so pack_env.py writes PNG and
    leaves the conversion here rather than shipping a 105 kB PNG of a sky
    that WebP stores in a fifth of that."""
    meta_path = os.path.join(OUT, 'env.json')
    if not os.path.exists(meta_path):
        return None
    meta = json.load(open(meta_path))
    changed = False
    for tier, rec in meta['tiers'].items():
        src = os.path.join(OUT, rec['file'])
        if not rec['file'].endswith('.png') or not os.path.exists(src):
            continue
        dest_name = rec['file'][:-4] + '.webp'
        Image.open(src).convert('RGB').save(
            os.path.join(OUT, dest_name), 'WEBP', quality=88, method=6)
        os.remove(src)
        rec['pngBytes'] = rec['bytes']
        rec['file'] = dest_name
        rec['bytes'] = os.path.getsize(os.path.join(OUT, dest_name))
        changed = True
    if changed:
        with open(meta_path, 'w') as fh:
            json.dump(meta, fh, indent=1)
    return meta


def main():
    if not os.path.exists(MANIFEST_IN):
        sys.exit('run blender/export_web.py first — no materials.json')
    os.makedirs(OUT, exist_ok=True)
    for f in os.listdir(OUT):
        # the environment map is produced by blender/pack_env.py, not here
        if f.startswith('env'):
            continue
        if f.endswith(('.webp', '.ktx2', '.json')):
            os.remove(os.path.join(OUT, f))

    data = json.load(open(MANIFEST_IN))
    mats = data['materials']

    # Pass 1 — decide, per source image, the largest resolution any material
    # asks of it. One image shared by two materials is packed once.
    want = {}
    for name, m in mats.items():
        drop = set(m.get('drop', ()))
        res_hi = int(m.get('res', 512))
        for channel, ref in m['maps'].items():
            if 'nor' in drop and channel == 'normalMap':
                continue
            if 'arm' in drop and channel in ('roughnessMap', 'metalnessMap'):
                continue
            file = ref['file']
            native = min(ref.get('size', [8192, 8192]) or [8192])
            # never upscale past what was actually captured
            hi = min(res_hi, native if native else res_hi)
            if channel == 'normalMap':
                hi = min(hi, NORMAL_CAP)
            lo = max(LO_FLOOR, hi // LO_DIVISOR)
            cur = want.setdefault(file, dict(channel=channel, hi=0, lo=0))
            cur['hi'] = max(cur['hi'], hi)
            cur['lo'] = max(cur['lo'], lo)
            # a normal map's quality rule must win over an albedo's if the
            # same image somehow served both
            if QUALITY.get(channel, (0,))[0] > QUALITY.get(cur['channel'], (0,))[0]:
                cur['channel'] = channel

    # Pass 2 — encode.
    packed = {}
    total = {'hi': 0, 'lo': 0, 'src': 0}
    for file, spec in sorted(want.items()):
        path = os.path.join(SRC, file)
        if not os.path.exists(path):
            print(f'  ! missing source {file}')
            continue
        stem = stem_of(file)
        total['src'] += os.path.getsize(path)
        rec = {'stem': stem}
        for tier in ('hi', 'lo'):
            r = encode(path, stem, spec['channel'], spec[tier])
            rec[tier] = {'res': spec[tier], **r}
            total[tier] += r['bytes']
        packed[file] = rec
        print(f"  {stem[:52]:52s} {spec['hi']:>5}px {rec['hi']['bytes']//1024:>5} kB"
              f"   {spec['lo']:>4}px {rec['lo']['bytes']//1024:>4} kB")

    # Pass 3 — the runtime manifest, keyed by MATERIAL NAME, which is the only
    # thing the GLB and the web renderer both know about.
    out_mats = {}
    for name, m in mats.items():
        drop = set(m.get('drop', ()))
        maps = {}
        for channel, ref in m['maps'].items():
            if 'nor' in drop and channel == 'normalMap':
                continue
            if 'arm' in drop and channel in ('roughnessMap', 'metalnessMap'):
                continue
            rec = packed.get(ref['file'])
            if rec:
                maps[channel] = rec['stem']
        out_mats[name] = dict(
            #: which Poly Haven asset this material's maps came from —
            #: docs/asset-register.md reads it back to prove the provenance
            slug=m.get('slug') or '',
            uv=m['uv'], metres=m.get('metres'), mode=m.get('mode'),
            baseColor=m['baseColor'], roughness=m['roughness'],
            metalness=m['metalness'], opacity=m['opacity'],
            emissive=m['emissive'], emissiveStrength=m['emissiveStrength'],
            maps=maps,
        )

    tiers = {t: {rec['stem']: rec[t]['res'] for rec in packed.values()}
             for t in ('hi', 'lo')}
    manifest = dict(
        metresPerUnit=data.get('metresPerUnit'),
        format='webp',
        ktx2=bool(WANT_KTX2 and TOKTX),
        tiers=tiers,
        materials=out_mats,
        bytes={t: total[t] for t in ('hi', 'lo')},
    )
    with open(os.path.join(OUT, 'manifest.json'), 'w') as fh:
        json.dump(manifest, fh, indent=1)

    env = env_to_webp()
    if env:
        e = env['tiers']
        print(f"  environment  {e['hi']['file']} {e['hi']['bytes'] // 1024} kB"
              f"   {e['lo']['file']} {e['lo']['bytes'] // 1024} kB"
              f"   (source {env['sourceBytes'] // 1024} kB .hdr)")
        total['hi'] += e['hi']['bytes']
        total['lo'] += e['lo']['bytes']

    print(f'\n{len(packed)} images  '
          f"source {total['src'] / 1e6:.1f} MB  →  "
          f"desktop {total['hi'] / 1024:.0f} kB   mobile {total['lo'] / 1024:.0f} kB")
    if WANT_KTX2 and not TOKTX:
        print('  ! --ktx2 asked for but no `toktx` on PATH; WebP only')


if __name__ == '__main__':
    main()
