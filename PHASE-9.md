# PHASE 9 — THE VERTICAL DIGITAL TWIN

**Does the building now feel like a digital twin, or like a nice 3D building?**

It feels like a digital twin, and there is a specific reason I can point at
rather than a claim I would like to make: **you can now follow one room —
L01-R07, "Tárgyaló 01" — from the physical building, to the capture station
standing in it, into the 360 viewer, onto the L01 drawing, and into its
quantity line, and every one of those five is the same rectangle in
`src/webgl/levels.js`.** The viewer's `ALAPRAJZON ↗` puts you on the plan
with the recognition bracket on that room. The plan's `FELVÉTELI PONT ↗`
puts you back inside it. Nothing about that chain is staged: `npm test`
asserts every link of it and never names the room.

That is criterion 16, and it is the one the phase turns on.

Performance was not touched and did not move: 60,0 fps composited on every
route, rAF p50 16,7 ms, zero CoreAnimation backpressure, 47–49 composited
layers — the same numbers Phase 8.3 finished with, measured with Phase 8.3's
own harness (`qa/p9/accept.mjs`, §M).

There is one thing the phase asked for that I did **not** build, and §16
below says why in full: the site's terrain and its building are modelled at
**two different metre scales in one world**, so a readout relating them
would have been arithmetic across incompatible units. It is now a failing-if-
fixed test rather than a number on a page.

---

## A · BEFORE AUDIT

Twelve states, five viewports, captured from production before anything was
touched: `qa/p9/audit.mjs`, frames in `qa/p9/shots/before-*`.

| frame | grade | what was wrong |
| --- | :---: | --- |
| HOME idle · 1440 | **B** | reads as a building, but the window openings are black voids — the facade has no glass in it |
| HOME idle · 1024 | **A−** | the strongest hero on the site |
| HOME idle · 2560 | **B−** | building marooned in the middle-right; the extra width went to margin |
| HOME idle · 390 | **B** | all three floors fitted the window with room to spare — the "tiny full building" the brief warns about |
| HOME capture | **C** | the failure the brief names by hand: cyan static over a building, two of three callouts unreadable cyan-on-cyan |
| HOME measure | **C** | hierarchy inverted — a three-storey ghost dominating a contour survey |
| HOME quantify | **C** | three plans in a tangle; `DOORS`, `WINDOWS`, `FLOOR` printed **on** the linework |
| exploded building | **B+** | genuinely good, but three equal gaps, no labels, no datum, furniture at full strength |
| QUANTIFY all | **C** | very dim; the three sheets overlap; totals nearly invisible |
| QUANTIFY L00/L01/L02 | **B/B−** | the drawing is readable — and the level labels **collide into an unreadable stack** under the near-vertical camera |
| 360 L00 | **B−** | reception, but the centre of the frame is a blank wall |
| 360 L01 | **C** | the corridor, entered with a grey wall filling the right half — the worst frame on the site, and the first thing a visitor saw on the work floor |
| 360 L02 | **B** | fine |
| mobile hero | **B** | small; correct but not assertive |

Five structural problems came out of it, and they set the phase's order of
work:

1. the facade had **no glazing presence**, so a building read as a frame;
2. CAPTURE's sample was tuned to be impressive rather than legible;
3. MEASURE's building weight was tuned against a **one-storey** building;
4. the level labels had **no de-collision** at all;
5. the 360's entry headings were solved by a rule that fails exactly where
   it matters.

---

## B · HERO

**The cutaway was not the problem, and I can show that.** `qa/p9/enclosure.mjs`
walks the level table: the sectional cuts remove **14% of the facade run and
18% of the slab area**. The brief's target is 25–40% exposure — the building
was *more* enclosed than asked for and still read as a doll's house.

What was missing was glass. A pane authored at 0.2 opacity was reaching the
screen at 0.19 because of a 1.6× multiplier tuned in Phase 6; every window
opening read as a hole. At 3.0 the same pane carries a reflection off the
environment map and the bays read as **glazed bays** — mass, without closing
a single opening. That one number is the largest single change to the hero
in this phase (`src/webgl/archScene.js`).

* `idle` glass .60 → 1, `capture` .70 → .88, `physical`/`capSite` likewise.
* Camera unchanged at 1440. At **≥2.15:1 the close-in factor went 0.82 → 0.74**
  (§30): an ultra-wide frame gets more building, not more margin.
