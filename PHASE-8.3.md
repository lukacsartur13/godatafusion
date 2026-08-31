# PHASE 8.3 — THE PRESENTATION PIPELINE

**Does the hero now look smooth on the user's actual browser?**

In Chrome, on this machine, on both of its displays: **yes, and it is not
close.** The hero renders **120,0 frames per second with 100% of its
frame intervals inside one refresh interval** on the 120 Hz monitor, and
**60,0 fps with 100% on time** on the 60 Hz Retina panel. Every route,
not only the homepage.

**In Safari: not yet answered, and I will not pretend otherwise.** Safari
refuses both WebDriver and Apple Events until two settings in Safari ▸
Settings ▸ Developer are turned on, and this phase says not to change a
setting behind the reader's back. So Safari is tested by hand, the page
now measures itself so that hand test produces numbers instead of
impressions, and the procedure is written out in
[`qa/p83/SAFARI.md`](qa/p83/SAFARI.md). Until somebody runs it, the
honest status of criterion 13 is **open**.

There is also a correction to make about where the 28–43 fps came from,
and it is the most important thing in this document. It is in §3.

---

## 1 · WHAT WAS ACTUALLY WRONG

Four mechanisms, and the reason none of the previous phases found them is
that **each one is cheap on its own and they are multiplicative.**

The phase brief predicted exactly this — *"Do not say: '≤15%
individually.' The performance may be multiplicative. Test
combinations."* — and that is what the measurement found.

### The control ladder

Eight compositions, from a blank document to the full page, identical
viewport, identical window position, identical power state, one fresh
navigation each because layerisation is decided once. `qa/p83/controls.mjs`.

| control | composited fps | rAF p50 | rAF p95 | swap | backpressure | layers |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| A · blank html | — | 16,7 | 17,5 | — | — | 4 |
| B · clear-only WebGL | 60,2 | 16,7 | 17,5 | 0,28 | 0,00 | 5 |
| C · hero canvas only, no DOM | 60,0 | 16,7 | 17,5 | 5,05 | 0,03 | 8 |
| D · hero DOM only, canvas hidden | 52,8 | 16,7 | 17,6 | 0,20 | 0,00 | 14 |
| E · canvas + headline | 60,0 | 16,7 | 17,5 | 4,43 | 0,11 | 10 |
| F · canvas + full hero DOM | 59,6 | 16,7 | 17,5 | 6,01 | 0,03 | 17 |
| G · + atmosphere | 60,0 | 16,7 | 17,5 | 1,26 | 0,14 | 18 |
| G2 · + veil, callouts, grid, scan plane | 59,0 | 16,7 | 17,6 | 6,70 | 1,93 | 41 |
| **G3 · + nav, tracker, cursor** | **36,2** | **32,9** | **49,9** | **24,45** | **12,20** | 45 |
| H · the full page | 37,8 | 32,7 | 49,8 | 23,09 | 10,52 | 50 |

The collapse is between **G2 and G3**, and G3 to H — the whole document
below the hero — costs nothing. The page's composition was never the
problem. Three elements in it were.

> A note on how this table was nearly wrong. The first run of this ladder
> reported "canvas only" at 0 composited fps with a suspended renderer:
> hiding `main` with `display:none` collapses the document, which puts
> `#process` at the top of a one-screen page — and `#process` crossing
> 30% of the viewport is the cue that turns the renderer OFF. A control
> that measures a page with no canvas in it looks exactly like a
> measurement. Everything below the hero is hidden with `visibility`
> instead, which keeps the scroll geometry.

### The ablation matrix

Twenty-three single toggles and five combinations, from the full page,
fresh navigation each. `qa/p83/ablate.mjs`. Baseline: 35,3 fps.

