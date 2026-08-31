import * as THREE from 'three';

/* ============================================================
   Materials.
   Every layer shares one scan uniform block, so THE SCAN PLANE is a
   single physical fact in the scene rather than an effect per object.
   ============================================================ */

export const scanUniforms = {
  uScanAxis:  { value: new THREE.Vector3(0, 1, 0) },
  uScanPos:   { value: 6.0 },
  uScanWidth: { value: 0.85 },
  /* Global gain on the scan response. Lets the plane's influence fade out
     entirely — the ambient idle cycle needs the object to stop reacting
     once the pass is over, not just to hide the plane quad. */
  uScanGain:  { value: 1 },
  uAccent:    { value: new THREE.Color().setRGB(176 / 255, 188 / 255, 190 / 255, THREE.SRGBColorSpace) },
  uAccentMix: { value: 0 },
  uTime:      { value: 0 },
  uFogNear:   { value: 21 },
  uFogFar:    { value: 54 },

  /* ------------------------------------------------------------------
     PHASE 11 — THE GLASS CROSSING.

     One scalar, shared by every material on the site, that says how far
     inside a pane of glass the camera currently is. It is read in the
     VERTEX stage and it bends the projected position: a weak barrel term
     plus the two low-frequency waves float glass actually has. That is
     refraction — the ray is deviated by the medium — done where the
     medium is, rather than a blur laid over the finished picture.

     It is deliberately NOT a post-process. Phase 8.3 established that
     this page may have exactly one full-screen surface, and a screen-space
     refraction needs a second one to sample from. See PART 24.
     ------------------------------------------------------------------ */
  uCross:     { value: 0 },

  /* ------------------------------------------------------------------
     PHASE 11 — THE 360 SAMPLING SHELL.

     A capture round is a sphere of measurements taken from one tripod
     position, so the sampling event is a SPHERE growing out of that
     position. Points inside it have been recorded and stay; points on
     its surface are being recorded now and flare; points outside it do
     not exist yet. Three uniforms and one distance, which is the whole
     of it — there is no second point cloud and no particle system.
     ------------------------------------------------------------------ */
  uSampleC:   { value: new THREE.Vector3(0, 0, 0) },
  uSampleR:   { value: 0 },
  uSampleW:   { value: 0.30 },
  uSampleG:   { value: 0 },
};

const SCAN_DECL = /* glsl */ `
  uniform vec3  uScanAxis;
  uniform float uScanPos;
  uniform float uScanWidth;
  uniform float uScanGain;
  uniform vec3  uAccent;
  uniform float uAccentMix;
  uniform float uTime;
  uniform float uFogNear;
  uniform float uFogFar;
  uniform vec3  uSampleC;
  uniform float uSampleR;
  uniform float uSampleW;
  uniform float uSampleG;

  float scanGlow(vec3 wp) {
    float d = abs(dot(wp, uScanAxis) - uScanPos) / uScanWidth;
    return exp(-d * d) * uScanGain;
  }

  /** On the shell: being recorded right now. */
  float sampleShell(vec3 wp) {
    if (uSampleG <= 0.001) return 0.0;
    float d = (distance(wp, uSampleC) - uSampleR) / max(uSampleW, 1e-4);
    return exp(-d * d) * uSampleG;
  }

  /** Inside the shell: already recorded, and therefore still there. */
  float sampleHeld(vec3 wp) {
    if (uSampleG <= 0.001) return 1.0;
    float held = smoothstep(uSampleR + uSampleW, uSampleR - uSampleW * 0.4,
                            distance(wp, uSampleC));
    return mix(1.0, held, uSampleG);
  }
`;

/* The lens lives in the vertex stage and is declared apart from SCAN_DECL,
   because two shaders include both and a uniform may be declared once. */
const LENS_DECL = /* glsl */ `
  uniform float uCross;

  vec4 gdfLens(vec4 clip) {
    if (uCross <= 0.0005) return clip;
    float w = clip.w;
    if (abs(w) < 1e-4) return clip;
    vec2 n = clip.xy / w;
    float r2 = dot(n, n);
    /* Barrel at the centre, and the pane's own two waves across it. The
       constant term is what makes the crossing a PINCH rather than only a
       swell — a boundary the picture is pulled through. */
    vec2 d = n * (uCross * (0.34 * r2 - 0.085));
    d.x += uCross * 0.026 * sin(n.y * 8.5);
    d.y += uCross * 0.013 * sin(n.x * 6.0);
    return vec4((n + d) * w, clip.z, clip.w);
  }
`;

const share = (extra) => Object.assign({}, scanUniforms, extra);