* Cutaway geometry unchanged, **except** that a window inside a cut run is
  now flagged rather than deleted — see §L.

Roof: left as it is. The stepped top — main roof, the L02 setback, the
terrace deck over L01's east bay — is what the building *is*, and the roof
already carries a 33% opening over the studio floor. Making it transparent to
satisfy a note would have been decoration solving a problem the brief says
not to decorate away.

## C · LEVELS

L00 / L01 / L02 were already structurally distinct and this phase did not
weaken that. Measured (`npm run audit`):

| | rooms | doors | windows | area | capture points | grain |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| L00 GROUND ±0,00 | 12 | 9 | 23 | 842,6 m² | 8 | 4×3 cells, one deep spine |
| L01 WORK +4,00 | 12 | 12 | 25 | 842,6 m² | 7 | five bands, two corridors, A-B-A columns |
| L02 PROJECT +7,60 | 8 | 7 | 21 | 632,0 m² | 5 | set back a full bay; terrace; spur corridor |

Furniture density differs by design — 65 / 93 / 54 placements. `no floor is
a copy of another` is now an assertion, not an observation
(`test/consistency.test.mjs`). **No brand accent is used to distinguish a
floor**, per §04: the accents belong to CAPTURE / MEASURE / QUANTIFY.

## D · EXPLODED VIEW

Three changes, all in service of *one building opening itself* rather than
three models floating apart:

* **Travel is no longer an arithmetic series.** L00 stays on its datum (0),
  L01 lifts one gap, L02 lifts 2,25, the roof 3,6 — the lid leaves last and
  furthest. One table, `EXPLODE_STEP` in `levels.js`, drives the
  architecture, the three drawings, the station marks and the point sample.
* **A vertical datum.** A single line at the centre of the CORE — the one
  rectangle at the same plan position on all three levels — with a tick at
  each level's own lifted elevation. It exists only while the building is
  separated; at rest it is not drawn. Architectural, not UI: no label, no
  handle.
* **The contents step back.** `furn` scales by `1 − 0.55 × explode`. They do
  not disappear: a plate with nothing on it is a slab, and the point of the
  view is that these are rooms.

Motion (`qa/p9/motion/explode-*.jpg`, 108 presented frames over 1,8 s at
60 fps): whole building → roof separates → levels part → labels resolve.
That is §07's choreography, and the intermediate state is legible
throughout.

## E · CAPTURE

Target 70% place / 30% data. The sample came down and the round went up,
which is the correct trade — a capture job is documented by where the tripod
stood, not by how much noise it made.

| | before | after |
| --- | ---: | ---: |
| `points` | .82 | **.30** |
| `pboost` | 1.50 | **.82** |
| `stations` | .82 | **1** |
| `panorama` | .60 | **.30** |
| `glass` | .70 | **.88** |

The three callouts moved off the parcel — where the cloud is densest and two
of them were cyan-on-cyan — and onto the building, where there is a surface
behind them.

**Floor awareness (§10).** The homepage readout's third cell was
`WALKTHROUGH · READY`, which carried no information. It is now
`L00 / L01 / L02 → 08 · 07 · 05`, and it is **counted**: the capture round
moved out of `blender/config/rooms.py` and into `src/webgl/stations.js`, so
the web can break the total down before the GLB has arrived and Blender
reads the same list back through `plan-features.json`. Python no longer
keeps a copy. `20 + 12` was a hand-written string in `modules/quantities.js`
until this phase.

## F · 360

**Initial headings (§13).** A real scorer, in the place that has the real
obstacles: `solve_heading()` in `blender/room_layout.py`. Seventy-two
candidates, scored on depth, edge openness, content in the cone, how centred
the room's contents are, openings, and tall obstructions inside 1,4 m.

The full review with a graded frame for every one of the twenty stations is
[`qa/p9/HEADINGS.md`](qa/p9/HEADINGS.md). Summary: **fourteen of twenty are
B+ or better, three are A, and no frame opens on a blank wall.** L01's
corridor went from the worst frame on the site to A−. Four frames are still
C-grade and none of them is a scorer failure — those rooms are sparsely
furnished and every one of the 72 headings was checked.

