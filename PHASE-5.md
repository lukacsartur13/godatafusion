# PHASE 5 — FINAL DESIGN DEBT + EVIDENCE-READY EXPERIENCE

Scope kept to the three stated goals: the mobile hero, the homepage PROCESS
section, and an evidence architecture. No backend scope, no CMS, no invented
project content. Two Phase 4 defects were reopened, both because regression
testing found a concrete issue (see §A).

---

## A. PHASE 4 STATE — VERIFIED, AND TWO DEFECTS FOUND

A computed-style assertion and a stranded-reveal assertion now run as code
rather than as a reading of the source (`src/core/assert.js` in development,
`qa/p5regress.mjs` in QA, 52 configurations × 4 pages).

**Holding.** Accent alpha declarations compute; the Scan Plane is visible in
PROCESS/FUSION/footer and absent elsewhere; the MEASURE reading steps and the
QUANTIFY output interaction are intact; the 360° compass and horizon render;
no horizontal overflow at any of the 13 tested widths.

**Two real defects, both caught by the new assertions, both fixed:**

1. **Three of the site's largest headlines never appeared.** MANIFESTO
   ("BUILT FOR A NEW WAY / OF BUILDING."), THE FUSION and SERVICES were
   stranded at their reveal's start state — permanently, at every scroll
   speed, on every load. Cause: `overwrite: 'auto'` on a **staggered**
   `fromTo` kills the tween during its own first render and leaves the start
   value inline. Every reveal in `sections.js`, `serviceSections.js`,
   `manifesto.js` and `request.js` now drops `overwrite` and ends with
   `clearProps`, so the resolved state is the stylesheet's own and there is
   no inline value left for anything to strand. The remaining bare
   `gsap.from()` calls were converted to `fromTo` at the same time.

2. **The WHY chain's final node was an empty ring, not a filled mark.**
   `.cf-node { fill: … }` is one specificity point below
   `.chain__f path, .chain__f circle { fill: none }`, so it had been silently
   dropped — the same *shape* of defect as the Phase 4 `rgba()` family and
   equally invisible in the source. Now `.chain__f circle.cf-node`. The
   assertion checks the computed value, which is why it was found at all.

---

## B. MOBILE HERO — BEFORE (why 390×844 was B−)

Measured on the Phase 4 build:

- **The idea was not visible.** The veil opened a 10%-tall band at a
  hardcoded 46–56% — 84px at 26% alpha — and the canvas was additionally
  dimmed to `opacity: .88`. The object read as texture behind the type, not
  as a subject. Nothing on the first screen showed reality becoming data.
- **The viewport was four stacked text blocks.** Headline, a 4–5 line lede,
  two actions, and three full-width mode rows consuming ~350px of 844.
- **~200px of dead space** under the readout, and at 360 the eyebrow ran to
  two lines and the instrument strip wrapped onto two rows.
- The only motion in frame was an infinite 2.8s loop on the scroll track.

---

## C. MOBILE HERO — AFTER

A dedicated phone composition (≤700px), not the desktop hero shrunk.

**Composition** — brand → headline → **signature window** → compact service
rail → state baseline → instrument strip. The window is the flexible grid
row, so it takes whatever height the frame has left.

**The window** is not a card and has no ground: it is where the veil opens.
`modules/heroWindow.js` measures `#heroWindow` and publishes `--win-a` /
`--win-b`, which the veil gradient consumes, and calls
`scene.setFrameCenter(centre, span)`, which aims the camera at the same band.
Three systems, one measured source. Corner registration ticks and a measured
left axis mark the frame; `REALITY —— DATA` is written along its base in DOM,
so the premise survives even if WebGL never loads.

**Scene crop.** A dedicated phone view table (`VIEWS_PHONE`) aims at the
building cluster rather than the parcel centre. The narrow tier's 1.36×
pull-back was right for scroll states and wrong for the one frame that has to
teach the idea. The camera also compensates for window height, so the object
holds the same share of the *window* at 932 and at 800 rather than the same
share of the viewport. QUANTIFY got its own fit (`FIT_PHONE`): `safeX: .52`
reserved half the frame for a text column that does not exist on a phone and
placed the drawing 56 units out — a distant sketch. It is now a drawing.

