# PHASE 11 — THE DATA DESCENT

One continuous journey through one building, in place of two sections that
described one.

---

## A. WHAT WAS REMOVED

### 1. "EGY HELY. NÉGY OLVASAT." — removed entirely

The section was a sticky block of 220vh with a heading and lede in the top
left, the digital twin centred behind them, and a four-cell representation
selector along the bottom edge — VALÓSÁG / CAPTURE / MEASURE / QUANTIFY.
Scrolling stepped a `spstate` index; pressing a cell scrolled to that
state's position. The camera was identical to the decimal in all four
states and only the layer weights changed.

Captured before deletion: `qa/p11/before/desk-place-0..3.png`,
`qa/p11/before/phone-place-0..3.png`, and the markup itself in
`qa/p11/before/removed-markup.html`.

Gone with it:

| what | where |
|---|---|
| the section markup, 3 401 chars | `index.html` |
| `.place`, `.place__*`, `.pstate` — 100 lines | `src/styles/fusion.css` |
| `SAMEPLACE_STATES` and its stop block | `src/modules/stops.js` |
| the `spstate` reader, the chip handler, the head-dodge rule | `src/modules/narrative.js` |
| `spReality` / `spCapture` / `spMeasure` / `spQuantify` in `VIEWS`, `SCAN`, `P` and `ARCH` | `src/webgl/presets.js` |
| `test/sameplace.test.mjs` | deleted |

`test/descent.test.mjs` asserts the four presets are absent from all three
tables, so the states cannot come back by accident.

### 2. The FUSION pipeline — removed; the deliverable kept

`#fusion` was a five-state pinned rail over 520vh: PHYSICAL, CAPTURE,
PROCESS, DATA, DECISION, each a heading and a line of copy beside a
transforming object. The journey now performs all five of those states as
one movement through one building, so the rail said a second time what the
object was already saying.

What it carried that the journey does not is the **deliverable**. That is
what is left: `#fusion` is now a 524px section titled WHAT ARRIVES with the
four output rows, and it is the point where the page's normal structure
returns.

### 3. WHY / METHOD — removed

`DIGITALIZÁCIÓ — "physical and drawing-based information in structured
digital form, under one logic"` is precisely and only what the journey
spends eleven screens doing. The chain is INPUT → PROCESS → RESULT now.
Kept in `qa/p11/before/removed-why-method.html`.

### 4. Two collisions retitled

* the QUANTIFY chapter's headline was `FROM DRAWING / TO DATA.` — word for
  word the sentence the journey distributes across the L01 floor plan. It
  is `COUNTED, / NOT ESTIMATED.` now.
* the SERVICES lede argued that the three services are three readings of
  one project. It says what is practical instead: they are separately
  orderable, and here is what each needs.

**Net:** 740vh of pinned scroll removed, 1 150vh added. Page height at
1440×900: 25 995px.

---

## B. SPATIAL STORYBOARD

Seventeen states, no two of which share a layout.
`qa/p11/sheet-desk.png` · `qa/p11/sheet-phone.png` · `qa/p11/story/`

| # | state | frame | type |
|---|---|---|---|
| 01 | EXTERIOR | the building at 22 units, material | `SITE / 001` · **GO** · **INSIDE.** cropping right |
| 02 | APPROACH | closing on the south facade | the same lockup, `L00–L02 · 2 317,2 M²` arriving |
| 03 | GLASS | inside the pane of `L01-W01-04` | `GLAZING` · `L01-W01-04` |
| 04 | INTERIOR | the room's long diagonal | **PRESENCE.** cropping left · `L01 / +4.00 M` · `CP-11` |
| 05 | CAPTURE | turned to the two glazed facades | **EVERY** / **VIEW** / **REMAINS.** on three positions |
| 06 | FLOOR CROSSING | inside the slab, dark | `FINISH` / `SLAB 0,32 M` |
| 07 | UNDERWORLD | under the ground, terrain overhead | the datum ladder, full height · **DEPTH.** cropping bottom-right |
| 08 | VOLUME | the cut prism from beneath | **411,7** · `M³` · `FILL 415,6 M³` |
| 09 | ASCENT L00 | rising through the ground floor | **L00 GROUND ±0,00** at extreme scale |
| 10 | ASCENT L01 | rising through the work floor | **L01 WORK +4,00**, cropping right |
| 11 | ASCENT L02 | rising through the project floor | **L02 PROJECT +7,60**, cropping top-left |
| 12 | COLLAPSE | perspective flattening | `PROJECTION — 37% ORTHOGRAPHIC`, live |
| 13 | TYPOGRAPHIC PLAN | orthographic L01 | **FROM DRAWING TO DATA.** in four rooms |
| 14 | DISASSEMBLY | the sheet tipped up, layers lifted | the layer key, resolving line by line |
| 15 | DATA FIELD | the drawing dissolved | **2 317,2** · **69** · **28** · **70,2** · **17** · **14** · **+11,20** · **32** |
| 16 | RESOLUTION | descending back onto the site | **REALITY,** arriving |
| 17 | FINAL STATEMENT | the building at distance | **REALITY,** / MADE / **COMPUTABLE.** |

