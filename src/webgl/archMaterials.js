import * as THREE from 'three';
import { scanUniforms } from './materials.js';

/* ============================================================
   SCAN-AWARE PBR

   PHASE 6 read each imported glTF material for its base colour and threw
   the rest away, rebuilding it as a flat custom shader. That was the right
   call while every material WAS flat — there was nothing to throw away, and
   one shader family meant one uniform block, one fog, one scan response.

   It stops being the right call the moment the materials are real. Phase 7
   downloads oak grain, plaster roughness and woven fabric, and a pipeline
   that reads only `baseColor` off them has downloaded nothing.

   So the direction inverts. Instead of replacing PBR with the scan shader,
   the scan becomes a RESPONSE ADDED TO PBR:

       MeshStandardMaterial          lit, textured, environment-reflecting
         + scan mask                 accent emission where the plane passes
         + accent tint               the page's colour state
         + distance fog              the same band the terrain fades into
         + layer opacity             what the mode system already switches

   The injection is done with onBeforeCompile and is IDENTICAL for every
   material, which is the point: `customProgramCacheKey` returns one constant,
   so twenty-one materials do not become twenty-one shader programs. What
   still splits programs is what always split them — which MAPS a material
   has — and that is why the packer normalises everything onto the same
   three channels wherever it can.

   The scan plane, the accent and the fog are read from the SAME uniform
   objects the procedural shaders use (materials.js). Not copies: the same
   object references, handed to three's uniform map. One write to
   scanUniforms.uScanPos still moves the plane through the whole scene —
   terrain, massing, lines, points and now the building — which is the
   single fact Phase 6 was built around and the one thing that must not
   regress.
   ============================================================ */

/* ------------------------------------------------------------------
   the injection
   ------------------------------------------------------------------ */

const PARS = /* glsl */ `
  uniform vec3  uScanAxis;
  uniform float uScanPos;
  uniform float uScanWidth;
  uniform float uScanGain;
  uniform vec3  uAccent;
  uniform float uAccentMix;
  uniform float uFogNear;
  uniform float uFogFar;
  uniform float uGdfOpacity;
  uniform float uGdfScan;
  uniform float uGdfGlass;
  uniform float uCross;
  uniform vec3  uSampleC;
  uniform float uSampleR;
  uniform float uSampleW;
  uniform float uSampleG;
  varying vec3  vGdfWorld;
  varying float vGdfDepth;
`;

/** Shared by every architectural surface, so one plane crosses one building. */
const GLOW = /* glsl */ `
  float gdfScanGlow(vec3 wp) {
    float d = abs(dot(wp, uScanAxis) - uScanPos) / uScanWidth;
    return exp(-d * d) * uScanGain;
  }
  /* PHASE 11 — the 360 round, on the surfaces it is taken off. Same
     sphere, same three uniforms as the procedural family: one sampling
     event crossing one building. */
  float gdfSampleShell(vec3 wp) {
    if (uSampleG <= 0.001) return 0.0;
    float d = (distance(wp, uSampleC) - uSampleR) / max(uSampleW, 1e-4);
    return exp(-d * d) * uSampleG;
  }
`;

/* PHASE 11 — the glass crossing, in the vertex stage. See the note in
   webgl/materials.js: the ray is deviated where the medium is, so the
   building bends as the camera passes through its facade and there is no
   second full-screen surface anywhere in the pipeline. */
const LENS = /* glsl */ `
  uniform float uCross;
  vec4 gdfLens(vec4 clip) {
    if (uCross <= 0.0005) return clip;
    float w = clip.w;
    if (abs(w) < 1e-4) return clip;
    vec2 n = clip.xy / w;
    float r2 = dot(n, n);
    vec2 d = n * (uCross * (0.34 * r2 - 0.085));
    d.x += uCross * 0.026 * sin(n.y * 8.5);
    d.y += uCross * 0.013 * sin(n.x * 6.0);
    return vec4((n + d) * w, clip.z, clip.w);
  }
`;

/* One constant key. Two materials that differ only in their MAPS still get
   two programs — that is three's own doing and correct — but this extension
   never adds a variant of its own. Without it three treats every
   onBeforeCompile material as unique and the program count tracks the
   material count. */
const CACHE_KEY = () => 'gdf-scan-pbr';

