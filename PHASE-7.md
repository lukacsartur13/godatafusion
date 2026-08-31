# Phase 7 — from technical model to believable place

Phase 6's architecture is intact. One building, four readings, all derived
from the same source. Nothing in this phase moved a wall, an opening or a
room boundary, and the QUANTIFY drawing is byte-for-byte the geometry it was.

What changed is everything that made the environment read as a procedural
demonstration rather than as a place.

---

## A. Poly Haven / external asset audit

**Phase 6's conclusion was wrong.** It recorded "Available: nothing" after
finding no authenticated asset provider on this machine. It did not test the
one provider that needs no authentication.

| Check | Result |
| --- | --- |
| `GET https://api.polyhaven.com/assets`, `User-Agent: GoDataFusion-AssetPipeline/1.0` | **HTTP 200**, 2,344,870 bytes, 2.65 s |
| Catalogue | 2,366 assets — 991 HDRIs, 854 textures, 521 models |
| API key | none exists |
| Commercial use | permitted |
| Endpoints used | `/assets`, `/info/{id}`, `/files/{id}`, `/types`, `/taxonomy/{type}`, `/categories/{type}` |

Terms were verified against the document the API's **own OpenAPI spec** names
as `info.termsOfService` — `Poly-Haven/Public-API/blob/master/ToS.md` — not
against a summary. The relevant clauses:

- §2.1 free for anyone including commercial use; §2.3 no key will ever be required
- §2.4 every call must carry a unique `User-Agent` or `Referer` — the pipeline sends one, and it is a constant, not a default
- §2.5 the credit clause binds the **live** API inside a product. This pipeline runs at build time and the site self-hosts the results, so the shipped page makes no API call. The assets are CC0 and carry no attribution requirement "now or ever". Provenance is recorded anyway.
- §2.6 do not degrade the service — hence the on-disk response cache, the serial queue and the inter-request delay

Nothing was scraped. No undocumented endpoint was called. No licence was assumed.

`tools/polyhaven/` — `client.mjs`, `search-assets.mjs`, `asset-metadata.mjs`,
`download-asset.mjs`, `asset-cache.mjs`, `generate-register.mjs`.

### The honest half

Poly Haven is a photogrammetry and environment library, not a
contract-furniture catalogue. Three of Part 04's eight priorities have **no
candidate at all**, and this is verified rather than assumed:

| Priority | Finding |
| --- | --- |
| **02 office / task chair** | Zero. Across all 521 models the only modern seat with a swivel base is a mid-century leather lounge recliner. |
| **04 meeting table** | Zero. Every table is vintage, rustic, or a coffee table. |
| **05 desk** | One — `metal_office_desk`, tagged *old, vintage, dirty, scratched, industrial*. Part 06 forbids that finish. |
| **graphite metal** | `?category=metal&condition=clean` returns **zero** assets. Every metal in the library is rusted or painted. |

Those four stayed procedural. The consequence is visible and is named in the
self-review.

## B. Asset selection

Chosen by **looking**, not by reading tags — contact sheets at
`qa/shots/candidates-models.png` and `candidates-materials.png`. Two decisions
came down to that:

- `white_plaster_02` carries the attribute `condition: clean`. Its render is visibly mottled and dirty. `white_stucco` is the clean one.
- `kloppenheim_07_puresky` is tagged overcast and low-contrast — and its `time_of_day` is **night**.

Selected (all CC0):

| Replaces | Asset | Source → web tris |
| --- | --- | ---: |
| `meeting_chair` ×12 | `dining_chair_02` | 22,013 → 1,249 |
| `lounge_chair` ×2 | `modern_arm_chair_01` | 8,916 → 1,799 |
| `plant` ×4 | `potted_plant_02` | 69,806 → 3,200 |
| `shelving` ×1 | `steel_frame_shelves_03` | 8,396 → 1,600 |
| `side_table` ×1 | `side_table_01` | 2,756 → 900 |
| `pendant` ×12 | `modern_ceiling_lamp_01` | 5,602 → 520 |