---

## C. CAMERA PATH

`src/webgl/descent.js` — 34 keys desktop, 26 mobile. One route, no cuts.

```
  exterior  22 units out, axonometric          y  +0.59
  approach  8.2 → 4.3 → 2.1 units off the      y  +0.86
            south facade (keyed at ratio)
  glass     INTO the pane of L01-W01-04,        y  +0.58
            x −2.00, z +2.30, sill 0.85 head 2.95
  interior  the room's long diagonal           y  +0.5566  (1.60 m eye)
  capture   TURNS where it stands, south        y  +0.5566
            glazing → west glazing
  floor     looks down over three keys, then    y  +0.33 → +0.23 → −0.12
            through the slab (soffit 0.1977)
  under     KEEPS FALLING — pure Y             y  −0.76 → −2.40
  volume    dollies back along the view axis,  y  −2.15
            2.1 → 3.4 → 5.7 units
  ascent    dollies through, then rises        y  −0.72 → +0.26 → +0.54 → +1.21
            past L00, L01, L02
  above     over the roof                       y  +2.90
  collapse  fov 40° → 21°, ortho 0 → 1          y  +7.40 → +12.10
  plan      orthographic, north up              y  +16.60
  apart     16° tilt at the SAME radius         y  +14.95
  field     20° tilt at the SAME radius         y  +14.42
  resolve   descends onto the site              y  +7.20 → +6.40
```

Eye travel: **78.7 world units — 421 m at building scale.** Vertical range
−2.40 to +16.60. Composition of the travel: **53.4% along the view axis,
36.1% vertical, 10.5% lateral.**

Everything is measured rather than composed. The window is a real opening
in the real wall of the reference room; the soffit is `floorY('L01') −
SLAB_T/MPU`; the eye is the finished floor plus 1.60 m; the plan is that
level's own. `test/descent.test.mjs` asserts each of those against
`webgl/levels.js` rather than against a number in this file.

**The path is written in the pacing map, not beside it.** A key is
`A('interior', 0.45)` — "forty-five per cent of the way through INTERIOR" —
and where that lands is arithmetic over `CHAPTERS`. Re-timing a state moves
its own keys and nothing else's. That is not tidiness: an earlier cut
carried absolute progress numbers, and changing one state's span by twelve
thousandths silently moved thirty keys into the wrong states.

---

## D. TYPOGRAPHY

`src/styles/descent.css` declares a second, local system. Its rules are
DEPTH, DATUM, ARCHITECTURE, MOVEMENT — a 12 × 12 field per state, two type
tiers only (display for words encountered in space, mono for identifiers
and elevations), and entrances that are **opacity plus a short vertical
rise and nothing else.** There is no horizontal entrance anywhere in the
file.

How the copy escapes the site grid:

* **It crops.** INSIDE. runs past the right edge; PRESENCE. past the left;
  DEPTH. past the bottom; COMPUTABLE. past the left. Each oversized word
  is anchored to the ONE edge it crops on — a word that loses both ends is
  not a crop, it is unreadable, which is what the first mobile cut did.
* **It is placed by the building.** In state 13 the four words stand in
  four real rooms, at sizes derived from those rooms (below).
