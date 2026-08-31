# PHASE 11.2 — SPATIAL TYPOGRAPHY RECOMPOSITION

**The journey stayed. The random text did not.**

The camera path, the pacing map, the scroll authority and the markup are
untouched. `index.html` was not edited once in this phase. What changed is
where the type stands: from a fixed twelve-by-twelve viewport field to the
projected building, its rooms, its slab edges, its excavation and the voids
between them.

    NEW   src/modules/descentCompose.js   1206 lines — the composition solver
    EDIT  src/modules/descent.js           560 lines — hands each state to the solver
    EDIT  src/styles/descent.css           837 lines — the `is-solved` contract
    NONE  index.html                                 — markup untouched
    NONE  src/webgl/descent.js                       — camera path untouched

---

## A. TYPOGRAPHY AUDIT

`qa/p112/audit.mjs` captures the twelve named frames at every breakpoint,
reads the live geometry of the state on screen, and grades every visible
text element:

    A  integrated with geometry     position derives from a projected anchor
    B  compositionally valid        inside the safe field, related to a neighbour
    C  floating / random            a fixed field percentage with no reason
    D  clipped / broken             crosses the viewport, the nav, or a sibling

**Before** — 12 frames × 5 viewports:

    A 20    B 175    C 168    D 62

**After** — 12 frames × 8 viewports (1920×1080, 1440×900, 1280×800,
1024×768, 768×1024, 430×932, 390×844, 375×812):

    A 508   B 0      C 0      D 0

One caveat, stated plainly: the audit's opacity handling was corrected
*during* the phase — the first pass read each element's own `opacity` rather
than the product of its ancestors', so it graded floor labels that were
already invisible. The before totals are therefore an over-count of hidden
elements. What is directly comparable is the per-frame defect list below and
the screenshots in `qa/p112/before/` against `qa/p112/after/`.

Per frame, C+D findings:

    FRAME                     before        after
    go-inside                 14 C           0
    interior                   5 C           0
    every-view-remains        15 C           0
    floor-cross                0             0
    underworld                 5 C           0
    volume-4117                9 C           0
    l00                       22 C / 18 D    0
    l01                       19 C / 22 D    0
    l02                       19 C / 22 D    0
    plan-typo                  0             0     ← already correct
    data-field                50 C           0
    reality-made-computable   10 C           0

Every element now uses one of the four valid relationships, and the audit
reports which:

    A geometry anchored   268    a projected world point
    B architectural void   88    solved negative space
    C structural datum    120    type and linework as one instrument
    D geometry as grid     32    a room rectangle as a container
    unclassified            0

---

## B. EVERY D/C FRAME AND HOW IT WAS FIXED

**D — ASCENT / L00 · L01 · L02.** The worst frames in the audit. `+7,60`
was 84% off the right edge at 1920×1080, 67% at 1440, 62% at 1280, 49% at
1024; `L02` sat under the navigation at 1920 at every one of the three
marks. Cause: three grid areas with negative viewport margins, unrelated to
anything in the frame.
*Fixed* — each label is now anchored to its own slab edge, projected, and
stands on the part of that edge the reader can actually see (the raw
projected midpoint was ~500 px past the right margin from inside the floor
plate, which is how "attached to the floor" became attached to nothing). It
leaves the frame only by fading as its floor leaves. See F.

**C — GO / INSIDE.** Two unrelated words: `GO` in empty black, `INSIDE.`
laid across the middle of the building. *Fixed* — see G.

**C — PRESENCE.** A fixed grid area with a −4vw crop. *Fixed* — fitted to
the largest projected upper wall field of the reference room.

**C — EVERY / VIEW / REMAINS.** Three thrown fragments; `VIEW` clipped at
the right edge. *Fixed* — see E.

**C — DEPTH.** A 15vw word alone in black, cropped on two edges, unrelated
to the datum ladder at the far left. *Fixed* — see G.

**C — 411,7.** Already strong; only its placement drifted. *Refined* — see G.

**C — DATA FIELD.** Fifty findings: eight numbers on a static 12×12 field,
distributed to fill the screen. *Fixed* — see H.

**C — REALITY / MADE / COMPUTABLE.** `COMPUTABLE.` cropped its C on the
left and collided with the building's base; `REALITY,` hung its comma over
the parapet. *Fixed* — see I.

**FLOOR CROSSING** produced no C or D, but its key drifted to the top-right
corner and its footnote sat at half opacity on the brightest part of a pale
gradient. *Fixed* — the key falls back to the frame's vertical centre when
there is no projected slab line, which is exactly when the camera is inside
the slab and the slab is the whole frame; the footnote moved to the
journey's own footnote position.

---

## C. SPATIAL ANCHOR SYSTEM

