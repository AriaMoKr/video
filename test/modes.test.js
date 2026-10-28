// The room's four modes (modes.js): everything inside the room and out of the way in, every tape
// shelved and every screen with its bar, the seats, and castRay and clampWalk with the furniture.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ROOM } from '../public/js/config.js';
import { EYE, MARGIN, doorSpawn, layoutRoom, standable } from '../public/js/room.js';
import { readCatalogue } from '../public/js/catalogue.js';
import {
  BAR_BUTTONS, BAR_PX, DEFAULT_MODE, MODES, MODE_NAMES, ROOM_PANEL_BUTTONS, ROOM_PANEL_PX,
  barButtonAt, blocked, castRay, clampWalk, faceFrame, furnish, roomPanelButtonAt, screenFor,
} from '../public/js/modes.js';

const episodes = readCatalogue(JSON.parse(readFileSync(new URL('../public/catalogue/episodes.json', import.meta.url), 'utf8')));
const hit = () => ({ t: 0, kind: '', id: null, use: null, x: 0, y: 0, z: 0, nx: 0, ny: 0, nz: 0, u: 0, v: 0, walkable: false });
const furnished = (mode) => {
  const L = layoutRoom(ROOM);
  L.furniture = furnish(L, mode, episodes);
  return L;
};
const ray = (L, o, to) => {
  const d = [to[0] - o[0], to[1] - o[1], to[2] - o[2]], n = Math.hypot(...d);
  return castRay(L, o[0], o[1], o[2], d[0] / n, d[1] / n, d[2] / n, hit());
};
/** A point just in front of a face's middle (or at u, v on it), and that point. */
const before = (f, u = 0.5, v = 0.5, back = 1.2) => {
  const fr = faceFrame(f);
  const p = [0, 1, 2].map((k) => fr.center[k] + fr.right[k] * (u - 0.5) * fr.width + (k === 1 ? (v - 0.5) * fr.height : 0));
  return { from: [p[0] + fr.normal[0] * back, p[1], p[2] + fr.normal[2] * back], at: p };
};

test('four modes, the video store first', () => {
  assert.deepEqual([...MODES], ['store', 'den', 'screening', 'gallery']);
  assert.equal(DEFAULT_MODE, 'store');
  assert.equal(MODE_NAMES.store, 'Video store');
  assert.equal(furnish(layoutRoom(ROOM), 'no such mode', episodes).mode, 'store');
  assert.ok(episodes.length >= 30, `${episodes.length} episodes`);
});