**Transformation.** One first-contact beat: `scene.heroBeat()` plays the
ambient cycle's solid → scan → data arc once, over 3.1s, then hands back to
the calm free-running loop, which decays to solid mass over the next ~7s. It
is not a new animation — it is the loop the object already runs, played once
at reading speed. No geometry, particles or layers were added. Under reduced
motion the `REALITY → DATA` rule is drawn immediately as a state.

**Service control.** One compact rail: `01 CAPTURE · 02 MEASURE · 03
QUANTIFY`, three channels of one instrument on hairlines, ~52px instead of
~350px. The active mode drives the object, the accent, the rail bar and the
state baseline below it. The Hungarian sub-label is collapsed out of the
layout but kept in each button's accessible name. The baseline is
fixed-height so switching modes can never move the window above it.
MEASURE's veil floor lifts to `.34` (QUANTIFY to `.14`) so a lit service
state reads as an instrument rather than flooding the band.

**Typography.** The eyebrow's tracking, not its words, was spending the width
— it is one line at 360 now. The lede drops its trailing method clause on a
phone rather than truncating mid-sentence with an ellipsis (the clause is
said again in the manifesto and in ABOUT). The headline breaks in the
intended two lines at all four widths, unchanged.

**First-contact communication** — all four present in the first viewport at
every tested width: GoDataFusion · TURN REALITY INTO DATA. · one visible
transformation · CAPTURE / MEASURE / QUANTIFY. Nothing else was added.

### Grading

| width | target | grade | reasoning |
|---|---|---|---|
| 430×932 | A | **A** | 354px window, object fully framed and clear of the actions; strip carries coordinates, index and SCROLL on one line; the most composed of the four. |
| 390×844 | A− min | **A−** | 257px window, object framed with room above and below; every element intended, nothing wrapping. Not an A only because the window is comfortable rather than commanding. |
| 375×812 | A− min | **A−** | 229px window; the coordinate pair is dropped below 400px so the strip stays one line. Same composition, slightly less air. |
| 360×800 | B+ min | **A−** | 218px window; hero height is exactly 800px with no overflow. The mass still reads as a building; the only concession is the dropped coordinate pair. |

Honest note: the *object* at 360 is the same size relative to its window as
at 430 by design, so the four frames differ in air rather than in intent —
which is why 360 grades above its B+ floor rather than at it.

---

## D. PROCESS — BEFORE (why it was one generation behind WHY)

Measured side by side at 1440×900:

- **It was a numbered timeline.** Six full-width rows on hairlines, each
  `index + title + one sentence`. The one shape this design language should
  never fall back to.
- **The right 60% of the frame was empty.** The copy column ended at ~740px
  and the rules ran to 1400. WHY, directly below it, held that same width
  with a figure column whose mark *count* fell stage by stage.
- **The travelling object was a widget, not a subject.** A 34×42px file icon
  in a 96px rail; the only thing that changed across six steps was a text
  label. On a phone it was an icon floating in an empty 46px column.
- **DELIVERY was a dimmed row.** The section did not resolve into anything.
- It carried none of the complexity → clarity argument WHY performs.

---

## E. PROCESS — AFTER

**Visual metaphor.** The journey of project information. One project token
held in a stable reading field on the left while the six stages pass it on
the right, and at each stage the token itself changes. A technical editorial
sequence with data-transfer choreography — deliberately *not* WHY's grammar:
PROCESS is a held object with copy moving past it, WHY is four static frames
on a spine. One tells a project's story; the other states a principle.

**Token behaviour.**

| stage | state | token | what the drawing does |
|---|---|---|---|
| 01 MINTARAJZ / KIINDULÓ ANYAG | SUBMITTED | `SAMPLE_01.PDF` | a raw outlined sheet in a coordinate frame, surrounded by 26 unresolved marks |
| 02 ÁTTEKINTÉS | REVIEWED | `SAMPLE_01.PDF` | dimension lines, witness lines and leaders appear; the raw marks drop to 38% |
| 03 ÁRAJÁNLAT | SCOPED | `SAMPLE_01.PDF` | two regions resolve inside selection brackets; the raw marks are gone |
| 04 PROJECT SPACE | ALLOCATED | `PROJECT_001` | the sheet **expands out of its own footprint** into an organised set of six; the token becomes a project |
| 05 FELDOLGOZÁS | PROCESSING | `PROJECT_001` | **the Scan Plane crosses** — once, here, and nowhere else in the sequence |
| 06 DELIVERY | DATA READY | `PROJECT_001` | the noise is gone, each sheet carries one resolved mark, one node on a clean rule |

