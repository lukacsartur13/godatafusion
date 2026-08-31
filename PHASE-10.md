# PHASE 10 — VISUAL IDENTITY SYSTEM

Typography · Layout rhythm · GDF glyphs · Interaction language

The brief for this phase was one sentence: **make the interface as
distinctive as the digital twin.** No new geometry, no new floors, no new
3D, no new services, no new synthetic content, no performance experiments.
None of those were added.

Everything below was measured on the running site with the harnesses in
`qa/p10/`, against a reconstructed Phase 9.1 tree served in parallel on
:5199 — so every "before" number in this document is a reading, not a
recollection.

    qa/p10/type.mjs       the typographic ramp, 9 widths
    qa/p10/hu.mjs         Hungarian QA — tofu, overflow, widows, substitution
    qa/p10/monoaudit.mjs  §03 — what actually computes to monospace
    qa/p10/a11y.mjs       §28 — glyph naming, keyboard parity, reduced motion
    qa/p10/perf.mjs       §27 — frame rate and the layer inventory
    qa/p10/sheet.mjs      §04 C / §25 — the glyph sheet and legibility grid
    qa/p10/prims.mjs      §07 — the primitives at rest / mid / engaged
    qa/p10/shots.mjs      §29 — the matched before/after gallery

---

## A — TYPOGRAPHY, BEFORE / AFTER

### Before

| Role | Family | Notes |
|---|---|---|
| display + body + UI | **Geist** 100–900 | one face doing three jobs |
| technical | **Geist Mono** 100–900 | and 117 CSS rules pointing at it |

`body` was set in the display face, so a headline grotesk was setting every
paragraph, every form field and every list item on the site.

### After

| Token | Family | Weights | File | Job |
|---|---|---|---|---|
| `--ff-display` | **Instrument Sans** | 400–700 var | 23 144 B | H1/H2/H3, display lockups, the wordmark |
| `--ff-text` | **IBM Plex Sans** | 300–600 var | 26 932 B | body, ledes, nav, forms, list copy |
| `--ff-label` | = `--ff-text` | 500/600 | — | the uppercase UI micro tier |
| `--ff-mono` | **IBM Plex Mono** | 400 / 500 | 12 824 B | coordinates, IDs, measurements, counts |

**Payload: 83 648 B → 62 900 B, −20 748 B (−24,8 %)** — a third family for
less money than two, because these are single files subset to the charset
the site actually sets (ASCII, the Hungarian accented pairs, typographic
punctuation, and the engineering marks `° ′ ″ ² ³ × ↗`). Google serves
latin and latin-ext as separate faces and a Hungarian page pulls both,
every time. All three are SIL OFL 1.1; licences in `docs/fonts/`.

### The scales

Three display scales, each with its own tracking — §02.

```
DISPLAY XL   --fs-dxl  clamp(2.85rem, 4.98vw + 1.577rem, 11.24rem)   ls -.042em
DISPLAY L    --fs-dl   clamp(2.18rem, 3.41vw + 0.936rem,  7.02rem)   ls -.034em
DISPLAY M    --fs-dm   clamp(1.73rem, 2.32vw + 0.539rem,  4.54rem)   ls -.026em
             --lh-d    .875
```

XL is the homepage hero and nothing else. L is every section H2 and every
service hero. M is the editorial transitions — chapter titles, ABOUT, the
`PROJECT INPUT` question, the "one place, four readings" title.

Text and micro tiers:

```
--fs-body   clamp(.94rem,  .43vw + .625rem, 1.27rem)
--fs-lede   clamp(.90rem,  .39vw + .635rem, 1.21rem)
--fs-micro  clamp(.651rem, .132vw + .631rem, .814rem)   ls .155em   LABEL
--fs-mono   clamp(.692rem, .142vw + .666rem, .875rem)   ls .075em   DATA
```

### Measured metrics — the reason every ramp is what it is

All on a 1000 upm, read off the shipped files:

| | cap | x | adv H | adv n |
|---|---|---|---|---|
| Geist *(replaced)* | 710 | 530 | 713 | 581 |
| Geist Mono *(replaced)* | 710 | 530 | 600 | 600 |
| Instrument Sans | **720** | **510** | 736 | 599 |
| IBM Plex Sans | 698 | 516 | 707 | 568 |
| IBM Plex Mono | 698 | 516 | 600 | 600 |

Three facts drove every number above.

