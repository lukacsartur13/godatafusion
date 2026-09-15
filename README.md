# GoDataFusion — TURN REALITY INTO DATA.

Construction-data & digital-surveying website. Four documents, one visual
system: a homepage that runs one continuous REALITY → DATA narrative, and
three service pages that are each a deeper reading of one of its states.

```bash
npm install
cp .env.example .env   # the endpoint's contract; see "The endpoint" below
npm run dev            # http://localhost:5173
npm test               # the narrative stop-table invariants
npm run build
npm run preview        # serves dist/ WITH the API endpoint
npm run check:live     # fails while company.js still holds a placeholder
npm run i18n           # regenerate /en/ and /de/ from the Hungarian pages
```

**Phase 13–14** cut the homepage to four readings with no visible seam
between them, moved the company and the contact into documents of their
own, and published the whole site in **three languages**. See PHASE-13.md.

## Routes

Nine documents, three languages, twenty-seven URLs. The Hungarian column is
the markup anybody writes; the other two are generated from it at build time
(see **Three languages** below).

| hu | en | de | Mode | Entry |
| --- | --- | --- | --- | --- |
| `/` | `/en/` | `/de/` | idle → all three | `src/main.js` |
| `/360-camera/` | `/en/360-camera/` | `/de/360-kamera/` | CAPTURE `#42E8FF` | `src/service.js` |
| `/teruletfelmeres/` | `/en/site-survey/` | `/de/gelaendeaufmass/` | MEASURE `#B8FF3D` | `src/service.js` |
| `/mennyisegszamitas/` | `/en/quantity-takeoff/` | `/de/mengenermittlung/` | QUANTIFY `#FF6846` | `src/service.js` |
| `/rolunk/` | `/en/about/` | `/de/ueber-uns/` | — | `src/page.js` |
| `/kapcsolat/` | `/en/contact/` | `/de/kontakt/` | — | `src/page.js` |
| `/impresszum/` | `/en/imprint/` | `/de/impressum/` | — | `src/page.js` |
| `/adatkezeles/` | `/en/privacy/` | `/de/datenschutz/` | — | `src/page.js` |
| `/404.html` | `/en/404.html` | `/de/404.html` | — | `src/page.js` |

The header is a route index, not a table of contents: the three services
behind one disclosure, the company, the contact, and the call to action.

Real directories, not a client-side router: back/forward, direct entry,
view-source and crawling all work without JavaScript, and the transition
between them is an overlay laid over a native navigation
(`src/modules/transition.js`), never a fake one.

## Stack

| Choice | Why |
| --- | --- |
| **Vite + vanilla ES modules** | One canvas-driven document. A framework would add runtime weight and a VDOM boundary between GSAP/Three and the DOM for no benefit. |
| **Three.js (raw)** | Full control of materials and the shared scan uniform block. No R3F, no post-processing pipeline. |
| **GSAP + ScrollTrigger** | Timeline choreography and scroll linkage in one clock. |
| **Lenis** | Smooth wheel scrolling on pointer devices; disabled for touch and reduced motion, where the platform does it better. |
| **Self-hosted GDF Display / Text / Mono** | Instrument Sans + IBM Plex Sans + IBM Plex Mono (all SIL OFL 1.1), subset to the charset the site sets — ASCII, the Hungarian accented pairs, and the engineering marks `° ′ ″ ² ³ × ↗`. 61 KB across three files, zero third-party requests. See PHASE-10.md §A/§B. |

## Architecture