| toggled off | fps | Δ | backpressure Δ | layers Δ |
| --- | ---: | ---: | ---: | ---: |
| **nav `backdrop-filter`** | 46,4 | **+11,1** | −4,3 | 0 |
| **stage `__veil`** | 42,6 | +7,3 | −2,6 | −1 |
| **stage `will-change`** | 39,6 | +4,3 | −0,6 | −1 |
| **cursor `mix-blend-mode`** | 38,4 | +3,1 | +0,6 | −1 |
| grain (`mix-blend-mode: overlay`) | 37,0 | +1,7 | +1,1 | 0 |
| atmosphere, whole block | 37,2 | +1,9 | +2,5 | −2 |
| the three accent layers | 36,2 | +0,9 | +3,0 | 0 |
| the 3D callouts (19 promoted layers) | 36,8 | +1,5 | +0,9 | **−19** |
| engineering grid | 35,6 | +0,3 | +2,3 | −2 |
| DOM scan plane | 37,2 | +1,9 | +0,9 | −1 |
| section tracker | 36,6 | +1,3 | +2,0 | −1 |
| telemetry column | 36,8 | +1,5 | +0,6 | 0 |
| service rail | 38,2 | +2,9 | −0,5 | −6 |
| headline | 39,6 | +4,3 | −0,1 | −2 |
| everything below the hero | 38,0 | +2,7 | +0,9 | −5 |
| below hero → `content-visibility: auto` | 37,8 | +2,5 | +0,1 | −3 |
| the strip's infinite CSS animation | 36,4 | +1,1 | +1,6 | −1 |

Nothing individually is worth more than a third of the loss. And then:

| combination | fps | Δ | swap | backpressure |
| --- | ---: | ---: | ---: | ---: |
| cursor blend + nav filter | 58,6 | **+23,3** | 8,44 | 2,30 |
| + grain blend | 58,0 | +22,7 | 10,96 | 2,56 |
| **+ stage `will-change`** | **60,0** | **+24,7** | **1,46** | **0,50** |

Two effects worth 11 and 3 fps apart are worth 23 together, and the
fourth closes it to a locked 60 with the swap cost down from 24,4 ms to
1,5 ms and CoreAnimation backpressure from 10,2 ms to 0,5 ms.

### Why: each one forces a render surface

From the layer tree (`qa/p83/layers-before.json`, produced by
`qa/p83/layers.mjs`, which resolves every composited layer back to its
element and asks the compositor why it promoted it):

```
element                     size        Mpx  paint  reason
main#main                   2498x33668  84.1      1  Overlap
div.atmos                   2998x1804    5.4      2  Overlap
div#stage.stage             2498x1502    3.8      0  FixedPosition, WillChangeFilter
canvas#gl.stage__canvas     2498x1502    3.8      0  Canvas
div.stage__veil             2498x1502    3.8      1  Overlap
div#scanplane.scanplane     2498x450     1.1      0  WillChangeTransform, WillChangeOpacity
header#nav.nav              2498x120     0.3      1  FixedPosition, BackdropFilter
19 x div.anno               ~400x80    0.03ea     0  WillChangeTransform, WillChangeOpacity
```

A **`backdrop-filter`** cannot be composited as a quad. The compositor
has to flatten everything behind the element into a render surface, read
that surface back, blur it, and only then draw the element — and the
thing behind the nav is a full-viewport WebGL canvas that is new every
frame.

**`mix-blend-mode`** is the same shape of cost with a bigger backdrop:
the custom cursor sat at `z-index: 120` over the whole page, so its
backdrop *was* the whole page — and it moved every frame, because its
follow loop ran forever whether or not the pointer had moved.

**`will-change: filter`** promises the compositor a filter, so the
compositor builds a render surface for that element and holds it for the
session. That element is the one containing the canvas. The canvas could
therefore never be handed to macOS as a finished layer; it was drawn into
an intermediate surface first, every frame.

And the fourth, which is not CSS at all:

### The opaque canvas was never opaque

Phase 8.1 measured `alpha: false` as worth half the hero's frame rate and
set it. **It never took effect.** three.js hardcodes the attribute it
passes to `getContext()`:

```js
// three.module.js
const contextAttributes = {
  alpha: true,          // ← always, regardless of the renderer's own flag
  depth, stencil, antialias, premultipliedAlpha, preserveDrawingBuffer,
  powerPreference, failIfMajorPerformanceCaveat,
};
```

The renderer's `alpha` flag only decides what the colour buffer is
*cleared* to. So the pixels were opaque and the **drawing buffer was
not**: the compositor still saw a canvas with an alpha channel, still had
to blend it against what was behind it, and still could not treat it as
an occluder. Verified by reading `gl.getContextAttributes()` out of the
shipped build: `{alpha: true, …}`.

The context is created explicitly now and handed to three, which then
reads its real attributes. On the 120 Hz display this one change took the
hero from **63 → 95–101 composited fps**, with rAF p50 from 15,7 ms to
8,5 ms and p95 from 33,2 ms to 17,4 ms.

Part 16 of the brief says never to fall back to `alpha: true`. This is the
first build in which we were not already there.

---

## 2 · WHAT CHANGED

Four removals, one addition, one QA instrument. No architecture change —
see §4 for why none was needed.

| file | change |
| --- | --- |
| `src/core/env.js` | new `opaqueContext()` — creates the WebGL context with `alpha: false` and hands it to three, because three will not |
| `src/webgl/scene.js` | the hero stage uses it |
| `src/webgl/panorama.js` | so does the 360 viewer |
| `src/styles/nav.css` | `backdrop-filter: blur(7px)` gone from the nav; the gradient carries the separation (`.86/.42` → `.92/.55`). Also gone from the mobile drawer, which is 97% opaque |
| `src/styles/cursor.css` | `mix-blend-mode: difference` gone; the ring keeps its reading on light surfaces through a dark hairline under a light one |
| `src/modules/cursor.js` | the follow loop stops when the cursor has arrived and restarts on the next pointer event, instead of writing a transform on a promoted layer forever |
| `src/styles/hero.css` | `will-change: opacity, filter` gone from `.stage` |
| `src/modules/narrative.js` | `will-change: filter` is set for exactly as long as a blur is actually applied — a few seconds of the narrative scroll — and withdrawn after |
| `src/styles/base.css` | the grain is a plain 3,5% wash instead of a full-viewport `mix-blend-mode: overlay` layer. Over `#080A0B`, overlay was very nearly a no-op anyway |
| `src/styles/panorama.css` | `backdrop-filter` off the viewer's dozen control buttons — each one made the compositor read back the live 360 render behind it |
| `src/styles/evidence.css` | same, on the evidence caption |
| `src/modules/fpsBadge.js` | **new.** `?fps` on any route makes the page report its own frame pacing on screen. Dynamic import behind the flag: a real visitor never fetches it. This is the Safari path (§5) |

There is now **not one `backdrop-filter`, `mix-blend-mode` or permanent
`will-change: filter` left in the stylesheets.**

### The layer tree, before and after

`qa/p83/layers-before.json` / `layers-after.json`, same viewport, same
pixel ratio:

| | before | after |
| --- | ---: | ---: |
| composited layers | 50 | **48** |
| layer memory | 328,5 Mpx | **240,2 Mpx** |
| `div#stage.stage` | its own layer — `FixedPosition, UndoOverscroll, **WillChangeFilter**` | **not a layer at all** |
| `canvas#gl` | `Canvas`, drawn into the stage's render surface | `Canvas`, composited directly |
| `header#nav.nav` | `FixedPosition, UndoOverscroll, **BackdropFilter**` | `Overlap` |

Eighty-eight megapixels of layer memory removed, and the two layers that
were forcing render surfaces are no longer forcing them. The canvas is
now a plain composited quad with nothing between it and the screen.

### What it costs visually: nothing measurable