/**
 * Turn any lit three material into a scan-aware one, in place.
 * @param {THREE.Material} mat
 * @param {{ scan?: number }} opts  scan how strongly this surface answers the
 *   plane. Glass and emitters answer less: a light fitting that flares when
 *   the scan passes reads as a bug, not as a material.
 */
export function makeScanAware(mat, { scan = 1, glass = 0 } = {}) {
  const uOpacity = { value: 1 };
  const uScan = { value: scan };
  /* How far this surface goes toward opaque at a grazing angle. See the
     fragment injection: 0 for everything that is not glazing. */
  const uGlass = { value: glass };
  mat.userData.gdf = { uOpacity, uScan, uGlass };
  mat.transparent = true;
  mat.customProgramCacheKey = CACHE_KEY;

  mat.onBeforeCompile = (shader) => {
    /* The same uniform OBJECTS the procedural family uses. Three reads
       `.value` every frame, so assigning the reference is what makes one
       write reach every material at once. */
    shader.uniforms.uScanAxis = scanUniforms.uScanAxis;
    shader.uniforms.uScanPos = scanUniforms.uScanPos;
    shader.uniforms.uScanWidth = scanUniforms.uScanWidth;
    shader.uniforms.uScanGain = scanUniforms.uScanGain;
    shader.uniforms.uAccent = scanUniforms.uAccent;
    shader.uniforms.uAccentMix = scanUniforms.uAccentMix;
    shader.uniforms.uFogNear = scanUniforms.uFogNear;
    shader.uniforms.uFogFar = scanUniforms.uFogFar;
    shader.uniforms.uGdfOpacity = uOpacity;
    shader.uniforms.uGdfScan = uScan;
    shader.uniforms.uGdfGlass = uGlass;
    shader.uniforms.uCross = scanUniforms.uCross;
    shader.uniforms.uSampleC = scanUniforms.uSampleC;
    shader.uniforms.uSampleR = scanUniforms.uSampleR;
    shader.uniforms.uSampleW = scanUniforms.uSampleW;
    shader.uniforms.uSampleG = scanUniforms.uSampleG;

    shader.vertexShader = `
      ${LENS}
      varying vec3  vGdfWorld;
      varying float vGdfDepth;
      ${shader.vertexShader}
    `.replace(
      '#include <project_vertex>',
      /* glsl */ `
        #include <project_vertex>
        {
          /* World position has to be recomputed rather than read: three only
             emits worldPosition under a handful of defines, and an
             InstancedMesh — which is most of the furniture — needs the
             instance matrix folded in before the model matrix. */
          vec4 gdfObj = vec4(transformed, 1.0);
          #ifdef USE_BATCHING
            gdfObj = batchingMatrix * gdfObj;
          #endif
          #ifdef USE_INSTANCING
            gdfObj = instanceMatrix * gdfObj;
          #endif
          vGdfWorld = (modelMatrix * gdfObj).xyz;
          vGdfDepth = -mvPosition.z;
          gl_Position = gdfLens(gl_Position);
        }
      `,
    );

    shader.fragmentShader = `
      ${PARS}
      ${GLOW}
      ${shader.fragmentShader}
    `.replace(
      '#include <opaque_fragment>',
      /* glsl */ `
        #include <opaque_fragment>
        {
          /* Injected BEFORE tone mapping on purpose: the accent has to sit
             inside the same response curve as the lit surface, or a scanned
             wall blows out while the wall beside it does not. */
          float gdfG = gdfScanGlow(vGdfWorld) * uGdfScan;
          gl_FragColor.rgb += uAccent * gdfG * (0.16 + 0.34 * uAccentMix);
          gl_FragColor.rgb += uAccent * gdfSampleShell(vGdfWorld) * 0.60 * uGdfScan;

          /* The page's accent state, as a WASH rather than a replacement.
             Phase 6 could tint freely because the surface had no texture to
             lose; here the grain must survive the tint, so the mix is small
             and weighted by luminance — bright surfaces take the accent,
             shadowed ones stay their own colour, which is how a coloured
             light behaves. */
          float gdfL = dot(gl_FragColor.rgb, vec3(0.2126, 0.7152, 0.0722));
          gl_FragColor.rgb = mix(gl_FragColor.rgb,
                                 uAccent * gdfL, uAccentMix * 0.16 * uGdfScan);

          /* GLAZING — Phase 7 Part 10.
             Phase 6 drew glass at a CONSTANT low alpha, which is why the
             self-review called it "a blank grey opening": a sheet that is
             25% opaque from every angle is a grey filter, not a window.
             Real glass is governed by Fresnel — nearly invisible looking
             straight through it, a mirror at a glancing angle — and that one
             term is what makes an opening read as glazed rather than as a
             hole. It costs a dot product.

             Deliberately NOT transmission: MeshPhysicalMaterial's refractive
             path renders the scene to a second buffer every frame, and the
             brief is explicit that this page does not need architectural
             path tracing. What it needs is for the facade to say that there
             is an environment out there, and a Fresnel-weighted reflection
             of the sky says exactly that. */
          if (uGdfGlass > 0.0) {
            vec3 gdfV = normalize(vViewPosition);
            float gdfFres = pow(1.0 - clamp(dot(normalize(normal), gdfV), 0.0, 1.0), 3.4);
            gl_FragColor.a = mix(gl_FragColor.a, 1.0, gdfFres * uGdfGlass);
            /* A visible edge: the sheet brightens where it turns away, which
               is what separates one pane from the next across a facade. */
            gl_FragColor.rgb += uAccent * gdfFres * 0.05 * uGdfGlass;
            /* PHASE 11 — inside the pane. At a crossing the sheet is being
               looked THROUGH at zero degrees, where Fresnel gives nothing,
               so the term that has to carry it is the body of the glass
               rather than its edge: the medium itself brightens for the
               fraction of a second the camera is inside it. */
            gl_FragColor.rgb += uAccent * uCross * 0.10 * uGdfGlass;
            gl_FragColor.a = mix(gl_FragColor.a,
                                 min(1.0, gl_FragColor.a + 0.20), uCross);
          }

          /* One fog band for the whole site. The terrain, the massing, the
             linework and the building all dissolve at the same two
             distances, which is what stops the GLB reading as a separate
             object composited over the scene. */
          float gdfFog = smoothstep(uFogNear, uFogFar, vGdfDepth);
          gl_FragColor.a *= uGdfOpacity * (1.0 - gdfFog);
          if (gl_FragColor.a <= 0.003) discard;
        }
      `,
    );
  };
  mat.needsUpdate = true;
  return mat;
}