```
index.html            homepage shell — all copy lives here, not in JS
                      01 hero · the bridge · 02 results · 03 the data field
                      04 details · 05 why · 06 the request form
rolunk/               /rolunk/              the company, the principles, the process
kapcsolat/            /kapcsolat/           contact and the request form
360-camera/           /360-camera/          CAPTURE
teruletfelmeres/      /teruletfelmeres/     MEASURE
mennyisegszamitas/    /mennyisegszamitas/   QUANTIFY
404.html
netlify.toml          static build + one function; headers; 404 mapping
.env.example          the endpoint's environment contract
server/
  handler.mjs         POST /api/project-request — validation, files, limits
  mail.mjs            transport abstraction (resend | postmark | console)
  vite-api.mjs        the same handler, under `vite dev` and `vite preview`
netlify/functions/
  project-request.mjs a two-line adapter around server/handler.mjs
test/
  stops.test.mjs      narrative stop invariants, DOM-free
src/
  service.js          shared entry for the three service routes
  page.js             shared entry for every page with no scene:
                      /rolunk/, /kapcsolat/, the legal pages, the 404
  i18n/
    routes.js         every document's path in every language — one table
    t.js              the runtime dictionary; t() and the locale's numbers
    messages.js       the endpoint's answers, in all three languages
    <lang>/*.json     the dictionaries, keyed by the Hungarian sentence
  data/
    company.js        the ONLY place contact + legal strings exist
    services.js       one definition of the three services, read by four consumers
    terrain-metrics.js area / volume / contour interval, integrated from the field
  main.js             boot: shell first, renderer as a lazy enhancement
  core/
    env.js            capability detection (reduced motion, pointer, WebGL, DPR cap)
    store.js          the single source of truth for the active service mode
    theme.js          animates the live --accent channel from the store
    scroll.js         Lenis + ScrollTrigger wiring
  service/            per-route modules, lazy-loaded — never all three at once
    stage.js            the shared scene + state machine
    capture.js measure.js quantify.js
  modules/            DOM behaviour, each one a store subscriber
    nav.js modes.js cursor.js telemetry.js intro.js
    request.js          START PROJECT — one component, five pages, real POST
    seams.js            PHASE 13 — one number per crossing; the CSS does the rest
    datafield.js        PHASE 13 — the drawing, and the figures counted out of it
    transition.js       the page-transition field over native navigation
    company.js          applies data/company.js to every [data-company]
    examples.js         PHASE 12 — derived tables, floor plan, contours; no three.js
    media.js            PHASE 12 — lazy, viewport-gated sample video
    stops.js            the narrative arithmetic, pure and testable
    serviceSections.js  section reveals for the three service pages
    scanplane.js        the Scan Plane, re-aimed at whatever is being read
    narrative.js        THE scroll authority for hero → services
    track.js            keyframed weight maps along one scroll range
    manifesto.js        outline → structure → solid → data
    process.js  project.js  tracker.js  sections.js
  webgl/
    field.js          deterministic terrain field + site constants
    presets.js        the 23 named states + the aspect-derived camera fit
    panorama.js       the 360° viewer — world source or equirect photo
    levels.js         THE BUILDING — three levels of room rectangles, and the
                      walls, doors, windows, finishes and quantities derived
                      from them. No three.js import; the data source of record.
    geometry.js       terrain, massing, contours, the three floor plans,
                      stations, point cloud
    materials.js      shaders; all share one scan uniform block
    annotations.js    3D-anchored measurement callouts
    scene.js          renderer, mode blending, camera, render loop
  styles/             tokens → base → nav → hero → modes → manifesto → cursor
    tone.css            PHASE 12 — the light surface, service ink colours, new blocks
```

### The one rule that holds it together

`core/store.js` owns `hovered` and `locked`. Everything else subscribes:
CSS custom properties, the readout panels, the cursor, the telemetry, and the
WebGL weight vector. That is why hovering a service changes typography, grid,
atmosphere, geometry, scan behaviour and metadata *together* rather than
recolouring text.

### The narrative

`modules/narrative.js` owns ONE ScrollTrigger from the top of the hero to
the bottom of the services section. Its stops are measured from the real
elements on every refresh, and each stop carries a weight map over the
scene presets plus the scalars that travel with it — who owns the scene
(`mix`), which side the object sits on (`side`), how present the canvas is
(`op`/`blur`) and which service owns the page accent (`mode`).

One authority means there is never a gap where nobody drives the scene and
never two triggers fighting over the same frame, which is what would turn
the morphs back into crossfades. Continuous values are interpolated between
stops; discrete ones (`mode`) are a **step** function — the last stop at or
before the current progress. Nearest-stop lookup lags a whole chapter,
because one chapter's closing stop and the next one's opening stop share a
scroll position.

Two invariants worth keeping:

- `range` must equal the trigger's real scroll distance. `end: 'bottom
  bottom'` finishes one viewport before the element's bottom edge; measuring
  the raw element span instead skews every stop by ~7% of the page.