* **It is fragmented but ordered.** EVERY / VIEW / REMAINS. are three
  elements at three positions with three arrival times, in document order.
  So are REALITY, / MADE / COMPUTABLE.
* **Nothing is centred by default,** and there is no headline-over-lede
  anywhere in the eleven screens.
* **Two custom properties drive all of it** — `--on` (how present this
  state is) and `--k` (progress through it), written once per state per
  frame. There is no tween per word and no ScrollTrigger per element.

---

## E. CAPTURE

The round is a **sphere growing out of CP-11**, the eleventh station of the
capture round, standing in L01-R07. Four shared uniforms
(`src/webgl/materials.js`): origin, radius, shell width, gain.

* points **on** the shell are being recorded now, and flare;
* points **inside** it have been recorded and stay;
* points **outside** it do not exist yet.

The samples come off the GLB's own surfaces — `archScene`'s per-level
`MeshSurfaceSampler` clouds, which is why they describe the furniture and
the openings rather than a box. The surfaces answer the shell too, so a
wall lights where the round crosses it.

Sparse on purpose: the CAPTURE preset carries the point layer at **.34**,
not Phase 8's .82. PLACE first, DATA second. The Scan Plane is held quiet
through the whole state (`scan: 0.35`) because two readings of one room at
once is the noise Phase 9 already removed.

The round only ever grows, and it stops **gating** before it stops
existing — a test asserts the radius never decreases while it is live,
because collapsing the two un-samples the room.

---

## F. FLOOR CROSSING

The camera looks down over three keys — the first cut did the whole
eighty-five degree pitch in one segment and the frame metric measured
twenty-three degrees per wheel notch, which is a camera being yanked. Then
it descends through L01's finished floor at +0.2575, through the slab, past
the soffit at +0.1977, and out under L00.

The Scan Plane is **parked** at that soffit for the passage — the only
place in the site where it does not free-run — so the camera descends onto
a stationary section line, the line opens across the frame, goes edge-on at
the crossing and closes underneath. `archScene.setInside()` makes the shell
double-sided for the duration, because a camera inside a solid sees nothing
through a back-face cull. The fog closes to half a world unit so nothing
from either storey leaks into a space that has neither.

**On the layer build-up, honestly:** the model knows the structural slab is
0.32 m and it knows a level has a finish. It does not know a rétegrend.
So the section says `FINISH` and `SLAB 0,32 M`, and the Hungarian line
under it says *"Általános szerkezeti megnevezés — nem rétegrend."*

---

## G. MEASURE UNDERWORLD

The camera does not travel across to a viewpoint under the site — **it
keeps falling**, and what changes is where it is looking. By the second key
it is 1.6 units below the lowest ground on the parcel, with the terrain
overhead as a topographic ceiling and the building above that as a ghost at
7% of the shell.

The terrain gets a normal flip on back faces, so the underside of ground
reads as the underside of ground. The atmosphere is the site's own fog
band pulled in to four world units. Exposure drops to 0.40.

The first tuning of this state gave the terrain .95 with full elevation
banding and it came out as a **saturated lime field with the contour lines
invisible inside it**. What makes ground read as *surveyed* is the opposite
balance: the surface dark and matte, the LINES carrying the reading. The
accent is a **dose** inside the journey — the colour is still the page's
lime, at 18% of the strength a hero frame takes, because here the tinted
thing is the whole viewport.

### The datum, and what it deliberately does not say

The ladder is the terrain's own contour set at the interval the survey
chose — max **+1,20**, two intermediate lines, the cut level **−0,29**
marked, min **−1,79** — and it is labelled `TEREP · RELATÍV DATUM · 0,25 M`.
Under it, on the page:

> *A terep saját datumja. Az épület szintkótái külön rendszerben — a két
> lépték összehangolása még nem történt meg.*

The parcel resolves at 2,21 m per world unit and the building at 5,35,
because each was solved against a figure its own domain owns. One ladder
containing +7,20 over −2,18 would be two rulers printed as one, and they
disagree by a factor of 2,4. **No cross-domain elevation is printed
anywhere in this phase.** The building's own elevations appear only in the
ascent, where they are the building's alone.

### The volume

