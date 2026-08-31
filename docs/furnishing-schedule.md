# Furnishing schedule — GoDataFusion environment

PHASE 8: THREE LEVELS.

The building is the site's own plan, and it is not described here.
`src/webgl/levels.js` declares the room rectangles of L00, L01 and L02 and
DERIVES the walls, the doors and the windows from them;
`blender/dump_plan.mjs` imports that module and dumps exactly what it
computes; `blender/build_environment.py` extrudes the dump. No dimension in
this document was chosen independently of the drawings the QUANTIFY mode
counts, and nothing in it was typed.

What IS authored by hand is the one thing a plan cannot know: what stands in
each room. That is `blender/config/rooms.py`, and it is the table below.

| Derived quantity | Value |
| --- | --- |
| Metres per world unit | 5.3499 (solved from 842.6 m2 over 6.4 x 4.6 units) |
| Footprint (L00, L01) | 34.24 x 24.61 m |
| Footprint (L02) | 25.68 x 24.61 m — set back one structural bay |
| Roof terrace | 210.7 m2, over the L01 east bay |
| Building height | +11.20 m to the roof datum, +12.30 m over the parapet |
| Levels | 3 + roof |
| Rooms | 32 |
| Doors | 28, derived from which rooms touch circulation |
| Windows | 59, one per structural bay the room covers |
| Gross internal area | 2317.2 m2 |

## Levels

| Level | Programme | Elevation | Floor-to-floor | Clear | Rooms | Doors | Windows | Area (m2) | Furniture |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| L00 | FÖLDSZINT | +0.00 m | 4.00 m | 3.68 m | 12 | 9 | 18 | 842.6 | 65 |
| L01 | MUNKASZINT | +4.00 m | 3.60 m | 3.28 m | 12 | 12 | 23 | 842.6 | 93 |
| L02 | PROJEKTSZINT | +7.60 m | 3.60 m | 3.28 m | 8 | 7 | 18 | 632.0 | 54 |
| ROOF | TETŐ | +11.20 m | — | — | — | — | — | — | — |

The three plans are deliberately NOT variations of one grid:

* **L00** four equal bays either side of one deep 8.2 m circulation
  spine — twelve rooms of one size, which is what a public floor with
  an unfinished bay in it wants.
* **L01** the deep band is on the NORTH, the shallow one faces the
  entrance, and the column rhythm is A-B-A rather than four equal
  bays. That is where the 4.3 m focus rooms come from, and it is why
  this floor has the most doors in the building.
* **L02** the mirror of L01 — deep band south — set back a full bay
  from the east facade so a roof terrace opens over L01. Fewest
  rooms, largest rooms.

## Programme

| Room | Level | Zone | Programme | Area (m2) | Finish |
| --- | --- | --- | --- | ---: | --- |
| L00-R01 | L00 | CORE | Közlekedőmag és gépészet | 62.0 | CORE |
| L00-R02 | L00 | C | Projektiroda | 64.8 | OFFICE |
| L00-R03 | L00 | D | Technikai helyiség | 64.8 | TECH |
| L00-R04 | L00 | F | Szerkezetkész terület | 62.0 | RAW |
| L00-R05 | L00 | E | Közlekedő — nyugat | 64.9 | CIRC |
| L00-R06 | L00 | E | Közlekedő — közép | 67.7 | CIRC |
| L00-R07 | L00 | E | Közlekedő — kelet | 67.7 | CIRC |
| L00-R08 | L00 | E | Érkeztető folyosó | 64.9 | CIRC |
| L00-R09 | L00 | B | Nagytárgyaló | 62.0 | MEET |
| L00-R10 | L00 | A | Recepció | 64.8 | RECEP |
| L00-R11 | L00 | A | Ügyfélvárakozó | 64.8 | WAIT |
| L00-R12 | L00 | A | Lounge | 62.0 | LOUNGE |
| L01-R01 | L01 | CORE | Közlekedőmag és gépészet | 95.1 | CORE |
| L01-R02 | L01 | C | Nyitott iroda | 149.8 | OPEN |
| L01-R03 | L01 | E | Északi összekötő | 48.7 | CIRC |
| L01-R04 | L01 | D | Projektszoba | 48.7 | PROJECT |
| L01-R05 | L01 | D | Tervtár és irattár | 44.6 | STORE |
| L01-R06 | L01 | E | Központi folyosó | 131.9 | CIRC |
| L01-R07 | L01 | B | Tárgyaló 01 | 62.0 | MEET |
| L01-R08 | L01 | C | Fókuszszoba 01 | 31.8 | FOCUS |
| L01-R09 | L01 | C | Fókuszszoba 02 | 31.8 | FOCUS |
| L01-R10 | L01 | C | Fókuszszoba 03 | 31.8 | FOCUS |
| L01-R11 | L01 | B | Tárgyaló 02 | 64.8 | MEET |
| L01-R12 | L01 | A | Teakonyha és közösségi tér | 29.1 | KITCH |
| L02-R01 | L02 | CORE | Közlekedőmag és gépészet | 62.0 | CORE |
| L02-R02 | L02 | C | Iroda 01 | 64.8 | OFFICE |
| L02-R03 | L02 | C | Iroda 02 | 31.8 | OFFICE |
| L02-R04 | L02 | D | Gépészeti helyiség | 29.1 | TECH |
| L02-R05 | L02 | E | Folyosó | 98.1 | CIRC |
| L02-R06 | L02 | D | BIM és adatszoba | 145.6 | BIM |
| L02-R07 | L02 | C | Projektstúdió | 99.2 | STUDIO |
| L02-R08 | L02 | D | Technikai és kollaborációs sáv | 44.6 | COLLAB |

