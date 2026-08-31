"""
The furnishing schedule — PHASE 8.

The room grid is NOT invented here. It is not even described here any more:
`src/webgl/levels.js` derives the walls, doors and windows of all three
levels from the room rectangles, and `blender/config/plan-features.json` is
that derivation dumped verbatim. Room ids, labels, programmes, areas and
finishes all arrive with the plan.

What is left in this file is the one thing the plan cannot know: WHAT STANDS
IN EACH ROOM. Change a room rectangle in levels.js and the walls, doors and
windows move with it; change this file and only the furniture moves.

    L00  GROUND    public, arrival, technical, and the unfinished bay
    L01  WORK      open office, meeting rooms, focus rooms, documentation
    L02  PROJECT   BIM room, studio, plan review, enclosed offices

DENSITY IS DELIBERATE and it descends: the ground floor is the floor the hero
looks into and the one CAPTURE sells, so it is the richest; the work floor is
medium; the project floor is medium-light. Furnishing a room the visitor
cannot see is triangles spent on nothing, and Part 07 of the brief says so.
"""

#: The furnishing schedule, keyed by the plan's own room uid.
#: `docs/furnishing-schedule.md` is generated from this.
#: layout names are implemented in room_layout.py.
SCHEDULE = {

    # ============================================================
    # L00 — GROUND. Public, arrival, technical, unfinished bay.
    # ============================================================

    'L00-R02': [   # PROJEKTIRODA — a small office, not the open plan.
        dict(asset='desk',         count=2, layout='desk_bank', spacing=2.10),
        dict(asset='office_chair', count=2, layout='at_desks', offset=0.86),
        dict(asset='monitor',      count=3, layout='on_desks', duals=(0,)),
        dict(asset='shelving',     count=1, layout='wall', side='n'),
        dict(asset='plant',        count=1, layout='corner', corner='nw'),
        dict(asset='pendant',      count=2, layout='ceiling_row'),
    ],
    'L00-R03': [   # TECHNIKAI HELYISÉG
        dict(asset='equipment_case', count=2, layout='wall', side='n', spacing=1.20),
        dict(asset='credenza',     count=1, layout='wall', side='w'),
        dict(asset='tripod',       count=1, layout='at_point', at=(2.10, 1.10), face=0.6),
        dict(asset='plan_frame',   count=2, layout='wall_mounted', side='e', spacing=1.60),
        dict(asset='pendant',      count=2, layout='ceiling_row'),
    ],
    'L00-R04': [   # SZERKEZETKÉSZ TERÜLET — construction reality, not furniture
        dict(asset='formwork_stack', count=1, layout='at_point', at=(-1.80, 1.60), face=0.22),
        dict(asset='trestle',      count=2, layout='pair_facing', gap=1.90, face=0.0),
    ],
    # CIRCULATION — intentionally almost empty. One linear luminaire each is
    # the only thing in the spine, and it is what lights the middle of the
    # building in the exterior frames.
    'L00-R05': [dict(asset='ceiling_line', count=1, layout='ceiling_row')],
    'L00-R06': [dict(asset='ceiling_line', count=1, layout='ceiling_row')],
    'L00-R07': [
        dict(asset='ceiling_line', count=1, layout='ceiling_row'),
        dict(asset='plant',        count=1, layout='corner', corner='ne'),
    ],
    'L00-R08': [dict(asset='ceiling_line', count=1, layout='ceiling_row')],
    'L00-R09': [   # NAGYTÁRGYALÓ — the boardroom
        dict(asset='meeting_table', count=1, layout='center', length=3.20),
        dict(asset='meeting_chair', count=8, layout='around_table', clearance=0.62),
        dict(asset='wall_screen',  count=1, layout='wall_mounted', side='w'),
        dict(asset='credenza',     count=1, layout='wall', side='n'),
        dict(asset='pendant',      count=2, layout='ceiling_row'),
    ],
    'L00-R10': [   # RECEPCIÓ — kept visually quiet on purpose
        # Placed against the ENTRANCE, which is the one door in the building
        # that is authored rather than derived: the desk faces whoever walks
        # in, and the chair stands behind it.
        dict(asset='reception_desk', count=1, layout='at_point', at=(-0.60, 0.30), face=3.1416),
        dict(asset='office_chair', count=1, layout='at_point', at=(-0.60, 1.40), face=3.1416),
        dict(asset='credenza',     count=1, layout='wall', side='n'),
        dict(asset='signage',      count=1, layout='wall_mounted', side='n'),
        dict(asset='plant',        count=1, layout='corner', corner='nw'),
        dict(asset='pendant',      count=2, layout='ceiling_row'),
    ],
    'L00-R11': [   # ÜGYFÉLVÁRAKOZÓ — the corner the ground-floor cutaway opens
        dict(asset='lounge_chair', count=2, layout='pair_facing', gap=1.45, face=1.5708),
        dict(asset='side_table',   count=1, layout='center'),
        dict(asset='plan_frame',   count=2, layout='wall_mounted', side='n', spacing=1.60),
        dict(asset='plant',        count=1, layout='corner', corner='nw'),
        dict(asset='pendant',      count=2, layout='ceiling_row'),
    ],
    'L00-R12': [   # LOUNGE — the other room the cutaway opens
        dict(asset='lounge_chair', count=2, layout='pair_facing', gap=1.45, face=0.0),
        dict(asset='side_table',   count=1, layout='center'),
        dict(asset='floor_lamp',   count=1, layout='corner', corner='ne'),
        dict(asset='plant',        count=1, layout='corner', corner='nw'),
        dict(asset='acoustic',     count=3, layout='wall_mounted', side='w', spacing=1.35),
        dict(asset='pendant',      count=2, layout='ceiling_row'),
    ],

    # ============================================================
    # L01 — WORK. The floor with the most doors and the deepest room.
    # ============================================================

    'L01-R02': [   # NYITOTT IRODA — 158 m², the largest single space below
        dict(asset='desk',         count=8, layout='desk_bank', spacing=2.10),
        dict(asset='office_chair', count=8, layout='at_desks', offset=0.86),
        dict(asset='monitor',     count=11, layout='on_desks', duals=(0, 1, 4, 5)),
        dict(asset='shelving',     count=2, layout='wall', side='n', spacing=2.90),
        dict(asset='plant',        count=1, layout='corner', corner='nw'),
        dict(asset='pendant',      count=4, layout='ceiling_row'),
    ],
    'L01-R03': [dict(asset='ceiling_line', count=1, layout='ceiling_row')],
    'L01-R04': [   # PROJEKTSZOBA ÉS TERVTÁR
        dict(asset='plan_table',   count=1, layout='center'),
        dict(asset='office_chair', count=1, layout='at_point', at=(0.0, -1.35), face=0.0),
        dict(asset='shelving',     count=1, layout='wall', side='e'),
        dict(asset='credenza',     count=1, layout='wall', side='w'),
        dict(asset='plan_frame',   count=2, layout='wall_mounted', side='n', spacing=1.60),
        dict(asset='pendant',      count=2, layout='ceiling_row'),
    ],
    'L01-R05': [   # TERVTÁR ÉS IRATTÁR
        dict(asset='shelving',     count=2, layout='wall', side='e', spacing=2.90),
        dict(asset='credenza',     count=1, layout='wall', side='w'),
        dict(asset='pendant',      count=2, layout='ceiling_row'),
    ],
    'L01-R06': [
        dict(asset='ceiling_line', count=1, layout='ceiling_row'),
        dict(asset='plant',        count=1, layout='corner', corner='nw'),
    ],
    'L01-R07': [   # TÁRGYALÓ 01
        dict(asset='meeting_table', count=1, layout='center', length=3.20),
        dict(asset='meeting_chair', count=8, layout='around_table', clearance=0.62),
        dict(asset='wall_screen',  count=1, layout='wall_mounted', side='w'),
        dict(asset='credenza',     count=1, layout='wall', side='n'),
        dict(asset='pendant',      count=2, layout='ceiling_row'),
    ],
    # FOCUS ROOMS — 35 m², one workstation each. They are the fine grain this
    # floor has and neither of the others does, so they are furnished
    # identically ON PURPOSE: three of the same room in a row is a rhythm.
    'L01-R08': [
        dict(asset='desk',         count=1, layout='desk_bank'),
        dict(asset='office_chair', count=1, layout='at_desks', offset=0.86),
        dict(asset='monitor',      count=1, layout='on_desks'),
        dict(asset='pendant',      count=1, layout='ceiling_row'),
    ],
    'L01-R09': [
        dict(asset='desk',         count=1, layout='desk_bank'),
        dict(asset='office_chair', count=1, layout='at_desks', offset=0.86),
        dict(asset='monitor',      count=2, layout='on_desks', duals=(0,)),
        dict(asset='pendant',      count=1, layout='ceiling_row'),
    ],
    'L01-R10': [
        dict(asset='desk',         count=1, layout='desk_bank'),
        dict(asset='office_chair', count=1, layout='at_desks', offset=0.86),
        dict(asset='monitor',      count=1, layout='on_desks'),
        dict(asset='plant',        count=1, layout='corner', corner='ne'),
        dict(asset='pendant',      count=1, layout='ceiling_row'),
    ],
    'L01-R11': [   # TÁRGYALÓ 02 — smaller
        dict(asset='meeting_table', count=1, layout='center', length=2.00),
        dict(asset='meeting_chair', count=4, layout='around_table', clearance=0.60),
        dict(asset='wall_screen',  count=1, layout='wall_mounted', side='n'),
        dict(asset='credenza',     count=1, layout='wall', side='w'),
        dict(asset='pendant',      count=2, layout='ceiling_row'),
    ],
    'L01-R12': [   # TEAKONYHA ÉS KÖZÖSSÉGI TÉR
        dict(asset='credenza',     count=1, layout='wall', side='e'),
        dict(asset='lounge_chair', count=2, layout='pair_facing', gap=1.45, face=1.5708),
        dict(asset='side_table',   count=1, layout='center'),
        dict(asset='plant',        count=1, layout='corner', corner='ne'),
        dict(asset='pendant',      count=2, layout='ceiling_row'),
    ],

    # ============================================================
    # L02 — PROJECT. Fewest rooms, largest rooms, lightest furnishing.
    # ============================================================

    'L02-R02': [   # IRODA 01
        dict(asset='desk',         count=2, layout='desk_bank', spacing=2.10),
        dict(asset='office_chair', count=2, layout='at_desks', offset=0.86),
        dict(asset='monitor',      count=3, layout='on_desks', duals=(0,)),
        dict(asset='shelving',     count=1, layout='wall', side='n'),
        dict(asset='pendant',      count=2, layout='ceiling_row'),
    ],
    'L02-R03': [   # IRODA 02
        dict(asset='desk',         count=1, layout='desk_bank'),
        dict(asset='office_chair', count=1, layout='at_desks', offset=0.86),
        dict(asset='monitor',      count=2, layout='on_desks', duals=(0,)),
        dict(asset='pendant',      count=1, layout='ceiling_row'),
    ],
    'L02-R04': [   # GÉPÉSZETI HELYISÉG — feeds the roof plant above it
        dict(asset='equipment_case', count=2, layout='wall', side='n', spacing=1.20),
        dict(asset='credenza',     count=1, layout='wall', side='w'),
        dict(asset='pendant',      count=1, layout='ceiling_row'),
    ],
    'L02-R05': [
        dict(asset='ceiling_line', count=1, layout='ceiling_row'),
        dict(asset='plant',        count=1, layout='corner', corner='nw'),
    ],
    'L02-R06': [   # BIM ÉS ADATSZOBA — the working heart of the top floor
        dict(asset='desk',         count=4, layout='desk_bank', spacing=2.10),
        dict(asset='office_chair', count=4, layout='at_desks', offset=0.86),
        dict(asset='monitor',      count=6, layout='on_desks', duals=(0, 1)),
        dict(asset='equipment_case', count=1, layout='wall', side='w'),
        dict(asset='shelving',     count=1, layout='wall', side='n'),
        dict(asset='pendant',      count=3, layout='ceiling_row'),
    ],
    'L02-R07': [   # PROJEKTSTÚDIÓ
        dict(asset='plan_table',   count=1, layout='center'),
        dict(asset='office_chair', count=1, layout='at_point', at=(0.0, -1.35), face=0.0),
        dict(asset='wall_screen',  count=1, layout='wall_mounted', side='n'),
        dict(asset='plan_frame',   count=2, layout='wall_mounted', side='w', spacing=1.60),
        dict(asset='pendant',      count=2, layout='ceiling_row'),
    ],
    'L02-R08': [   # TECHNIKAI ÉS KOLLABORÁCIÓS SÁV — opens onto the terrace
        dict(asset='lounge_chair', count=2, layout='pair_facing', gap=1.45, face=1.5708),
        dict(asset='side_table',   count=1, layout='center'),
        dict(asset='equipment_case', count=1, layout='wall', side='w'),
        dict(asset='tripod',       count=1, layout='at_point', at=(0.0, 3.40), face=0.4),
        dict(asset='pendant',      count=2, layout='ceiling_row'),
    ],
}

