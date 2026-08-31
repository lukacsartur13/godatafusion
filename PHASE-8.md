# PHASE 8 — VERTICAL DIGITAL TWIN

Three usable levels, one building, four readings. What follows is the record
of what changed and why, in the order the brief asked for it.

---

## A · PHASE 7 AUDIT — what was preserved

| Kept | Where |
| --- | --- |
| The zero-drift chain | `src/webgl/levels.js` → `blender/dump_plan.mjs` → `plan-features.json` → `build_environment.py`. Still one source; it now describes three floors instead of one. |
| The PBR material system | `blender/config/palette.py`, `texture_manifest.py`, `archMaterials.js`. Untouched. Poly Haven assets, packed maps, progressive texture upgrade, environment map: all as shipped. |
| The rule-based furnishing engine | `blender/room_layout.py`. Same eleven layout rules, same collision/clearance/door-swing validation. Only the schedule grew. |
| The solved capture station | `room_layout.capture_station()`. Same sampler, same scoring, same yaw conversion — run twenty times instead of eight. One rule added, for corridors. |
| The single blend pass | `scene.js applyBlend()`. Every new behaviour is a preset row or a multiplier over the existing layer stack; no second renderer, no second state system. |
| Route asset discipline | MEASURE and QUANTIFY still fetch structure only: **1 GLB, 108 kB, no texture set**. |
| The procedural fallback | `?scene=procedural` and the GLB-blocked path both still produce a working, complete site. |
| Reduced motion, focus rings, contrast | 0 failures, unchanged. |

Two Phase 7 mechanisms could **not** survive and were replaced rather than
patched:

1. **The clip-plane cutaway.** Phase 7 opened the hero by clipping the ceiling
   material against a world-Z plane. On a stack, a level's ceiling *is* the
   floor of the level above — clipping it drops that level through it. The cut
   is now real geometry on a per-level `CEILING` layer, faded by camera
   insideness (`archScene.cutCloseFor`).
2. **The abstract massing.** The podium, the two stacked volumes, the abstract
   core and the canopy occupied exactly the space the three real levels now
   occupy. In the architectural source they are gone; `buildStandIn()` replaces
   them with a stepped three-level mass taken from the level table, which is
   what paints before the GLB lands and what a failed fetch keeps.

---

## B · LEVEL ARCHITECTURE

| | L00 GROUND | L01 WORK | L02 PROJECT | ROOF |
| --- | --- | --- | --- | --- |
| Elevation | ±0,00 m | +4,00 m | +7,60 m | +11,20 m |
| Floor-to-floor | 4,00 m | 3,60 m | 3,60 m | parapet 1,10 m |
| Clear height | 3,68 m | 3,28 m | 3,28 m | — |
| Footprint | 34,24 × 24,61 m | 34,24 × 24,61 m | 25,68 × 24,61 m | 25,68 × 24,61 m |
| Rooms | 12 | 12 | 8 | — |
| Doors | 9 | **12** | 7 | — |
| Windows | 18 | **23** | 18 | — |
| Area | 842,6 m² | 842,6 m² | 632,0 m² | — |
| Furniture | **65** | 93 | 54 | — |

**L00 — public, arrival, unfinished.** Four equal bays either side of one deep
8,2 m circulation spine. Twelve rooms of one size: reception, client waiting,
a boardroom, a lounge, a small project office, a technical room and the
unfinished construction bay. It is the tallest floor because it is the public
one and because a construction volume needs the height.

**L01 — the work floor.** The plan is *inverted* against the ground floor: the
deep 12,3 m band is on the NORTH, where the 158 m² open office wants the quiet
side, and the shallow 8,2 m band faces the entrance. The column rhythm is
A-B-A rather than four equal bays, which is where the three 35 m² focus rooms
come from. One extra north–south link corridor gives the open office a second
route out. The most doors and the most windows in the building.

**L02 — the project floor.** Set back a full structural bay from the east
facade, so a **210,7 m² roof terrace** opens over L01 and the building steps.
The deep band is back on the SOUTH — the mirror of L01 — so a different room
faces the site's cameras on every storey. Fewest rooms, largest rooms: the BIM
and data room (158 m²), the project studio, the plan review room, two enclosed
offices, a plant room and a technical strip opening onto the terrace.