`ANCHORS` in `src/modules/descentCompose.js` is the whole of it. Every point
is read from the module that owns it — `webgl/levels.js` for the building,
`webgl/descent.js` for the route, `webgl/field.js` for the ground. Nothing
is invented:

    building     X0..X1, BASE_Y..roofY(), Z0..Z1        the primary subject
    volume       SITE.pad, padY..0.58                    the excavated prism
    pane         L01-W01-04, sill..head                  the opening the camera crosses
    roomWalls    the reference room's two upper wall fields
    phrase       a wall bay, an opening, the floor       three kinds of surface
    slab         floorY('L01') and SOFFIT
    slabEdge(id) the level's own east slab edge, as a segment
    planRooms    the largest non-circulation room per plan quadrant
    dataSources  each figure's own evidence, plus a size ceiling

`scene.project(x, y, z)` turns any of them into stage pixels. Placement runs
inside `scene.onFrame` — after the draw, with the matrices that drew it —
never from the scroll handler, whose camera belongs to a frame that has not
been rendered yet.

---

## D. NEGATIVE-SPACE SYSTEM

**The safe field** (PART 04) is a collision boundary, not a grid:
`EDGE(vw)` gives 48–72 px on desktop and 28 px on mobile, the navigation's
measured bottom sets the top, and the section tracker's measured left edge
sets the right from 1240 up.

**`getNegativeSpace(avoid, field)`** enumerates every rectangle whose edges
are the field's edges or an obstacle's edges — a few dozen candidates with
one or two obstacles, cheap enough to solve every frame, which is the only
way the answer can follow the camera. Height counts only up to three
quarters of the width, so the answer is never a tall sliver.

The minimum height matters as much as the solver. Without one, ENTRY's
answer on a wide screen was the letterbox band above the roofline — the
region with the most area and the one place the word could be neither large
nor near the opening.

**`avoidBounds`** resolves against the whole obstacle set each pass and
reports whether it *succeeded*; a figure that cannot be got clear of its
neighbours is not drawn (PART 27) rather than drawn on top of one. Its first
version stopped at the first obstacle it found, which is how two data-field
labels ended up printed over each other.

**`insideFade`** replaces clipping with a fade, asymmetrically: sideways and
downward a floor label may hang past the field before it dims, because that
is the direction a floor leaves a rising camera. Upward it may not — above
the field is the navigation, and nothing crosses it at any opacity.

---

## E. EVERY / VIEW / REMAINS — BEFORE AND AFTER

*Before*: `EVERY` upper-left at grid 3/2, `VIEW` right of centre with its
W clipped by the viewport, `REMAINS.` across the bottom. Three independent
placements that never read as a sentence.

*After*: three world anchors on three different **kinds** of surface — the
west wall bay, the window opening, the room floor — projected, and a
least-squares axis fitted through them. The words are set on that one line,
in reading order, descending. The slope is held in the band a sentence can
still be read across (never rising to the right; never past ~27° down).

One correction worth recording: the first version laid each word at its own
projected anchor and scaled the group to fit. At that camera two of the
three anchors are off screen, so the group came out ~3000 px wide and the
fit shrank every word to 63% of its authored size. **The anchors now decide
two things only — the direction of the axis and the ratio of the gaps along
it.** The words keep their authored sizes and the phrase is laid across the
safe field in the room's proportions. Nothing is clipped at any breakpoint.

On a phone the same rule produces a stepped stack rather than a line,
because the slope is steeper against a narrow frame. That is a different
composition, not a squeezed one.

---

## F. FLOOR LABELS — BEFORE AND AFTER

*Before*: `clamp(4rem, 20vw, 23rem)` on a three-row grid with negative
margins. At 1440 that is a 288 px word placed by percentage; the elevations
were cut in half at every width tested and `L02` sat under the nav at 1920.

*After*: a floor label is an architectural object.

- **Anchor** — the level's own slab edge, projected, then clipped to the
  safe field; the label's baseline is the visible run's midpoint.
- **Scale** — from how long that edge reads on screen (`edgePx × 0.055`),
  held between a floor and a ceiling. 118 px at 1440, 54 px at 390. It does
  not become a headline because the camera got close, and it does not
  disappear because it got far (PART 15).
- **Exit** — it travels past the frame with its floor and fades as it goes.
- **One object, one voice** — the elevation was set in the page accent and
  became the least legible thing in the frame over the scan band. It now
  takes the same weight as the level's name, because it is the third line of
  one label rather than a separate technical mark.

Measured at the three marks, `--e` and `--bfz`:

    1440×900   L00 1.00 @118px   L01 1.00 @118px   L02 1.00 @118px
     390×844   L00 1.00 @ 54px   L01 1.00 @ 54px   L02 1.00 @ 54px