1. **Both Plex faces share IBM's metrics exactly.** Same cap, same
   x-height, same 600 advance as the mono they replace. A sans label and a
   mono value sit on the same cap line with no correction — which is what
   makes the §03 split possible without per-component nudging.
2. **Instrument Sans is cap 720 over x 510** — a cap/x ratio of 1,41
   against Geist's 1,34. Tall narrow caps over a quiet lowercase is what
   makes a headline read architectural rather than interface. It also
   means the display ramp comes down by 710/720 = 1,4 %, not the 3 % a
   first pass guessed and shipped before this was measured.
3. **Every ramp is scaled by its own face's cap ratio**, so rendered cap
   height is unchanged from Phase 9 at every breakpoint.

### The proof (`qa/p10/type.mjs`, hero display)

| width | cap before | cap after | Δ | rows |
|---|---|---|---|---|
| 2560 | 109,96 | 109,96 | 0,00 | 2 / 2 |
| 1920 | 87,02 | 87,00 | −0,02 | 2 / 2 |
| 1440 | 69,81 | 69,80 | −0,01 | 2 / 2 |
| 1280 | 64,07 | 64,06 | −0,01 | 2 / 2 |
| 1024 | 54,89 | 54,88 | −0,01 | 2 / 2 |
| 768 | 45,71 | 45,70 | −0,01 | 2 / 2 |
| 430 | 33,59 | 33,58 | −0,01 | 2 / 2 |
| 390 | 32,38 | 32,83 | +0,45 | 2 / 2 |
| 375 | 32,38 | 32,83 | +0,45 | 2 / 2 |

Hero lede x-height: 10,00 → 9,99 at 2560; 8,16 → 8,14 at 1440; 7,42 → 7,43
at 1024 and below. The composition is where it was; the voice is not.

---

## B — FONT DECISION

Four display candidates were subset, self-hosted, and rendered at real
display sizes with real site copy against the real palette. Screenshots,
not names — `qa/p10/` and the specimen in the scratch build.

| | axes | subset | verdict |
|---|---|---|---|
| **Instrument Sans** | wght 400–700 | 22,6 kB | **chosen** |
| Archivo | wght 400–800 | 20,8 kB | widest of the four; reads American-gothic workhorse, close to the Inter/Geist family the phase is trying to leave |
| Schibsted Grotesk | wght 400–800 | 34,0 kB | editorial but news-brand; round period, wide caps, 50 % more payload |
| Host Grotesk | wght 400–800 | 13,5 kB | cheapest and friendliest — curved R leg, rounder bowls. Closest to the "SaaS" reading the brief bans |

**Why Instrument Sans.** Set beside Geist at the same size, the departure
is structural, not tonal: a straight sheared `R` leg where Geist splays a
curve, a spurred `G` where Geist has none, horizontally-cut `S` and `C`
terminals where Geist cuts them at an angle, and the tallest cap of the
four over the smallest x-height. It is the only candidate whose caps are
narrow *and* tall, which is the whole architectural reading. It is also
the smallest of the three distinctive options.

**The width axis was tested and rejected.** Instrument Sans ships
`wdth 75–100`, and a condensed DISPLAY XL is a genuinely proprietary
device. Keeping the axis costs **+22,4 kB — it doubles the display face**
(22,6 → 45,0 kB). Phase 8.3 spent its whole budget on restraint; a second
display file for one optional narrowing is not the trade. Tracking does
the work instead.

**Why IBM Plex Sans + Mono for the other two tiers**, beyond the brief
naming them: they are metrically identical to each other, which is the
single technical fact that makes a label/data split possible without
optical correction at every call site.

**Hungarian validation.** `ő ű Ő Ű` plus the full accented set verified
present in all seven candidate files before any decision (`fontTools`
cmap read), then verified *rendered* — `qa/p10/hu.mjs` compares the
advance of `ő` against `o` in the computed face at every heading on every
page, which catches a silent fallback that a screenshot would not. Four
pages × eight widths: no tofu, no substitution.

---

## C — GLYPH SYSTEM

**27 marks, drawn for this site.** No Lucide, no Heroicons, no Font
Awesome, no external pack in production or in development.

    CAPTURE   MEASURE   QUANTIFY   360       LOCATION  PLAN      PDF
    UPLOAD    AREA      VOLUME     LINEAR    CONTOUR   DOOR      WINDOW
    ROOM      LAYERS    SCAN       AI        DIGITALIZATION      OPTIMIZATION
    PROJECT SPACE       DELIVERY   DATA      ARROW     EXTERNAL  FLOOR
    STATION