/* ------------------------------------------------------------------
   textures
   ------------------------------------------------------------------ */

/* ------------------------------------------------------------------
   albedo compression
   ------------------------------------------------------------------ */

/**
 * The site is drawn on near-black. A physically honest light plaster —
 * blender/config/palette.py authors MAT_WALL at 0.606, which is what a real
 * wall reflects — renders as a WHITE BOX in a frame whose ground is 0.02,
 * and the hero stops being a dark composition with a building in it.
 *
 * Phase 6 solved the same problem with LIGHT_GAIN / DARK_GAIN in archScene.js,
 * compressing the palette as it rebuilt each material flat. The compression
 * survives Phase 7; only its place changed. Applied to ALBEDO rather than to
 * the lights, because darkening the lights would flatten the environment's
 * contribution too and take the material separation with it — the grain,
 * the roughness breakup and the reflections all stay at full strength, and
 * only how much light the surface returns comes down.
 */
export const ALBEDO_GAIN = 0.50;
/** Emitters are exempt: a light fitting reads as a light or as nothing. */

const CHANNELS = ['map', 'roughnessMap', 'metalnessMap', 'normalMap'];
/** Channels whose data is a measurement, not a picture. */
const LINEAR = new Set(['roughnessMap', 'metalnessMap', 'normalMap']);

/* ------------------------------------------------------------------
   PROGRAM REUSE — Phase 7 Part 07
   ------------------------------------------------------------------
   Three keys its shader programs on which MAPS a material carries, so an
   oak with no normal map and a fabric with one are two programs before this
   file has done anything at all. Nine materials with nine different channel
   combinations is nine programs, times two again for the instanced copies.

   `customProgramCacheKey` already stops the scan injection from adding
   variants of its own. This closes the other half: every non-glazing
   architectural material is given the SAME four channels, with a 1x1
   neutral standing in wherever the real map is absent. One define set, one
   program family.

   The stand-ins are neutral by construction — white for albedo, white for
   the packed AO/roughness/metalness (all three multiply by 1), and a flat
   +Z for the normal — so binding them changes no pixel. The cost is a
   texture fetch from a single texel that never leaves the cache; the saving
   is measured in qa/p7routes.mjs.
   ------------------------------------------------------------------ */