`411,7` at the largest size on the site, with `M³` hung off it as a
drawing's unit would be, `CUT` above and `FILL 415,6 M³` below. Both are
integrated over the same height field the view renders — move the cut level
and the number moves. Labelled *demonstrációs parcella*.

---

## H. ASCENT

Up through terrain, L00, L01, L02, at the building's own elevations.

What made the first cut of this wrong: `edges` is the *procedural* massing's
outline, and with the GLB source running the massing no longer contains the
building — so weighting it at 1 bought a bright outline of two outbuildings.
What actually draws the structure the camera rises through is the **level
drawings**: each storey's plan is its walls, its openings and its core, at
that storey's own elevation, and rising past three of them is rising past
three floor plates. The shell stays at .22, the furniture at .03.

Three level marks at extreme scale, each allowed to leave the frame. They
peak **where the camera crosses the floor they name** — `markFractions()`
reads the camera path for that, so a mark cannot end up beside a different
floor, and a test asserts they never overlap.

---

## I. PERSPECTIVE → PLAN

Two mechanisms, felt at different points:

1. **The field narrows.** 40° during the ascent to 21° over the roof, with
   the camera dollying back to hold the building's size. Real long-lens
   compression: the convergence leaves the vertical edges while the
   building is still a building.
2. **The projection flattens.** The projection matrix is then interpolated,
   element by element, toward an orthographic one framing the **same
   half-height at the target plane** — `distance × tan(fov/2)` — so nothing
   changes size at the moment of the change. What leaves is the perspective
   divide. At `ortho: 1` there is no vanishing point in the frame, and a
   floor plan is what an orthographic projection of a building from above
   *is*, not a picture that resembles one.

The readout on screen prints the number the matrix is actually being
blended with.

**North is up.** Looking straight down, screen-up is whatever is left of
the world up once the view direction is removed from it — which approaches
zero, so the roll becomes whatever the last thousandths of the camera
offset happened to be. The plan arrived on screen at seventeen degrees. Two
things fixed it: the camera's up vector hands over to −Z as the view goes
vertical (blended over the last eight degrees of tilt, where the two
answers already agree), and every vertical key sits on its target's own X.
A test enforces the second for both edits.

---

## J. PLAN TYPOGRAPHY

The four words stand in **the largest non-circulation room in each quadrant
of the plan**, taken in plan reading order: north-west, north-east,
south-west, south-east. On the current L01 that resolves to Nyitott iroda,
Projektszoba, Tárgyaló 01 and Tárgyaló 02. Move a partition and the words
move, because they are standing in rooms rather than at percentages.

**The room sets the size, not the word.** The first rule fitted each word to
its room's width, which is what a text box does and not what a drawing
does: it made TO — two letters in an 8.6 m room — the largest word on the
sheet and DRAWING the smallest, so the emphasis was a function of spelling.
The size now comes from the room's shorter side, so the two 70,2 m² meeting
rooms take the same size and read as a pair, the open-plan floor takes the
largest, and the one-bay project room the smallest. A long name in a narrow
room overhangs it, exactly as on a real sheet.

The heading is **one element with four spans in reading order**; only their
position is moved. A screen reader is read "FROM DRAWING TO DATA." A CSS
fallback places them on the block's own field if the projector never runs.

**The zone hatch was halved** to 0.52-unit spacing, because PART 12 asks for
language to be positioned in the drawing's *empty rooms* and a hatch at
drafting density leaves none.

### One bug worth recording

The words were projecting from a **stale camera**. `lookAt` writes a
quaternion; the matrixWorld it implies does not exist until the renderer
builds it — so projecting from a scroll handler reads the *previous*
frame's camera, which across a transition can be most of the way up a
staircase while this frame is a top-down plan. Measured: the four words
landed within 46 px of each other at the centre of the frame
(`qa/p11/probe.png`). The scene now exposes `onFrame()`, called immediately
after each draw with the camera the frame was drawn from, and `project()`
exists for it.

---

## K. DATA DISASSEMBLY

`buildPlanLayers()` builds the L01 sheet a second time, **by what each line
means** rather than by buffer order: walls (exterior double line,
partitions, core shaft), doors (leaf and swing, plus structural openings),
windows (paired ticks through the wall), rooms (the boundary each quantity
is counted inside), zones (hatched, one angle per zone letter), dimensions
(and the terrace).

