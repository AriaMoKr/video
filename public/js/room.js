// The room: where everything in it is, and the questions asked of it every frame (where the viewer
// may walk, whether they have gone back through the doorway, what a ray points at). Pure functions
// with no three.js, so the tests run them in Node. Its size, the wall its window is in, and what
// hangs on its walls come from config.js.
//
// Coordinates: metres, y up, the floor at y = 0. The doorway's wall is the plane z = 0, with the
// doorway in it at x = 0, and the room runs along -z to the far wall. Facing in from the doorway,
// left is -x. A yaw of 0 faces -z (into the room); positive yaws turn left.
import { ID } from './config.js';

/** @type {(v: number, lo: number, hi: number) => number} */
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
/** @type {[id: string, x0: number, y0: number, x1: number, y1: number][]} */
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

/**
 * The button at (u, v) on the panel (0…1 from its bottom left, as castRay reports), or null.
 * @param {number} u
 * @param {number} v
 */
export function panelButtonAt(u, v) {
  const x = u * PANEL_PX.width, y = (1 - v) * PANEL_PX.height;
  for (const b of PANEL_BUTTONS) {
    if (x >= b[1] && x <= b[3] && y >= b[2] && y <= b[4]) return b[0];
  }
  return null;
}

/**
 * What hangs on the walls (config.js's pieces): a frame `frame` wide round each picture, standing
 * `depth` out from the wall, the picture's face `picture` out; its title on a label `label.height`
 * high, `label.gap` under the frame, or over it when under would be lower than `label.floor`, as
 * wide as the frame or `label.width`, whichever is wider. All clear of the `skirting`.
 */
export const PIECE = { frame: 0.05, depth: 0.045, picture: 0.025, label: { height: 0.075, gap: 0.05, width: 0.7, floor: 0.35 }, skirting: 0.12 };

/** The walls a piece can hang on: not the doorway's, which has the doorway and the panel. */
export const PIECE_WALLS = ['left', 'right', 'far'];

/** The smallest room the doorway, the panel and the window fit in, in metres. */
export const MIN_SIZE = { width: 3.2, depth: 3, height: 2.6 };
export const MAX_SIZE = { width: 40, depth: 40, height: 12 };

/**
 * A piece where it hangs: `along` its wall in the wall's own terms (world x on the far wall, z on the
 * side walls, as the window's), its middle (x, y, z), the wall's normal into the room (nx, nz), the
 * way to the right facing the wall (rx, rz), and its label's place.
 * @param {import('./config.js').Piece} p
 * @param {{ x0: number, x1: number, z1: number, depth: number }} box
 */
function placePiece(p, { x0, x1, z1, depth }) {
  const far = p.wall === 'far', left = p.wall === 'left';
  const along = far ? p.at : left ? -depth / 2 - p.at : -depth / 2 + p.at;
  const nx = far ? 0 : left ? 1 : -1, nz = far ? 1 : 0;
  const { frame: F, label: T } = PIECE;
  const bottom = p.y - p.height / 2 - F, top = p.y + p.height / 2 + F;
  const under = bottom - T.gap - T.height >= T.floor;
  const y0 = under ? bottom - T.gap - T.height : top + T.gap;
  return {
    id: p.id, wall: p.wall, along, x: far ? along : left ? x0 : x1, y: p.y, z: far ? z1 : along, nx, nz, rx: nz, rz: far ? 0 : -nx,
    width: p.width, height: p.height, title: p.title, image: p.image, link: p.link ?? null,
    label: { y0, y1: y0 + T.height, width: Math.max(p.width + 2 * F, T.width) },
  };
}

/**
 * Everything about the room the frame loop asks: its walls, the doorway (its size from the link,
 * else DOOR), the window, the panel, the lamps, what hangs on the walls, and where to arrive.
 * @param {{ size: { width: number, depth: number, height: number }, window: 'left'|'right'|'far', pieces?: import('./config.js').Piece[] }} room config.js's ROOM
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
  const pieces = (room.pieces ?? []).map((p) => placePiece(p, { x0, x1, z1, depth }));
  return { width, depth, height, x0, x1, z0: 0, z1, door, window: win, panel, lamps, pieces, spawn: { x: 0, z: -0.6, yaw: 0 } };
}

/** The room as layoutRoom lays it out, which the rest asks of. @typedef {ReturnType<typeof layoutRoom>} Layout */

/**
 * Where someone coming back out of piece i's link stands: in front of it, facing into the room.
 * @param {Layout} L
 * @param {number} i
 */
export function pieceSpawn(L, i) {
  const p = L.pieces[i], m = MARGIN + 0.05;
  return { x: clamp(p.x + p.nx * 0.9, L.x0 + m, L.x1 - m), z: clamp(p.z + p.nz * 0.9, L.z1 + m, -m), yaw: Math.atan2(-p.nx, -p.nz) };
}