let NEUTRAL = null;

function neutralMaps() {
  if (NEUTRAL) return NEUTRAL;
  const make = (r, g, b, colorSpace) => {
    const t = new THREE.DataTexture(new Uint8Array([r, g, b, 255]), 1, 1);
    t.colorSpace = colorSpace;
    t.needsUpdate = true;
    return t;
  };
  NEUTRAL = {
    map: make(255, 255, 255, THREE.SRGBColorSpace),
    arm: make(255, 255, 255, THREE.NoColorSpace),
    normalMap: make(128, 128, 255, THREE.NoColorSpace),
  };
  return NEUTRAL;
}

/** Give `mat` the full four-channel set, standing in neutrals for gaps. */
export function neutralise(mat) {
  const n = neutralMaps();
  if (!mat.map) mat.map = n.map;
  if (!mat.roughnessMap) mat.roughnessMap = n.arm;
  if (!mat.metalnessMap) mat.metalnessMap = n.arm;
  if (!mat.aoMap) { mat.aoMap = n.arm; mat.aoMapIntensity = 0; }
  if (!mat.normalMap) {
    mat.normalMap = n.normalMap;
    mat.normalScale = new THREE.Vector2(0, 0);
  }
  return mat;
}

function textureLoader(base, tier, manifest, cache, anisotropy) {
  const loader = new THREE.TextureLoader();
  return (stem, channel) => {
    const res = manifest.tiers[tier][stem];
    if (!res) return null;
    const key = `${stem}-${res}`;
    let tex = cache.get(key);
    if (!tex) {
      tex = loader.load(`${base}scene/tex/${key}.webp`);
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.RepeatWrapping;
      tex.anisotropy = anisotropy;
      tex.generateMipmaps = true;
      tex.minFilter = THREE.LinearMipmapLinearFilter;
      tex.userData.bytesKey = key;
      cache.set(key, tex);
    }
    /* colorSpace is per-USE, and a texture reused across channels would be
       wrong for one of them. In this library no image is used as both a
       picture and a measurement, so setting it here is safe — and asserting
       that is cheaper than cloning textures defensively. */
    tex.colorSpace = LINEAR.has(channel) ? THREE.NoColorSpace : THREE.SRGBColorSpace;
    return tex;
  };
}

/* ------------------------------------------------------------------
   the library
   ------------------------------------------------------------------ */

/**
 * Build one material per manifest entry.
 *
 * The GLB's own materials are NOT used. They are the untextured fallback the
 * exporter deliberately left in the file, and they are what paints while this
 * is still in flight (Part 23) — but once the manifest lands, the material a
 * mesh gets is built here from the palette values plus the packed maps.
 *
 * @param {object} o
 * @param {'hi'|'lo'} o.tier
 * @param {THREE.Texture|null} o.envMap
 */