**ROOF.** Parapet, two mechanical volumes, the lift overrun, and a balustrade
round the terrace. Half of it is cut open by the pinwheel section, so it is
never a blank slab in the hero.

---

## C · VERTICAL CORE

One rectangle — 5,35 × 5,88 m at plan x −3,05…−2,05, z −2,15…−1,05 — declared
once in `levels.js` and asserted by test to land inside exactly one `CORE`
room on every level. It holds:

* **A dog-leg stair**, solved from the real floor-to-floor rather than drawn:

  | Run | Rise | Risers | Riser | Going | Flights | Run depth | Arrives |
  | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
  | L00 → L01 | 4,00 m | 22 | 182 mm | 290 mm | 2 × 1,20 m | 4,49 m | **+4,00 m** |
  | L01 → L02 | 3,60 m | 20 | 180 mm | 290 mm | 2 × 1,20 m | 4,20 m | **+7,60 m** |

  Both runs fit inside the 4,75 × 5,29 m clear shaft, and `build-stats.json`
  records `connects: true` / `fitsCore: true` for each. 780 triangles for the
  whole stair.
* **A lift shaft** beside it, with an overrun box on the roof.
* **A slab void** cut through the L01 and L02 slabs at the core rectangle, so
  the stair is not passing through concrete.
* **A door** onto the core room on every level, and that room onto the
  corridor — so the core is reached the same way on all three floors.

QUANTIFY draws the core on every sheet: the shaft outline, nine treads, a
direction arrow and the lift with its diagonals.

---

## D · FLOOR DATA MODEL

`src/webgl/levels.js` is the authority. A level is a **list of room
rectangles** that tiles its footprint; everything else is derived:

* **walls** — the union of every room edge, split into exterior and partition
* **doors** — one per room that touches circulation, sized by what the room is
  (`D01` 1,10 m · `D02` 1,60 m · `D03` 0,90 m); two corridors meeting produce a
  structural opening with no leaf, which is not on the schedule
* **windows** — one per structural bay the room's exterior wall covers, typed
  by what the room is (`W01` 2,40 · `W02` 1,60 · `W03` 3,20 m), with service
  rooms taking every other bay
* **finishes** — `F0`…`F3` from the room's programme

Identifiers, used end to end:

```
ROOM_L01_R07      DOOR_L01_D02_03     WIN_L02_W03_04
WEB_L01_STRUCTURE FURN_L01_DESK       CAPTURE_STATION_L01_MEETING_01
```

`floorY()`, `planY()`, `roofY()` and `elevationLabel()` are the only places the
metres → world-units conversion is written down.

---

## E · GEOMETRY GENERATION

`blender/dump_plan.mjs` imports the level module and dumps what it computes —
levels, rooms, doors, openings, windows, walls, cuts, core, construction
thicknesses, quantities. `build_environment.py` extrudes the dump: per level a
floor slab (holed at the core and at the cutaway), exterior and partition
walls opened for their real openings, glazing, door leaves and linings,
downstand beams on the bay grid, columns where a facade has been cut, and a
floor-finish plate per room carrying `gdf_room` / `gdf_level` / `gdf_program`.

Nothing is measured twice. The walls stand on the lines the drawings draw
because they are read from the same array.

---

## F · FACADE

* **One bay module for the whole building** — 8 bays of 4,28 m on the long
  facade, 6 of 4,10 m on the short one. Every opening sits on a bay centre, on
  every storey, which is asserted by test. That is the only reason three
  levels read as one facade.
* **Tripartite in material.** The ground floor is struck concrete; the two
  office floors are rendered. The 0,32 m slab edge between them is concrete
  either way, so each storey reads as a plastered box on a concrete line.
* **Different proportion per storey.** L00 sills at 0,95 m with 3,30 m heads;
  L01 at 0,85/2,95; L02 at 0,50/3,00 — the studio floor's openings sit closer
  to the floor throughout.
* **Solid/glass balance.** Service rooms (core, plant, store, the raw bay)
  glaze every *other* bay, which is what gives the west end and the unfinished
  corner runs of solid wall instead of eight identical glazed cells a storey.
* **A rotating cutaway.** South-east on L00, one mid-facade bay on L01, the
  whole terrace edge and half the roof on L02 — a different room opened at a
  different place on every storey.

---

## G · HERO