/**
 * Where to stand to look at piece i, or go in by its link: `distance` in front of it, facing it.
 * @param {Layout} L
 * @param {number} i
 */
export function pieceFront(L, i, distance = 0.8) {
  const p = L.pieces[i], m = MARGIN + 0.05;
  return { x: clamp(p.x + p.nx * distance, L.x0 + m, L.x1 - m), z: clamp(p.z + p.nz * distance, L.z1 + m, -m), yaw: Math.atan2(p.nx, p.nz) };
}

/**
 * What is wrong with config.js's pieces, in words (none: []): each needs an id of its own, a wall
 * it can hang on, a size, a picture by a relative address, a title and a description on one line
 * each, and a link (if any) to an http(s) address without the door's parameters; and each, with its
 * frame and label, on its wall, over the skirting, under the ceiling, clear of the window and of
 * the others.
 * @param {Parameters<typeof layoutRoom>[0]} room
 */
export function pieceProblems(room) {
  const pieces = room.pieces ?? [];
  if (!Array.isArray(pieces)) return ['pieces is not a list'];
  /** @type {string[]} */
  const problems = [];
  const ids = new Set();
  for (const [i, p] of pieces.entries()) {
    const name = typeof p?.id === 'string' ? p.id : `piece ${i}`;
    /** @param {string} what */
    const say = (what) => problems.push(`${name}: ${what}`);
    if (typeof p?.id !== 'string' || !ID.test(p.id)) say('its id is not 1–32 of a–z, 0–9 and -');
    else if (p.id === 'hallway') say("its id is the Hallway's");
    else if (ids.has(p.id)) say('another piece has its id');
    ids.add(p?.id);
    if (!PIECE_WALLS.includes(p?.wall)) say(`its wall is not one of ${PIECE_WALLS.join(', ')}`);
    for (const k of /** @type {const} */ (['at', 'y', 'width', 'height'])) if (!Number.isFinite(p?.[k])) say(`its ${k} is not a number`);
    if (!(p?.width >= 0.1 && p?.height >= 0.1)) say('it is smaller than 10 cm');
    if (typeof p?.image !== 'string' || !p.image || /^([a-z][a-z0-9+.-]*:|\/)/i.test(p.image)) say('its image is not a relative address');
    for (const k of /** @type {const} */ (['title', 'description'])) if (typeof p?.[k] !== 'string' || !p[k].trim() || /\n/.test(p[k])) say(`its ${k} is not a line of text`);
    if (p?.link !== undefined) {
      let u = null;
      try {
        u = new URL(p.link);
      } catch {
        // said below
      }
      if (!u || !/^https?:$/.test(u.protocol)) say('its link is not an http(s) address');
      else if (['from', 'back', 'backname', 'room'].some((k) => u.searchParams.has(k))) say("its link has the door's own parameters in it");
    }
  }
  // Where they hang, once each is whole.
  if (problems.length) return problems;
  const L = layoutRoom(room);
  const span = { far: [L.x0, L.x1], left: [L.z1, 0], right: [L.z1, 0] };
  const W = L.window;
  const rects = L.pieces.map((p) => {
    const half = Math.max(p.width / 2 + PIECE.frame, p.label.width / 2);
    return { wall: p.wall, a0: p.along - half, a1: p.along + half, y0: Math.min(p.y - p.height / 2 - PIECE.frame, p.label.y0), y1: Math.max(p.y + p.height / 2 + PIECE.frame, p.label.y1) };
  });
  /** @type {(r: { a0: number, a1: number, y0: number, y1: number }, a0: number, a1: number, y0: number, y1: number) => boolean} */
  const overlap = (r, a0, a1, y0, y1) => r.a0 < a1 && r.a1 > a0 && r.y0 < y1 && r.y1 > y0;
  rects.forEach((r, i) => {
    /** @param {string} what */
    const say = (what) => problems.push(`${L.pieces[i].id}: ${what}`);
    const [s0, s1] = span[r.wall];
    if (r.a0 < s0 + 0.05 || r.a1 > s1 - 0.05) say('it, its frame or its label runs off its wall');
    if (r.y0 < PIECE.skirting) say('it, its frame or its label is down on the skirting');
    if (r.y1 > L.height - 0.05) say('it, its frame or its label is up in the ceiling');
    if (r.wall === W.wall && overlap(r, W.along - W.width / 2 - 0.14, W.along + W.width / 2 + 0.14, W.bottom - 0.06, W.top + 0.13)) say('it is over the window');
    rects.forEach((q, j) => {
      if (j > i && q.wall === r.wall && overlap(r, q.a0, q.a1, q.y0, q.y1)) say(`it is over ${L.pieces[j].id}`);
    });
  });
  return problems;
}