#: Furniture that must never be counted as furniture by MEASURE/QUANTIFY —
#: it is part of the building's finish, not its contents.
FINISH_ASSETS = ('acoustic', 'signage', 'plan_frame')

#: Assets the mobile tier drops entirely. Chosen by visual contribution per
#: triangle, not by triangle count alone.
MOBILE_DROP = ('plan_frame', 'acoustic', 'tripod', 'equipment_case',
               'formwork_stack', 'trestle', 'signage', 'shelving')

#: Levels whose CONTENTS the mobile tier drops entirely.
#: Part 21 is explicit that a phone must not be shown three tiny exploded
#: floors, and the phone hero is a sectional read of the lower building — so
#: the project floor's chairs are geometry no phone frame ever contains.
MOBILE_DROP_LEVELS = ('L02',)

# ============================================================
# capture stations
# ============================================================

#: room uid → station name, in WALKING ORDER per level. Positions are NOT
#: listed: they are solved from each room's own furnished clearances
#: (room_layout.capture_station), which is the Phase 7 rule and it now runs
#: three times. Target counts from Part 11: 5–8 / 5–8 / 3–6.
#: PHASE 9 Part 10 — THE CAPTURE ROUND MOVED TO src/webgl/stations.js.
#:
#: It was declared here and the web had no way to read it, so the homepage's
#: CAPTURE readout printed a hand-written total and could not break it down
#: by floor. It is now declared on the same side of the fence as the rooms
#: themselves and arrives with plan-features.json; build_environment.py reads
#: it from there. Nothing in this file may hold a second copy.
