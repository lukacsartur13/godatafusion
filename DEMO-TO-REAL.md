# DEMO → REAL

Every synthetic thing on this site, and exactly what replaces it.

This document exists so that publishing the first real GoDataFusion project
is a **content and data task, not a redevelopment**. Nothing below requires a
new visual language, a new component, or a layout change. Where a swap needs
code, the code is already written and the entry point is named.

Written at the end of Phase 5. Keep it current: if a demo representation
changes and this file does not, the map is worse than no map.

---

## 0 — Rules that hold for every row

- **Nothing here is a client's work.** Every demonstration asset is
  procedurally generated from seeded noise or authored geometry in this
  repository. There is no anonymised client material anywhere on the site,
  so there is nothing to remove — only things to replace.
- **Every demo surface is labelled as one.** `Az itt látható értékek
  interfész-demó adatok.`, `DEMO ENVIRONMENT`, `A felmérés nem minősül
  hivatalos földmérésnek.` Replacing a demo with real material means the
  label changes too, and the label change is the part that must not be
  forgotten.
- **A real asset must arrive with permission.** Client name, location
  precision and whether the material may be shown at all are content
  decisions, not engineering ones. The evidence schema has `location` as
  optional for exactly this reason.

---

## 1 — CAPTURE

| current demo | what it is | future real source | how it is swapped |
|---|---|---|---|
| The 360° viewer's environment | `src/webgl/panorama.js` — `source: { type: 'world' }`. The same procedural site fragment the homepage renders, entered at a capture station. | One **equirectangular photograph** per station (2:1, ≥ 6000×3000, JPEG or AVIF). | The viewer already takes `{ type: 'equirect', url }` per station. Put the real stations in the station table and call `viewer.setStations(list)`. **No change to panorama.js, to the page, or to the UI.** |
| The twelve capture positions | `STATIONS` in `src/webgl/geometry.js` — authored XZ pairs. | The real capture positions of one site, with their own labels. | Same station table. Positions only drive the viewer's "other stations" markers and the site plan; a real list is a list. |
| `DEMO ENVIRONMENT` label | markup on `/360-camera/` | The project name, or nothing. | Copy change. **Must not be left saying DEMO over real footage.** |
| Homepage CAPTURE chapter object | the procedural site, `P.capture` preset | Unchanged — this stays synthetic. | The homepage object is a *diagram of the method*, not evidence. It is honest as a diagram. Real capture material belongs in the evidence sheet, not in the ambient scene. |

**First real asset needed:** one site, 6–12 stations, equirectangular, plus
permission to publish. That is the single highest-value asset this site can
receive.

---

## 2 — MEASURE

| current demo | what it is | future real source | how it is swapped |
|---|---|---|---|
| The terrain surface | `heightAt()` in `src/webgl/field.js` — seeded value noise plus an authored drainage swale and an excavated building pad. Deterministic, so it is the same object on every load. | A **real terrain model**: a point cloud, a TIN, or a heightfield raster from an actual survey. | `heightAt(x, z)` is the single seam. Everything downstream — the mesh, the contours, the volume prism, the callout anchors, and every number on the MEASURE page — is derived from it. Replace the function body with a sampler over real elevation data and the whole page follows. |
| Every measured figure | `src/data/terrain-metrics.js` — area, volume, elevation range and contour interval, integrated numerically over the field above. Nothing is typed in. | The same integration, over the real field. | **No change to terrain-metrics.js.** It already computes rather than quotes; it will simply be computing over real ground. |
| `PARCEL_M2 = 1248.62` | the world-unit → metre scale, chosen so the demo parcel matches the figure the homepage quotes. | the real parcel's area. | One constant. |
| `A felmérés nem minősül hivatalos földmérésnek.` | a claim limit | Keep it. | This is a limit on what the service is, not a property of the demo. It stays true for real work. |

**First real asset needed:** one site's terrain dataset in any griddable
form, plus the parcel area and the survey date.

---

## 3 — QUANTIFY

