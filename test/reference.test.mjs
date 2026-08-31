/* ============================================================
   THE REFERENCE ROOM — PHASE 9 Part 35

   Phase 9's central claim is that ONE room can be followed from the
   physical building to a capture station, into the 360 viewer, onto the
   L01 plan and into the quantity table, and that it is the same room every
   time rather than five things that resemble each other.

   That claim is only worth making if it cannot quietly stop being true. So
   every link in the chain is asserted here, and — this is the point — none
   of these tests names the room. They ask the rule for it and then check
   that everything downstream agrees. Move a wall, rename a room, drop a
   capture station, and the failure lands here rather than in a screenshot
   somebody takes in three months.

   Run: npm test
   ============================================================ */
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  REF_LEVEL, REF_UID, REF_ROOM_ID, referenceRoom, referenceFacts,
  isReferenceStation,
} from '../src/webgl/reference.js';
import { CAPTURE_ROUND, roundRooms, stationsByLevel } from '../src/webgl/stations.js';
import {
  levelFeatures, LEVEL_IDS, levelById, finishOf, buildingQuantities,
} from '../src/webgl/levels.js';

test('the rule resolves to exactly one room, and it is a meeting room', () => {
  const room = referenceRoom();
  assert.ok(room, 'the rule produced nothing');
  assert.equal(room.kind, 'MEET',
    `the reference room should be a meeting room, got ${room.kind}`);
  assert.equal(room.level, REF_LEVEL);
  assert.equal(room.uid, REF_UID);
  assert.equal(room.id, REF_ROOM_ID);
});

test('it is on the WORK floor — the one the brief asks for', () => {
  assert.equal(levelById(REF_LEVEL).name, 'WORK');
});

test('the rule is a rule, not a coordinate: it wins on its own terms', () => {
  const F = levelFeatures(REF_LEVEL);
  const meets = F.rooms.filter((r) => r.kind === 'MEET');
  assert.ok(meets.length >= 2,
    'the tie-break is untested unless the floor has more than one candidate');
  const chosen = referenceRoom();
  const facades = (r) => new Set(
    F.windows.filter((w) => w.room === r.id).map((w) => w.side)).size;
  for (const other of meets) {
    if (other.id === chosen.id) continue;
    /* Bigger, or equally big with more facades on it. */
    assert.ok(
      chosen.area > other.area
      || (chosen.area === other.area && facades(chosen) >= facades(other)),
      `${other.id} beats the chosen room on the stated rule`);
  }
});

test('it exists in the floor data with a derived area', () => {
  const F = levelFeatures(REF_LEVEL);
  const room = F.rooms.find((r) => r.uid === REF_UID);
  assert.ok(room, `${REF_UID} is not in ${REF_LEVEL}'s room list`);
  assert.ok(room.area > 0, 'the reference room has no area');
  /* The area is the rectangle, not a stored number. */
  const F2 = buildingQuantities().levels.find((l) => l.id === REF_LEVEL);
  assert.ok(room.area <= F2.area,
    'one room cannot be larger than the floor it is on');
});

test('a capture station stands in it', () => {
  const inRound = CAPTURE_ROUND.filter(([uid]) => uid === REF_UID);
  assert.equal(inRound.length, 1,
    `the capture round should visit ${REF_UID} exactly once`);
  /* …and the round knows which room that is. */
  const resolved = roundRooms().find((r) => r.uid === REF_UID);
  assert.ok(resolved?.room, 'the round names a room the plan does not have');
});

test('the 360 viewer can recognise that station from either id form', () => {
  /* The glTF station empty carries the UID; the plan carries the plain id.
     Both reach `isReferenceStation`, and it has to accept both. */
  assert.ok(isReferenceStation({ level: REF_LEVEL, room: REF_UID }));
  assert.ok(isReferenceStation({ floor: REF_LEVEL, roomId: REF_ROOM_ID }));
  assert.ok(!isReferenceStation({ level: REF_LEVEL, room: 'R99' }));
  assert.ok(!isReferenceStation(null));
});

test('the quantity readout is derived, every figure of it', () => {
  const f = referenceFacts();
  const F = levelFeatures(REF_LEVEL);
  const room = F.rooms.find((r) => r.uid === REF_UID);
  assert.equal(f.uid, REF_UID);
  assert.equal(f.label, room.label);
  assert.equal(f.area, room.area);
  assert.equal(f.doors, F.doors.filter((d) => d.room === REF_ROOM_ID).length);
  assert.equal(f.windows, F.windows.filter((w) => w.room === REF_ROOM_ID).length);
  assert.ok(f.doors >= 1, 'a room you can walk into has a door');
  assert.ok(f.windows >= 1, 'the reference room is chosen for its windows');
});

test('it has a floor finish, so PADLÓBURKOLAT can quote it', () => {
  const room = referenceRoom();
  const f = finishOf(room);
  assert.ok(f, 'no finish resolves for the reference room');
  const q = buildingQuantities().levels.find((l) => l.id === REF_LEVEL);
  assert.ok(q.finishes[f] > 0,
    `the floor's finish schedule has no ${f} on it`);
});

test('the room the plan draws is the room the station stands in', () => {
  /* The claim in one line: the 360 viewer, the drawing and the schedule
     are addressing one rectangle. There is no second copy of it to
     disagree with — this asserts that there is not. */
  const fromPlan = levelFeatures(REF_LEVEL).rooms.find((r) => r.uid === REF_UID);
  const fromRound = roundRooms().find((r) => r.uid === REF_UID).room;
  assert.equal(fromPlan, fromRound, 'two different objects for one room');
});

test('every level carries capture points, and they add up', () => {
  const by = stationsByLevel();
  assert.equal(by.length, LEVEL_IDS.length);
  for (const l of by) assert.ok(l.count > 0, `${l.id} has no capture point`);
  assert.equal(by.reduce((s, l) => s + l.count, 0), CAPTURE_ROUND.length);
});