- Only fully opaque surfaces may write depth. A translucent mesh that does
  will silently punch holes in every line layer drawn after it.

### The site fragment

One parcel, five co-registered representations built from the same data:
solid massing, edge wireframe, point cloud, terrain contours, floor plan.
A three-component weight vector (`capture`, `measure`, `quantify`, with idle as
the remainder) cross-fades layer opacities, camera position, scan axis, scan
width and scan speed in a single `applyBlend()` pass. Nothing can be half in
one mode and half in another.

The building has **three levels** — L00 GROUND ±0,00, L01 WORK +4,00, L02
PROJECT +7,60, roof +11,20 — and `webgl/levels.js` is the only place any of it
is described. A level is a list of ROOM RECTANGLES; the walls are the union of
their edges, the doors are derived from which rooms touch circulation, and the
windows from which structural bays a room's exterior wall covers. Change a
rectangle and the drawing, the extruded building, the furniture layout, the
capture stations and every number on the site move with it.

The QUANTIFY sheets therefore contain exactly the **28 doors and 59 windows**
across **32 rooms and 2 317,2 m²** the readouts quote, per floor and in total,
and the extraction callouts anchor to symbols genuinely drawn on the sheet
being read. Add a door on any level and the count changes — `test/levels.test.mjs`
asserts that against the live derivation rather than against a fixture.

The plan, its ancillary footprints and the recognition bracket are **ribbon
meshes**, not `gl.LINES`. A one-device-pixel line is half a CSS pixel at
DPR 2 — fine for a contour thicket, useless for a drawing whose door swings
have to be read. Ribbons also gain weight as the camera closes in.

### The Scan Plane

A single uniform block (`scanUniforms`) — axis, position, width — read by every
material. `scanGlow(worldPos)` brightens whatever the plane is passing through:
point cloud in CAPTURE, contours in MEASURE, plan linework in QUANTIFY. The
axis tweens from Y to X for QUANTIFY, so the plane reads a drawing instead of
slicing elevations. `modules/scanplane.js` is the DOM half, so the gesture
crosses the layout and not only the canvas.

## The service pages

`src/service.js` is one entry for all three routes. It wires everything the
pages share — nav, accent, smooth scroll, Scan Plane, reveals, the request
form, the transition field — then loads `./service/<id>.js` for that route
alone. A CAPTURE visitor never downloads the terrain solver.

A service page state is **a preset over the same scene**, not a second
visual system: `webgl/presets.js` gained `capSite` / `capStation` /
`capReturn`, `mSurface` / `mContours` / `mVolume` / `mExport` and
`qDrawing` / `qIdentify` / `qStructure` / `qQuantity`, and `service/stage.js`
drives them from real `<button>`s and from scroll through one setter.

### The 360° viewer

`webgl/panorama.js` is a real inside-looking viewer with two sources:

```js
{ type: 'world' }             // the GoDataFusion demonstration site
{ type: 'equirect', url: … }  // a real equirectangular photograph
```

Same camera, same drag, same touch, same keyboard, same station list, same
metadata — only what surrounds the camera differs. **When genuine client
panoramas exist, add them to the station table as `{ type: 'equirect', url }`
and nothing else changes.** No client footage is invented: the default source
is the same procedural site fragment the homepage has always used, the page
labels it DEMO ENVIRONMENT, and the copy says it is not a client project.

Station placement is derived, not guessed. Four of the site's twelve stations
sit inside the building footprint, and several more are metres from a
six-metre volume — from there a 360° view is one grey wall. `insideSolid()`
drops those, `place()` pushes the rest out to a 6.8-unit ring along their own
bearing, and `openHeading()` marches rays against `BOXES` to find the opening
direction with the most room, biased back toward the mass.

### Aspect-derived framing

Phase 2 hardcoded the plan cameras for ~16:9. A drawing is a planar object
with known extents, so the distance that keeps it readable is arithmetic:
`presets.js` `fitViews()` solves the perspective frustum for the plan's real
half-extents (dimension lines included, read from `PLAN`) inside a declared
safe area on both axes and takes whichever constraint binds. Only the
distance is derived; the direction — the 10° tilt, the offset target — stays
authored. The view offset is folded into the aspect, because sliding the
content 15% of the frame width costs 30% of a half-frame on the crowded side.