The four hero states at 1920×1080, 1440×900 and 390×844, before and
after, are in `qa/p83/shots/`. Mean per-channel difference is under
4/255 everywhere, and most of *that* is the ambient yaw being at a
different phase between two live captures. The nav bar reads the same,
the grain reads the same, the cursor reads the same on both the dark
scene and the one light element on the page.

---

## 3 · THE CORRECTION — WHERE 28–43 fps CAME FROM

This has to be said plainly, because it changes what the numbers above
mean.

Partway through this phase the machine was found to be running **84
leaked headless Chrome processes** — QA browsers from the Phase 8.1 and
8.2 tooling that were never reaped, sharing this GPU for hours. Load
average was 16. Every measurement in §1, and every measurement in Phase
8.2's report, was taken with them running.

After killing them and letting the machine settle:

| clean machine, Chrome, hero at idle | renderer draws | on time |
| --- | ---: | ---: |
| 120 Hz external, 1440×900, canvas 1440×813 | 120,0 /s | **100%** at 8,3 ms |
| 120 Hz external, 3440×1400, canvas 3130×1313 | 120,0 /s | **100%** |
| 60 Hz Retina built-in, 1470×930, canvas 2498×1502 | 60,0 /s | **100%** at 16,7 ms |
| all four routes, 120 Hz | 120,0 /s each | **100%** each |

And running the same before/after A/B on the quiet machine — the shipped
build against the Phase 8.2 composition reconstructed on top of it, same
bytes, same machine, back to back (`qa/p83/ab.mjs`):

| | shipped | Phase 8.2 composition |
| --- | ---: | ---: |
| 120 Hz, 1440×900 | 120,0 fps, 100% on time | 120,0 fps, 100% on time |
| 120 Hz, 3440×1400 | 120,0 fps, 100% on time | 120,1 fps, 100% on time |
| 60 Hz Retina, full size | 60,0 fps, 100% on time | 60,0 fps, 100% on time |

**On an unloaded M4, this page held the display's refresh rate before the
changes as well as after them.** I also tried to reproduce the collapse
deliberately, with 4 and then 8 background copies of the full site
competing for the same GPU (`qa/p83/load-ab.mjs`); both compositions held
a locked 60 through all of it. I could not reproduce the original state
on demand.

So the honest reading of §1 is this, and it is not the same claim the
phase brief was written around:

* Under the machine state in which the problem was reported and
  reproduced — idle hero at 35 fps, p50 33 ms, swap 24 ms, backpressure
  10 ms — **those four mechanisms were responsible**, and the evidence is
  not thin: each was measured individually and in combination, on two
  displays, at two pixel ratios, in both directions (removed from the old
  build, and put back one at a time into the new one, reproducing the
  collapse each time), across more than thirty runs.
* On a machine with headroom, they cost nothing you can see. They are not
  a defect you notice when the GPU is idle. They are a defect you notice
  **the moment it is not** — and a real reader's laptop, with tabs and a
  video call and a browser that is not the only thing on the machine, is
  much closer to the loaded case than to my quiet one.
* Part of what Phase 8.2 measured, and part of what this phase was called
  in to fix, was **the measuring environment**. Phase 8.2's headful idle
  figure of p50 33,4 ms is in `qa/p82/after-headful.json`, timestamped
  this morning, taken with those processes running.

What the changes buy, stated correctly, is **headroom**: four full-screen
render surfaces and a transparent drawing buffer removed from a frame
whose actual WebGL draw costs 0,3–0,4 ms. They are still right — they are
work the compositor was doing for effects nobody can see — but the phase
should not claim they took this machine from 30 fps to 120 fps, because
on a quiet machine it was already at 120.

**Also fixed, because it caused this:** `tools/perf/record.mjs` and the QA
launchers now place their windows explicitly and are reaped; and the
lesson is in `src/webgl/scene.js` next to the cadence note — *measure the
machine, not the mess on it.*

---

## 4 · WHAT WAS TESTED AND DELIBERATELY NOT SHIPPED