Four camera options were built and compared at 1440×900 (`qa/shots/p8hero-desk-0*.png`):
low axonometric, 3/4 cutaway, elevated axonometric, sectional corner. The 3/4
cutaway won on the three things that matter: all three storeys legible, the
rotating section looked *into* rather than across, and the headline untouched.

| | Phase 7 | Phase 8 |
| --- | --- | --- |
| `VIEWS.idle` | `p [11.9, 4.1, 16.0] t [−0.2, −0.24, 0]` | `p [12.4, 5.2, 16.4] t [−0.2, 0.34, 0]` |
| Phone hero | close sectional slice of one storey | pulled back to the whole corner: three storeys, the setback and the terrace inside the signature window |
| QUANTIFY | near-vertical, one plan | **exploded axonometric**, three sheets + roof, with floor labels |

The headline keeps the left half of the frame in every state and at every
tested width.

---

## H · EXPLODED VIEW

`scene.setExplode(t)` moves four groups — L00, L01, L02, ROOF — by
`t × 2,70 m × index`. 2,70 m is 0.75 of a floor-to-floor: enough to read each
level as its own plate and see the slab edges, not enough to disconnect the
building or lose the core alignment, which is the thing the view exists to
prove. It moves the building (inside the GLB, in metres) and the drawings,
capture marks and sampled clouds (in world units) by the same amount, so
nothing in the exploded view drifts off its own storey.

Where it is used: QUANTIFY hero `0.9`; QUANTIFY page `1.0` on ÖSSZES and
`0.42` on a single floor; the scroll narrative scrubs `0 → 0.95` through
PROCESSING and DATA and closes back to `0` at DECISION.

---

## I · CAPTURE

Twenty interior stations, **8 / 7 / 5** across the three levels, all solved
against the furnished layout — never typed. Each carries its level, room id,
room label, CP number and entry heading as glTF node extras.

Phase 8 added one rule to the solver: **a corridor is composed, not solved.**
The Phase 7 rule aimed at the furniture centroid, and in L02's 25,7 × 2,9 m
corridor the one plant is against the long wall — so the camera was pointed at
plaster 2,8 m away. A corridor now stands near one end, on the centre line,
looking along its length.

In the hero, CAPTURE keeps the building **stacked and intact**: floor labels
appear, station markers resolve level by level, the cyan sampling crosses all
three storeys. Part 10 is explicit that it must not explode, and it does not.

---

## J · 360

Floor first, then station. The viewer builds both rails from its own station
table, so a station added in Blender appears in the UI without the markup
changing. The HUD reads `CP-11 │ L01 │ TÁRGYALÓ 01 │ 11 / 20`. On a phone the
rails go flat — one row of level ids, one scrolling row of CP numbers, above
the thumb controls — and the level names are dropped so three buttons fit a
390 px screen.

---

## K · MEASURE

Terrain-first, and it had to be re-balanced to stay that way: `.34` of a 4,9 m
storey is a low block on a hillside and `.34` of a 12,3 m building is a
translucent block that fills the frame. Every architectural weight on the
MEASURE page was halved (`mSurface .34 → .17`), the hero's `measure` preset
dropped to `.42`, and all four page cameras were pulled back and lifted. What
is left says *where* the mass sits on the parcel and nothing more. The building
never explodes in MEASURE.

---

## L · QUANTIFY

A floor selector above the state rule: **L00 · L01 · L02 · ÖSSZES**.

* A level → that sheet is read; the other two stay as a 16% ghost, because a
  floor plan with nothing under it has lost the thing that makes it a floor.
  Separation drops to 0.42 and the scan plane parks at that level's elevation.
* ÖSSZES → full separation and the camera leaves the drawing convention for
  the exploded axonometric (`qExploded`), because three sheets seen from
  directly above are one illegible sheet.

The extraction sequence re-anchors per floor: the same five recognitions —
two door types, a window type, a room, a floor finish — pointing at symbols
genuinely drawn on *that* sheet and quoting the real counts of *that* level.

---

## M · QUANTITIES

Every figure below is a `.length` or a sum over the room rectangles.
Nothing is typed anywhere in the project.