Two findings in the scorer are worth keeping:

* corridors need an **edge** term, not only a depth term — what ruins that
  picture is the wall 1 m to the side, not what is ahead;
* **a table is not an obstruction.** The first weighting refused to look at a
  meeting table because it was inside 1,4 m and pointed every meeting room at
  its own corner. `LOW_SUBJECTS` names what you see *over*.

**Floor map (§12).** `src/modules/floorMap.js`. Outline, room boundaries,
capture points, and a cone showing where the camera in the frame above is
looking. Every rectangle comes out of `levelFeatures()` — the same call the
QUANTIFY drawing is generated from. No zoom, no pan, no scale bar, no second
set of labels; open on a desktop, an expandable on a phone. The reference
room carries a faint fill, so the room the site follows is findable on the
map too.

**Header (§11).** Reordered to the order a person asks: *what am I looking
at* (room), *where is it* (floor), *what is it called* (CP). Phase 8 led
with the station number, which is the one thing a visitor has no use for
until they want to come back.

**Entry (§14).** The viewer opens **in the reference room**, not at station
01. `start()` used to default to station 0 and, because it is called the
moment the visitor presses VIEW 360°, that zero was parked in `pending` and
beat the entry rule; a viewer being switched on has no opinion about which
station it is, and says so now by passing nothing.

## G · MEASURE

Terrain-first, and it was not. A three-level building at `arch: .42` is three
times the ghost Phase 7 tuned against one storey.

| | before | after |
| --- | ---: | ---: |
| `arch` | .42 | **.24** |
| `ceiling` | .10 | **.05** |
| `terrain` | .62 | **.74** |
| `contours` | .80 | **1** |
| `survey` | .55 | **.70** |
| `points` | .34 | **.10** |
| `volume` | .30 | **.34** |

Furniture was already at 0 and stays there. The three callouts moved onto the
ground they describe — VOLUME onto the cut prism, AREA onto the parcel,
ELEVATION onto the slope — and ELEVATION came in from x 6,2, where at 1440
the frame was cropping it.

## H · QUANTIFY

**The drawing is neutral; the analysis is the accent.** Phase 8 tinted the
whole sheet 52% toward the mode colour, which made every wall, every door
swing and every dimension string the same orange as the thing being counted.
At `tint: .14` the linework is paper-white with a trace of the mode in it,
and the accent belongs to the recognition bracket, the extraction labels and
the scan pass — the things that are *about* the analysis. Three line weights
(0.044 / 0.026 / 0.015) were already there; against a neutral sheet you can
now see them.

The three summary callouts stand **off** the drawing on its right edge with
leader lines, the way a dimension string on a real sheet does. And a flipped
callout now actually moves: `flex-direction: row-reverse` reordered the
children but the element is placed by a translate whose origin is its left
edge, so a label flipped at the frame edge still ran off it — on a 1024
portrait tablet all three totals were cut in half while carrying the class
meant to prevent it. `translate: -100% 0` is the fix.

**Choreography** (`qa/p9/motion/floor-switch-*.jpg`): building → roof leaves
→ levels separate → materials fade → walls and openings remain → the sheet
resolves. No hard cuts; the levels move on one progress.

## I · REFERENCE ROOM

**L01-R07 · "Tárgyaló 01" · 70,2 m² · 1 door · 4 windows on 2 facades ·
station CP-11.**

Chosen by a rule, not a coordinate (`src/webgl/reference.js`): *the largest
MEET room on the WORK level, ties broken by how many facades it touches, then
by window count.* L01 has two meeting rooms of exactly 70,2 m²; one is a
corner room with four windows on two facades. When both stations were
rendered side by side the corner room's frame was plainly the better one — so
the rule was written to describe what the eye had already chosen, rather than
the answer being written down.

| representation | where | what proves it is the same room |
| --- | --- | --- |
| REALITY | hero | four windows on two facades, now glazed and legible |
| CAPTURE | hero | its station is one of L01's seven, counted in the readout |
| 360 | `/360-camera/` | opens here by default; header reads `TÁRGYALÓ 01 · L01 · CP-11` |
| EXPLODED | hero / QUANTIFY ALL | on the plate that lifts in the middle |
| L01 PLAN | `/mennyisegszamitas/` | recognition bracket parks on its rectangle |
| QUANTITY | same page | `L01-R07 · 70,2 m² · AJTÓ 01 · ABLAK 04 · PADLÓ F2` |