Every group reads the same `levelFeatures()` the merged sheet reads, so a
wall that moves moves in both. `journey.sheet` crossfades between the two —
they draw identical lines, so the crossfade is invisible; what it buys is
that the ascent can show three floor plates while the plan phase takes one
apart.

Structure does not move. Everything else is lifted **off** it, 0.55 to 2.70
world units, in the order it detaches — which is why it reads as a layer
key rather than an explosion. The camera tips 16° at exactly the plan
camera's radius: under an orthographic projection that is the only move
that can make a vertical separation visible, and it is the one orbit the
whole route is allowed. A test asserts there is no other, and that it is in
the drawing.

The legend counts what it describes: 15 walls, 12 doors, 25 windows, 12
rooms, 6 zones, 2 dimension lines.

## The data field

Eight measured values at four sizes, all read at boot from
`webgl/levels.js` and `data/terrain-metrics.js`: 2 317,2 m² · 69 windows ·
28 doors · 70,2 m² (L01-R07) · 17 (W03) · 14 (D01) · +11,20 m · 32 rooms.
**There is not one typed quantity in the section.** The brief's example
figures (`D01 ×12`, `W03 ×25`) are not the model's; the model's are 14 and
17, and those are what is on screen.

---

## L. RESOLUTION

Not a reversal. The camera **descends out of the drawing** along the axis it
was already tipped along, the ortho blend runs back to 0.10 and then 0, the
plan silhouette resolves into a building, and the building is standing
where it was left — same site, same terrain, at distance.

`modules/stops.js` puts the narrative's own idea of the scene at that same
place at the section's last stop, so the moment the journey hands the
camera back there is nothing to catch up with. Without it the reader would
come out into the manifesto's 9% ghost — the frame from *before* they went
in.

---

## M. HOMEPAGE REDUNDANCY

**Done:** the same-place section (220vh), the FUSION pipeline (520vh), the
WHY/METHOD stage, the QUANTIFY chapter's duplicate headline, the SERVICES
lede's restatement. 740vh of pinned scroll removed.

**Recommended, not done — the three service chapters.** They are the last
place on the homepage where the old grammar survives: copy on one side, the
object crossing to the other, three times. Collapsing them into one compact
three-column index would remove three 50/50 sequences and the object's
left/right travel entirely, and the detail pages would keep the depth.

I did not do it because it is a decision about the **commercial content** —
MIRE JÓ / MILYEN ADATRA VAN SZÜKSÉG / KINEK AJÁNLJUK, and three CTAs — not
about the journey, and because it would unpick Phase 9's tuned chapter
narrative. It is the single highest-value follow-up and it belongs to
whoever owns what those pages have to sell.

**Not redundant, keep:** PROCESS (the commercial workflow — sample, quote,
Drive, delivery — is said nowhere else), OUTPUT (the deliverable), WHY's
remaining INPUT and RESULT.

---

## N. MOBILE EDIT

A **cut** of the same journey, not a compression: same beats, same order,
intermediate frames removed and the survivors held longer. 26 keys against
34; 720vh against 1 150vh. A test asserts the mobile edit never reorders a
beat or invents one, and drops at most two.

* **The interior is a crop, not a smaller room.** A portrait frame's
  horizontal field is its vertical field times an aspect of 0.46, so the
  desktop's 40° of vertical becomes 19° of horizontal — a slot. Widening to
  compensate needs about 100°, which is a fisheye. So the phone frames the
  south glazing at three quarters of a metre, table in front, floor to
  soffit. The room is not smaller on a phone; it is **closer**.
* **The plan fits, and that is arithmetic.** The ortho box is solved from
  distance and field, so on 0.46 the binding constraint is width: the L01
  sheet is 7.25 units across including its dimension lines, needing a
  half-width of 3.63, needing a half-height of 7.9, needing a distance of
  34 at 26°. Below that it loses its dimension lines and then its east wall.
* **The ascent is three crops**, one storey each, rather than one rise past
  three.