| current demo | what it is | future real source | how it is swapped |
|---|---|---|---|
| The floor plan | `PLAN` + `planFeatures()` in `src/webgl/geometry.js` — an authored rectangle with partition walls, from which 24 doors, 31 windows and 12 rooms are generated. | A **real anonymised drawing**: the linework of one floor, with client identification removed. | The plan is consumed as line segments plus a feature list. A real drawing arrives as either (a) an SVG/DXF path set converted to the same segment buffer, or (b) a flat image plane with a real feature list beside it. The camera fitting (`fitViews` / `planBounds`) is already derived from the plan's own extents, so a differently-shaped drawing frames itself. |
| `24 AJTÓ · 31 ABLAK · 12 HELYISÉG · 842,6 m²` | derived from `planFeatures()`, consistent everywhere it appears | the real counts from the real drawing | Derived, not typed — the same code path. |
| `floorTotal: 842.6` | the demo plan's floor area | the real drawing's | One constant. |
| The extraction sequence | `annotations.js` extraction anchors over plan features | real features of the real drawing | Anchors are read from the feature list. |

**First real asset needed:** one PDF floor plan the client permits us to show
with identification removed, and the quantity schedule that came out of it.

---

## 4 — The rest of the synthetic material

| current demo | future real source | note |
|---|---|---|
| Hero readout values (`12 capture points`, `1 248,62 m²`, `24 PCS`…) | Real figures once a project exists, or leave as-is. | Already labelled `interfész-demó adatok`. These are an *interface demonstration*, and are honest as long as the label stays. |
| `47°41'12.8"N / 17°38'05.4"E` in the hero strip | The company's actual operating region, or removed. | Currently instrument furniture. If it is not a place the company works, it should become one or go. |
| PROCESS token `SAMPLE_01.PDF` / `PROJECT_001` | **Nothing.** This stays. | It is deliberately a neutral token, not fake project metadata. A real filename here would be a leak, not proof. |
| The PROCESS figure (`.pf`) | **Nothing.** This stays. | It is a diagram of the workflow, not a claim about a project. |
| The WebGL fallback SVG, the ABOUT object | **Nothing.** These stay. | Diagrams of the method. |
| The FUSION operating labels | **Nothing.** | Descriptions of stages, not data. |

---

## 5 — Where a real project actually lands

`src/data/evidence.js`. One entry:

```js
export const PROJECTS = [{
  id: 'gyor-irodahaz',
  service: 'capture',                 // or measure / quantify / mixed
  type: 'IRODAHÁZ',
  location: 'GYŐR',                   // optional — omit if not permitted
  title: '…',
  summary: '…',
  facts: [
    { k: 'SERVICE', v: 'CAPTURE' },
    { k: 'INPUT',   v: '360° SITE RECORD' },
    { k: 'OUTPUT',  v: 'VIRTUAL SITE RECORD' },
    { k: 'STATUS',  v: 'COMPLETED' },
  ],
  visual: { kind: 'panorama', src: '/evidence/…', width: 1600, height: 900,
            alt: '…' },
  steps: [ { k: 'CONTEXT', c: '…' }, … ],   // optional, 01…05
  status: 'published',
}];
```

That single entry makes the evidence section appear **on the homepage
between WHY and START PROJECT, and on the matching service page**, in that
service's accent, with no other change anywhere in the codebase.

Until then the section is not rendered, its stylesheet is not loaded and its
renderer is not fetched.

---

## 6 — What must NOT be done

- Do not write a project entry before the asset exists. `isPublishable()`
  rejects an entry without a real `visual.src` and `visual.alt`, and that
  guard is there on purpose.
- Do not use the development fixtures as content. They are marked
  `demo: true`, they live in a module that is not emitted in production, and
  they are rejected by the same guard even if they somehow were.
- Do not present a render as a survey. The `kind` field decides the badge on
  the sheet — `panorama`, `terrain`, `drawing`, `image` — and those four
  words are different claims.
- Do not add a fourth accent for evidence. A sheet inherits its service's
  colour; a multi-service project uses the neutral foreground.