Frames 11, 17, 18, 19, 20 of the QA matrix are that chain end to end.

**One honest trade.** The L01 cutaway was moved onto this room so the hero
would open it — and then moved back. Removing a run of facade removes that
wall from the *building*, not only from the picture: standing in the room in
the 360 viewer and turning south, you are looking out of a hole. The
reference room is the one room that has to survive being stood inside. The
reality → capture link is carried by the glazing, the station marker and the
same-place section instead, none of which need a wall removed.

## J · CROSS-REPRESENTATION INTERACTION

Both directions, and both only for this one room (§37):

* **360 → plan.** `ALAPRAJZON ↗` appears in the viewer only when the visitor
  is standing in the reference room. It navigates to
  `/mennyisegszamitas/?room=L01-R07`, which selects L01, moves to the
  STRUCTURE reading and parks the bracket on the rectangle.
* **plan → 360.** `FELVÉTELI PONT ↗` on the reference card goes to
  `/360-camera/?room=L01-R07`. It addresses the **room**, not the station
  number — the plan knows which room it is showing and has no business
  knowing which CP stands in it.

Two bugs surfaced while building it and both were worth finding:

1. `setState` fires `onState`, which repaints the recognition sequence — so
   focusing the room and *then* changing state threw the room's own label
   away and put the full five-step sequence back on top of it. State first,
   room second, one frame apart.
2. The sequence reveals cumulatively, because that is what IDENTIFY is.
   Tracing one room is the opposite act, so `setExtractStep(n, only)` can now
   reveal exactly one recognition. Arriving from the viewer with four other
   labels already on the sheet buries the room you came to see.

Neither link is the only way to navigate anything.

## K · MOBILE

* **Hero (§28).** The eye came in ~1,8 units and the target rose to the work
  floor: the window now holds the ground and work floors at a readable size
  with the project floor cropping out of the top — about two and a half
  storeys. Phase 8's frame fitted all three with room to spare.
* **Explosion (§28/29).** The threshold moved from 700 px to **1100 px**. A
  1024 portrait tablet was getting the exploded three-sheet axonometric,
  which is two floor separations taller and a full plan wider than one sheet
  — both ends of every drawing were cropped by the frame. Phone and tablet
  read one storey and the floor selector changes which.
* **Tablet QUANTIFY (§29).** One override, not a tier: `VIEWS_TABLET` gives
  900–1100 px the near-vertical single-sheet camera. The desktop's 50° tilt
  exists to separate levels; a tablet that does not separate them was being
  shown three sheets stacked exactly on top of each other through the camera
  designed to pull them apart.
* **360 (§28).** Floor rail stays compact; the floor map is a labelled
  expandable rather than always-on.
* **Same-place section (§26).** Two-column chips, sticky pane starts below
  the fixed nav, and the canvas is **exempt from the phone's narrative
  dimming** — everywhere else on a phone the object steps back behind
  full-width type; here the type is above and below it and dimming to 42%
  left four barely-different dark rectangles.

## L · DATA CONSISTENCY

`npm test` — **56 tests, 56 pass** (30 before this phase, 26 added).
`npm run audit` — **CLEAN, no orphaned data.**

New: `test/reference.test.mjs` (§35, 11 assertions over every link of the
chain, none of which names the room), `test/consistency.test.mjs` (§33/34),
`test/sameplace.test.mjs` (§26), and `tools/audit/model.mjs`, which prints
the same walk as a table so you can see *which* of two hundred objects went
missing.

**One behaviour changed, and it is a correction.** Phase 8 deleted a window
whose run of wall the cutaway had removed. That quietly made the schedule a
count of the *cut model* rather than of the building: moving the section by
one bay to frame a different room changed how many windows the building was
said to have. A section is a way of DRAWING. A window in a cut run is now
**flagged** — counted, scheduled and drawn on the plan; skipped only by the
two consumers that build the physical shell.

The building total therefore moved from **59 to 69 windows**. That is not a
regression; 59 was wrong.

| | rooms | doors | windows | GFA | levels | height |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| building | 32 | 28 | 69 | 2 317,2 m² | 3 | +11,20 m |