* **The assembly is two keys, not four** — a darkening and a return.
* **Every exterior frame is nearer than the desktop's**, asserted by a test:
  no frame contains the whole building at a size a thumb could cover.
* Type sizes come down about a third, and every oversized word is anchored
  to the one edge it crops on.

---

## O. PERFORMANCE — PHASE 8.3 INTACT

`node qa/p11/perf.mjs` — 1440×900, dpr 1:

```
  hero, idle (the Phase 8.3 baseline)       60.4 fps
  journey — exterior                        60.4 fps
  journey — inside the room                 60.5 fps
  journey — under the site                  60.4 fps
  journey — the drawing                     60.4 fps
  journey — scrolling end to end            60.4 fps

  shaders compiled while travelling  0
  network requests while travelling  0
  long tasks (>50ms) while travelling 0

  canvases         1
  WebGL alpha      false (opaque)
  backdrop-filter  NONE
  mix-blend-mode   NONE
  filter           NONE
```

Nothing on the prohibited list was introduced. Everything large happens in
the existing opaque pipeline:

* **the glass crossing** is a vertex-stage lens on the shared uniform
  block — a weak barrel term plus float glass's own two waves. The ray is
  deviated where the medium is. It is deliberately not a screen-space
  refraction, because that needs a second full-screen surface to sample
  from and Phase 8.3 established this page may have exactly one.
* **the sampling shell** is four uniforms and one distance.
* **the perspective collapse** is an element-wise interpolation of two
  projection matrices — exact at both ends, free when `ortho` is 0.
* **the underworld** is the site's own fog band, pulled in.
* **`side` is cull state, not a shader define**, so the double-sided
  passage costs two material walks per crossing and nothing per frame.

Two standing `will-change` promises were found and withdrawn:

* the first cut put `will-change: opacity, transform` on every item of
  every state — about twenty permanent render surfaces for eleven screens.
  The promise is per **state** now, made when it starts being read and
  withdrawn when it stops. At most two exist at once.
* the narrative leaves `will-change: filter` on the stage when the
  manifesto's blur was live at hand-over. A full-viewport canvas with a
  standing filter hint is a permanent render surface — Phase 8.3's first
  finding. The journey never blurs, so it withdraws it.

`npm test` 79 pass · `npm run test:browser` 16 pass, including the Phase 8.1
hero-transition gate.

---

## P. MOTION REVIEW

`node qa/p11/motion.mjs 40` — the journey scrolled end to end at 1×, frames
captured and diffed. Data in `qa/p11/rec/motion.json`.

```
  median frame difference        0.12 / 255
  FROZEN (still) frames          10% of the journey
  LATERAL-dominant pairs         4.3%
  CUTS                           only at authored fast beats
```

Pace per state, median change per frame — the pacing map, measured:

```
    entry       0.1     under       0.1     apart       0.3
    glass       0.2     volume      0.1     field       0.0
    interior    0.2     ascent      0.9     final       0.1
    capture     0.4     collapse    0.9
    floor       0.0     plan        0.1
```

**What the recording changed:**

1. **The look-down before the floor crossing was a whip** — 23° per wheel
   notch, done in one segment. It is spread across three keys now.
2. **The approach accelerated into the glass.** A dolly that closes at a
   constant *rate* does not look like one: apparent size goes as 1/distance,
   so the last third covers as much frame change as the first two thirds.
   The approach and the volume dolly are keyed at a constant **ratio** now
   — 8.2 → 4.3 → 2.1 units off the facade.
3. **The floor crossing measured as the slowest state in the journey**, the
   opposite of the pacing map. It moved fast and showed nothing. It gained
   the parked section plane, the double-sided shell and the L01/L00 sheets.
4. **PLAN COLLAPSE was given more of the track** (0.073 → 0.085) after it
   measured as the fastest-changing state.

**Two readings that stay "wrong" and are not defects.** FLOOR and FIELD
measure near zero because a pixel metric cannot see a fast camera in a dark
frame, or eight numbers fading in over a still drawing. Their *scroll*
spans — 5.5% and 4.8% — are what the reader experiences as quick and
medium.