/**
 * Where someone coming in through the doorway stands: dx to the right of its middle (within its
 * jambs), turned by yaw (within a quarter turn).
 * @param {Layout} L
 */
export function doorSpawn(L, dx = 0, yaw = 0) {
  const jamb = Math.max(0, L.door.width / 2 - 0.25);
  return { x: clamp(dx, -jamb, jamb), z: L.spawn.z, yaw: clamp(yaw, -Math.PI / 2, Math.PI / 2) };
}

/**
 * The nearest place to (x, z) a head coming from (fx, fz) may be: inside the walls, `MARGIN` from
 * them, or in the doorway between its jambs (which the shoulders keep clear of), through to the
 * portal at the back of the wall. Writes { x, z } into out.
 * @param {Layout} L
 * @param {number} fx
 * @param {number} fz
 * @param {number} x
 * @param {number} z
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

/**
 * Whether a head at (x, z) has gone back through the doorway.
 * @param {Layout} L
 * @param {number} x
 * @param {number} z
 */
export function doorCrossed(L, x, z) {
  return Math.abs(x) < L.door.width / 2 && z > L.door.threshold;
}

/**
 * Whether (x, z) is somewhere to stand: inside the walls, MARGIN from them.
 * @param {Layout} L
 * @param {number} x
 * @param {number} z
 */
export function standable(L, x, z) {
  const m = MARGIN - 1e-9;
  return x >= L.x0 + m && x <= L.x1 - m && z >= L.z1 + m && z <= -m;
}

/**
 * What castRay writes: common's Hit (common/controls.js, what its walking reads), with u, v and piece.
 * @typedef {import('common/controls.js').Hit & { u: number, v: number, piece: number }} RoomHit
 */

/**
 * What a ray from inside the room reaches first: the doorway, the control panel, a piece on a wall,
 * the window, the floor, a wall or the ceiling. The room is a box, so this is where the ray leaves
 * it; from the doorway's reveal, the doorway is its back, where the portal is. Writes into out
 * { t, kind, x, y, z, nx, ny, nz, u, v, walkable, piece } (n: the surface's normal, into the room;
 * u, v: where on the panel or the piece's picture, 0…1 from its bottom left; walkable: for the
 * floor, whether one may stand there; piece: which of L.pieces, else -1) and returns it, or null
 * when the ray leaves through no surface.
 * @param {Layout} L
 * @param {number} ox
 * @param {number} oy
 * @param {number} oz
 * @param {number} dx
 * @param {number} dy
 * @param {number} dz
 * @param {RoomHit} out
 * @returns {RoomHit | null}
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
  out.piece = -1;
  const W = L.window;
  /** @param {number} along */
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
    if (out.kind === 'wall') hitPiece(L, plane, ox, oy, oz, dx, dy, dz, out);
  } else if (plane === 'far') {
    out.nz = 1;
    out.kind = W.wall === 'far' && inWindow(x) ? 'window' : 'wall';
    if (out.kind === 'wall') hitPiece(L, plane, ox, oy, oz, dx, dy, dz, out);
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

/**
 * A ray that reaches `wall` meets a piece there first when it passes through the piece's picture or
 * frame, whose face stands out from the wall: then out is the piece, where on the picture (u, v),
 * and the point on its face.
 * @param {Layout} L
 * @param {string} wall
 * @param {number} ox
 * @param {number} oy
 * @param {number} oz
 * @param {number} dx
 * @param {number} dy
 * @param {number} dz
 * @param {RoomHit} out
 */
function hitPiece(L, wall, ox, oy, oz, dx, dy, dz, out) {
  for (let i = 0; i < L.pieces.length; i++) {
    const p = L.pieces[i];
    if (p.wall !== wall) continue;
    // The plane of its face: PIECE.picture out from the wall, along the wall's normal.
    const s = p.nx ? (p.x + p.nx * PIECE.picture - ox) / dx : (p.z + p.nz * PIECE.picture - oz) / dz;
    if (!(s > 0)) continue;
    const x = ox + dx * s, y = oy + dy * s, z = oz + dz * s;
    const right = (x - p.x) * p.rx + (z - p.z) * p.rz, up = y - p.y;
    if (Math.abs(right) > p.width / 2 + PIECE.frame || Math.abs(up) > p.height / 2 + PIECE.frame) continue;
    out.kind = 'piece';
    out.piece = i;
    out.t = s;
    out.x = x;
    out.y = y;
    out.z = z;
    out.u = clamp(0.5 + right / p.width, 0, 1);
    out.v = clamp(0.5 + up / p.height, 0, 1);
    return;
  }
}