Sheet and legibility grid: **`qa/p10/glyph-sheet.png`** (regenerate with
`node qa/p10/sheet.mjs`).

**Architecture.** One source — `src/glyphs/glyphs.js` — two consumers:

- `tools/glyphs-plugin.mjs` expands `{{glyph:name cls | label}}` in the
  static HTML at dev *and* build time, so a glyph on a static page costs
  no JavaScript and nothing has to hydrate;
- `glyph(name, opts)` builds identical markup for UI that JS assembles
  (the project-input form, the panorama HUD).

An unknown glyph name is a **build error**, not a silent blank.

**Bodies are inlined, not `<use>`d.** A use-element shadow tree only
reliably inherits *inherited* properties. Chrome does apply document CSS
inside it; Firefox and Safari do not — verified with a three-way probe
before committing to an approach — and §06 has to move individual corner
brackets and draw individual measurement lines. Inlining costs repeated
markup and buys real CSS, and repeated identical strings are the cheapest
thing gzip is ever handed.

Delivered: 15 static instances on the homepage, 8–10 per service page,
plus 6 more mounted with the form.

---

## D — GLYPH RULES

```
grid       24 × 24
live area  x,y ∈ [2.5, 21.5] — a 2,5-unit margin, so a row of glyphs
           optically aligns with no per-icon nudging
stroke     1.5, set by CSS so one declaration retunes the family
caps       square   — round caps are what make a set read friendly
joins      miter    — every corner in the family is a drawn corner
angles     90° and 45° only
```

There are exactly four curves in the set — the door swing, the contour
lines, the 360 orbit, the sensor rings — and each is a curve because the
thing it draws is round.

**Geometry is open.** Almost nothing is a filled silhouette; a drafting
mark describes an edge, a datum or an extent. `fill` appears only on the
sensor dots and the count markers, the two places in the system where a
mark means *here, exactly*.

**Shared parts (§05).** The three service glyphs are built from the parts
the brief specified — CAPTURE: corner brackets + sensor + frame; MEASURE:
terrain + dimension + datum; QUANTIFY: plan + boundary + count — and every
other glyph reuses them: the same 4-unit corner bracket, the same 3-unit
measurement tick, the same r=1 sensor dot.

**Stroke does not scale linearly** — optical weight is not linear:

```
.gl--16  1.35    .gl--20  1.45    .gl--24  1.5    .gl--32  1.6    .gl--40  1.7
```

**§25 QA.** All 27 rendered at 16/20/24/32 (`qa/p10/glyph-sheet.png`).
Four were redrawn after the first sheet because they failed it:

- **AI** — a three-node graph that read as unrelated fragments below 24 px.
  Now a 45° decision node on a data line.
- **WINDOW** — an elevation that read as a dumbbell at every size below 32.
  Now wall–glass–wall in plan, paired with DOOR.
- **OPTIMIZATION** — illegible tangle. Now a dashed stepped detour
  collapsing onto a direct run.
- **360** — the arrowhead collided with the ring. Now a chevron *on* the
  orbit, ring intact.

---

## E — HOVER LANGUAGE

Four primitives, plus the technical button that shares one of them.
Plate: **`qa/p10/plate-primitives.png`** — each at rest, mid-gesture and
engaged, on the real control it ships on.

| | primitive | where it is allowed | what happens |
|---|---|---|---|
| **A** | SCAN REVEAL | START PROJECT, service primary CTA, form submit — 6 controls total | one 1 px line crosses the control once |
| **B** | TECHNICAL SHIFT | nav links, secondary links | the section index resolves in beside the label |
| **C** | GLYPH ASSEMBLY | icon-led actions — mode rail, service picks, drop zone | the glyph's own geometry resolves (§06) |
| **D** | DATA LINE | representation links — the sibling-service cards | the technical baseline extends and its value resolves |

**A is deliberately scarce.** A scan that happens on every link is
wallpaper. Six controls on four pages.

**No scale, no bounce, no spin, no pill expansion, no shadow** anywhere in
the system. Everything is transform, opacity or `stroke-dashoffset`.