for (const mode of MODES) {
  test(`${mode}: inside the room, clear of the doorway, the panels and the window`, () => {
    const L = furnished(mode), F = L.furniture;
    const eps = 1e-6;
    for (const b of F.boxes) {
      assert.ok(b.min[0] >= L.x0 - eps && b.max[0] <= L.x1 + eps && b.min[2] >= L.z1 - eps && b.max[2] <= 0 + eps, `${b.material} ${b.min} ${b.max}`);
      assert.ok(b.min[1] >= 0 && b.max[1] <= L.height, `${b.material} under the ceiling`);
      for (let k = 0; k < 3; k++) assert.ok(b.min[k] <= b.max[k], `${b.material} ${b.min} ${b.max}`);
    }
    for (const f of [...F.faces, ...F.signs.map((s) => s.face), ...F.screens.map((s) => s.bar)]) {
      assert.ok(f.y0 >= 0 && f.y1 <= L.height && f.a1 > f.a0 && f.y1 > f.y0, `${f.kind} ${f.id}`);
      const [x, , z] = faceFrame(f).center;
      assert.ok(x >= L.x0 && x <= L.x1 && z >= L.z1 && z <= 0, `${f.kind} ${f.id} at ${x}, ${z}`);
    }
    // One comes in at the doorway and can stand there, reach the control panel and the room's panel, and walk in.
    const s = doorSpawn(L);
    assert.ok(!blocked(F, s.x, s.z));
    assert.ok(!blocked(F, L.panel.x, -0.6) && !blocked(F, -L.panel.x, -0.6));
    assert.ok(!blocked(F, 0, -2), 'the middle, two metres in');
    // Nothing stands in front of the window.
    const W = L.window;
    for (const r of F.obstacles) {
      if (W.wall === 'right') assert.ok(r.maxX < L.x1 - 0.2 || r.maxZ < W.along - W.width / 2 || r.minZ > W.along + W.width / 2, `in front of the window: ${JSON.stringify(r)}`);
    }
    // The furniture's floor is not walkable; where one sits is in it.
    for (const seat of F.seats) {
      assert.ok(blocked(F, seat.x, seat.z), 'a seat is in its furniture');
      assert.ok(!blocked(F, ...seat.out), `one stands up clear of it: ${seat.out}`);
    }
  });

  test(`${mode}: every tape on the shelves or every decade's set, each screen with its bar, and castRay finds them`, () => {
    const L = furnished(mode), F = L.furniture;
    if (mode === 'gallery') {
      assert.equal(F.tapes.length, 0);
      assert.deepEqual(F.screens.map((s) => s.decade).sort(), [...new Set(episodes.map((e) => e.decade))].sort());
      assert.equal(F.bar, null, 'no bar until a set plays');
    } else {
      assert.deepEqual(F.tapes.map((t) => t.episode).sort((a, b) => a - b), episodes.map((_, i) => i), 'every episode, once');
      assert.equal(F.screens.length, 1);
      assert.equal(F.bar, F.screens[0].bar);
      // The tapes don't overlap, and castRay finds each one from in front of it.
      for (const { episode, face } of F.tapes) {
        for (const other of F.tapes) {
          if (other.face === face || other.face.axis !== face.axis || other.face.at !== face.at) continue;
          assert.ok(other.face.a1 <= face.a0 + 1e-9 || other.face.a0 >= face.a1 - 1e-9 || other.face.y1 <= face.y0 + 1e-9 || other.face.y0 >= face.y1 - 1e-9, `tapes ${episode} and ${other.episode} overlap`);
        }
        const { from, at } = before(face, 0.5, 0.5, 0.6);
        const h = ray(L, from, at);
        assert.equal(h?.kind, 'tape', `tape ${episode} from in front: ${h?.kind}`);
        assert.equal(h.use, `tape:${episode}`);
      }
      // Read left to right, row by row, a shelf's tapes go in the catalogue's order.
      const rows = new Map();
      for (const t of F.tapes.filter((t) => t.face.axis === 'x' && t.face.facing === 1)) {
        const key = t.face.y0.toFixed(3);
        rows.set(key, [...(rows.get(key) ?? []), t]);
      }
      for (const row of rows.values()) {
        const byPlace = [...row].sort((p, q) => q.face.a0 - p.face.a0); // facing the left wall, left is +z
        const decades = byPlace.map((t) => episodes[t.episode].decade);
        assert.deepEqual(decades, [...decades].sort(), 'decades left to right');
      }
    }
    for (const s of F.screens) {
      const h = ray(L, ...Object.values(before(s.face)));
      assert.equal(h?.kind, 'screen', `${s.id} screen`);
      assert.equal(h.use, `screen:${s.id}`);
      assert.ok(Math.abs((s.face.a1 - s.face.a0) / (s.face.y1 - s.face.y0) - 4 / 3) < 0.01, `${s.id}: 4:3`);
      // Its bar, once it is the one in use.
      F.bar = s.bar;
      for (const [id, x0, y0, x1, y1] of BAR_BUTTONS) {
        const { from, at } = before(s.bar, (x0 + x1) / 2 / BAR_PX.width, 1 - (y0 + y1) / 2 / BAR_PX.height, 0.8);
        const b = ray(L, from, at);
        assert.equal(b?.kind, 'bar', `${s.id}'s bar`);
        assert.equal(barButtonAt(b.u, b.v), id);
      }
      assert.ok(Math.abs((s.bar.a1 - s.bar.a0) / (s.bar.y1 - s.bar.y0) - 6) < 1e-6, 'a bar is 6:1');
    }
    // The room's panel, by the doorway, and its buttons.
    for (const [id, x0, y0, x1, y1] of ROOM_PANEL_BUTTONS) {
      const { from, at } = before(F.panel, (x0 + x1) / 2 / ROOM_PANEL_PX.width, 1 - (y0 + y1) / 2 / ROOM_PANEL_PX.height, 1.5);
      const p = ray(L, from, at);
      assert.equal(p?.kind, 'roompanel', id);
      assert.equal(roomPanelButtonAt(p.u, p.v), id);
    }
    // The seats: pointing at one sits there.
    F.seats.forEach((seat, i) => {
      const h = ray(L, [seat.out[0], EYE, seat.out[1]], [seat.x, 0.3, seat.z]);
      assert.equal(h?.use, `seat:${i}`, `seat ${i}: ${h?.kind} ${h?.use}`);
    });
  });
}