The file becomes a project at 04 because that is when it actually does. The
token is deliberately neutral: a real filename here would be a leak, not
proof.

**Stage hierarchy.** `04 / ALLOCATED` in mono microcopy (index and *state*
are separate registers — one is the step, the other is what the project
information IS at that step), then the Hungarian title large, then Hungarian
explanatory copy. English state labels stay technical microcopy, exactly as
specified. One deviation: stage 04's state is `ALLOCATED` rather than the
brief's `PROJECT SPACE`, because the title is already PROJECT SPACE and
printing it twice on the same block reads as a duplicate rather than as a
state.

**Scan Plane.** Used exactly once, at FELDOLGOZÁS — both halves: the accent
line crossing inside the drawing, and `scanPlane.passOver(field)` crossing
the DOM field it sits in. Before it: unstructured noise over the set. After
it: structure. That is what gives the brand gesture meaning here.

**Motion.** No scrub and no pin. Each stage commits as a discrete state when
its own reading line crosses, so the field changes *with* the copy rather
than a third of a screen after it. Verified in the filmstrip at a 900px/s
scroll: the set is mid-expansion in the same frame as the `04 / ALLOCATED`
copy.

**Final state.** DELIVERY is calmer than SUBMITTED — fewer marks, no
generic tick. The resolved outputs are named in the hand-off block below.

**Mobile and reduced motion** share one layout: no field, no pinning, one
figure per stage already in its own state, cloned from the single source so
the drawing cannot drift across six copies. Stages are ~43vh; the section is
3100px. In the static case the Scan Plane is parked *mid-drawing* as a single
line — a crossing, since a still cannot show a pass.

---

## F. PROCESS → WHY

PROCESS ends by releasing the object. What is left on the page is
`PROJECT_001 / OUTPUT` and the resolved output types —
**DRAWING READY · QUANTITY STRUCTURED · SITE DATA READY** — under a line that
says plainly that the output depends on the service ordered, so nothing
implies every project receives every type.

A rule descends from that block at the gutter, continues through the WHY head
(`.why__head::before`, same x, same value), and hands into the chain spine —
which starts at the same x because both sections are padded from the same
gutter. One continuous line from a finished project into the four concepts
that generalise it. The page does not restart from zero: PROCESS tells one
project's story, WHY states the method behind it.

---

## G. EVIDENCE ARCHITECTURE

**Component structure**

```
src/data/evidence.js            interface + PROJECTS (empty) + isPublishable()
src/data/evidence.fixtures.js   dev-only fixtures, not emitted in production
src/modules/evidence.js         the production gate — a filter and a return
src/modules/evidence/sheet.js   the renderer      ┐ lazy chunk,
src/styles/evidence.css         the stylesheet    ┘ never fetched today
```

**Data interface** — `EvidenceProject`: `id`, `service`
(capture/measure/quantify/mixed), `type`, optional `location`, `title`,
`summary`, `facts[]` (the rail), `visual` (**required**: `kind` ∈ panorama |
terrain | drawing | image, `src`, `alt`, dimensions), optional `steps[]`
(01 CONTEXT → 05 RESULT), `status`, `demo`. There is no field for ROI,
percentage improvements or lead counts: a project of this kind is compelling
through technical proof, and the claim limits on this site have to keep
meaning something.

**Disabled production behaviour** — `getEvidence()` returns `[]`, `initEvidence`
returns before the dynamic import, and **no section, no markup and no
placeholder is created**. Measured: `sheet-*.js` transfer = **0 bytes** on a
full homepage load. Two independent guards keep fixtures out: they live
behind an `import.meta.env.DEV` branch (verified: the module is not emitted in
`dist/`, and `grep` for its content finds nothing), and `isPublishable()`
rejects `demo: true` in production regardless.