| Level | Rooms | Doors (D01/D02/D03) | Windows (W01/W02/W03) | Area |
| --- | ---: | --- | --- | ---: |
| L00 | 12 | 9 (4 / 3 / 2) | 18 (10 / 4 / 4) | 842,6 m² |
| L01 | 12 | 12 (6 / 5 / 1) | 23 (14 / 6 / 3) | 842,6 m² |
| L02 | 8 | 7 (4 / 2 / 1) | 18 (6 / 4 / 8) | 632,0 m² |
| **Building** | **32** | **28** (14 / 10 / 4) | **59** (30 / 14 / 15) | **2 317,2 m²** |

Plus: height +11,20 m to the roof datum, roof terrace 210,7 m² (excluded from
floor area), and floor-finish zones F0–F3 that account for every square metre
of every floor — all asserted by test.

The three places on the homepage that quoted `24 PCS`, `31 PCS` and `842,6 m²`
in the markup now read from the level model at boot.

---

## N · SCAN PLANE

The travel was re-solved. `ax: 0` has always meant a horizontal plane rising
up Y, but the ranges were inherited from Phase 1 — −4,0 to 7,5 world units
over a scene 2,5 units tall, so four fifths of every pass happened where there
was nothing. The building now occupies world Y −0,49 → +1,80, and the travel
is that plus a little ground under and sky over: a pass genuinely enters at
the roof, crosses L02, L01, L00 and leaves through the slab.

`parkScanAt(level)` puts the plane at a chosen elevation, which is what the
floor selector calls — selecting a floor and having the plane arrive at it is
what makes the gesture read as taking a slice through a building.

---

## O · MOBILE

* **Hero** — one sectional read of the whole corner, pulled back until the
  three storeys, the setback and the terrace are all inside the signature
  window with the furniture still identifiable. Not three tiny floors.
* **QUANTIFY** — one sheet at a time, no explosion, and the camera reverts to
  near-vertical because a single floor is a *drawing*. The floor selector
  scrolls on one horizontal rail.
* **360** — a compact floor rail plus a scrolling station rail above the thumb
  controls; the DEMO ENVIRONMENT stamp moves under the HUD to clear them.
* **Payload** — the mobile tier drops the eight heaviest asset families *and*
  the whole project floor's contents: 136 instances instead of 212,
  70 831 triangles instead of 103 172, 277 kB instead of 379 kB.

---

## P · PERFORMANCE

| | Phase 7 | Phase 8 |
| --- | ---: | ---: |
| Home — draw calls | 76 | **84** |
| Home — triangles | 89 750 | 144 356 |
| Home — GLB payload | 471 kB | 472 kB |
| Home — texture payload | 774,6 kB | 774,6 kB |
| Home — frame cost | — | **1,68 ms** |
| Mobile — draw calls | 62 | **70** |
| Mobile — triangles | 64 036 | 89 617 |
| Mobile — GLB payload | 371 kB | 377 kB |
| MEASURE — draw calls | 28 | **35** |
| MEASURE — triangles | 36 966 | 39 822 |
| MEASURE — frame cost | — | **0,22 ms** |
| QUANTIFY — draw calls | 28 | **31** |
| QUANTIFY — triangles | 36 966 | 41 186 |
| QUANTIFY — frame cost | — | **0,19 ms** |
| MEASURE / QUANTIFY — GLB | 45 kB | 108 kB |
| MEASURE / QUANTIFY — textures | 4,6 kB (env only) | 4,6 kB (env only) |
| Console errors, all routes | 0 | 0 |

144 356 triangles is inside the brief's 120–180 k target, and the building is
*three times the architecture* for 61% more triangles — because every
decimation target was re-costed against the new instance counts (the pendant
520 → 240, the plant 3200 → 1400, the meeting chair 1250 → 800; none visibly
different at hero distance).

Draw calls are the number worth reading twice: **eight more than Phase 7 for
three times the building**, and the two measurement routes are within seven
of a single-storey scene. That did not come free — the first three-level
build ran at 154, and the work that brought it back down is in the
post-review section below.

Two performance bugs were found and fixed on the way: the floor indicators
were reading a layout rect per line of type **every frame** (fixed: measured
at most 4×/s, and not at all while they are hidden), and the recognition
bracket's weight summed the homepage's plan states only, so it had been
multiplied by zero on `/mennyisegszamitas/` since that page was built.

---

## Q · QA