test('the floor behind furniture is not walkable, and a walk into it stops MARGIN short, sliding along', () => {
  const L = furnished('store'), F = L.furniture;
  const couchRect = F.obstacles.find((r) => r.minX > 0 && r.minZ < -4.5 && r.maxZ > -4.1);
  assert.ok(couchRect, 'the couch');
  const mid = (couchRect.minX + couchRect.maxX) / 2;
  // Looking down at the couch's footprint from beside it, the floor there is not walkable (or the couch is hit).
  const h = ray(L, [mid, EYE, couchRect.maxZ + 1.2], [mid, 0, couchRect.minZ - 0.1]);
  assert.ok(!h.walkable);
  const out = {};
  // Walking at it from the doorway's side stops in front of its back.
  const c = clampWalk(L, mid, -2.5, mid, (couchRect.minZ + couchRect.maxZ) / 2, out);
  assert.ok(Math.abs(c.z - (couchRect.maxZ + MARGIN)) < 1e-9 && c.x === mid, `${c.x}, ${c.z}`);
  // Walking along it slides.
  const s = clampWalk(L, mid - 0.5, couchRect.maxZ + MARGIN, mid, couchRect.maxZ + MARGIN - 0.2, out);
  assert.ok(s.x === mid && Math.abs(s.z - (couchRect.maxZ + MARGIN)) < 1e-9);
  // One put in it (the mode changed under them) is put out on its nearest side.
  const p = clampWalk(L, mid, couchRect.minZ + 0.1, mid, couchRect.minZ + 0.1, out);
  assert.ok(!blocked(F, p.x, p.z), `${p.x}, ${p.z}`);
  // Between the screening room's rows, too close together to stand between: out to the nearest clear place.
  const S = furnished('screening');
  for (const [x, z] of [[-1.65, -3.95], [1.05, -4.5], [2.25, -2.95], [-2.4, -4.95]]) {
    const q = clampWalk(S, x, z, x, z, {});
    assert.ok(!blocked(S.furniture, q.x, q.z) && standable(S, q.x, q.z), `from ${x}, ${z}: ${q.x}, ${q.z}`);
    assert.ok(Math.hypot(q.x - x, q.z - z) < 2, `not far: ${q.x}, ${q.z}`);
  }
  // Without furniture, room.js's own.
  const bare = layoutRoom(ROOM);
  assert.deepEqual(clampWalk(bare, 0, -3, 0, -3, {}), { x: 0, z: -3 });
});

test("an episode plays on the main screen, or in the gallery on its decade's set", () => {
  const store = furnished('store').furniture, gallery = furnished('gallery').furniture;
  assert.equal(screenFor(store, episodes[0]).id, 'main');
  for (const e of episodes) assert.equal(screenFor(gallery, e).decade, e.decade);
});