Verified in frame at 2560×1080, 1920×1200, 1920×1080, 1440×1200, 1440×900,
1280×800, 1024×768, 1024×1366 and 768×1024.

### Chapter hand-overs

Two numbers in `modules/stops.js` decide whether a chapter change reads as a
morph or as a cut, and both were wrong through Phase 2.

`READ_LINE` (0.32) — a chapter's state begins a third of a viewport *before*
its box top, because a chapter box opens with 16vh of padding above its
headline. Keyed to the box edge, the object changed a third of a screen after
the reader had already moved on: measured, with "MEASURE THE SITE." at the
reading line, the scene was still 100% `captureClose`.

`MORPH` (0.24) — adjacent chapters used to share one scroll position, so the
blend between them had zero distance. `captureClose` at 0.8005 and `measure`
at 0.8005 is a hard swap, however smoothly each state is built. Each boundary
now owns a real span, sized against the shorter of the two chapters and
centred on the boundary, with an explicit half-and-half stop at its midpoint
where the accent changes hands. Geometry and colour turn together.

`chapterBounds()` derives the ranges so one chapter's end *is* the next one's
start; nothing can put two of them in the wrong order. The QUANTIFY
extraction sequence reads the same function, so its steps cannot drift from
the state they belong to.

### Narrative stop assertions

`modules/stops.js` holds the arithmetic that `narrative.js` used to do inline
against live layout — the most load-bearing calculation on the site and the
one thing that could not be tested. `buildStops()` takes plain numbers,
`validateStops()` checks that stops are finite, ordered, inside [0,1], that
every chapter owns a non-zero range, that no two chapters overlap and that
the trigger range is real. It also asserts that the mode step never runs backwards — the defect that
put a full frame of the previous chapter's close state, its near camera and
its accent, on screen after the next chapter's headline had arrived.
`reportStops()` warns in development and is folded out of production.
`npm test` runs the same invariants against synthetic layouts, DOM-free,
including regressions for that inversion, for ±0.9px of sub-pixel drift
between siblings, for every boundary being a blend rather than a cut, and
for each chapter taking over while its own type is being read.

## Section tracker

`#sectionIndex` and the `data-section` / `data-section-name` attributes on
each `<section>` are the hook.

## The endpoint

`POST /api/project-request` — `server/handler.mjs`, one Web-standard
`Request → Response` handler with **zero dependencies**, run by two adapters:

- `netlify/functions/project-request.mjs` in production (Functions v2 —
  the route is declared in the function, so there is no redirect table to
  keep in sync)
- `server/vite-api.mjs` in `npm run dev` and `npm run preview`

Development and production therefore run the **same** validator, the same
file checks and the same transport selection. There is no dev-only success
path anywhere.

### Environment variables

Copy `.env.example` to `.env` locally; on Netlify set the same names under
Site configuration → Environment variables.

| Variable | Required | Meaning |
| --- | --- | --- |
| `MAIL_TRANSPORT` | yes, in production | `resend` \| `postmark` \| `console` |
| `CONTACT_TO` | yes, for a real provider | where inquiries are delivered |
| `CONTACT_FROM` | yes, for a real provider | verified sender for that provider |
| `RESEND_API_KEY` | if `resend` | https://resend.com |
| `POSTMARK_SERVER_TOKEN` | if `postmark` | https://postmarkapp.com |
| `POSTMARK_STREAM` | no | defaults to `outbound` |
| `MAIL_ALLOW_CONSOLE` | no | `1` permits the dev transport in a production context |
| `VITE_SITE_ORIGIN` | build time | canonical / `og:url` origin |

**Nothing is silently discarded.** With no transport configured the endpoint
returns `503 transport_unconfigured` and the form says so, offering a
`mailto:` fallback with the visitor's own text already in it. The `console`
transport prints the whole submission to the server log and reports
`transport: "console"`, which the UI shows as an explicit dev-mode notice —
and it is refused in production unless `MAIL_ALLOW_CONSOLE=1`.

### Adding a provider