## M · PERFORMANCE REGRESSION

Phase 8.3's harness, unmodified, on this machine's 60 Hz panel, against the
production build (`qa/p9/accept.mjs`, `qa/p9/accept-phase9.json`):

| case | comp fps | rAF p50 | rAF p95 | swap ms | backpressure | layers |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| IDLE hero (settled) | **60,0** | 16,7 | 18,5 | 0,22 | 0 | 48 |
| MODE switching — slow | **60,0** | 16,7 | 18,5 | 0,51 | 0 | 49 |
| **SAME PLACE — four readings** | **60,0** | 16,7 | 18,4 | 0,15 | 0 | 47 |
| QUANTIFY floors | **60,0** | 16,7 | 18,5 | 0,18 | 0 | 36 |
| 360 viewer + floor map | **60,0** | 16,7 | 18,5 | 0,20 | 0 | 37 |

Phase 8.3's 60 Hz acceptance holds at 100%. **The section this phase added
costs nothing** — 47 layers against idle's 48, and the lowest main-thread
occupancy of the five cases.

`npm run test:browser` — **16 tests, 16 pass**: no shader compiles, no
fetches and no long tasks during a mode switch; the 360 viewer survives its
stress round.

No `backdrop-filter`, no `mix-blend-mode`, no transparent WebGL context and
no new full-screen effect was introduced. The same-place section and the
reference card are flat paint over the canvas, deliberately — the floor map
in particular would have been the obvious place for a frosted panel, and
Phase 8.3 measured what that costs.

**The 120 Hz half of Phase 8.3's result could not be re-measured**: that
display is not attached to this machine. Nothing in this phase touches the
presentation path, and the 60 Hz result is unchanged — but the honest status
of the 120 Hz figure is *carried forward, not re-verified*.

## N · VISUAL QA

`node qa/p9/matrix.mjs` → `qa/p9/final/`, the brief's twenty-four frames in
its own order: 01–04 hero, 05–09 vertical, 10–12 360, 13–17 QUANTIFY,
18–20 the connection, 21–24 mobile. Contact sheets: `f-hero.png`,
`f-vert.png`, `f-quant.png`, `f-mobile.png`, `heads-a/b/c.png`.

Before/after pairs are `qa/p9/shots/before-*` against `qa/p9/final/*`.

## O · MOTION QA

`node qa/p9/motion.mjs` → `qa/p9/motion/`, sampled through the CDP
screencast at presentation rate:

| transition | presented |
| --- | --- |
| home mode cycle (4 changes) | 276 frames / 4,6 s — **60 fps** |
| explode | 108 frames / 1,8 s — **60 fps** |
| floor switch (4 changes) | 252 frames / 4,2 s — **60 fps** |
| 360 station change ×3 | 57 frames / 2,4 s — 24 fps |
| 360 floor change ×3 | 56 frames / 2,5 s — 22 fps |
| 360 → plan | 231 frames / 4,2 s — 55 fps |

The two low numbers are **not** a defect and it is worth writing down why: the
panorama is an on-demand renderer. It draws when something changes, and a
station change is a cut followed by a still view. Measured under a continuous
drag, the same viewer presents **60 fps** (45 frames / 756 ms). It is not
dropping frames; it is not drawing frames that would be identical.

Reviewed at 1×: the explode reads as an opening rather than a scatter, the
mode cycle is instrument-like rather than floaty, and the 360 → plan link
arrives with the bracket already parked.

## P · CRITICAL SELF-REVIEW

**1. Strongest single frame.** `final/06-vertical-exploded.png` — the
building opened, four elevations labelled, the datum through the core, the
contents stepped back. It is the frame that says *twin* instead of *render*.
Runner-up: `final/11-360-reference-room.png`.

**2. Weakest single frame.** `heads/CP-07` — L00's plant room. Nearly empty,
correctly framed, nothing to look at. Second weakest: `final/14-quantify-L00`,
where the ghost floors under the read sheet are closer to noise than to
context.

**3. Digital twin, or a nice 3D building?** A twin — because the
relationships are *addressable*, not because it is detailed. `?room=L01-R07`
resolves in three different representations. That is the test.