| Check | Result |
| --- | --- |
| `npm test` | **30 / 30 pass** — 16 new architecture + quantity tests |
| Rooms tile every floor | no gaps, no overlaps, ±0,5 m² of the footprint |
| Every room reachable | door graph connected from the core on all three levels |
| Core alignment | inside exactly one `CORE` room per level |
| Doors on walls, clear of corners | pass |
| Windows on the perimeter, clear of partitions, under the soffit | pass |
| Windows on the bay grid | pass — the vertical alignment assertion |
| Storey heights | 3,3–4,2 m f-f, 2,8–3,9 m clear |
| No floor is a copy | room grids and programme sets all differ |
| Stair connects | `connects: true`, `fitsCore: true`, both runs |
| Quantities | totals = sum of floors; type breakdowns = totals; finishes = floor area |
| "Add a room → the counts change" | asserted against the live derivation |
| Furniture layout | clean — no placement dropped, all 212 |
| Capture stations | 20 solved, none refused, none inside furniture or a door swing |
| Route payloads | MEASURE/QUANTIFY: 1 GLB, 0 texture files |
| Viewports | 2560×1080, 1920×1080, 1440×900, 1280×800, 1024×1366, 390×844 |
| Reduced motion | respected on all four routes |
| Focus | every tab stop has a visible ring; the closed 360 rails are not focusable |
| Contrast | 0 failures |
| Console | clean on every route and every state |
| Fallback | `?scene=procedural` complete; GLB-blocked leaves a working site with the correct three-level silhouette |

---

## R · SAME-PLACE 2.0

`qa/p8/sheet.html` — built from live captures, nothing composed.

**SAME BUILDING. THREE LEVELS. FOUR READINGS.** — one camera reference, four
hero states.

**THE FLOOR PROOF** — `CP-11 · Tárgyaló 01 · L01-R07`, followed through five
frames: standing in it → the 360 viewer at the same eye position → its storey
lifted out of the exploded building → the same room drawn on the L01 sheet →
**70,2 m²** read off that drawing. The room is never chosen by coordinate: the
REALITY frame and the viewer both read the same capture-station empty out of
the GLB, and the plan symbol and the quantity are the same rectangle.

---

## S · CRITICAL SELF-REVIEW

**1 · Does it feel like a real building rather than a ground-floor model?**
Yes. The test is not the height — it is that the section rotates, the core
lines up, the stair has treads that land on the floor above, and the facade
has a base and a top. A model would have none of those.

**2 · Which floor is visually weakest?**
L02. It has the fewest rooms and the largest ones, and from the hero the
terrace edge is doing more work than the plan behind it. It is also the floor
the mobile tier drops entirely, which is honest but means it is the least
seen. If one thing gets more attention next, it is L02's interior.

**3 · Does any level look copied?**
No, and it is asserted rather than judged: the room grids differ, the
programme sets differ, the band depths differ (8,2/8,2/8,2 · 12,3/4,1/8,2 ·
8,2/4,1/12,3), and the column rhythms differ. The core cell is deliberately
identical on all three — that is alignment, not repetition.

**4 · Is the hero silhouette stronger?**
Materially. Phase 7's silhouette was a slab under abstract boxes. This one has
three storeys, a setback, a terrace, a parapet and roof plant, and you can
read GROUND + LEVEL 01 + LEVEL 02 at hero distance without being told.

**5 · Does verticality hurt headline readability?**
No. The building grew upward, not leftward; the view offset still holds it on
the right half and the headline was checked at all six widths. The one thing
that did collide was the floor indicators, which now dodge the *painted type*
rather than the column box.

**6 · Is the exploded view genuinely informative?**
Yes on the desktop, where the axonometric camera lets vertical separation
project. It was **not** informative at first: with the near-vertical camera
inherited from Phase 7, the three sheets landed on top of each other and the
mode showed an illegible tangle. That is the single biggest thing the
screenshots caught.

**7 · Does CAPTURE benefit from multiple floors?**
Yes — more than any other mode. Eight stations in one storey is a room list;
twenty across three floors with a floor-then-station selector is a building
walk-through, and it is the first time the viewer's navigation matches how
anyone actually moves through a building.

**8 · Is MEASURE still clear?**
Yes, but only after every architectural weight on that route was halved and
the cameras pulled back. The first three-level build made MEASURE
building-dominant, which is exactly what Part 12 forbids.

**9 · Is QUANTIFY materially better?**
Yes. Per-floor selection, a per-floor and building-total table, three sheets
that can be compared, and a room that can be traced from a 360 station to its
area. It also gained back a recognition bracket that had never rendered.