Materials: `white_stucco` (plaster), `concrete_wall_001` (concrete),
`oak_veneer_02` (light oak), `poly_wool_herringbone` (fabric).
Environment: `kloofendal_overcast_puresky`.

Rejected after download: `potted_plant_04` — at 268 mm it is a desk succulent,
and its only home would be the credenza tops Part 04 says not to decorate.

## C. Asset register

`docs/asset-register.md`, **generated** by
`node tools/polyhaven/generate-register.mjs` from the download ledger, the
Blender build stats and the texture manifest. It cannot drift from what was
actually shipped, because it is read back from it.

## D. Material pipeline — the Phase 6 decision reversed

Phase 6 read each glTF material for its base colour and **threw the rest
away**, rebuilding it as a flat scan-aware `ShaderMaterial`. That was correct
while every material was flat. Applied to real assets it would have discarded
everything worth downloading.

The direction is now inverted. The scan is a **response added to PBR**:

```
MeshStandardMaterial      lit, textured, environment-reflecting
  + scan mask             accent emission where the plane passes
  + accent tint           luminance-weighted, so grain survives it
  + distance fog          the same band the terrain dissolves into
  + layer opacity         what the mode system already switches
```

`src/webgl/archMaterials.js` injects this with `onBeforeCompile`, identically
for every material, and returns **one constant** from
`customProgramCacheKey` so the extension adds no shader variants of its own.
The scan plane, accent and fog uniforms are the *same objects* the procedural
shaders use — not copies — so one write to `scanUniforms.uScanPos` still moves
one plane through terrain, massing, linework, points and now the building.

**Program count.** The other half of program reuse is which *maps* a material
carries, which is three's own key. Nine materials with nine channel
combinations were nine programs, doubled again by `USE_INSTANCING`. Every
non-glazing material is now given the same four channels, with a 1×1 neutral
standing in for absent maps (white albedo, white ARM, flat normal — all
mathematically no-ops).

| | Phase 6 | Phase 7 first cut | Phase 7 shipped |
| --- | ---: | ---: | ---: |
| Shader programs, home | 6 | 20 | **10** |
| 360 viewer | — | 14 | **5** |

## E. Textures

Source is 8K in every case and **none of it ships**. Resolution is decided per
material, never globally.

| | Bytes |
| --- | ---: |
| Downloaded source | 21.2 MB |
| Blender-exported PNG intermediates | 38.8 MB |
| **Shipped, desktop** | **756 kB** (32 WebP) |
| **Shipped, mobile** | **167 kB** |
| Environment map | 4.6 kB desktop / 1.9 kB mobile, from a 1.1 MB `.hdr` |

Two decisions did most of the work:

- **Normal maps cap at 512.** A tiling normal is repeated: the wall material repeats every 2.6 m, so 512 already puts ~197 texels on every metre of wall while a 1440-wide viewport resolves about 100. The 1K versions measured 444 kB and 253 kB — 53% of the entire payload for detail no frame can show.
- **The environment map is 4.6 kB** because the sky is overcast. An overcast sky has almost no range above 1.0, so there is no sun disc to clip and tone-mapping to 8-bit loses nearly nothing. A dramatic sky would have needed the real HDR.

**KTX2/Basis is not shipped, and the reason is a missing tool.** The encode
step is implemented — `python3 tools/textures/pack.py --ktx2` writes `.ktx2`
beside each `.webp` and flags it in the manifest — but it shells out to
Khronos' `toktx`, which is not installed here, is not on npm, and does not
ship with Blender. No third-party rebuild of it was fetched. The measured
consequence is GPU texture memory: **37.4 MB desktop / 9.2 MB mobile**, where
ETC1S/UASTC would put desktop near 7 MB. The pipeline is ready the day the
binary is.

## F. Lighting

Three sources and no more: a sun matched to the Blender QA render's direction,
a cool fill, and a low hemisphere. The environment map does the ambient work
and is what gives plaster its faint directionality.

Plus **three point lights**, at the three rooms the hero's sectional cut
opens. An emissive surface in three.js lights nothing — it is a bright pixel,
not a lamp — so without these the opened rooms are lit only by a sky the rest
of the roof is blocking, and an office with no light in it does not read as
occupied. Three, not twelve: a light per pendant is eleven more uniforms for a
difference no frame shows.