(An earlier cut faded mobile labels to a third, because it treated "how much
of a 4.5 m slab edge is on screen" as a fade rather than a presence test —
a narrow frame sees a smaller share of the same edge, which says nothing
about whether the floor is leaving.)

---

## G. DEPTH / 411,7 COMPOSITION

**DEPTH.** was a 15vw word alone in black space, cropped bottom and right,
with the survey ladder unrelated to it at the far left. They are one
instrument now: the word is set on the ladder's own axis and spans exactly
the rungs, MAX to MIN, so the typography and the linework measure the same
interval. The size follows from that span — it is a consequence of how tall
the survey is and cannot be chosen. The instrument's head is placed against
the cut prism's projected top edge, so the ladder is measuring the thing
overhead rather than standing beside it.

The vertical setting is an **orientation**, not a motion device — the same
thing a section drawing does when it names a vertical measurement. PART 21's
rule survives intact: there is still no rotation used as a device and no
horizontal entrance anywhere in the file.

**411,7 M³** was already strong and was refined, not redesigned. Its box is
now solved against the projected cut prism — left edge to the volume's left
edge, baseline on the volume's own base — so the number reads as a dimension
of the thing behind it. `M³` is still hung off its top right; `CUT` and
`FILL` are its head and foot, aligned to it. No KPI framing, no detached
label.

---

## H. PLAN TYPOGRAPHY

FROM / DRAWING / TO / DATA. was the reference standard and the rule is
unchanged: the largest non-circulation room in each plan quadrant, in plan
reading order, projected live every frame (PART 17 — no baked viewport
percentages).

Two improvements:

1. **The word is measured against the room.** If it does not fit the room's
   projected rectangle inset by a real margin, the placer takes the next
   room in that quadrant rather than shrinking the word until it cannot be
   read.
2. **A narrow room takes its name the way a drawing does.** `DRAWING` in a
   0.8-bay project room came out at a quarter of `FROM`'s size — a hierarchy
   produced by spelling rather than by plan. It is now set down its room at
   a size comparable to `FROM`. Vertical has to win clearly (≥1.35×), so a
   word is never turned for a 5% gain.

---

## I. DATA FIELD

PART 18: data emerges from the element it belongs to.

    2317,2 M² · hasznos alapterület   the largest room of the drawing
    69 ablak                          the south facade the windows are cut into
    28 ajtó                           among the doors
    70,2 m² · L01-R07                 inside the room the journey stood in
    17 W03                            at the full-height windows
    14 D01                            at the single-leaf doors
    +11,20 m épületmagasság           on the drawing's own dimension line
    32 helyiség                       along the circulation that connects them

Each figure carries a size ceiling as well as an anchor — the first one was
wider than the room it was counted from at Phase 11's sizes. Figures are
**not** clamped into the frame: one whose source has left the drawing has
nothing to stand on and fades out with its own evidence, which is why
`+11,20` is absent at 1440×900 (its dimension line is above the frame) and
present at 390×844. Half the plan carries no numbers at all, because that is
where the evidence is not.

---

## J. FINAL STATEMENT

Three regions at three depths, none chosen by eye. `REALITY,` takes the
largest void above the projected silhouette; `COMPUTABLE.` the largest below
it; `MADE` is small and stands *at* the building, on whichever flank is
clear. Both editorial bands stand off the silhouette by a real gap, because
a descender is part of the word — `REALITY,` previously sat with its
baseline on the roofline and hung its comma over the parapet.

`COMPUTABLE.` is still the largest word in the journey and now has a clean
silhouette at every breakpoint.

---

## K. MOTION TRIGGERS

Every resolve has a physical cause. Nothing fades in at an arbitrary scroll
point.

    GO / INSIDE.           the approach — the state's own travel toward the opening
    EVERY / VIEW / REMAINS the 360 round's shell crossing the room  (PART 10)
    floor labels           the camera crossing that floor's datum   (PART 26)
    FROM / DRAWING / TO    the projection flattening — the room becoming a rectangle
    data field             its own source element entering the drawing
    REALITY / COMPUTABLE   the building returning to frame

On the phrase, one correction is worth recording. The station sits near the
middle of the reference room, so a shell expanding from it reaches a
left-to-right sentence **from the middle outwards**: no assignment of those
three surfaces to those three words can make the shell arrive in reading
order, and a sentence that resolves backwards is not a sentence. So the
round drives one progress and the words take their turn along it — physical
trigger, reading order, and no third animation invented to reconcile them.
Measured:

    capture k=0.45   EVERY 0.02   VIEW 0.00   REMAINS. 0.00
    capture k=0.55   EVERY 0.41   VIEW 0.00   REMAINS. 0.00
    capture k=0.62   EVERY 1.00   VIEW 0.89   REMAINS. 0.29
    capture k=0.70   EVERY 1.00   VIEW 1.00   REMAINS. 1.00