**10 · Can one L01 room be traced from reality to quantity?**
Yes — five frames, in the evidence sheet, with the identifiers matching at
every step.

**11 · Is the building now too complex for the hero?**
No, but it is at the limit. 144 k triangles and 154 draw calls is the ceiling
I would accept; a fourth floor would not fit inside the brief's budget without
thinning the contents, and the brief is right that a fourth floor would add
nothing.

**12 · What could be removed with almost no loss?**
The stand-in's edge wireframe over the terrace once the GLB has landed — it
reads as a ghost volume beside the building. The three focus rooms on L01
could be two. And the exterior site stations (the twelve tripods on the
terrain) are now the least useful capture layer on the page, since the twenty
interior ones say the same thing better.

---

## T · NEXT STEP

The three-level building works, so **stop building the demo.**

Everything the environment can prove, it now proves: same place, same
geometry, four readings, three floors, one traceable room. What it cannot
prove is that any of it was ever done for a client, and that is the only thing
a visitor is actually buying. The next meaningful improvement is **real
project evidence** — one genuine capture round, one genuine survey, one
genuine take-off, with the demo environment demoted to what it already says it
is on the label.

---

## POST-REVIEW FIXES

Three defects found by watching a real session rather than a screenshot
sweep. Two of them were mine.

### 1 · Stutter, cause one — the DOM

`core/theme.js` tweens `--accent` **on the root element**
for 0.85 s. A custom property on `:root` invalidates style for the whole
document, because any of the ~1 060 elements might read it, and that write
measured **5.7 ms** on the homepage. It was running once per frame: about
fifty whole-document recalcs back to back, on every mode change.

| | Before | After |
| --- | ---: | ---: |
| `--accent` writes per switch | ~50 | **13–14** |
| Cost per write | 5,7 ms | **4,9 ms** |
| Style-recalc work per switch | ~285 ms | **~66 ms** |

The CSS write is capped at ~24 Hz and skipped when the rounded channel has
not actually moved — the eye cannot see a colour crossfade stepping at 24 Hz,
and the final value is always forced so the accent still lands exactly on the
service colour. The shader uniform is *not* throttled; it costs nothing and
the canvas is where the crossfade is actually watched. Separately the
annotation panels lost their `backdrop-filter`: nine blurred panels, four of
them the floor indicators added this phase, were 2,1 ms of that 5,7 ms write,
and what sits behind them is a dark render rather than text.

**The renderer, measured rather than guessed at**, showed the frame was
dominated by CPU draw-call submission — and that most of those calls were
drawing nothing at all.

| Route | Calls before | Calls after | Frame before | Frame after |
| --- | ---: | ---: | ---: | ---: |
| Home / CAPTURE | 154 | **84** | 3,56 ms | **1,68 ms** |
| MEASURE | 151 | **35** | 2,45 ms | **0,22 ms** |
| QUANTIFY | 147 | **31** | 2,95 ms | **0,19 ms** |

Three changes, in order of size:

* **A layer at zero opacity is still a draw call.** Nine of the eleven
  procedural layers are at or near zero in any given state — QUANTIFY draws
  the contours at 0 and the terrain at .07, IDLE draws the volume prism and
  the panorama sphere at 0 — and every one was being submitted, transformed
  and blended to nothing on every frame. They now leave the render list below
  one 8-bit alpha step, which is under what a viewer could see.
* **So is a building.** The same rule applied per architectural layer.
  QUANTIFY sets `furn` to 0 and was still submitting 46 draw calls and
  103 000 triangles of chairs behind a drawing.
* **The per-level furniture split was dead weight.** Splitting the instanced
  furniture per storey tripled it from 24 families to 72, to let a floor's
  contents rise with it in the exploded view — a capability nothing uses,
  because the furniture layer is at zero in *every* state that explodes. A
  plan drawing does not have chairs in it. Merged back; each instance still
  carries its level, which is what the mobile tier filters on.

One preset was wrong rather than slow: MEASURE carried `furn: .04`. Part 12
says the furniture disappears in MEASURE, and 4% of 103 000 triangles is a
cost with no reading attached to it. It is 0 now, which is both faster and
what the brief asked for.

### 2 · The hero was fill-rate bound at retina — adaptive resolution