`server/mail.mjs` is a map of `name → async (msg, env) => id`. Both shipped
providers are plain HTTPS+JSON, which is why the endpoint has no
dependencies. A third is one entry in `TRANSPORTS` plus a line in
`.env.example`.

### File rules

Enforced server-side, from `src/data/services.js` — the same module the
browser validates against, so the two cannot drift:

- **PDF, JPG, PNG only**, and only the subset each service accepts
  (QUANTIFY takes PDF and requires one)
- max **3 files**, **4 MB** each, **5 MB** total — sized to stay inside
  Netlify's 6 MB synchronous function payload
- filenames normalised, path components stripped, 60-char stem
- **magic-byte validation**: a `.pdf` that is really a zip is rejected, not
  forwarded. The declared MIME type is never trusted
- attachments go out on the inquiry email. There is no storage bucket and
  no Drive integration: the public form is not the document repository, and
  the copy says so

### Abuse mitigation

- a honeypot field (`company`) — filled means the response *looks* like a
  success and the submission is discarded
- a time check — a form completed in under 2.5 s is refused
- two per-instance rate windows: 40 requests / 10 min, and **5 deliveries**
  / 10 min. Validation failures deliberately do not consume the strict
  budget, or a visitor correcting three fields would lock themselves out
- no CAPTCHA. Serverless instances are ephemeral, so the in-memory windows
  are a speed bump; the durable layer is the host's own edge rate limiting
  (on Netlify, Site configuration → Rate limiting on `/api/*`)

## Company data

`src/data/company.js` is the only place contact and legal strings exist.
Anything flagged `placeholder: true` is a clearly named stand-in, not
verified company data. `src/modules/company.js` applies it to every
`[data-company]` element at runtime and warns in development if the markup
and the config have drifted. Phone, address, registration number and VAT are
`null` and render nothing — an empty field is honest, an invented one is not.

## Constraints worth keeping

- Never show two service accents at full strength at once.
- Demo values must stay labelled as demonstration data. Every number on the
  site is now *derived*: the MEASURE figures are integrated over the height
  field the canvas renders (`data/terrain-metrics.js`), and the QUANTIFY
  counts come from `webgl/levels.js` — the module the symbols are drawn from
  and the building is extruded from. Add a door to a level and the readout
  gains a door, on that floor and in the building total.
- The endpoint must never report a success it did not achieve. If a
  transport is missing it returns 503 and says so.
- The MEASURE legal note ("A felmérés nem minősül hivatalos földmérésnek")
  ships with every MEASURE surface.
- WebGL is an enhancement. The static composition in `#stageFallback` must
  always look deliberate.
- The renderer suspends from PROCESS down (`scene.setActive(false)`); measured
  0 renders while suspended against 60fps active. Keep it that way.
- Nothing below `--fg-38` (3.2:1) may carry text. `--fg-16` and below are for
  rules, hairlines and marks only.
- CSS owns any opacity that a state class also drives. A GSAP `from` on such
  an element leaves an inline opacity that outranks the class permanently.


## Three languages

Hungarian is the source and lives at the root. English and German are real
directories with translated slugs, generated from the Hungarian documents
before the build reads its inputs — so every language is a real file a
crawler can fetch, and nothing is translated in the browser.

```bash
npm run i18n                            # regenerate /en/ and /de/
npm run i18n -- --extract               # the keys still missing, in document order
node tools/i18n/missing.mjs de          # what the German markup cannot say yet
node tools/i18n/runtime-missing.mjs de  # what the German code cannot say yet
```

| what | where |
| --- | --- |
| the route table | `src/i18n/routes.js` |
| the generator | `tools/i18n/core.mjs` (+ the Vite plugin beside it) |
| markup dictionaries | `src/i18n/<lang>/*.json`, keyed by the Hungarian sentence |
| strings JS writes | the same dictionaries, read through `t()` at render time |
| the endpoint's answers | `src/i18n/messages.js`; the form posts its `lang` |

`/en/` and `/de/` are generated, so they are **not** committed —
`npm run build` and `npm run dev` both write them first.

`npm test` fails if any language is missing a line, if two dictionary files
translate one key differently, if a translated document links out of its own
language, or if a server message loses a placeholder.