export async function loadMaterialLibrary({
  base, tier = 'hi', envMap = null, anisotropy = 4, signal,
} = {}) {
  const res = await fetch(`${base}scene/tex/manifest.json`, { signal });
  if (!res.ok) throw new Error(`material manifest ${res.status}`);
  const manifest = await res.json();

  const cache = new Map();
  const texture = textureLoader(base, tier, manifest, cache, anisotropy);
  const out = new Map();
  let mapped = 0;

  for (const [name, spec] of Object.entries(manifest.materials)) {
    const glass = spec.opacity < 1;
    const emissive = spec.emissiveStrength > 0;

    const mat = glass
      ? new THREE.MeshPhysicalMaterial()
      : new THREE.MeshStandardMaterial();

    mat.name = name;
    mat.color = new THREE.Color()
      .setRGB(...spec.baseColor, THREE.LinearSRGBColorSpace)
      .multiplyScalar(ALBEDO_GAIN);
    mat.roughness = spec.roughness;
    mat.metalness = spec.metalness;
    mat.envMap = envMap;
    /* Interiors are lit almost entirely by the environment here — there is
       one sun and no bounce solver — so the IBL has to carry more than a
       physically neutral 1.0 would give it. */
    mat.envMapIntensity = glass ? 1.5 : 1.0;
    mat.side = THREE.FrontSide;

    if (emissive) {
      mat.emissive = new THREE.Color().setRGB(...(spec.emissive || spec.baseColor),
                                              THREE.LinearSRGBColorSpace);
      /* A fitting seen from a hundred metres is the ONLY thing that says the
         building is occupied, so emission is deliberately over-driven
         relative to the Blender value — but capped, because a bloom-free
         renderer turns anything past ~2 into a flat white blob. */
      mat.emissiveIntensity = Math.min(1.8, 0.55 + spec.emissiveStrength * 0.32);
    }

    for (const channel of CHANNELS) {
      const stem = spec.maps[channel];
      if (!stem) continue;
      const tex = texture(stem, channel);
      if (!tex) continue;
      mat[channel] = tex;
      mapped++;
    }
    /* An ARM map's ambient occlusion lives in the red channel of the image
       already bound to roughness/metalness. Reusing it costs no extra fetch
       and is what puts contact shading under a chair arm. */
    if (mat.roughnessMap) {
      mat.aoMap = mat.roughnessMap;
      mat.aoMapIntensity = 0.75;
    }
    if (mat.normalMap) {
      mat.normalScale = new THREE.Vector2(0.85, 0.85);
    }

    /* Fill the gaps so every one of these compiles to the same program. */
    if (!glass) neutralise(mat);

    if (spec.uv === 'box' && spec.metres) {
      /* Box UVs are emitted in METRES by blender/lib_mesh.box_uv, so the
         repeat is literally "how many metres of this material per tile".
         The building is exported at 1/5.35 scale, but the UVs are not
         scaled with it — they are a surface property, not a position. */
      const r = 1 / spec.metres;
      for (const channel of CHANNELS) {
        if (mat[channel]) mat[channel].repeat.set(r, r);
      }
    }

    if (glass) {
      mat.transmission = 0;
      /* Lower than the palette's authored alpha, because the Fresnel term
         in the injection adds the rest back where it belongs. Head-on the
         pane is now nearly clear and the room behind it is legible; at the
         angles a facade is actually seen from, it fills in. */
      mat.opacity = spec.opacity * 0.62;
      mat.roughness = spec.roughness;
      mat.metalness = 0;
      mat.ior = 1.46;
      mat.reflectivity = 0.72;
      mat.depthWrite = false;
    }

    makeScanAware(mat, {
      scan: glass ? 0.55 : emissive ? 0.25 : 1,
      glass: glass ? 0.92 : 0,
    });
    out.set(name, mat);
  }

  return {
    materials: out,
    manifest,
    stats: {
      materials: out.size,
      textures: cache.size,
      boundChannels: mapped,
      tier,
      payloadBytes: manifest.bytes?.[tier] ?? null,
    },
    dispose() {
      for (const t of cache.values()) t.dispose();
      for (const m of out.values()) m.dispose();
    },
  };
}

/* ------------------------------------------------------------------
   environment
   ------------------------------------------------------------------ */

/**
 * The environment map, convolved for roughness.
 *
 * A 512x256 WebP of an overcast sky — see blender/pack_env.py for why that
 * is not a compromise. PMREMGenerator turns it into the mip chain the
 * standard material samples by roughness, which is what gives glass a
 * horizon, metal a gradient and plaster the faint directionality that stops
 * it reading as a flat fill.
 */
export async function loadEnvironment(renderer, { base, tier = 'hi', signal } = {}) {
  const res = await fetch(`${base}scene/tex/env.json`, { signal });
  if (!res.ok) throw new Error(`env manifest ${res.status}`);
  const meta = await res.json();
  const file = meta.tiers[tier]?.file || meta.tiers.hi.file;

  const tex = await new THREE.TextureLoader().loadAsync(`${base}scene/tex/${file}`);
  tex.mapping = THREE.EquirectangularReflectionMapping;
  tex.colorSpace = THREE.SRGBColorSpace;

  const pmrem = new THREE.PMREMGenerator(renderer);
  pmrem.compileEquirectangularShader();
  const target = pmrem.fromEquirectangular(tex);
  pmrem.dispose();
  tex.dispose();

  return {
    texture: target.texture,
    stats: { file, bytes: meta.tiers[tier]?.bytes ?? null, sourceBytes: meta.sourceBytes },
    dispose() { target.dispose(); },
  };
}