/* ---------------- solid surfaces ---------------- */
export function makeSurfaceMaterial({ dark, light, opacity = 1, bands = 0, side }) {
  return new THREE.ShaderMaterial({
    transparent: true,
    ...(side ? { side } : null),
    uniforms: share({
      uDark:    { value: new THREE.Color().setRGB(...dark, THREE.SRGBColorSpace) },
      uLight:   { value: new THREE.Color().setRGB(...light, THREE.SRGBColorSpace) },
      uOpacity: { value: opacity },
      uBands:   { value: bands },
    }),
    vertexShader: /* glsl */ `
      ${LENS_DECL}
      varying vec3 vWorld;
      varying vec3 vNormalW;
      varying float vFog;
      void main() {
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWorld = wp.xyz;
        vNormalW = normalize(mat3(modelMatrix) * normal);
        vec4 mv = viewMatrix * wp;
        vFog = -mv.z;
        gl_Position = gdfLens(projectionMatrix * mv);
      }
    `,
    fragmentShader: /* glsl */ `
      ${SCAN_DECL}
      uniform vec3  uDark;
      uniform vec3  uLight;
      uniform float uOpacity;
      uniform float uBands;
      varying vec3 vWorld;
      varying vec3 vNormalW;
      varying float vFog;

      void main() {
        vec3 n = normalize(vNormalW);
        /* PHASE 11 — the terrain is looked at from UNDERNEATH in MEASURE,
           and a heightfield lit by its own upward normal from below is a
           bright ceiling. Flipping the normal on back faces is what makes
           the underside of the ground read as the underside of ground.
           A no-op for every FrontSide material, which is all the others. */
        if (!gl_FrontFacing) n = -n;
        vec3 v = normalize(cameraPosition - vWorld);

        float key  = clamp(dot(n, normalize(vec3(0.42, 0.86, 0.30))) * 0.5 + 0.5, 0.0, 1.0);
        float fill = clamp(dot(n, normalize(vec3(-0.65, 0.22, -0.55))) * 0.5 + 0.5, 0.0, 1.0);

        vec3 col = mix(uDark, uLight, pow(key, 1.7));
        col += uLight * fill * 0.10;

        float fres = pow(1.0 - clamp(dot(n, v), 0.0, 1.0), 2.7);
        col += uAccent * fres * (0.09 + 0.26 * uAccentMix);

        float g = scanGlow(vWorld);
        col += uAccent * g * (0.13 + 0.30 * uAccentMix);

        /* PHASE 11 — where the sampling shell is crossing this surface.
           The samples come OFF the surfaces, so the surfaces say so. */
        col += uAccent * sampleShell(vWorld) * 0.55;

        // elevation banding — the terrain reads as a contoured survey in MEASURE
        if (uBands > 0.001) {
          float e = vWorld.y / 0.40;
          float w = fwidth(e) * 1.5 + 1e-5;
          float f = fract(e);
          float line = 1.0 - smoothstep(0.0, w, min(f, 1.0 - f));
          col += uAccent * line * uBands * 0.42;
        }

        float fog = smoothstep(uFogNear, uFogFar, vFog);
        gl_FragColor = vec4(col, uOpacity * (1.0 - fog));
      }
    `,
  });
}

/* ---------------- line work ---------------- */
export function makeLineMaterial({ color, opacity = 1, tint = 1, boost = 1, ribbon = false }) {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.NormalBlending,
    // Ribbon geometry is two-sided quads, not gl.LINES.
    side: ribbon ? THREE.DoubleSide : THREE.FrontSide,
    uniforms: share({
      uColor:   { value: new THREE.Color().setRGB(...color, THREE.SRGBColorSpace) },
      uOpacity: { value: opacity },
      uDraw:    { value: 1 },
      uTint:    { value: tint },
      uBoost:   { value: boost },
    }),
    vertexShader: /* glsl */ `
      ${LENS_DECL}
      attribute float aOrder;
      varying float vOrder;
      varying vec3  vWorld;
      varying float vFog;
      void main() {
        vOrder = aOrder;
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWorld = wp.xyz;
        vec4 mv = viewMatrix * wp;
        vFog = -mv.z;
        gl_Position = gdfLens(projectionMatrix * mv);
      }
    `,
    fragmentShader: /* glsl */ `
      ${SCAN_DECL}
      uniform vec3  uColor;
      uniform float uOpacity;
      uniform float uDraw;
      uniform float uTint;
      uniform float uBoost;
      varying float vOrder;
      varying vec3  vWorld;
      varying float vFog;

      void main() {
        // uDraw is the draw-on head. The 1.12 bias guarantees that uDraw == 1
        // leaves NOTHING partially drawn — without it the last ~11% of every
        // line layer (here: the dimension lines) stays faded forever.
        float drawn = clamp((uDraw * 1.12 - vOrder) * 9.0, 0.0, 1.0);
        if (drawn <= 0.001 || uOpacity <= 0.001) discard;

        float g = scanGlow(vWorld);
        vec3 col = mix(uColor, uAccent, clamp(uAccentMix * uTint, 0.0, 1.0));
        col += uAccent * g * uBoost * 0.85;

        float fog = smoothstep(uFogNear, uFogFar, vFog);
        float a = uOpacity * drawn * (1.0 + g * uBoost * 0.9) * (1.0 - fog);
        gl_FragColor = vec4(col, clamp(a, 0.0, 1.0));
      }
    `,
  });
}