Tone mapping is ACES Filmic. It reaches **only** the building: the
`tonemapping_fragment` chunk exists in three's built-in shaders and never in a
raw `ShaderMaterial`, so the nine procedural layers render byte-identically to
Phase 6 while the architecture gains a filmic shoulder.

**Albedo compression.** `blender/config/palette.py` authors `MAT_WALL` at
0.606 — what a real wall reflects. On a page whose ground is 0.02 that renders
as a white box. Phase 6 solved this with `LIGHT_GAIN`/`DARK_GAIN`; the
compression survives as a single `ALBEDO_GAIN = 0.50`, applied to albedo
rather than to the lights so the grain, roughness breakup and reflections stay
at full strength.

## G. Glass

Phase 6 drew glazing at a **constant** low alpha, which is exactly why its
self-review called it "a blank grey opening": a sheet 25% opaque from every
angle is a grey filter, not a window.

Glass is now Fresnel-governed — near-invisible looking straight through it, a
mirror at a glancing angle — plus a faint edge brightening that separates one
pane from the next across a facade. It costs one dot product.

Deliberately **not** transmission: `MeshPhysicalMaterial`'s refractive path
renders the scene to a second buffer every frame, and the brief is explicit
that this page does not need path tracing. What it needs is for the facade to
say there is an environment out there, and a Fresnel-weighted sky reflection
says exactly that. From outside you now read *into* reception and the lounge.

Evidence: `qa/shots/sheet-glass.png`.

## H. Hero — recomposed, not zoomed

Phase 6 sat at eye height 9.2 aimed at `t.y 0.4`: a camera **above** the
building pointed at the middle of the abstract volumes. The furnished storey
was a band under a stack of empty boxes and the frame's largest single object
was a blank roof.

Two changes, both compositional:

**1. The camera dropped to 4.1 and the target to −0.24.** That turns the frame
through about twenty degrees, and three things follow: the facade is seen
nearly straight on so window openings become openings; the sectional cut is
looked *into* rather than across; and the tall massing rises out of frame
instead of filling it. `massing` and `edges` come down from .98/.84 to .42 in
the two states that show the building — they now read as what they are, the
rest of the scheme held as a wireframe over the one storey that is built.

**2. A sectional cut.** The roof is clipped back over the south row — meeting
rooms, reception, lounge — and left on over circulation and the north row.
That is a building drawn the way buildings are drawn: a section with the
inhabited storey opened, not a dollhouse with its lid off.

The cut **follows the camera**. It opens as the building is looked at and
closes as it is stood in. A visitor at a capture station, in the 360 viewer or
in CAPTURE's close camera has a soffit over their head — a room with its roof
lifted off is a model of a room, which is the exact reading this phase exists
to kill.

Chosen from screenshots at 1440×900, not from coordinates: four framings in
`qa/shots/sheet-hero-light.png`, four cut/mass variants in `sheet-hero-cut.png`.

## I. CAPTURE

Unchanged in structure, and it now does what Part 15 asks: the physical
building stays fully legible — rooms, oak, lounge chairs, lit pendants — with
the cloud sampling *over* it rather than replacing it. The furniture is real
geometry now, so the interior sampler weights contents down to 0.45 before it
runs; otherwise a 3,200-triangle plant out-samples a 34 m wall and the cloud
describes chairs instead of a room.

## J. MEASURE — not polluted

Confirmed, and one real bug was found and fixed doing it.

`qa/p7routes.mjs` caught MEASURE and QUANTIFY downloading the **entire** 774 kB
texture set for materials the modes exist to dissolve. The upgrade is now
gated on the `full` tier.

| Route | GLB | Textures | Draw calls | Programs |
| --- | ---: | ---: | ---: | ---: |
| home / CAPTURE | 471 kB | 775 kB | 76 | 10 |
| MEASURE | 45 kB | **4.6 kB** (env only) | 28 | 9 |
| QUANTIFY | 45 kB | **4.6 kB** (env only) | 28 | 9 |