**The scan is composited.** A full-size overlay carrying a 1 px line at
its own left edge, translated by a *percentage of itself* — a percentage
translate resolves against the element's own box, so 0 % puts the line on
the leading edge and 100 % on the trailing one, at every control width,
with no container query and no measurement. A `background-position` sweep
would have repainted the control on every frame of every hover, which is
the exact class of effect Phase 8.3 spent its budget removing.

### §06 — glyph animation

```
CORNER   the four brackets close 1,25 units toward the centre
SENSOR   the point resolves — .6 scale / .55 alpha at rest
DRAW     a measurement line completes along its own length
TICK     a datum tick resolves in place
MARK     a count marker resolves
SWEEP    a scan line crosses its field
FRAG     a plan fragment resolves
```

Nothing in that list is the difference between legible and not. The first
cut animated *every* line in every glyph, and at rest LOCATION lost its
crosshair, ARROW lost its shaft and STATION lost its legs. An idle glyph
is now a complete drawing that is merely quiet; engaging it sharpens the
drawing rather than finishing it.

Timing: `--motion-ui` (260 ms), inside the brief's 150–250 ms band at the
fast end of the gesture and settling just past it.

### §20 — motion tokens

```
--motion-fast   .18s   the pointer is answered
--motion-ui     .26s   a control RESOLVES        (was .34s — read as soft)
--motion-state  .65s   a decision or a reveal

--ease-out   cubic-bezier(.16, .84, .28, 1)   default; leaves fast, lands exactly
--ease-io    cubic-bezier(.72, 0, .18, 1)     travel between two known states
--ease-line  cubic-bezier(.34, 0, .10, 1)     a rule drawing itself
```

Every curve ends with its second control point at y=1, so **nothing on
this site can travel past its destination and come back**. The Phase 3–9
names (`--t-hover`, `--t-state`, `--t-commit`, `--ease`) are aliases onto
these three, so every existing stylesheet follows the new grammar without
being rewritten. `--t-mode: .85s` is unchanged — it is a contract with the
renderer, not one of the three tiers.

---

## F — HOMEPAGE

### §14 — the service rail

Phase 9 ran three equal columns under one continuous rule. It worked, and
it made the three services look like three equivalent products rather than
three readings of one site — which is the argument of the page above it.

The rail is now a **section drawing**: three channels of progressively
increasing width (0,84 / 1,00 / 1,16), each entered at its own datum —
CAPTURE at the top line, MEASURE 14 px down, QUANTIFY 28 px down. The
continuous top border is gone; each mode carries its own rule at its own
height, and the stepped edge is the composition. Each channel gains its
service glyph, right-anchored.

*(The first implementation of this cancelled itself exactly: with
bottom-aligned tracks the stepped padding made each box taller and
therefore start higher, putting all three datum rules back on one line.
Equal-height boxes let the padding move rule and content down together
while the bottom edge stays level.)*

**Not sacrificed, per §14:** three `<button>`s with `role="tab"`, the same
roving tabindex, panels intact, the full column as the hit area — measured
at 173 px tall, and ≥ 64 px at every width. All five assertions in
`qa/p10/a11y.mjs`.

**Removed:** the per-mode arrow. These are tabs; they do not navigate, and
an arrow saying they do was the one element of the rail that lied.

### §18 — PROJECT INPUT

The section is no longer titled START PROJECT. It opens with a **question
at display size** — `WHAT ARE WE / WORKING WITH?` — the only legend on the
site that is not a micro label, because the answer decides everything the
form does next.

Each selector leads with the **object**, not the product:

```
01                          [capture glyph]
Egy meglévő helyszín
CAPTURE
360° kamera · virtuális bejárás
```

*(A first pass set "MENNYISÉGSZÁMÍTÁS DRAWING" as the key — 27 characters
of display type in a 380 px column, saying the same thing twice in two
languages. The product name moved to the line below.)*

§19 glyphs on `location`, `data`, `upload` (which replaced the last
hand-drawn icon on the site — a 26×32 box with a `box-shadow` standing in
for three body lines), `project-space` and `delivery`. Every one is
secondary: grey at rest, accent only when its row is the live one, and
`aria-hidden` in all cases because the word beside it already says it.

Field usability is untouched — same inputs, same validation, same
required/optional contract, same honeypot.

---

## G — CAPTURE · SPATIAL

A capture job is a walk: you stand at CP-01, then CP-04, then CP-08, and
the record is the relationship between those positions. The page performs
it.