/* ---------------- point cloud ---------------- */
export function makePointsMaterial({ color, size = 1.5, opacity = 1 }) {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: share({
      uColor:   { value: new THREE.Color().setRGB(...color, THREE.SRGBColorSpace) },
      uSize:    { value: size },
      uOpacity: { value: opacity },
      uResolve: { value: 1 },
      uScatter: { value: 0 },
      uBoost:   { value: 1 },
      uPR:      { value: 1 },
      uRef:     { value: 22 },
    }),
    vertexShader: /* glsl */ `
      ${SCAN_DECL}
      ${LENS_DECL}
      attribute float aRand;
      attribute float aLayer;
      uniform float uSize;
      uniform float uResolve;
      uniform float uScatter;
      uniform float uBoost;
      uniform float uPR;
      uniform float uRef;
      varying float vAlpha;
      varying float vGlow;

      void main() {
        float r = clamp(uResolve * 1.75 - aRand * 0.75, 0.0, 1.0);
        r = r * r * (3.0 - 2.0 * r);

        vec3 dir = normalize(vec3(
          aRand - 0.5,
          fract(aRand * 37.13) - 0.42,
          fract(aRand * 91.71) - 0.5
        ) + 0.0001);

        vec3 p = position + dir * (1.0 - r) * uScatter;
        vec4 wp = modelMatrix * vec4(p, 1.0);
        vec4 mv = viewMatrix * wp;
        gl_Position = gdfLens(projectionMatrix * mv);

        float g = scanGlow(wp.xyz);
        vGlow = g * uBoost;
        /* PHASE 11 — a sample exists once the round has reached it. The
           shell flares as it passes; everything behind it stays. */
        float shell = sampleShell(wp.xyz);
        vGlow += shell * 1.35;
        float fog = smoothstep(uFogNear, uFogFar, -mv.z);
        vAlpha = r * sampleHeld(wp.xyz)
               * (0.30 + 0.22 * aLayer + 0.95 * vGlow) * (1.0 - fog);
        /* Point size scales with 1/distance, so a state whose camera comes
           in close turns the cloud into an opaque wall across the whole
           viewport — and the type behind it becomes unreadable. Survey
           points are samples, not sprites: cap them. */
        float ps = uSize * uPR * (0.55 + aRand * 0.85) * (1.0 + vGlow * 1.6) * (uRef / max(-mv.z, 0.001));
        gl_PointSize = min(ps, uSize * uPR * 5.5);
      }
    `,
    fragmentShader: /* glsl */ `
      ${SCAN_DECL}
      uniform vec3  uColor;
      uniform float uOpacity;
      varying float vAlpha;
      varying float vGlow;

      void main() {
        vec2 c = gl_PointCoord - 0.5;
        float d = dot(c, c);
        if (d > 0.25) discard;
        float a = smoothstep(0.25, 0.015, d);
        vec3 col = mix(uColor, uAccent, clamp(uAccentMix * 0.9, 0.0, 1.0));
        col += uAccent * vGlow * 0.8;
        gl_FragColor = vec4(col, a * vAlpha * uOpacity);
      }
    `,
  });
}

/* ---------------- the scan plane itself ---------------- */
export function makeScanPlaneMaterial() {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    depthTest: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    uniforms: share({ uOpacity: { value: 0 } }),
    vertexShader: /* glsl */ `
      ${LENS_DECL}
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = gdfLens(projectionMatrix * modelViewMatrix * vec4(position, 1.0));
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3  uAccent;
      uniform float uOpacity;
      varying vec2 vUv;
      void main() {
        vec2 p = vUv * 2.0 - 1.0;
        float r = length(p);
        float a = pow(clamp(1.0 - r, 0.0, 1.0), 3.4) * uOpacity;
        if (a <= 0.001) discard;
        gl_FragColor = vec4(uAccent, a);
      }
    `,
  });
}
