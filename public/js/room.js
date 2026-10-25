// The room: where everything in it is, and the questions asked of it every frame (where the viewer
// may walk, whether they have gone back through the doorway, what a ray points at). Pure functions
// with no three.js, so the tests run them in Node. Its size, and the wall its window is in, come
// from config.js.
//
// Coordinates: metres, y up, the floor at y = 0. The doorway's wall is the plane z = 0, with the
// doorway in it at x = 0, and the room runs along -z to the far wall. Facing in from the doorway,
// left is -x. A yaw of 0 faces -z (into the room); positive yaws turn left.

const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

/** The viewer's eye on a screen, and how near a wall their head comes. */
export const EYE = 1.6;
export const MARGIN = 0.3;

/** The doorway back to the Hallway: the link's dw and dh, when it gives them, replace its size. The wall is `reveal` thick there. */
export const DOOR = { width: 1.1, height: 2.25, reveal: 0.3, threshold: 0.06 };

/** The window, in the middle of its wall: as wide as `width` (less on a short wall), from `bottom` to `top` (lower under a low ceiling). */
export const WINDOW = { width: 1.6, bottom: 0.9, top: 2.4, reveal: 0.22 };

/** The control panel on the doorway's wall, on the +x side of the doorway (to the right, coming in): its centre, size, and how far its face stands out. */
export const PANEL = { gap: 0.5, y: 1.4, width: 0.56, height: 0.84, depth: 0.03 };

/**
 * The panel's canvas, and its buttons on it as [id, x0, y0, x1, y1] in canvas pixels (y down): the
 * Hallway's VR, Move and Turn, then the accessibility settings (common/access.js: motion, the
 * vignette, seated), then the shared session.
 */
export const PANEL_PX = { width: 512, height: 768 };
export const PANEL_BUTTONS = [
  ['vr', 32, 74, 480, 136],
  ['move:teleport', 160, 160, 314, 218],
  ['move:smooth', 326, 160, 480, 218],
  ['turn:snap', 160, 236, 314, 294],
  ['turn:smooth', 326, 236, 480, 294],
  ['motion:system', 160, 352, 262, 410],
  ['motion:reduce', 270, 352, 372, 410],
  ['motion:full', 380, 352, 480, 410],
  ['vignette:on', 160, 428, 314, 486],
  ['vignette:off', 326, 428, 480, 486],
  ['seated:on', 160, 504, 314, 562],
  ['seated:off', 326, 504, 480, 562],
  ['session', 32, 652, 480, 706],
];

/** The button at (u, v) on the panel (0…1 from its bottom left, as castRay reports), or null. */
export function panelButtonAt(u, v) {
  const x = u * PANEL_PX.width, y = (1 - v) * PANEL_PX.height;
  for (const b of PANEL_BUTTONS) {
    if (x >= b[1] && x <= b[3] && y >= b[2] && y <= b[4]) return b[0];
  }
  return null;
}

/** The smallest room the doorway, the panel and the window fit in, in metres. */
export const MIN_SIZE = { width: 3.2, depth: 3, height: 2.6 };
export const MAX_SIZE = { width: 40, depth: 40, height: 12 };

/**
 * Everything about the room the frame loop asks: its walls, the doorway (its size from the link,
 * else DOOR), the window, the panel, the lamps, and where to arrive.
 * @param {{ size: { width: number, depth: number, height: number }, window: 'left'|'right'|'far' }} room config.js's ROOM
 * @param {{ doorWidth?: number, doorHeight?: number }} [o]
 */
export function layoutRoom(room, { doorWidth = DOOR.width, doorHeight = DOOR.height } = {}) {
  const width = clamp(room.size.width, MIN_SIZE.width, MAX_SIZE.width);
  const depth = clamp(room.size.depth, MIN_SIZE.depth, MAX_SIZE.depth);
  const height = clamp(room.size.height, MIN_SIZE.height, MAX_SIZE.height);
  const x0 = -width / 2, x1 = width / 2, z1 = -depth;
  // The doorway fits under the ceiling, and leaves its wall room for the panel beside it.
  const door = {
    width: Math.min(doorWidth, width - 2 * (PANEL.gap + PANEL.width + 0.1)),
    height: Math.min(doorHeight, height - 0.25),
    reveal: DOOR.reveal,
    threshold: DOOR.threshold,
  };
  // The window, in the middle of its wall: along its wall `along` (x on the far wall, z on a side wall).
  const wall = room.window === 'far' || room.window === 'right' ? room.window : 'left';
  const length = wall === 'far' ? width : depth;
  const win = {
    wall,
    along: wall === 'far' ? 0 : -depth / 2,
    width: Math.min(WINDOW.width, length - 1.2),
    bottom: Math.min(WINDOW.bottom, height - 1.4),
    top: Math.min(WINDOW.top, height - 0.35),
    reveal: WINDOW.reveal,
  };
  const panel = { x: door.width / 2 + PANEL.gap + PANEL.width / 2, y: Math.min(PANEL.y, height - PANEL.height / 2 - 0.3), width: PANEL.width, height: PANEL.height, depth: PANEL.depth };
  // A lamp on the ceiling every 3.5 m or so down the middle.
  const n = Math.max(1, Math.round(depth / 3.5));
  const lamps = Array.from({ length: n }, (_, i) => ({ x: 0, y: height, z: -((i + 0.5) * depth) / n }));
  return { width, depth, height, x0, x1, z0: 0, z1, door, window: win, panel, lamps, spawn: { x: 0, z: -0.6, yaw: 0 } };
}