Each section head enters at a different distance across the field — 0 / 7
/ 14 / 21 vw, clamped — and a **survey line runs back from it to the left
gutter with an anchor at the origin**, so the indent is not a margin, it
is a measured offset from a station.

The 360 viewer takes the full frame, weighted off-centre to the right
above 1100 px. Never centred: a centred field is a card. The hero's
station strip becomes a rail across the whole frame with an anchor at each
station.

---

## H — MEASURE · INSTRUMENT

Not a dashboard. A dashboard is readouts arranged for scanning; an
instrument is one scale that everything is read *against*.

The page grows a continuous vertical **datum** — one hairline down the
full height of `<main>`, calibration tick every 24 px, major division
every 120 px, drawn as two repeating gradients so a 12 000 px scale is one
element and one paint rather than 500 ticks in the DOM. Every section sits
to the right of it; every section eyebrow takes a level off it with a
terminal mark.

Nothing on this page wanders horizontally. That *is* the art direction:
precision is the absence of the freedom the CAPTURE page takes.

---

## I — QUANTIFY · EDITORIAL DRAWING

The page is a **sheet**: a drawn border inset from the frame with four
registration crosses, sections laid out *on* it rather than stacked in it,
and **title blocks** bottom-right carrying sheet number, scale and a live
reading.

The plan **crops**. An asymmetric bleed to the right only — a drawing that
bleeds on both edges is a background, and this one is still a subject.

Copy does not get a column opposite the drawing. It sits in the drawing's
**void**: max 33 rem, offset 8 vw (22 vw in the output section), never a
half of a 50/50 split.

---

## J — START PROJECT

See **F** above.

---

## K — MOBILE

Built for, not stripped to.

- **Hero** holds two authored rows at 375/390/430 on all four pages.
- **Service rail** — the stepped datum is a desktop composition; at 390 the
  channels are ~110 px and a 28 px step would spend a tenth of the frame
  on an offset nobody can read as one. The rule is level and the asymmetry
  is carried by the glyph column.
- **Glyphs** drop to 16 px at 1.35 stroke — legibility verified in the
  §25 grid, not assumed.
- **MEASURE datum** survives at a third of its offset; the calibration
  does not survive at all, so it goes rather than becoming noise.
- **QUANTIFY sheet** keeps its border, drops its registration crosses;
  title blocks reflow to two columns, left-aligned.
- **Cursor** is off — `(hover: hover) and (pointer: fine)` only.

**One real bug caught here.** The ≤700 phone rail reset its grid *rows*
but not its *columns*, so it inherited `auto 1fr` from the ≤900
breakpoint: at 375 each channel was still two columns and `.mode__body`
was a 50 px box holding a 65 px word. QUANTIFY overflowed by 15 px. Found
by `qa/p10/hu.mjs`, which is what an overflow check is for.

---

## L — PERFORMANCE

**No regression. Phase 8.3 is intact.**

`qa/p10/perf.mjs`, 1440×900, dpr 1, median of three 2-second passes:

| | before | after |
|---|---|---|
| hero, idle | 60,4 fps | 60,4 fps |
| hero, continuous pointer sweep across nav, CTA, rail and tracker | 60,5 fps | 60,5 fps |

Layer inventory — **identical before and after**:

```
backdrop-filter   NONE
mix-blend-mode    NONE
filter            NONE
3d transforms     0
will-change       .cursor, .anno, .scanplane, .line__in, .chapter__hold
```

Nothing in this phase added a promoted layer or a render surface. Two
things were caught and removed before they could:

- a `filter: drop-shadow()` on the cursor's arrow — a filter on the one
  element that moves every frame is a render surface bought for a 7 px
  mark. Not needed: the arrow only appears in the LINK state, and every
  light-ground control on the site carries `data-cursor` and is therefore
  in the LABELLED state, where that pseudo-element is at opacity 0;
- a `mix-blend-mode: normal` left on the primary button's scan overlay —
  a no-op, but the wrong thing to leave in a file whose rule is "no blend
  modes".

**Transfer.** CSS +3,43 kB gz, HTML +0,70 kB gz, fonts **−20,7 kB**.
Net **≈ −16,6 kB** for a first homepage load.

---

## M — ACCESSIBILITY

`qa/p10/a11y.mjs` — all checks pass on all four pages.

- **Glyph naming.** 23 glyphs on the homepage, 10 per service page; every
  one is either `aria-hidden` or carries an accessible name. **No control
  on the site is named only by a glyph.**
