// This room in the Hallway's door contract (common/door.js, which has the contract's own tests):
// the Hallway's door to here, as the Hallway makes its link, read back here, and the way back.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { doorLink, hallwayUrl, hallwayViews, leaveUrl, readVisit, wayBack, withoutVisit } from 'common/door.js';
import { ROOM, hallwayDoor } from '../public/js/config.js';
import { doorSpawn, layoutRoom } from '../public/js/room.js';

const DOOR = hallwayDoor();
const HALL = { doorWidth: 1.1, doorHeight: 2.25 };
const pose = { across: 0.12, yaw: (-8 * Math.PI) / 180, pitch: (-3 * Math.PI) / 180 };
/** The Hallway's door to here, walked through, as the visitor arrives here. */
const arrive = (here, room = null) => new URL(doorLink(DOOR, { here, hall: HALL, pose, room }));

test("through the Hallway's door: the visit, where one stands, and the way back to that door", () => {
  const url = arrive('https://ariamokr.github.io/hallway/', 'k3vd-q8hn');
  assert.equal(url.origin + url.pathname, ROOM.url);
  const v = readVisit(url.search);
  assert.equal(v.from, 'hallway');
  assert.equal(v.glow, ROOM.glow);
  const s = doorSpawn(layoutRoom(ROOM, { doorWidth: v.dw, doorHeight: v.dh }), v.dx, v.yaw);
  assert.ok(Math.abs(s.x - 0.12) < 1e-9 && Math.abs(s.yaw - pose.yaw) < 1e-3);
  const way = wayBack(url.search, ROOM.id, { origin: url.origin });
  assert.equal(way.hallway, true);
  assert.equal(way.label, '← Hallway');
  assert.equal(way.url, `https://ariamokr.github.io/hallway/?from=${ROOM.id}&room=k3vd-q8hn`);
  assert.deepEqual(hallwayViews(way, ROOM.id), { views: 'https://ariamokr.github.io/hallway/views/views.json', id: ROOM.id });
  assert.equal(withoutVisit(url.href), `${new URL(ROOM.url).pathname}?room=k3vd-q8hn`);
});

test("without a door's link (?from=hallway alone, or nothing), the way back is the Hallway, in front of this door", () => {
  for (const search of ['', '?from=hallway']) {
    const way = wayBack(search, ROOM.id, { origin: 'https://ariamokr.github.io' });
    assert.equal(way.url, hallwayUrl(ROOM.id));
    assert.equal(way.url, `https://ariamokr.github.io/hallway/?from=${ROOM.id}`);
    assert.equal(way.label, '← Hallway');
  }
});

test("from the dev servers, the Hallway's (8088) to this room's, the way back is the Hallway too", () => {
  const url = arrive('http://localhost:8088/');
  const way = wayBack(url.search, ROOM.id, { origin: `http://localhost:${ROOM.port}` });
  assert.equal(way.hallway, true);
  assert.equal(way.url, `http://localhost:8088/?from=${ROOM.id}`);
});

test("going back carries the shared session's room, and leaves it off out of one", () => {
  const way = wayBack('', ROOM.id, { origin: 'https://ariamokr.github.io' });
  assert.equal(leaveUrl(way, 'k3vd-q8hn'), `https://ariamokr.github.io/hallway/?from=${ROOM.id}&room=k3vd-q8hn`);
  assert.equal(leaveUrl(way, null), hallwayUrl(ROOM.id));
});