The remaining stutter was invisible from a QA machine. The same scene, the
same 84 draw calls, costs **1,18 ms at 1,1 megapixels and 4,07 ms at the 4,4
megapixels a 14-inch MacBook actually renders**. On a 120 Hz panel the budget
is 8,33 ms, and the browser still has to composite that 4,4 Mpx canvas
afterwards. Every measurement up to this point had been taken at
`devicePixelRatio` 1 — a third of the pixels the complaint was about.

Picking a lower fixed pixel ratio would trade sharpness on machines that
never needed it, so the scene measures itself instead:

* a rolling ring of real frame deltas;
* the **refresh interval read off the machine** — the 10th percentile is what
  it manages when nothing is in the way. A fixed "slower than 21 ms" rule is
  right for a 60 Hz panel and useless on a 120 Hz one, where dropping to
  60 fps is exactly the stutter being reported and 16,7 ms passes the test;
* step down a rung when the median runs half again longer than its own best
  frame; step back up only when it is genuinely comfortable.

Going back up is deliberately hard — a step down blocks any step up for eight
seconds, and after two recoveries the tuner settles low. A resolution that
flaps between two rungs every couple of seconds is worse than the stutter it
is trying to fix. Verified over eight sampling windows at both starting
ratios: it settles and stays settled.

### 3 · One selector matched one element too many

This is the real cause of "the 3D view drops me into the form", and it was
never in the viewer.

```js
document.querySelectorAll('[data-service]')      // ← also matches <html>
```

Every service page carries `data-service` on the document element, so the
route knows what it is. That selector therefore matched `<html>`, and the
click listener attached to it fired for a click **anywhere on the page**. On
/360-camera/ every station chip, every floor button and every drag inside the
360 viewer silently ran `select('capture', { focus: true })` — which took
focus into the request form 620 ms later and, in any browser that does not
honour `preventScroll`, scrolled the reader out of the viewer and down to it.

Found by instrumenting `HTMLElement.prototype.focus` and
`Element.prototype.scrollIntoView` with stack traces and then using the
viewer the way the recording showed it being used. The handler is now scoped
to `a[data-service], button[data-service]` — real controls. Verified both
ways: the three chapter CTAs still preselect their service and focus the
first field, and a stray click on the page no longer touches the form.

### 4 · The 360 rails covered a third of the view

Also mine. The floor and station rails were a vertical stack docked to the
left edge — and with eight stations on the ground floor that is nine boxes
down the side of the frame, over the room you had just chosen to stand in.

They are a **base bar** now: two short horizontal rows over a scrim along the
bottom of the frame, floors above stations, the same shape on a desktop and
on a phone. Everything above the bar is the view, and the viewer's controls
now occupy one edge of the frame instead of two.

### 5 · The station rail scrolled the document

My bug, introduced with the station rail. `paintRails()` centred the active
station with `scrollIntoView({ block: 'nearest' })` — which scrolls **every
scrollable ancestor, including the document**. On a desktop the viewer sits
inline in the page, so the first station change quietly scrolled the page
away from the viewer and into the section below it. It fired on open, too.

Fixed by scrolling the rail and nothing else (`stationsEl.scrollLeft`).
Verified: `scrollY` is now constant at 2 430 through opening the viewer,
clicking a station, clicking a floor, and every key press.

### 6 · Keyboard navigation in the viewer

Now complete, and every handler calls `preventDefault` so an arrow can never
fall through to the document and scroll the view off screen:

| Focus | Keys | Does |
| --- | --- | --- |
| canvas | ← → | look |
| canvas | ↑ ↓ | tilt |
| canvas | **shift + ← →** | previous / next capture station |
| canvas | **shift + ↑ ↓** | previous / next floor |
| canvas | + − = | field of view |
| floor rail | ← → ↑ ↓ · Home / End | change floor |
| station rail | ← → ↑ ↓ · Home / End | change station |

Both rails use a roving tabindex, so each is one tab stop rather than
twenty, and a pointer click on any control hands focus back to the canvas —
because the next thing anyone does after choosing a station is look around.

### 7 · The exploded stack read as a skewed diamond

The ambient yaw is damped whenever the scene is showing a drawing, because a
rotating plan reads as a lozenge. Phase 8 made DATA a plan state — it is
where the building comes apart into three sheets — and added `qExploded`,
and neither was in the damping list. Both are now.