---

## L. PERFORMANCE REGRESSION

None. `qa/p11/perf.mjs`, the Phase 11 gate, unchanged:

    hero, idle (the Phase 8.3 baseline)   60.4 fps
    journey — exterior                    60.5 fps
    journey — inside the room             60.5 fps
    journey — under the site              60.4 fps
    journey — the drawing                 60.4 fps
    journey — scrolling end to end        60.4 fps

    shaders compiled while travelling     0
    network requests while travelling     0
    long tasks (>50 ms) while travelling  0

    canvases            1
    backdrop-filter     NONE
    mix-blend-mode      NONE
    filter              NONE
    will-change         unchanged — `.dsc__hold: opacity`, one per live state

The solver writes transforms and opacities, which is what the compositor was
already doing for this section. Natural sizes are cached per element per
size, so a frame costs a handful of projections and no layout.

`npm test` — 79 passed, 0 failed.

---

## M. FULL 1× RECORDING

    qa/recordings/p112-journey-desk.gif    1440×900   186 frames   9.3 s   1×
    qa/recordings/p112-journey-phone.gif    390×844   108 frames   5.4 s   1×

Raw screencast frames and their wall-clock manifests are beside them.
`qa/p112/gif.py` encodes at a rate GIF can express (the Phase 8.1 encoder
merged every frame under 20 ms, which is every frame of a 60 fps capture —
a nine-second pass came out as 27 frames).

Contact sheets, twelve frames each:

    qa/p112/sheet-1920.png    1920×1080
    qa/p112/sheet-1440.png    1440×900
    qa/p112/sheet-390.png      390×844

---

## THE PANE IS THE COMPOSITION'S FRAME

Solving in viewport co-ordinates is right while the sticky pane is pinned
and wrong the moment it is not. On the way out the pane scrolls up, the
solver kept re-solving against the viewport, and the closing statement
stayed glued to the screen while the thing it was composed inside left —
`COMPUTABLE.` printed 533 px below the pane, over section 04.

The journey's type now exists exactly while its pane does: outside the
pinned range every state is switched off, which also means none of them is
composited while the reader is somewhere else on the page. Measured with the
pane's bottom at y = 130 in a 991 px viewport, the final state reports
`--on: 0` and nothing paints.

*(Separately: `.output` was `.fusion` until Phase 11, and the section
scaffolding rule in `base.css` still listed the old class — so 04 was the
one section on the page with no `--gutter`, sitting a full gutter left of 05
and running to the viewport edge. Fixed; 04 and 05 now share a left edge at
every width.)*

---

## FALLBACKS

Under reduced motion, with no JavaScript, or with no WebGL, `is-solved` is
never set and the authored twelve-by-twelve stack in `descent.css` runs
exactly as Phase 11 shipped it. Verified: at 1440×900 with reduced motion,
one element leaves its own block — `INSIDE.` by 5% horizontally, its
authored bleed, within PART 05.

`THREE READINGS OF ONE SITE` is untouched. `index.html` was not edited in
this phase.

---

## FINAL ACCEPTANCE

     1. No important text accidentally leaves the viewport      PASS  0 D findings, 8 breakpoints
     2. EVERY / VIEW / REMAINS reads as one composed phrase      PASS  one fitted axis, reading order
     3. Floor labels feel attached to floors                     PASS  slab-edge anchored, visible run
     4. DEPTH belongs to the terrain/datum                       PASS  set on the ladder's axis, spans the rungs
     5. 411,7 remains strong                                     PASS  refined, aligned to the cut prism
     6. FROM / DRAWING / TO / DATA remains geometry-driven       PASS  live room projection, unchanged rule
     7. Data values remain tied to their source                  PASS  8 sources, fades with its evidence
     8. REALITY / MADE / COMPUTABLE has controlled negative space PASS  three solved regions, clean silhouette
     9. Typography and 3D never feel like two separate layers    PASS  every placement projected per frame
    10. THREE READINGS OF ONE SITE remains untouched             PASS  index.html not edited
    11. The journey retains its unusual depth/vertical movement  PASS  camera path not edited
    12. No generic left-copy/right-visual layout introduced      PASS  every region solved from the frame

**Does any text now look randomly placed on top of a 3D background?**

No. Every visible element in the journey resolves to a projected world
anchor, a solved negative-space region, a structural datum, or a room
rectangle — 508 of 508 across twelve frames and eight breakpoints, with zero
floating and zero broken placements.