The speed rule is now a test rather than an opinion: `test/descent.test.mjs`
measures the change in what the **frame contains** (turn, plus apparent
size) rather than how far the eye moved, because under an orthographic
projection distance does not affect the picture at all. Any sustained speed
above a calm threshold must fall inside a segment the path explicitly
declares `quick`. Speed has to have been authored.

---

## Q. CRITICAL SELF-REVIEW

**1. Does any part still feel like a horizontal Awwwards slideshow?**
Not inside the journey. There are no panels, no representation selector, no
50/50 split in any of the seventeen states, and 10.5% of the camera's travel
is lateral against 53% depth and 36% vertical. Immediately *after* it, the
three service chapters still slide the object left and right — see M. That
is the honest answer: the journey is clean, its neighbour is not yet.

**2. Where is it most original?** Three places. The **datum ladder that
refuses to lie** — a large vertical measurement system that says on the page
which ruler it is using and that the other one has not been reconciled.
The **plan as the typographic grid**, where the type is sized by the rooms
it stands in, so the composition changes if a partition moves. And the
**perspective collapse**, which is a real projection-matrix interpolation
rather than a crossfade to a picture of a plan.

**3. Where is it most confusing?** The floor crossing. It is legible as a
tonal event — light room, dense dark, open underworld — but a reader who
stops mid-slab sees two labels on near-black and has to infer from the
neighbours where they are. I tried four ways to put a truthful cross-section
in it and none survived contact with the fact that a horizontal section
line on a horizontal soffit seen from directly above is not a line. It
works travelling and is weakest paused.

**4. Is camera travel ever excessive?** 421 m of eye travel over eleven
screens is not excessive for the route, and the sustained-speed test caps
what any single moment can do. The one place it is close is the resolution
on mobile, which pulls out of a 37-unit orthographic view and lands on the
site in under 3% of the track. It is a `quick` beat by design and it sits
just under the ceiling.

**5. Is any typography trying too hard?** `INSIDE.` at 17vw running past the
right edge is the biggest swing and I think it earns it — the sentence
finishes off-screen because the thing it names is off-screen. The one I am
least sure of is `PRESENCE.`: a single abstract word over a photographic
interior is the most "designed" moment in the sequence, and it is doing less
work than DEPTH. or the 411,7.

**6. Is the plan typography genuinely architectural?** Yes, and it is
testable. The words are in rooms chosen by a rule over the plan's own
quadrants, sized by those rooms' shorter sides, projected from the rendered
frame. Change the plan and it all moves. What would make it *more*
architectural is a north arrow and a scale bar — the drawing has dimension
lines but no orientation mark, which a real sheet would carry.

**7. Does MEASURE feel like a distinct world?** Yes. It is the only part of
the site where the camera is below the ground, the only place the terrain is
seen from underneath, the fog is four units instead of twenty-one, exposure
is 0.40, and the building is a 7% ghost overhead. It took two tunings: the
first was a saturated lime field, which is the "sci-fi" the brief rules out.

**8. Does the sequence remain one continuous place?** Yes, by construction.
It is one path with no cuts; every key starts where the last one ended; the
audit reports no gap in either edit. The window is a real opening in the
room the plan later draws, and the plan is that room's own level.

**9. What now feels redundant?** SERVICES' head — the journey has already
shown one site read three ways, so "THREE READINGS OF ONE SITE." is a
caption to something the reader has just travelled through. I trimmed its
lede rather than its title. And, as in M, the three-chapter split layout
itself.

**10. Does this feel like a GoDataFusion world rather than a designed
website?**

For the eleven screens of the journey: yes. The evidence I would put behind
that is not the compositions — it is that **almost nothing in it is
authored twice.** The room is the one `reference.js` resolves. The window
has a sill and a head. The soffit is the slab's. The eye is 1.60 m. The
contour interval is the one the survey chose. The volume is integrated over
the field being rendered. The plan is drawn from the same rectangles the
quantities are counted from, and the layer key counts what it takes apart.
The pacing map exists once and the camera path is written inside it. A
reader cannot see any of that, but it is why the thing behaves like a place
instead of like a sequence of pictures of one.

Where it is still a designed website is the seam: the moment the journey
hands back, the page becomes a page again, and the next section is three
chapters of copy-beside-object. The phase is complete for what it set out
to replace. The homepage is not finished.