**Visual language** — a project evidence sheet, not a gallery: one large
visual with a `kind` badge in the service accent, a factual rail beside it in
the same instrument-readout grammar ABOUT uses, and 01–05 across the bottom.
A sheet inherits `--accent` from its service; a mixed project uses the
neutral foreground and names its services in the rail. No fourth accent, no
rainbow.

**Insertion points** — homepage: between WHY and START PROJECT. The two slots
the brief offered both sit inside sequences this phase deliberately joined
(SERVICES → PROCESS is where the renderer suspends, and a photographic asset
there would sit over a live canvas; PROCESS → WHY is the new hand-off), and
proof is strongest as the last thing read before the form. It is one argument
in `main.js` if that judgement is wrong. Service pages: before the sibling
block, so each page argues its own case before offering the other two.

**Future inputs** — CAPTURE: an equirectangular photograph, into the existing
`{ type: 'equirect', url }` station source the 360° viewer already accepts.
MEASURE: real elevation data behind `heightAt()`, from which every figure on
that page is already integrated rather than typed. QUANTIFY: a real
anonymised drawing as a segment buffer or a plane, framed automatically by
the existing `fitViews` solver. Full detail in `DEMO-TO-REAL.md`.

---

## H. DEMO → REAL MAP

Written as `DEMO-TO-REAL.md` — every synthetic representation on the site,
what it is, what replaces it, and the exact seam. Summary:

| demo | real source | seam |
|---|---|---|
| 360° viewer environment (`type: 'world'`) | equirectangular photographs, 6–12 stations | `viewer.setStations()` — no code change |
| the 12 capture positions | the site's real positions | same station table |
| terrain surface (`heightAt()`) | a real survey: point cloud / TIN / raster | one function; mesh, contours, volume, anchors and every number follow |
| every MEASURE figure | the same integration over real ground | **no change** — `terrain-metrics.js` computes, it does not quote |
| the floor plan (`PLAN` / `planFeatures()`) | a real anonymised drawing | segment buffer or plane; camera fitting is already derived from the plan's own extents |
| door / window / room counts, floor area | the real drawing's | derived, not typed |
| hero readout values | real figures, or leave — already labelled as interface demo | copy |
| `47°41'12.8"N` strip coordinates | the real operating region, or removed | copy |
| PROCESS token, PROCESS figure, WebGL fallback, ABOUT object, FUSION labels | **nothing — these stay** | they are diagrams of the method, not claims about a project |

The document also states what must *not* be done: no project entry before the
asset exists, no fixtures as content, no render presented as a survey, no
fourth accent.

---

## I. MOTION

Counted, not felt (`qa/p5motion.mjs`), after walking the whole page:

| section | triggers | scrubbed | pinned | density |
|---|---|---|---|---|
| HERO | 2 | 1 | 0 | HIGH |
| MANIFESTO | 14 | 12 | 0 | MEDIUM–HIGH |
| FUSION | 1 | 0 | 0 | HIGH (driven by the hero's single track) |
| SERVICES | 6 | 0 | 0 | MEDIUM/HIGH |
| PROCESS | 8 | **0** | **0** | MEDIUM |
| WHY | 2 | 0 | 0 | LOW/MEDIUM |
| PROJECT | 3 | 0 | 0 | LOW |
| ABOUT | 3 | 0 | 0 | STILL |
| FOOTER | 2 | 0 | 0 | one gesture |

Totals: 34 triggers, **13 scrubbed (was 14)**, **0 pinned on the whole page**,
**1 infinite CSS animation** (the desktop scroll track; removed from the phone
hero, where the window is now the motion).

Net change: **one continuous scrub removed** (PROCESS, which drove a per-frame
position write across 2558px of scroll, replaced by six discrete commits) and
**one infinite loop removed** from the phone first viewport. Added: one
first-contact beat that runs once. Restored: three headline reveals that had
never played. Motion density improved rather than increased.

Recording review (`qa/p5film.mjs`, 43 desktop / 39 phone frames at a 900px/s
scroll): mobile first contact is readable at 1.5s and the transformation is
unmistakable by 3.6s; the object never competes with the headline because the
veil is measured from the headline's own layout; PROCESS scene changes land in
the same frame as their copy; the Scan Plane fires once, at PROCESSING; the
PROCESS → WHY rule is continuous. Total animation fatigue is lower than Phase
4 on the phone and equal on desktop.

---

## J. RESPONSIVE

`qa/p5regress.mjs` — 13 widths × 4 pages, real stepped scrolling, asserting
no horizontal overflow, no stranded reveal, every accent-derived computed
style resolving, and no console errors. **All pass.**

2560×1080 · 1920×1200 · 1920×1080 · 1440×1200 · 1440×900 · 1280×800 ·
1024×1366 · 1024×768 · 768×1024 · 430×932 · 390×844 · 375×812 · 360×800

Mobile specifics: the hero is exactly viewport-height at all four phone
widths with no overflow; the eyebrow, lede, actions, rail, state baseline and
strip each hold one intended shape; the tallest mode state (MEASURE, which
carries the legal note) fits the fixed baseline with 1px to spare at 360.
Two composition rules were added for tall/wide frames — the PROCESS field is
capped at 46rem above 1700px and lifted on frames taller than 1100px, and the
stage height is capped at 340px so a 1366-tall portrait tablet is not a
column of holes.

---

## K. PERFORMANCE

| | Phase 4 | Phase 5 | Δ |
|---|---|---|---|
| `index.html` | 11.99 kB gz | 14.77 kB gz | +2.78 |
| `main.css` | 18.61 kB gz | 20.07 kB gz | +1.46 |
| `home.js` | 6.66 kB gz | 7.34 kB gz | +0.68 |
| shared form chunk | 16.03 kB gz | 16.37 kB gz | +0.34 |
| `main.js` / `gsap` | 0.40 / 45.16 | 0.40 / 45.16 | 0 |
| **homepage initial** | **98.85 kB gz** | **104.11 kB gz** | **+5.26 (+5.3%)** |
| `three` (lazy) | 121.84 kB gz | 121.84 kB gz | 0 |
| `scene` (lazy) | 14.36 kB gz | 14.70 kB gz | +0.34 |
| evidence (lazy, **unused**) | — | 1.02 js + 0.99 css | **0 bytes fetched** |

The +5.3% is content, not overhead: the PROCESS drawing and six stages of
real markup replace a 2 kB list, and the phone hero window is new DOM. Nothing
was added that is not on screen. (Build-listing note: the ~16 kB chunk Rollup
names `evidence-*.js` is the shared inquiry form — Rollup names a shared chunk
after one of its members. Splitting it by hand to fix the label costs ~0.6 kB
in chunk overhead, so it is documented in `vite.config.js` instead.)

GPU, measured from `renderer.info`, unchanged in every dimension that costs:

| | desktop | phone |
|---|---|---|
| draw calls | 15 | 15 |
| triangles | 33 748 | 11 348 |
| points | 33 000 | 10 700 |
| lines | 8 561 | 3 990 |
| geometries / textures | 15 / 0 | 15 / 0 |
| DPR cap | 1–2 | 1.75 |
| frame interval, idle hero | 16.7 ms median, 18.6 p95 | 16.7 ms median, 18.7 p95 |

No geometry, quality tier, DPR cap or layer was changed. The only phone-side
delta is camera distance (28.3 units × 0.84–1.14, from 32.2), which changes
point-sprite fill, not vertex or draw-call load — and the full-viewport
`opacity: .88` composite on the canvas was removed, which is a saving in the
same place. Both phones hold 60fps.

---

## L. ACCESSIBILITY

- Contrast: **240 text styles measured across all four pages, 0 below AA.**
- Focus: the mode rail rings in the active accent; arrow keys rove, roving
  tabindex is maintained, `aria-selected` and panel visibility track the
  store, Enter commits.
- Touch: no new target under 24px. One regression was found and fixed — hiding
  both the scroll track and its label on the phone strip had left a focusable
  link with no accessible name and a 0×0 hit area; the SCROLL word is back in
  the track's place.
- Reduced motion: PROCESS becomes a clear static sequence — six stages, each
  with its own figure already in its own state, no field, no pinning, no
  content dependent on animation. The phone hero's `REALITY → DATA` rule is
  drawn as a state. Verified with real CDP media emulation after finding that
  Chrome silently ignores `--force-prefers-reduced-motion` (the harness was
  reporting reduced-motion passes it had never actually tested).
- The PROCESS section contains **zero focusable elements**: scroll is the only
  navigation and no interaction is required to understand the sequence.
- The 360° viewer, the form and the mobile menu are untouched.

---

## M. VISUAL QA

`qa/p5/before/` and `qa/p5/after/` — mobile hero at 430/390/375/360, PROCESS
at 2560/1920/1440/1024/390, and the PROCESS → WHY hand-off at 1440 and 390.
`qa/p5/film-1440/` and `qa/p5/film-390/` are the full-page motion recordings.

---

## N. CRITICAL SELF-REVIEW

**1. Weakest homepage frame.** The PROCESS → WHY hand-off at 2560×1080. The
line is right and the release is right, but the outputs occupy the left third
and the remaining 60% is a hairline and nothing else. WHY solved the same
problem with a trailing measure line; this block has not earned one yet
because there is nothing real to measure.

**2. Weakest service-page frame.** The CAPTURE panorama on `/360-camera/`. It
is the most demanding claim on the site — "here is a site you can walk
through" — answered by a procedural environment. The design is fine; the
content is the ceiling.

**3. Does mobile communicate GoDataFusion in the first viewport?** Yes.
Brand, statement, one visible transformation and the three services, at all
four tested widths, with the object as a subject rather than a texture.

**4. Does PROCESS belong beside WHY?** Yes. Side by side, PROCESS reads as
the newer of the two: it has a held object, a state layer WHY does not have,
and a resolved end state. Neither looks older.

**5. Is any section over-animated?** MANIFESTO. Twelve scrubbed triggers —
more than the rest of the page combined — for six words. It works, but it is
now the densest thing on the site by a wide margin. Not touched: it is
strong, and Phase 5 was told not to polish already-strong work.

**6. What is still visually synthetic?** Everything that matters: the site
fragment, the terrain, the panorama, the floor plan, every readout figure.
The site is now honest and well-labelled about it, and completely out of room
to improve by being more so.

**7. What single real asset would improve the site most?** **One real
360° panorama set** — 6–12 equirectangular stations of one site, with
permission to publish. It is the only asset that drops in with zero code
change (the viewer already accepts it), it is the hardest claim to make
without proof, and it converts the CAPTURE page from a demonstration into a
record.

**8. What should NOT be polished further until real content exists?**
The WebGL scene and its presets. The FUSION sequence. The MANIFESTO. The
service-page state systems. ABOUT and the footer. The hero object's ambient
cycle. All of these are at the ceiling of what synthetic content can say, and
more work on them would be motion for its own sake.

---

## O. NEXT DESIGN STEP

**STOP POLISHING. ADD REAL EVIDENCE.**

The remaining weakness is content, not design. The site is now ready to
receive it without a redesign, an architecture rewrite or a visual-language
rethink.

**Collect this package first — one project, one service, in this order:**

1. **One site, captured in 360°.** 6–12 equirectangular stations, 2:1,
   ≥6000×3000, JPEG or AVIF, plus each station's name and its position on the
   site. Ideally the same building shown from outside in one still.
2. **Written permission to publish**, and a decision on how specific the
   location may be (the schema treats `location` as optional for this reason).
3. **The five short readings** — CONTEXT, INPUT, PROCESS, OUTPUT, RESULT — in
   Hungarian, two or three sentences each, with no financial claims.
4. **The factual rail**: project type, service, input, output, status.

That is one `PROJECTS` entry in `src/data/evidence.js` and one folder of
images. It publishes the evidence section on the homepage and on
`/360-camera/`, in CAPTURE's cyan, with no other change anywhere.

The second package is a real terrain dataset for MEASURE; the third is one
anonymised drawing with its quantity schedule for QUANTIFY. `DEMO-TO-REAL.md`
has the exact seam for each.