/** Where someone coming in through the doorway stands: dx to the right of its middle (within its jambs), turned by yaw (within a quarter turn). */
export function doorSpawn(L, dx = 0, yaw = 0) {
  const jamb = Math.max(0, L.door.width / 2 - 0.25);
  return { x: clamp(dx, -jamb, jamb), z: L.spawn.z, yaw: clamp(yaw, -Math.PI / 2, Math.PI / 2) };
}

/**
 * The nearest place to (x, z) a head coming from (fx, fz) may be: inside the walls, `MARGIN` from
 * them, or in the doorway between its jambs (which the shoulders keep clear of), through to the
 * portal at the back of the wall. Writes { x, z } into out.
 */
export function clampWalk(L, fx, fz, x, z, out = { x: 0, z: 0 }) {
  const m = MARGIN;
  x = clamp(x, L.x0 + m, L.x1 - m);
  z = Math.max(z, L.z1 + m);
  const jamb = L.door.width / 2 - 0.2;
  if (z > -m) {
    // The doorway's wall: only the doorway goes on, between its jambs; one already in it slides along it.
    if (Math.abs(x) < jamb || (fz > -m && Math.abs(fx) <= jamb + 1e-6)) {
      x = clamp(x, -jamb, jamb);
      z = Math.min(z, L.door.reveal + 0.1);
    } else {
      z = -m;
    }
  }
  out.x = x;
  out.z = z;
  return out;
}

/** Whether a head at (x, z) has gone back through the doorway. */
export function doorCrossed(L, x, z) {
  return Math.abs(x) < L.door.width / 2 && z > L.door.threshold;
}

/** Whether (x, z) is somewhere to stand: inside the walls, MARGIN from them. */
export function standable(L, x, z) {
  const m = MARGIN - 1e-9;
  return x >= L.x0 + m && x <= L.x1 - m && z >= L.z1 + m && z <= -m;
}

/**
 * What a ray from inside the room reaches first: the doorway, the control panel, the window, the
 * floor, a wall or the ceiling. The room is a box, so this is where the ray leaves it; from the
 * doorway's reveal, the doorway is its back, where the portal is. Writes into out
 * { t, kind, x, y, z, nx, ny, nz, u, v, walkable } (n: the surface's normal, into the room; u, v:
 * where on the panel, 0…1 from its bottom left; walkable: for the floor, whether one may stand
 * there) and returns it, or null when the ray leaves through no surface.
 */
export function castRay(L, ox, oy, oz, dx, dy, dz, out) {
  let t = Infinity;
  let plane = '';
  const near = oz > 0 ? L.door.reveal : L.z0; // in the doorway, its back is the wall to reach
  if (dx < 0) { const s = (L.x0 - ox) / dx; if (s > 0 && s < t) { t = s; plane = 'left'; } }
  if (dx > 0) { const s = (L.x1 - ox) / dx; if (s > 0 && s < t) { t = s; plane = 'right'; } }
  if (dy < 0) { const s = -oy / dy; if (s > 0 && s < t) { t = s; plane = 'floor'; } }
  if (dy > 0) { const s = (L.height - oy) / dy; if (s > 0 && s < t) { t = s; plane = 'ceiling'; } }
  if (dz < 0) { const s = (L.z1 - oz) / dz; if (s > 0 && s < t) { t = s; plane = 'far'; } }
  if (dz > 0) { const s = (near - oz) / dz; if (s > 0 && s < t) { t = s; plane = 'near'; } }
  if (t === Infinity) return null;
  const x = ox + dx * t, y = oy + dy * t, z = oz + dz * t;
  out.t = t;
  out.x = x;
  out.y = y;
  out.z = z;
  out.nx = out.ny = out.nz = 0;
  out.u = out.v = 0;
  out.walkable = false;
  const W = L.window;
  const inWindow = (along) => Math.abs(along - W.along) < W.width / 2 && y > W.bottom && y < W.top;
  if (plane === 'near') {
    out.nz = -1;
    out.kind = 'wall';
    if (oz <= 0) {
      // The panel's face stands a little out from the wall, so the ray meets it first.
      const P = L.panel;
      const s = (-P.depth - oz) / dz;
      const px = ox + dx * s, py = oy + dy * s;
      const u = 0.5 - (px - P.x) / P.width, v = 0.5 + (py - P.y) / P.height;
      if (s > 0 && u >= 0 && u <= 1 && v >= 0 && v <= 1) {
        out.kind = 'panel';
        out.t = s;
        out.x = px;
        out.y = py;
        out.z = -P.depth;
        out.u = u;
        out.v = v;
        return out;
      }
    }
    if (Math.abs(x) < L.door.width / 2 && y < L.door.height) out.kind = 'door';
  } else if (plane === 'left' || plane === 'right') {
    out.nx = plane === 'left' ? 1 : -1;
    out.kind = W.wall === plane && inWindow(z) ? 'window' : 'wall';
  } else if (plane === 'far') {
    out.nz = 1;
    out.kind = W.wall === 'far' && inWindow(x) ? 'window' : 'wall';
  } else if (plane === 'floor') {
    out.kind = 'floor';
    out.ny = 1;
    out.walkable = standable(L, x, z);
  } else {
    out.kind = 'ceiling';
    out.ny = -1;
  }
  return out;
}