## Schedule

`layout` names are the placement rules in `blender/room_layout.py`.
Every placement is validated against the room's walls, its door
clearances and the other objects already in it; the current build
drops nothing.

Density descends by level on purpose — the ground floor is the one
the hero looks into and the one CAPTURE sells, the project floor is
the one a phone frame never contains.

| Room | Asset | Count | Layout | Requirement |
| --- | --- | ---: | --- | --- |
| L00-R02 | `desk` | 2 | `desk_bank` | 1.60 x 0.75 m |
| L00-R02 | `office_chair` | 2 | `at_desks` | 0.66 x 0.66 m |
| L00-R02 | `monitor` | 3 | `on_desks` | 0.62 x 0.20 m |
| L00-R02 | `shelving` | 1 | `wall` | 2.40 x 0.74 m — wall n |
| L00-R02 | `plant` | 1 | `corner` | 0.60 x 0.60 m — corner nw |
| L00-R02 | `pendant` | 2 | `ceiling_row` | 0.36 x 0.36 m |
| L00-R03 | `equipment_case` | 2 | `wall` | 0.82 x 0.52 m — wall n |
| L00-R03 | `credenza` | 1 | `wall` | 1.80 x 0.46 m — wall w |
| L00-R03 | `tripod` | 1 | `at_point` | 0.70 x 0.70 m |
| L00-R03 | `plan_frame` | 2 | `wall_mounted` | 1.20 x 0.06 m — wall e, counted as finish, not contents |
| L00-R03 | `pendant` | 2 | `ceiling_row` | 0.36 x 0.36 m |
| L00-R04 | `formwork_stack` | 1 | `at_point` | 2.40 x 1.00 m |
| L00-R04 | `trestle` | 2 | `pair_facing` | 1.10 x 0.62 m |
| L00-R05 | `ceiling_line` | 1 | `ceiling_row` | 2.60 x 0.11 m |
| L00-R06 | `ceiling_line` | 1 | `ceiling_row` | 2.60 x 0.11 m |
| L00-R07 | `ceiling_line` | 1 | `ceiling_row` | 2.60 x 0.11 m |
| L00-R07 | `plant` | 1 | `corner` | 0.60 x 0.60 m — corner ne |
| L00-R08 | `ceiling_line` | 1 | `ceiling_row` | 2.60 x 0.11 m |
| L00-R09 | `meeting_table` | 1 | `center` | 3.20 x 1.20 m — length 3.20 m |
| L00-R09 | `meeting_chair` | 8 | `around_table` | 0.52 x 0.56 m |
| L00-R09 | `wall_screen` | 1 | `wall_mounted` | 1.66 x 0.08 m — wall w |
| L00-R09 | `credenza` | 1 | `wall` | 1.80 x 0.46 m — wall n |
| L00-R09 | `pendant` | 2 | `ceiling_row` | 0.36 x 0.36 m |
| L00-R10 | `reception_desk` | 1 | `at_point` | 3.32 x 1.00 m |
| L00-R10 | `office_chair` | 1 | `at_point` | 0.66 x 0.66 m |
| L00-R10 | `credenza` | 1 | `wall` | 1.80 x 0.46 m — wall n |
| L00-R10 | `signage` | 1 | `wall_mounted` | 2.20 x 0.06 m — wall n, counted as finish, not contents |
| L00-R10 | `plant` | 1 | `corner` | 0.60 x 0.60 m — corner nw |
| L00-R10 | `pendant` | 2 | `ceiling_row` | 0.36 x 0.36 m |
| L00-R11 | `lounge_chair` | 2 | `pair_facing` | 0.78 x 0.80 m |
| L00-R11 | `side_table` | 1 | `center` | 0.56 x 0.56 m |
| L00-R11 | `plan_frame` | 2 | `wall_mounted` | 1.20 x 0.06 m — wall n, counted as finish, not contents |
| L00-R11 | `plant` | 1 | `corner` | 0.60 x 0.60 m — corner nw |
| L00-R11 | `pendant` | 2 | `ceiling_row` | 0.36 x 0.36 m |
| L00-R12 | `lounge_chair` | 2 | `pair_facing` | 0.78 x 0.80 m |
| L00-R12 | `side_table` | 1 | `center` | 0.56 x 0.56 m |
| L00-R12 | `floor_lamp` | 1 | `corner` | 0.42 x 0.42 m — corner ne |
| L00-R12 | `plant` | 1 | `corner` | 0.60 x 0.60 m — corner nw |
| L00-R12 | `acoustic` | 3 | `wall_mounted` | 1.20 x 0.05 m — wall w, counted as finish, not contents |
| L00-R12 | `pendant` | 2 | `ceiling_row` | 0.36 x 0.36 m |
| L01-R02 | `desk` | 8 | `desk_bank` | 1.60 x 0.75 m |
| L01-R02 | `office_chair` | 8 | `at_desks` | 0.66 x 0.66 m |
| L01-R02 | `monitor` | 11 | `on_desks` | 0.62 x 0.20 m |
| L01-R02 | `shelving` | 2 | `wall` | 2.40 x 0.74 m — wall n |
| L01-R02 | `plant` | 1 | `corner` | 0.60 x 0.60 m — corner nw |
| L01-R02 | `pendant` | 4 | `ceiling_row` | 0.36 x 0.36 m |
| L01-R03 | `ceiling_line` | 1 | `ceiling_row` | 2.60 x 0.11 m |
| L01-R04 | `plan_table` | 1 | `center` | 2.40 x 1.10 m |
| L01-R04 | `office_chair` | 1 | `at_point` | 0.66 x 0.66 m |
| L01-R04 | `shelving` | 1 | `wall` | 2.40 x 0.74 m — wall e |
| L01-R04 | `credenza` | 1 | `wall` | 1.80 x 0.46 m — wall w |
| L01-R04 | `plan_frame` | 2 | `wall_mounted` | 1.20 x 0.06 m — wall n, counted as finish, not contents |
| L01-R04 | `pendant` | 2 | `ceiling_row` | 0.36 x 0.36 m |
| L01-R05 | `shelving` | 2 | `wall` | 2.40 x 0.74 m — wall e |
| L01-R05 | `credenza` | 1 | `wall` | 1.80 x 0.46 m — wall w |
| L01-R05 | `pendant` | 2 | `ceiling_row` | 0.36 x 0.36 m |
| L01-R06 | `ceiling_line` | 1 | `ceiling_row` | 2.60 x 0.11 m |
| L01-R06 | `plant` | 1 | `corner` | 0.60 x 0.60 m — corner nw |
| L01-R07 | `meeting_table` | 1 | `center` | 3.20 x 1.20 m — length 3.20 m |
| L01-R07 | `meeting_chair` | 8 | `around_table` | 0.52 x 0.56 m |
| L01-R07 | `wall_screen` | 1 | `wall_mounted` | 1.66 x 0.08 m — wall w |
| L01-R07 | `credenza` | 1 | `wall` | 1.80 x 0.46 m — wall n |
| L01-R07 | `pendant` | 2 | `ceiling_row` | 0.36 x 0.36 m |
| L01-R08 | `desk` | 1 | `desk_bank` | 1.60 x 0.75 m |
| L01-R08 | `office_chair` | 1 | `at_desks` | 0.66 x 0.66 m |
| L01-R08 | `monitor` | 1 | `on_desks` | 0.62 x 0.20 m |
| L01-R08 | `pendant` | 1 | `ceiling_row` | 0.36 x 0.36 m |
| L01-R09 | `desk` | 1 | `desk_bank` | 1.60 x 0.75 m |
| L01-R09 | `office_chair` | 1 | `at_desks` | 0.66 x 0.66 m |
| L01-R09 | `monitor` | 2 | `on_desks` | 0.62 x 0.20 m |
| L01-R09 | `pendant` | 1 | `ceiling_row` | 0.36 x 0.36 m |
| L01-R10 | `desk` | 1 | `desk_bank` | 1.60 x 0.75 m |
| L01-R10 | `office_chair` | 1 | `at_desks` | 0.66 x 0.66 m |
| L01-R10 | `monitor` | 1 | `on_desks` | 0.62 x 0.20 m |
| L01-R10 | `plant` | 1 | `corner` | 0.60 x 0.60 m — corner ne |
| L01-R10 | `pendant` | 1 | `ceiling_row` | 0.36 x 0.36 m |
| L01-R11 | `meeting_table` | 1 | `center` | 3.20 x 1.20 m — length 2.00 m |
| L01-R11 | `meeting_chair` | 4 | `around_table` | 0.52 x 0.56 m |
| L01-R11 | `wall_screen` | 1 | `wall_mounted` | 1.66 x 0.08 m — wall n |
| L01-R11 | `credenza` | 1 | `wall` | 1.80 x 0.46 m — wall w |
| L01-R11 | `pendant` | 2 | `ceiling_row` | 0.36 x 0.36 m |
| L01-R12 | `credenza` | 1 | `wall` | 1.80 x 0.46 m — wall e |
| L01-R12 | `lounge_chair` | 2 | `pair_facing` | 0.78 x 0.80 m |
| L01-R12 | `side_table` | 1 | `center` | 0.56 x 0.56 m |
| L01-R12 | `plant` | 1 | `corner` | 0.60 x 0.60 m — corner ne |
| L01-R12 | `pendant` | 2 | `ceiling_row` | 0.36 x 0.36 m |
| L02-R02 | `desk` | 2 | `desk_bank` | 1.60 x 0.75 m |
| L02-R02 | `office_chair` | 2 | `at_desks` | 0.66 x 0.66 m |
| L02-R02 | `monitor` | 3 | `on_desks` | 0.62 x 0.20 m |
| L02-R02 | `shelving` | 1 | `wall` | 2.40 x 0.74 m — wall n |
| L02-R02 | `pendant` | 2 | `ceiling_row` | 0.36 x 0.36 m |
| L02-R03 | `desk` | 1 | `desk_bank` | 1.60 x 0.75 m |
| L02-R03 | `office_chair` | 1 | `at_desks` | 0.66 x 0.66 m |
| L02-R03 | `monitor` | 2 | `on_desks` | 0.62 x 0.20 m |
| L02-R03 | `pendant` | 1 | `ceiling_row` | 0.36 x 0.36 m |
| L02-R04 | `equipment_case` | 2 | `wall` | 0.82 x 0.52 m — wall n |
| L02-R04 | `credenza` | 1 | `wall` | 1.80 x 0.46 m — wall w |
| L02-R04 | `pendant` | 1 | `ceiling_row` | 0.36 x 0.36 m |
| L02-R05 | `ceiling_line` | 1 | `ceiling_row` | 2.60 x 0.11 m |
| L02-R05 | `plant` | 1 | `corner` | 0.60 x 0.60 m — corner nw |
| L02-R06 | `desk` | 4 | `desk_bank` | 1.60 x 0.75 m |
| L02-R06 | `office_chair` | 4 | `at_desks` | 0.66 x 0.66 m |
| L02-R06 | `monitor` | 6 | `on_desks` | 0.62 x 0.20 m |
| L02-R06 | `equipment_case` | 1 | `wall` | 0.82 x 0.52 m — wall w |
| L02-R06 | `shelving` | 1 | `wall` | 2.40 x 0.74 m — wall n |
| L02-R06 | `pendant` | 3 | `ceiling_row` | 0.36 x 0.36 m |
| L02-R07 | `plan_table` | 1 | `center` | 2.40 x 1.10 m |
| L02-R07 | `office_chair` | 1 | `at_point` | 0.66 x 0.66 m |
| L02-R07 | `wall_screen` | 1 | `wall_mounted` | 1.66 x 0.08 m — wall n |
| L02-R07 | `plan_frame` | 2 | `wall_mounted` | 1.20 x 0.06 m — wall w, counted as finish, not contents |
| L02-R07 | `pendant` | 2 | `ceiling_row` | 0.36 x 0.36 m |
| L02-R08 | `lounge_chair` | 2 | `pair_facing` | 0.78 x 0.80 m |
| L02-R08 | `side_table` | 1 | `center` | 0.56 x 0.56 m |
| L02-R08 | `equipment_case` | 1 | `wall` | 0.82 x 0.52 m — wall w |
| L02-R08 | `tripod` | 1 | `at_point` | 0.70 x 0.70 m |
| L02-R08 | `pendant` | 2 | `ceiling_row` | 0.36 x 0.36 m |

## Against the brief's caps

| Family | Placed | Phase 8 target |
| --- | ---: | --- |
| seating | 51 | 40–56 |
| tables and desks | 30 | 20–28 |
| screens | 33 | 24–34 |
| storage | 23 | 12–18 |
| lighting | 48 | 34–48 |
| plants | 10 | 8–12 |

## Mobile tier

Dropped assets: acoustic, equipment_case, formwork_stack, plan_frame, shelving, signage, trestle, tripod.
Dropped levels' contents: L02.

