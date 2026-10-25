// The room's layout (room.js): where one may walk, going back through the doorway, arriving, and
// what a ray points at.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ROOM } from '../public/js/config.js';
import { DOOR, EYE, MARGIN, PANEL_BUTTONS, PANEL_PX, castRay, clampWalk, doorCrossed, doorSpawn, layoutRoom, panelButtonAt, standable } from '../public/js/room.js';

const L = layoutRoom(ROOM);
const ray = (o, d) => {
  const n = Math.hypot(...d);
  return castRay(L, o[0], o[1], o[2], d[0] / n, d[1] / n, d[2] / n, {});
};
const near = (a, b, eps = 1e-9) => Math.abs(a - b) <= eps;

test('the layout: the room as config.js sizes it, the doorway in the near wall, the window in its wall', () => {
  assert.equal(L.width, ROOM.size.width);
  assert.equal(L.depth, ROOM.size.depth);
  assert.equal(L.height, ROOM.size.height);
  assert.equal(L.x1 - L.x0, L.width);
  assert.equal(L.z1, -L.depth);
  assert.equal(L.door.width, DOOR.width);
  assert.equal(L.window.wall, ROOM.window);
  assert.ok(L.window.bottom < L.window.top && L.window.top < L.height);
  assert.ok(L.lamps.length >= 1 && L.lamps.every((p) => p.y === L.height && p.z < 0 && p.z > L.z1));
  // The panel is on the doorway's wall, beside the doorway, inside the room.
  assert.ok(L.panel.x - L.panel.width / 2 > L.door.width / 2);
  assert.ok(L.panel.x + L.panel.width / 2 < L.x1);
});

test("a small room still fits the doorway, the panel and the window; a link's doorway shrinks to fit", () => {
  const s = layoutRoom({ size: { width: 1, depth: 1, height: 1 }, window: 'far' }, { doorWidth: 2.4, doorHeight: 3.2 });
  assert.ok(s.door.width / 2 + 0.5 + s.panel.width <= s.width / 2);
  assert.ok(s.door.height < s.height);
  assert.ok(s.window.width > 0 && s.window.width < s.width);
  assert.ok(s.panel.y + s.panel.height / 2 < s.height);
});

test('one arrives just inside the doorway: where in it they came through, turned as they came', () => {
  const s = doorSpawn(L, 0.12, -0.14);
  assert.equal(s.x, 0.12);
  assert.equal(s.yaw, -0.14);
  assert.ok(standable(L, s.x, s.z));
  assert.ok(!doorCrossed(L, s.x, s.z));
  // Not in the jambs, and never facing back out.
  assert.ok(Math.abs(doorSpawn(L, 1.2).x) < L.door.width / 2);
  assert.equal(doorSpawn(L, 0, 3).yaw, Math.PI / 2);
});

test('the walls stop you, MARGIN from them', () => {
  const out = {};
  for (const [x, z, ex, ez] of [
    [-50, -3, L.x0 + MARGIN, -3],
    [50, -3, L.x1 - MARGIN, -3],
    [0, -50, 0, L.z1 + MARGIN],
    [2, 5, 2, -MARGIN], // the doorway's wall, beside the doorway
  ]) {
    const c = clampWalk(L, 0, -3, x, z, out);
    assert.ok(near(c.x, ex) && near(c.z, ez), `(${x}, ${z}) → (${c.x}, ${c.z})`);
  }
});

test('the doorway lets you in between its jambs, through to its back, and no further', () => {
  const out = {};
  const c = clampWalk(L, 0, -1, 0, 2, out);
  assert.equal(c.x, 0);
  assert.ok(near(c.z, L.door.reveal + 0.1));
  assert.ok(doorCrossed(L, c.x, c.z));
  // In the doorway, one slides along it but not into its jambs.
  const j = clampWalk(L, 0, 0.2, 3, 0.2, out);
  assert.ok(j.x < L.door.width / 2 && j.z === 0.2);
  // Walking at the wall beside the doorway does not slip into it.
  const w = clampWalk(L, 1.5, -MARGIN, 1.5, 0.5, out);
  assert.equal(w.z, -MARGIN);
});

test('one has gone back through the doorway once past its threshold, inside its width', () => {
  assert.ok(doorCrossed(L, 0, L.door.threshold + 0.01));
  assert.ok(!doorCrossed(L, 0, L.door.threshold - 0.01));
  assert.ok(!doorCrossed(L, L.door.width, 0.2));
});

test('what a ray points at: the doorway, the panel, the floor, the window, a wall, the ceiling', () => {
  const eye = [0, EYE, -2];
  assert.equal(ray(eye, [0, -0.2, 1]).kind, 'door');
  const p = ray(eye, [L.panel.x, L.panel.y + 0.3 - EYE, 2]);
  assert.equal(p.kind, 'panel');
  assert.ok(p.u > 0 && p.u < 1 && p.v > 0 && p.v < 1);
  const f = ray(eye, [0, -1, -0.5]);
  assert.equal(f.kind, 'floor');
  assert.ok(f.walkable && near(f.y, 0));
  assert.ok(!ray([0, EYE, -0.6], [0, -1, 2]).walkable); // the floor right by the doorway's wall
  assert.equal(ray(eye, [0, 1, 0]).kind, 'ceiling');
  // The window, in the middle of its wall.
  const W = L.window, mid = (W.bottom + W.top) / 2;
  const at = W.wall === 'far' ? [W.along, mid, L.z1] : [W.wall === 'left' ? L.x0 : L.x1, mid, W.along];
  const from = [0, mid, W.wall === 'far' ? -1 : W.along];
  assert.equal(ray(from, [at[0] - from[0], at[1] - from[1], at[2] - from[2]]).kind, 'window');
  assert.equal(ray(from, [at[0] - from[0], L.height - 0.1 - from[1], at[2] - from[2]]).kind, 'wall');
  // From inside the doorway, its back.
  assert.equal(ray([0, EYE, 0.2], [0, 0, 1]).kind, 'door');
});

test("the panel's buttons are where castRay's u, v find them", () => {
  for (const [id, x0, y0, x1, y1] of PANEL_BUTTONS) {
    const u = (x0 + x1) / 2 / PANEL_PX.width, v = 1 - (y0 + y1) / 2 / PANEL_PX.height;
    assert.equal(panelButtonAt(u, v), id);
  }
  assert.equal(panelButtonAt(0.02, 0.98), null);
});