Those two routes keep the flat palette — which is what Phase 6 shipped
everywhere — and the environment map, because the lighting has to match or the
same building reads as two.

## K. QUANTIFY — zero drift

The plan is untouched. The mechanism that guarantees it:

1. An imported asset **replaces a library entry**. It never adds one, never moves a wall, never changes a room boundary. The layout engine still lays out `meeting_chair`; only the mesh behind the name changed.
2. Every import is fitted by **uniform** scale to the footprint the Phase 6 layout had already reserved. Where a real object is genuinely deeper than its Phase 6 stand-in (the shelving: 0.72 m against 0.40 m), the footprint is **re-registered** so the validator sees the truth.
3. The layout solver reports `clean — no placement dropped` after the swap.

The B/A frames for MEASURE and QUANTIFY are visually indistinguishable, which
is the correct result.

## L. 360 viewer — mandatory, and done

Phase 6 left this rendering an **unrelated world**: the procedural massing
shaded into vertex colours, with the twelve exterior stations pushed out to a
6.8 m radius so the camera would not end up inside a grey box. A visitor who
opened the viewer was standing on a different site from the one the hero had
just shown them.

**How the old world was removed.** `src/webgl/panorama.js` no longer builds
geometry. The `shade()` vertex-colour baker, the `MIN_RADIUS` push-out, the
`openHeading` clearance solver, the sky dome and the ground skirt are gone.

**How the shared environment loads.** The viewer calls the same
`loadArchitecture()` the homepage calls, fetching the same two GLBs with the
same materials, the same Poly Haven textures and the same environment map —
all already in the browser cache from the page behind it, so opening the
viewer costs geometry upload, not download. The scan response is switched off
per material rather than removed, because the viewer is REALITY, not a mode.
The environment map is also the scene **background**, which is what a window
is for.

**Station placement.** Phase 6 typed eight coordinates by hand and five were
room centres — harmless over an empty slab, and directly inside the meeting
table once the room was furnished. Stations are now **solved** against the
furnished layout (`blender/room_layout.capture_station`): sample the room,
reject anything within 0.95 m of a wall, 0.42 m of furniture or inside a door
swing, then score what survives for clearance *minus* distance from the
furniture centroid — so a position with room to stand but nothing to look at
scores badly. The entry heading faces the room's contents; an empty corridor
cell instead looks *along* the spine toward the middle of the building.
Position, heading, room id and room label travel in the GLB as node extras.

**Camera.** Eye height 1.62 m, arrival pitch −0.06 (Phase 6 arrived pitched
down at the ground because the subject was a site; the subject is a room now),
FOV range widened to 38–96°, exposure 0.86 — lower than the homepage's 1.06,
because there the building is a small lit object in a dark frame and here it
fills the viewport.

**Performance.** 59 draw calls, 56,014 triangles, **5 shader programs**.

| | Phase 6 | Phase 7 |
| --- | --- | --- |
| What you stand in | the procedural massing, outdoors, on a 6.8 m radius | Reception, Meeting Room 01, the workspace, the technical room, the spine |
| Station labels | `CP-01 LEVEL 00` | `CP-01 RECEPTION / ARRIVAL`, `CP-02 MEETING ROOM 01`, … |
| Chunk size | 7.46 kB | 6.37 kB |

Evidence: `qa/shots/ba-360.png` — the Phase 6 world reconstructed verbatim
(`qa/p6pano/`) beside the Phase 7 viewer, because the old viewer had to be
photographed after it was replaced.

## M. Same-place proof

`qa/shots/ba-sameplace.png` follows **Reception (R-11)** through four frames:

1. REALITY — the room seen from outside through the cutaway: desk, plant, lounge chairs
2. 360° — station CP-01, standing in it: the same desk, the same chair
3. QUANTIFY — the same cell in the plan
4. QUANTIFY — `PADLÓBURKOLAT · F1 · 124,8 M²` annotated over exactly that cell

The cyan outline is **not drawn by eye**. It is one world-space rectangle —
the room's own bounds from `build-stats.json` — projected through four
different live cameras. That is a proof rather than an assertion.