The brief asked for several architecture candidates. All were measured.
None earned its place, and the reason in every case is the same: once the
render surfaces were gone there was nothing left for them to fix.

**Canvas width (Part 17).** 100vw / 80vw / 65vw / 55vw, on both displays.
On the fixed page all four present identically — 60,2 / 60,0 / 60,0 /
58,6 composited fps on the 60 Hz panel. The full-viewport canvas costs
nothing. Not changed.

**Hero-local canvas, reparented canvas, suspend-at-handoff (Part 06,
architectures B/C/D).** The premise was that the fixed full-page canvas
was the bottleneck. It is not: hiding *everything below the hero* is
worth +2,7 fps before the fix and **exactly nothing** after it. The
same-place 3D concept keeps its single renderer.

**Atmosphere into WebGL (Parts 09/10).** Three full-screen translucent
DOM quads. Removing all three entirely is worth +1,9 fps before the fix
and 0,0 after. Moving them into the shader would be a rewrite of a
working crossfade to buy nothing.

**The veil into WebGL (Part 10/15).** The single best non-blend candidate
— +7,3 fps on the loaded machine. After the fix: 60,2 vs 60,0. Left in
the DOM, where it also still works for the `no-webgl` fallback.

**Consolidating the callouts into one SVG (Part 12).** Worth testing on
layer count alone: the 19 `.anno` elements are 19 permanently promoted
compositing layers. Measured: turning all of them off drops 19 layers and
buys +1,5 fps loaded, 0,0 fixed. A rewrite of the projection code for a
rounding error.

**`content-visibility: auto` below the hero (Parts 05/07).** +2,5 fps
loaded, and it is not supported in the Safari versions this site still
serves. Not added.

**A 60 fps render cadence on a 120 Hz panel (Part 21).** This one was
built, shipped into a working build, and A/B'd — the code is worth
describing because the *result* is the argument. Under load it turned a
69% / 24% / 5% / 2% spread across one to four refresh intervals into
97,6% at a flat 16,7 ms. On a clean machine the hero draws 120,0 fps with
**100%** of intervals at 8,3 ms and a worst frame of 10,9 ms — there is
no jitter left for a cadence rule to smooth, and a rule that can only
take frames away from a scene already meeting every vsync is complexity
with a downside and no upside. **Removed.** The brief's own condition was
*"only do this if presentation becomes genuinely more stable."* It did
not. The reasoning is kept as a comment in `src/webgl/scene.js` so the
next person does not have to build it again to find out.

---

## 5 · SAFARI

Not tested, and not testable from here without changing the reader's
settings, which the brief forbids and I did not do:

```
safaridriver → "You must enable 'Allow remote automation' …"
AppleScript  → "You must enable 'Allow JavaScript from Apple Events' …"
```

What exists instead is a **manual path that produces numbers rather than
impressions**: `?fps` on any route mounts a self-measuring panel.

```
GODATAFUSION — FRAME BADGE
served     120.0 fps
rendered   120.0 fps  (WebGL)
best frame 8.0 ms
on time    100.0 %   <- this is the one that matters
p50 8.3  p90 9.8  p95 10.2  max 10.4 ms
spacing    (900 frames)
  1 x      8.0 ms 100% █████████████████████████
```

It deliberately does not name a refresh rate. rAF timestamps jitter a few
tenths low, which is enough to make a 120 Hz monitor announce itself as
144 Hz and bin every honest frame as late; the *shape* is what decides
whether a page feels smooth and the shape does not need the display's
datasheet. `served` alone is not enough either — 90 fps made of
alternating 8 ms and 25 ms gaps looks worse than a flat 60, and an
average cannot see that.

The six-step procedure, what to write down at each step, and where to
find Safari's own Rendering Frames timeline if a step fails, are in
[`qa/p83/SAFARI.md`](qa/p83/SAFARI.md). Step A — thirty seconds of idle
hero — is the one that decides this phase.