- **Focus parity.** Every hover primitive answers `:focus-visible`
  identically to `:hover`, verified by *walking the real tab order* with
  synthetic Tab keys and reading the settled computed state.
- **Reduced motion.** Glyph parts resolve to the **finished** drawing, not
  the half-drawn idle one — a reader who asked for no motion should get
  the completed mark. Cursor off. Scan animations off.
- **Mode rail.** `<button>` × 3, `role="tab"`, real panels, roving
  tabindex, hit areas 173 px.

**A real defect was found and fixed here.** `.pick` is a `<label>`
wrapping a visually-hidden radio: the label is not focusable, so keyboard
focus lands on the *input* and `.hv-glyph:focus-visible` never matched.
Glyph assembly answered the mouse and ignored the keyboard on the MEASURE
and QUANTIFY pages. All four primitives now carry `:has(:focus-visible)`
with a `:focus-within` fallback under `@supports not selector(:has(*))`.

*(Two earlier versions of this check were themselves wrong — one read a
computed value mid-transition, one reported a failure when a control it
targeted was simply not a tab stop, which is correct radiogroup behaviour.
Both are documented in the harness so the next phase does not repeat them.)*

---

## N — VISUAL QA

`qa/p10/hu.mjs` — 4 pages × 8 widths (1920 → 375): **no tofu, no overflow,
no widows, no font substitution on ő/ű.**

Twelve issues were found and fixed on the way there:

- 6 × `.mode__key` overflow on phones — the grid-column bug in **K**.
- 5 × display widows. `text-wrap: balance` was reaching the three
  `u-d*` classes but not `.sv-h` / `.sv-hero__title`, which set their own
  type. Balance now applies inside `.line__in`, the block the reveal mask
  animates, so authored two-line headings are not re-broken.
- 1 × a widow that balance could not fix: `TO MEASURABLE DATA.` needs
  380 px and has 319 at a 375 frame, so the browser added a third row and
  left `DATA.` alone. The service-hero floor is lowered below 520 px, and
  the ramp is continuous across the breakpoint — 35,52 px at both 519 and
  520. Cost: a 17 % smaller headline at 375. That is the right trade: an
  authored composition at 30 px reads as designed; a browser-chosen
  three-row break at 35 px reads as broken.

**Gallery** (matched framings, same script against both trees):

```
qa/p10/plate-ba-1.png   home hero · service rail · services · capture hero
qa/p10/plate-ba-2.png   measure instrument · quantify hero · analysis · project input
qa/p10/plate-ba-3.png   footer · about · six mobile framings at 390
qa/p10/plate-primitives.png   §07 — the four primitives, rest / mid / engaged
qa/p10/glyph-sheet.png        §04 C + §25 — sheet and legibility grid
qa/p10/before/  qa/p10/after/  26 matched plates
```

**Build and tests:** `npm run build` clean, **56/56 tests pass**, no
console errors on any of the four documents.

---

## O — CRITICAL SELF-REVIEW

**1. Does this now look clearly unrelated to Rapidkert?**
On typography, yes, and structurally rather than tonally. Geist is gone
from the repo — files deleted, not just unreferenced. Instrument Sans
differs from it in the skeleton (sheared R leg, spurred G, flat-cut S and
C terminals, cap/x 1,41 vs 1,34), and the body face is a different
designer's different idea of a grotesk. What I *cannot* verify is the
actual claim: I have never seen Rapidkert. I verified the departure from
the face this site was using. If Rapidkert's resemblance came from
something other than Geist — a layout habit, a colour, a photographic
treatment — this phase did not address it, because nothing in the brief
described it.

**2. Which element feels most proprietary to GoDataFusion?**
The MEASURE datum. A continuous calibrated scale running the height of a
page, with every section heading taking a level off it, is not a pattern
you can buy or accidentally arrive at, and it is the one place where the
graphic system does what the 3D system does — it makes the page behave
like the instrument it is describing. Second: the stepped service rail.

**3. Which glyph is weakest?**
WINDOW. Even redrawn as wall–glass–wall in plan it is a symmetrical
arrangement of small parts, and at 16 px it reads as an abstract mark
rather than as an opening. STATION is second-weakest — it reads as a
drafting compass at least as readily as a survey tripod, though in this
site's vocabulary that ambiguity is close to harmless. AI is the most
*honest* weak one: a 45° decision node is defensible and distinctive, but
nothing about it says "AI" without the label.