## N. Mobile hero

Phase 6 aimed the phone's signature window at the abstract volume cluster from
33 units out. In a window that is a third of a 390-wide screen, the storey was
four pixels tall and the furniture was noise.

The phone now gets the sectional slice, close. At this distance a visitor can
pick out the reception desk, the task chair behind it, the two lounge chairs
around their side table, the plant in the corner and the doors down the
circulation wall — on a phone, at arm's length. The abstract volumes are still
overhead, but they are the frame rather than the subject.

MEASURE keeps its pull-back: that state's subject is the ground.

Evidence: `qa/shots/sheet-phone-zoom.png`.

## O. Performance — Phase 6 vs Phase 7

Identical routes, identical viewports, headless Chrome with the Metal ANGLE
backend, local server.

### Desktop, 1440×900, home

| | Phase 6 | Phase 7 | Δ |
| --- | ---: | ---: | --- |
| GLB transfer | 250.2 kB | 471.2 kB | +221.0 kB |
| Texture transfer | 0 | 770.0 kB | +770.0 kB |
| Environment map | 0 | 4.6 kB | +4.6 kB |
| **Total added payload** | | | **+995.6 kB (0.95 MB)** |
| Draw calls | 76 | 76 | 0 |
| Triangles | 61,792 | 89,750 | +45% |
| Points | 40,200 | 40,200 | 0 |
| Shader programs | 6 | 10 | +4 |
| Textures | 0 | 36 | +36 |
| GPU texture memory (est.) | ~0 | 37.4 MB | — |
| GPU geometry | ~1.9 MB | 3.6 MB | +1.7 MB |
| FPS | 61 | 61 | 0 |
| Console errors | 0 | 0 | 0 |

### Mobile, 390×844

| | Phase 6 | Phase 7 | Δ |
| --- | ---: | ---: | --- |
| GLB transfer | 201.1 kB | 371.2 kB | +170.1 kB |
| Texture transfer | 0 | 171.5 kB | +171.5 kB |
| **Total added payload** | | | **+341.6 kB (0.33 MB)** |
| Draw calls | 61 | 62 | +1 |
| Triangles | 37,368 | 64,036 | +71% |
| Shader programs | 6 | 10 | +4 |
| GPU texture memory (est.) | ~0 | 9.2 MB | — |
| FPS | — | 61 | — |

**The added near-hero payload is 0.95 MB desktop, 0.33 MB mobile** — inside
Part 22's `< 2 MB` budget and under its stated preference of ~1 MB.

### Progressive quality (Part 23), measured in-page against navigationStart

| | Desktop | Mobile | MEASURE |
| --- | ---: | ---: | ---: |
| First contentful paint | 228 ms | 496 ms | 344 ms |
| Renderer live | 856 ms | 673 ms | 782 ms |
| Building in scene (flat palette) | 1,099 ms | 820 ms | 1,863 ms |
| Textures bound | 1,319 ms | 990 ms | never — by design |

The building appears in flat palette material at ~1.1 s and resolves into a
textured one 220 ms later. The canvas is never empty waiting on a texture, and
a browser that fails to fetch the manifest keeps the palette for good.

### Triangle budget (Part 21)

Master 55,808 (was 28,044). Desktop visible **89,750** — inside the
80k–180k target, at the low end, as asked.

## P. Visual QA

All matched, same camera, same framing:

| Sheet | Contents |
| --- | --- |
| `qa/shots/ba-modes.png` | REALITY / CAPTURE / MEASURE / QUANTIFY, P6 vs P7 |
| `qa/shots/ba-interiors.png` | meeting / reception / workspace, P6 vs P7 |
| `qa/shots/ba-360.png` | 360 viewer, P6 (reconstructed) vs P7 |
| `qa/shots/ba-sameplace.png` | Reception through four representations |
| `qa/shots/ba-key.png` | hero, meeting room, mobile hero |
| `qa/shots/sheet-glass.png` | glazing at hero distance |
| `qa/shots/sheet-hero-light.png`, `sheet-hero-cut.png` | the framings that were compared |
| `qa/shots/sheet-phone-zoom.png` | phone window, before/after |