**A prediction, marked as one.** All four removed mechanisms are handled
by WebKit at least as expensively as by Chromium, and two of them worse:
WebKit implements `backdrop-filter` as a genuine backdrop readback and
blur into a separate `CALayer`, and it must flatten a blended element's
entire backdrop into a render surface. If Safari was where the complaint
came from, these are the right four things to have removed. That is a
reason to run §2 of the Safari path, not a substitute for running it.

---

## 6 · TEST CONDITIONS

Recorded, not blamed.

| | |
| --- | --- |
| machine | Apple M4, 10 GPU cores, Metal 4 |
| power | AC, 100%, **Low Power Mode off**, Power Nap on |
| display 1 | Color LCD, built-in, **1470×956 @ 60 Hz**, DPR 2 — *main display* |
| display 2 | Odyssey G85SB, **3440×1440 @ 120 Hz**, DPR 1, positioned left of the built-in |
| browser | Google Chrome, **headful**, ANGLE/Metal, hardware acceleration on |
| server | `npm run build && npm run preview` — the production bundle |

**Both displays were measured separately, every time, and nothing here
generalises one to the other.** They do not behave alike: the 120 Hz
panel is where the transparent drawing buffer showed up (63 → 95 fps) and
the 60 Hz panel is where it was invisible. Every table above says which
one it is.

Headless Chrome has no swapchain and paces rAF off a software BeginFrame
source, so **nothing in this phase that is a claim about frame pacing was
measured headless.** The recordings in §7 are headful too, which is a
change from Phase 8.2.

---

## 7 · THE RECORDINGS

`qa/p83/rec-*/index.html` — the real presented frames with the timestamp
each was presented at, a player that runs them back at real speed, and a
frame stepper. Screencast capture perturbs pacing, so these are evidence
about **continuity** — whether anything teleports, freezes or jumps — and
the pacing evidence is the tracing above.

The idle recording is new this phase and is the one that matters: the
whole claim is about the hero standing still.

| recording | p50 | p90 | p95 | max | frozen frames | flagged jumps | worst local pixel jump |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| [A — 30 s idle hero](qa/p83/rec-idle/index.html) | 9,8 | 16,9 | 17,8 | 31,8 | 1 | 2 | 11,5x |
| [B — slow mode switching](qa/p83/rec-a-slow/index.html) | 9,2 | 16,8 | 17,2 | 20,0 | 0 | 1 | 7,0x |
| [C — rapid mode switching](qa/p83/rec-b-rapid/index.html) | 8,6 | 16,8 | 17,3 | 23,0 | 0 | 0 | 2,3x |
| [D — the scan plane](qa/p83/rec-c-scan/index.html) | 10,1 | 16,9 | 18,1 | 20,8 | 0 | 1 | 8,5x |
| [E — QUANTIFY floors](qa/p83/rec-d-levels/index.html) | 8,5 | 16,8 | 17,0 | 19,1 | 0 | 0 | 2,1x |
| [F — the 360 viewer](qa/p83/rec-e-360/index.html) | 8,5 | 16,8 | 17,1 | 19,0 | 0 | 0 | 2,0x |

Against Phase 8.2's equivalents, which were captured headless:

| | 8.2 p50 | 8.3 p50 | 8.2 p95 | 8.3 p95 | 8.2 max | 8.3 max | 8.2 frozen | 8.3 frozen |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| slow switching | 20,5 | **9,2** | 35,4 | **17,2** | 59,2 | **20,0** | 1 | **0** |
| rapid switching | 27,1 | **8,6** | 45,7 | **17,3** | 92,8 | **23,0** | 0 | 0 |
| the scan plane | 20,4 | **10,1** | 33,6 | **18,1** | 86,0 | **20,8** | 1 | **0** |
| QUANTIFY floors | 27,7 | **8,5** | 43,6 | **17,0** | 75,4 | **19,1** | **14** | **0** |
| the 360 viewer | 20,1 | **8,5** | 32,4 | **17,1** | 48,6 | **19,0** | 0 | 0 |