**4. Is the exploded view informative or merely impressive?** Informative
now, and it was merely impressive before. Three equal gaps with no labels is
a nice picture; unequal travel off a fixed datum, with the elevation of each
plate printed against a line through the core, is a section. If I removed one
thing it would be the datum, and the view would lose about a third of its
argument.

**5. Is CAPTURE too noisy anywhere?** Not on the homepage any more. It is
still the busiest state on the site, and the terrain sample on the right of
the frame is the last place I would look next.

**6. Does MEASURE remain clear?** Yes, and it is the largest single
improvement after the hero glazing. It reads as a survey with a building on
it, which is what it is for.

**7. Is QUANTIFY understandable without explanation?** Mostly. `ALL` — three
exploded sheets — still asks more of a first-time reader than the single-floor
views do, even after the separation was made unequal. A visitor who lands on
`L01` understands it immediately.

**8. Can the reference room genuinely be followed?** Yes, and this is the
claim I am most confident in because it is asserted rather than observed:
`test/reference.test.mjs` fails if the room loses its station, its area, its
door, its finish, or its identity in any of the five representations, and it
never names the room.

**9. Does any floor feel copied?** No. The three plans have different grains,
different room counts, different door counts and a genuinely different
section — and one floor is set back a full structural bay. That was Phase 8's
achievement; this phase only stopped hiding it.

**10. What is still synthetic?**

* **The terrain and the building are at different metre scales** — 2,21 m
  and 5,35 m per world unit — in one world. Everything printed is internally
  consistent within its own subject and nothing on the site prints a figure
  that spans them, but the relationship the eye infers between the hill and
  the building is not a real one. This is the most important thing in the
  report. It is pinned by a test that fails when the two are reconciled.
* **Four rooms are too thinly furnished to photograph** (§F): the plant room,
  Tárgyaló 02, the kitchen, the collaboration bay.
* The scan status / data points / process figures in the hero telemetry are
  interface demo values, and the page says so.
* The terrain field is procedural. The parcel, the volumes, the cut and fill
  are all derived from it and are consistent with it — they are just not a
  survey of anywhere.
* The 360 is a rendering of the model, not a photograph. The viewer says
  `DEMO ENVIRONMENT` in two places.

**11. What would I remove to simplify by 15%?** The exterior twelve capture
stations. They inflate the headline number from 20 to 32 and they document a
site nobody is being shown the inside of; the twenty interior points are the
whole of the argument. Second: the `qIdentify` timed reveal on the QUANTIFY
page, which is a 3,6-second animation the visitor did not ask for.

**12. Is further demo refinement justified?** No. See Q.

## Q · FINAL RECOMMENDATION

**DEMO SYSTEM COMPLETE.**

The demonstration now says everything a demonstration of this can say. It
reads as one building; it has three distinguishable floors; it opens for
inspection and closes again; one room can be followed from a photograph-like
interior to a line in a schedule; every number is counted; and the whole of
it holds 60 fps. Another pass would add polish to arguments that are already
made, and Phase 10 should not be a synthetic one.

**What must replace the demonstration, in order of what it buys:**

1. **One real 360 capture round of one real building** — 15–25 stations,
   equirectangular, with the station positions recorded. The viewer already
   accepts `source: { type: 'equirect', url }` per station and falls back to
   the model when a photo is missing, so this can go in one station at a
   time. This is the single highest-value replacement: it turns "here is our
   model" into "here is a place".
2. **The floor plan that building was built from**, as PDF or DWG, digitised
   through the real QUANTIFY process — with the resulting konszignáció and
   helyiségkönyv as delivered. Then `levels.js` becomes an importer instead
   of an author, and the totals stop being demonstration totals.
3. **One real terrain survey** of the same site — point cloud or contour set
   — with the surveyed parcel area. This is also what resolves finding 10:
   with a real survey, the terrain and the building share one metre and the
   §16 building datum can finally be built.
4. **Genuine layer assemblies** (rétegrend) from that project's
   specification. The page currently prints only what the model truly holds —
   slab 320 mm, external wall 4 579 mm as drawn, partition 802 mm, four floor
   finishes — and says in Hungarian that it does not invent layers it does
   not have. That sentence should be replaced by data, not by a better
   sentence.
5. **A photograph of the reference room**, so the chain begins with a
   photograph rather than with a render.

Items 1 and 2 can come from the same building. That is the next phase.