Sweep: 2560×1080, 1920×1080, 1440×900, 1280×800, 1024×768, 820×1180,
768×1024, 430×932, 390×844, 360×780, plus reduced motion — **zero console
errors, zero horizontal overflow, architecture loaded on every tier**.
13/13 unit tests pass.

## Q. Critical self-review

**1. Does REALITY look like a believable place rather than a model?**
For the storey, yes. The rooms have depth, the materials have scale, objects
sit on surfaces and the light separates planes. Above the storey it is still a
diagram — deliberately, because that is the rest of the scheme and the site's
identity depends on it.

**2. Which object still looks most synthetic?**
The six office task chairs, without question. Poly Haven has none, so they are
still the Phase 6 procedural chair, and they sit in the open workspace where
the hero and the 360 both look at them. Second: the monitors and wall screens,
which are flat emissive rectangles.

**3. Which material still looks weakest?**
Graphite metal. `?category=metal&condition=clean` returns zero assets, so it
is analytic — a roughness and metalness value with no map. That is defensible
for powder-coated steel and it reads acceptably on the chair frames, but the
desk legs are visibly a solved surface rather than a scanned one.

**4. Is the lighting believable or merely attractive?**
Believable at room scale, but **there are no shadows**. Nothing casts. Contact
between a chair leg and the floor is carried only by the ARM map's ambient
occlusion, and at the hero's distance the storey's interior partitions do not
darken each other. This is the largest remaining gap between this and a real
photograph, and a single 1024 directional shadow map is the obvious next move.

**5. Does glass improve spatial perception?**
Yes, materially. The facade reads as glazed and you can see into reception and
the lounge from outside, which is what makes the cutaway legible as a building
rather than as a model with the walls off. It reflects only the sky — there is
no interior reflection — which is a limit worth naming but not worth a
transmission pass.

**6. Is any external asset visually over-detailed?**
`potted_plant_02` at 3,200 triangles × 4 instances = 12,800 is the heaviest
item per unit of contribution in the building. Halving it would cost nothing
visible.

**7. Does the hero finally expose enough interior?**
Yes. At 1440×900 before any interaction, the visitor sees a meeting table with
eight chairs, a reception desk, two lounge chairs, a side table, a plant, doors
and lit pendants.

**8. Does CAPTURE preserve enough physical reality?**
Yes — the building is fully legible under the cloud.

**9. Does the 360 viewer unmistakably show the same place?**
Yes. It is the same two GLBs.

**10. Can one room be followed REALITY → 360 → QUANTIFY?**
Yes, and it is proven by projection rather than asserted (§M).

**11. What could be removed with almost no visual loss?**
Twelve pendants could be eight. `potted_plant_02` could be 1,600 triangles.
The procedural `tripod` and `equipment_case` in the technical room contribute
almost nothing at hero distance. Together, roughly 8k triangles.

**12. Is further synthetic realism still useful?**
**No.** The remaining gaps are a task chair that does not exist in any free
library and a shadow map — one is not solvable by more asset hunting and the
other is an afternoon of shader work, not a phase.

---

## Final decision

Does this feel like a believable architectural place? **Yes.**

Per the brief: **stop adding synthetic detail.** The next phase should use
real project evidence. The architecture is ready for it — `src/data/evidence.js`
already defines the contract, and the 360 viewer already accepts
`{ type: 'equirect', url }` in its station table without a line changing.

## Reproducing

```bash
node tools/polyhaven/download-asset.mjs models dining_chair_02 --res 1k    # etc.
blender -b --python blender/build_environment.py
blender -b --python blender/export_web.py
blender -b --python blender/pack_env.py
python3 tools/textures/pack.py            # add --ktx2 once toktx is on PATH
python3 blender/make_docs.py
node tools/polyhaven/generate-register.mjs
npm run build
```

A checkout with an empty `tools/polyhaven/downloads/` builds the Phase 6
environment unchanged — every import is guarded by `polyhaven.available()`.