The acceptance conditions the brief set out, read off that table:

* **idle is smooth** — p50 9,8 ms, one frozen frame in thirty seconds of
  a scene whose ambient yaw is deliberately almost imperceptible;
* **a mode transition is not worse than idle** — rapid switching is p50
  8,6 against idle's 9,8, and slow switching 9,2. Transitions are now
  *faster* than idle, because idle is where the ambient scan plane runs;
* **floors stay continuous** — QUANTIFY floor switching went from
  **fourteen frozen frames to none**, which was the single worst artefact
  in the Phase 8.2 recordings;
* **the scan plane stays continuous** — no frozen frames, one flagged
  frame in a 22-second sequence;
* **the 360 viewer stays continuous** — no frozen frames, no flagged
  frames, worst local pixel change 2,0x its neighbours.

---

## 8 · THE THREE CANDIDATES, AND ONE RECOMMENDATION

### CURRENT ARCHITECTURE — as it was at the start of this phase

*Performance.* On a quiet M4: full refresh rate, 100% on time. Under GPU
contention: 35 fps at idle, p50 33 ms, swap 24 ms, CoreAnimation
backpressure 10 ms — four full-screen render surfaces plus a transparent
drawing buffer competing for a frame whose actual WebGL draw is 0,35 ms.
*Visual quality.* The intended design, complete.

### BEST BALANCED — what is shipped

*Performance.* Quiet: 120,0 fps / 100% on time at 120 Hz, 60,0 / 100% at
60 Hz, all four routes. Contended: still a locked 60 with eight competing
copies of the site on the same GPU. Swap 24,4 → 1,5 ms, backpressure
10,2 → 0,5 ms, and the canvas is genuinely opaque for the first time.
*Visual quality.* Unchanged to within 4/255 mean per channel, most of
which is the ambient yaw moving between captures. One fixed nav bar has a
slightly deeper gradient and no blur behind it; one decorative cursor
gains a hairline instead of an inversion; the grain is a wash instead of
a blend. Nothing in the brand headline, the service logic, the
CAPTURE/MEASURE/QUANTIFY structure, the same-place building, the floor
system or the navigation hierarchy was touched.

### MAX PERFORMANCE — measured, and not worth having

Add: veil into the shader, atmosphere into the shader, callouts
consolidated into one SVG, a partial-width canvas, `content-visibility`
below the fold, a 60 fps cadence cap on high-refresh panels.
*Performance.* On the fixed page, all of it together is worth **0,0 fps**
— every one of those toggles measures 60,0 vs 60,0 once the render
surfaces are gone. *Visual quality.* Loses the veil's per-breakpoint
window on phones, loses the DOM fallback path, caps a 120 Hz display at
60, and replaces a working accent crossfade with uniforms. It buys
nothing and costs several things.

### RECOMMENDATION

**Ship BEST BALANCED. It is what is in the tree.**

Then run `qa/p83/SAFARI.md` §2 in Safari, on the display you actually use,
and send back the badge reading from step A. If the idle hero reads
**on time ≥ 97%** with everything in the `1 x` row, this phase is closed.
If it does not, the Rendering Frames timeline from §3 of that document
will say which WebKit mechanism is holding it, and that is a targeted
follow-up rather than another sweep.

---

## 9 · THE FINAL QUESTION, ANSWERED LITERALLY

> **Does the hero now look smooth on the user's actual browser?**

**In Chrome, on both of this machine's displays: yes — 120,0 fps at 100%
on time on the 120 Hz panel, 60,0 fps at 100% on time on the 60 Hz one,
on every route.**

**In Safari: unknown, because Safari cannot be driven from here without
changing your settings, and I did not change them.** The measurement is
one URL away — `http://localhost:4173/?fps`, thirty seconds, read the
`on time` line — and until you run it the answer to this question is
yours to give, not mine.