**4. Is typography distinctive enough?**
The display tier, yes. The text tier is the compromise: IBM Plex Sans is
an excellent, technical, well-drawn face that a great many other products
also use. It was specified in the brief and it earns its place
metrically — sharing metrics with Plex Mono is what makes the whole
label/data split work — but if the goal is that no one can place the
typography, Plex Sans is the piece someone will place.

**5. Is any service page still structurally generic?**
CAPTURE is the least transformed. The survey-line offsets and the
full-bleed viewer are real, but below the viewer it still reads as
sections stacked down a page; the "station / environment relationships"
the brief asked for are drawn as connectors rather than built into the
layout. MEASURE and QUANTIFY have genuinely different bones. Also: the
**PROCESS section on the homepage** was not touched by this phase at all
beyond inheriting the type — it is 669 lines of Phase 4/5 composition and
it is now the most conventional part of the site.

**6. Are hover effects too frequent anywhere?**
Close to it in the mode rail, where the glyph resolves, the datum rule
brightens, the key changes colour and the accent bar extends — four
simultaneous responses to one pointer. It reads as one gesture because
they share a duration and a curve, but it is the most that should ever
happen at once, and I would not add a fifth. Everywhere else the ratio is
right: SCAN REVEAL is on six controls in the entire site.

**7. Is monospace still overused?**
No, but the line is not perfectly drawn. 117 rules set monospace before
this phase; 63 distinct elements still compute to it, and every one I
inspected is a value or an identifier. The judgement calls I would expect
an argument about: `PDF · JPG · PNG` (a format list — I called it data),
`20 FELVÉTELI PONT · 3 SZINT` (a sentence containing counts — data), and
`.sv-step__i`, which is `SURFACE` on one page and `01 / DRAWING` on
another and therefore cannot be right in both.

**8. What would you remove from the interface?**
The per-mode arrow is already gone. Next I would remove the **hero
telemetry column** — SCAN STATUS / DATA POINTS / PROCESS. It is
`aria-hidden` decorative fiction sitting in the most valuable corner of
the page, and the new type system makes its absence cheaper than it used
to be. After that, the `modes__disclaimer`, which now says in Plex Sans
what the `chapter__demo` line says again two screens later.

**9. Has any design change reduced usability?**
One measurable regression, accepted: the service hero is 17 % smaller at
375 px. That buys an authored line break over a browser-chosen one.
One risk I would want tested with real users rather than a harness: the
nav index (01–04) appears only on hover, so it is invisible to a touch
user entirely — it is decoration on a phone, not information. And the
`--motion-ui` retune from 340 ms to 260 ms makes the whole interface feel
faster; if anyone found the old pacing calming, this will read as brisk.

**10. Is there now a complete GoDataFusion visual identity outside the 3D
system?**
Yes, with one honest gap. Type, glyphs, rules, marks, motion, hover
grammar, buttons, cursor and three layout rhythms are all defined, all
tokenised, all applied, and all documented in the stylesheets rather than
only here. The gap is that the identity is currently **screen-only** —
there is no wordmark lockup, no favicon in the new system (it is still a
1,5 px two-bar SVG from Phase 1), no OG image, no print or document
treatment. The site is unmistakably GoDataFusion; a GoDataFusion PDF or a
GoDataFusion social card is not yet anything.

---

## FILES

**New**

```
src/glyphs/glyphs.js          27 glyphs, one source
tools/glyphs-plugin.mjs       {{glyph:…}} expansion, dev + build
src/styles/glyphs.css         glyph presentation, §06 animation, §07 primitives, §15/§16 marks
src/styles/rhythm.css         §10–13 — the three editorial rhythms
public/fonts/gdf-*.woff2      three families, 62 900 B
docs/fonts/OFL-*.txt          three licences
qa/p10/*.mjs                  eight harnesses
PHASE-10.md                   this document
```

**Removed**

```
public/fonts/geist*.woff2     4 files, 83 648 B
```

**Reworked** — `tokens.css` (type, motion, rule and mark systems),
`base.css` (display tier, micro tier, buttons, drafting marks), `nav.css`,
`modes.css`, `project.css`, `cursor.css`, `service.css`, `services.css`,
`fusion.css`, `footer.css`, `panorama.css`, `process.css`, `manifesto.css`,
`evidence.css`, `hero.css`, `modules/request.js`, `modules/cursor.js`,
four HTML documents, `vite.config.js`.
