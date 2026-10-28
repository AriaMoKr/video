// The room's four modes, and where everything in each one is: the furniture, the tapes on their
// shelves, the screens and the bars of buttons under them, the seats, the signs, and the room's own
// panel by the doorway (which mode, and what is showing). Pure functions with no three.js, so the
// tests run them in Node; and castRay and clampWalk as room.js has them, with the furniture in the
// way, which controls.js asks instead.
//   store      the video store (the first a visitor sees): every tape face out on shelves down the
//              left wall, a bay to a decade, a counter by the doorway, and a TV and a couch at the back
//   den        a console TV against the far wall, a sofa and a coffee table on a rug, and the tapes
//   screening  a screen across the far wall over a low stage, three rows of seats either side of an
//              aisle, the tapes by the doorway on both sides, and while a show plays the lights down
//              and the window's curtains drawn
//   gallery    a TV set of each decade's, styled for its time, each showing its decade's shows: using
//              one plays what it shows
// Furnished (furnish) into the layout's `furniture`, which castRay and clampWalk read. Coordinates as
// room.js's: the doorway's wall at z = 0, the room along -z, left is -x.
import { MARGIN, castRay as castRoomRay, clampWalk as clampRoomWalk, standable } from './room.js';

export const MODES = /** @type {const} */ (['store', 'den', 'screening', 'gallery']);
/** @typedef {typeof MODES[number]} Mode */
/** @type {Record<Mode, string>} */
export const MODE_NAMES = { store: 'Video store', den: 'Den', screening: 'Screening room', gallery: 'Decades gallery' };
export const DEFAULT_MODE = 'store';
const DECADES = ['1940s', '1950s', '1960s', '1970s'];

/** Seated, the eye on a screen is this high (in VR it is the headset's). */
export const SEATED_EYE = 1.15;

/**
 * The room's panel by the doorway, on the left as the control panel is on the right (room.js
 * PANEL's size): its canvas, and its buttons as [id, x0, y0, x1, y1] in canvas pixels (y down): the
 * four modes, then what is showing.
 */
export const ROOM_PANEL_PX = { width: 512, height: 768 };
/** @type {[id: string, x0: number, y0: number, x1: number, y1: number][]} */
export const ROOM_PANEL_BUTTONS = [
  ['room:mode:store', 32, 84, 250, 142],
  ['room:mode:den', 262, 84, 480, 142],
  ['room:mode:screening', 32, 154, 250, 212],
  ['room:mode:gallery', 262, 154, 480, 212],
  ['room:play', 32, 446, 250, 504],
  ['room:next', 262, 446, 480, 504],
  ['room:captions', 32, 516, 250, 574],
  ['room:stop', 262, 516, 480, 574],
];

/** The bar under a screen: its canvas (6:1, as every bar is), and its buttons, as the panel's. */
export const BAR_PX = { width: 768, height: 128 };
/** @type {[id: string, x0: number, y0: number, x1: number, y1: number][]} */
export const BAR_BUTTONS = [
  ['bar:play', 8, 60, 188, 122],
  ['bar:next', 200, 60, 380, 122],
  ['bar:captions', 392, 60, 572, 122],
  ['bar:stop', 584, 60, 760, 122],
];

/** The button at (u, v) (0…1 from the bottom left) of a canvas `px` with `buttons`, or null. */
function buttonAt(buttons, px, u, v) {
  const x = u * px.width, y = (1 - v) * px.height;
  for (const b of buttons) {
    if (x >= b[1] && x <= b[3] && y >= b[2] && y <= b[4]) return b[0];
  }
  return null;
}
export const roomPanelButtonAt = (u, v) => buttonAt(ROOM_PANEL_BUTTONS, ROOM_PANEL_PX, u, v);
export const barButtonAt = (u, v) => buttonAt(BAR_BUTTONS, BAR_PX, u, v);

/**
 * @typedef {{ kind: string, id: string | number, use: string | null, axis: 'x' | 'z', at: number, facing: 1 | -1,
 *   a0: number, a1: number, y0: number, y1: number }} Face
 *   a rectangle on a wall-like plane, facing into the room: on x = at (axis 'x') or z = at (axis
 *   'z'), its normal along +axis (facing 1) or -axis (-1), from a0 to a1 along the other horizontal
 *   axis (z or x) and y0 to y1 up; `use` is what using it does (controls.js), null for nothing
 * @typedef {{ min: number[], max: number[], material: string, solid?: boolean, visible?: boolean, use?: string }} Box
 *   solid: it stops a ray (true unless false); visible: it is drawn (true unless false); use: a seat's
 * @typedef {{ minX: number, maxX: number, minZ: number, maxZ: number }} Rect where one may not walk (MARGIN from it)
 * @typedef {{ x: number, z: number, yaw: number, out: [number, number] }} Seat where one sits, facing which way, and where one stands up to
 * @typedef {{ id: string, decade: string | null, face: Face, bar: Face }} Screen
 * @typedef {{ mode: Mode, boxes: Box[], obstacles: Rect[], faces: Face[], tapes: { episode: number, face: Face }[],
 *   screens: Screen[], signs: { text: string, face: Face }[], seats: Seat[], panel: Face, bar: Face | null,
 *   curtain: boolean, dim: number }} Furniture
 *   bar: the bar of the screen in use, which castRay asks (none in the gallery until a set plays);
 *   curtain: whether the window's curtains close while a show plays; dim: how far the lights go down then
 */

/** @returns {Face} */
function face(kind, id, use, axis, at, facing, a0, a1, y0, y1) {
  return { kind, id, use, axis, at, facing, a0: Math.min(a0, a1), a1: Math.max(a0, a1), y0, y1 };
}

/**
 * Where a face is, for drawing it: its middle, size, and the turn that faces something made facing
 * +z the way it faces; `right` is the way to its right as one looks at it. Pure.
 * @param {Face} f
 */
export function faceFrame(f) {
  const n = f.axis === 'x' ? [f.facing, 0, 0] : [0, 0, f.facing];
  const yaw = Math.atan2(n[0], n[2]);
  const mid = (f.a0 + f.a1) / 2, y = (f.y0 + f.y1) / 2;
  return {
    center: f.axis === 'x' ? [f.at, y, mid] : [mid, y, f.at],
    width: f.a1 - f.a0,
    height: f.y1 - f.y0,
    yaw,
    normal: n,
    right: [Math.cos(yaw), 0, -Math.sin(yaw)],
  };
}

/**
 * A wall's frame for laying things against it: `a` along it, `d` out from it into the room. box()
 * is a box in it, face() a face standing `d` out from the wall.
 */
function wall(L, name) {
  const W = {
    left: { axis: 'x', facing: 1, x: (a, d) => L.x0 + d, z: (a) => a },
    right: { axis: 'x', facing: -1, x: (a, d) => L.x1 - d, z: (a) => a },
    far: { axis: 'z', facing: 1, x: (a) => a, z: (a, d) => L.z1 + d },
  }[name];
  return {
    ...W,
    /** @returns {Box} */
    box(a0, a1, d0, d1, y0, y1, material, more = {}) {
      const xs = [W.x(a0, d0), W.x(a1, d1)], zs = [W.z(a0, d0), W.z(a1, d1)];
      return { min: [Math.min(...xs), y0, Math.min(...zs)], max: [Math.max(...xs), y1, Math.max(...zs)], material, ...more };
    },
    face(kind, id, use, d, a0, a1, y0, y1) {
      return face(kind, id, use, /** @type {'x'|'z'} */ (W.axis), W.axis === 'x' ? W.x(0, d) : W.z(0, d), /** @type {1|-1} */ (W.facing), a0, a1, y0, y1);
    },
  };
}

/** The floor a box stands on, as a rect to walk round. @returns {Rect} */
const footprint = (b) => ({ minX: b.min[0], maxX: b.max[0], minZ: b.min[2], maxZ: b.max[2] });

/** A bar under a screen, `width` wide (6:1), its bottom at y0, on the face's plane. */
function barFace(screenId, f, width, y0, along = (f.a0 + f.a1) / 2) {
  return face('bar', screenId, null, f.axis, f.at, f.facing, along - width / 2, along + width / 2, y0, y0 + width / 6);
}

/** The tapes' shelves: one deep, the tapes face out on them, a row every rowH from `bottom`. */
export const SHELF = { depth: 0.34, tapeW: 0.22, tapeH: 0.3, pitch: 0.27, pad: 0.08, rowH: 0.4, bottom: 0.36, board: 0.03 };

/**
 * Shelves of tapes against a side wall from zStart on along -z, a bay to a decade with its sign
 * over it, holding the tapes of `decades`, in their order as one reads them facing the wall (left
 * to right, row by row). Returns where they end (the far z).
 */
function shelves(L, F, episodes, { side = 'left', zStart, rows = 4, decades = DECADES }) {
  const w = wall(L, side);
  const top = SHELF.bottom + rows * SHELF.rowH + 0.04;
  // Facing the left wall, left to right runs along -z; facing the right wall, along +z: there the
  // first bay is the far one.
  const bays = decades.map((decade) => ({ decade, eps: episodes.map((e, i) => ({ e, i })).filter(({ e }) => e.decade === decade) })).filter((b) => b.eps.length);
  let z = zStart;
  const placed = [];
  for (const bay of side === 'left' ? bays : [...bays].reverse()) {
    const cols = Math.ceil(bay.eps.length / rows);
    const length = cols * SHELF.pitch + 2 * SHELF.pad;
    placed.push({ ...bay, cols, near: z, far: z - length });
    z -= length;
  }
  for (const { decade, eps, cols, near, far } of placed) {
    const left = side === 'left' ? near : far; // the bay's end on one's left, facing it
    const step = side === 'left' ? -1 : 1;
    eps.forEach(({ i }, k) => {
      const row = Math.floor(k / cols), col = k % cols;
      const mid = left + step * (SHELF.pad + (col + 0.5) * SHELF.pitch);
      const y0 = SHELF.bottom + (rows - 1 - row) * SHELF.rowH;
      const f = w.face('tape', i, `tape:${i}`, SHELF.depth + 0.004, mid - SHELF.tapeW / 2, mid + SHELF.tapeW / 2, y0, y0 + SHELF.tapeH);
      F.tapes.push({ episode: i, face: f });
      F.faces.push(f);
    });
    // The bay: its back, ends, boards and top, drawn; one box in the way of rays.
    F.boxes.push(w.box(far, near, 0, SHELF.depth, 0, top, 'shelf', { visible: false }));
    F.boxes.push(w.box(far, near, 0, 0.015, 0, top, 'shelfBack', { solid: false }));
    for (const a of [near, far]) F.boxes.push(w.box(a - 0.0125, a + 0.0125, 0, SHELF.depth, 0, top, 'shelf', { solid: false }));
    for (let r = 0; r <= rows; r++) {
      const y = r === rows ? top - SHELF.board : SHELF.bottom + r * SHELF.rowH - SHELF.board;
      F.boxes.push(w.box(far, near, 0, SHELF.depth, Math.max(0, y), y + SHELF.board, 'shelf', { solid: false }));
    }
    F.boxes.push(w.box(far, near, SHELF.depth - 0.02, SHELF.depth, 0, Math.max(SHELF.bottom - SHELF.board, 0.08), 'shelfBack', { solid: false })); // the plinth
    const mid = (near + far) / 2, half = Math.min(0.42, (near - far) / 2 - 0.03);
    F.signs.push({ text: decade, face: w.face('sign', decade, null, 0.012, mid - half, mid + half, top + 0.06, top + 0.06 + half / 2) });
    F.obstacles.push(footprint(w.box(far, near, 0, SHELF.depth, 0, top, 'shelf')));
  }
  return z;
}

/** A seat: where one sits (yaw set by facing()), where one stands up to, and its boxes, which using sits on it. */
function seat(F, x, z, out, ...boxes) {
  for (const box of boxes) box.use = `seat:${F.seats.length}`;
  F.seats.push({ x, z, yaw: 0, out });
  F.boxes.push(...boxes);
}

/**
 * A couch or a sofa facing -z, from x0 to x1: to each of `places` (the seats' x) its cushion and
 * its piece of the back, the arms the end ones', and the rect round it. One stands up behind it,
 * the way one came.
 */
function couch(F, x0, x1, zFront, zBack, material, places) {
  const back = zBack + 0.22;
  places.forEach((x, i) => {
    const a = i ? (places[i - 1] + x) / 2 : x0, b = i < places.length - 1 ? (x + places[i + 1]) / 2 : x1;
    const arms = [i === 0 && [x0, x0 + 0.2], i === places.length - 1 && [x1 - 0.2, x1]].filter(Boolean)
      .map(([p, q]) => ({ min: [p, 0, zFront], max: [q, 0.62, back], material }));
    seat(F, x, (zFront + zBack) / 2 + 0.05, [x, back + MARGIN + 0.05],
      { min: [a, 0, zFront], max: [b, 0.43, zBack], material }, { min: [a, 0, zBack - 0.01], max: [b, 0.9, back], material }, ...arms);
  });
  F.obstacles.push({ minX: x0, maxX: x1, minZ: zFront, maxZ: back });
}

/** Seats `seats` face what they look at: (tx, tz). */
function facing(seats, tx, tz) {
  for (const s of seats) s.yaw = Math.atan2(-(tx - s.x), -(tz - s.z));
}

/** @type {Record<Mode, (L: any, F: Furniture, episodes: { decade: string }[]) => void>} */
const BUILD = {
  store(L, F, episodes) {
    shelves(L, F, episodes, { side: 'left', zStart: -1.0, rows: 4 });
    // The counter, on the right as one comes in, and the store's sign on the wall over it.
    const r = wall(L, 'right');
    const counter = r.box(-2.25, -1.05, 0.3, 0.95, 0, 0.98, 'counter');
    F.boxes.push(counter, r.box(-2.3, -1.0, 0.26, 0.99, 0.98, 1.03, 'dark', { solid: false }), r.box(-1.62, -1.32, 0.5, 0.78, 1.03, 1.21, 'metal'));
    F.obstacles.push(footprint(counter));
    F.signs.push({ text: 'Classic TV', face: r.face('sign', 'store', null, 0.012, -2.35, -0.95, 1.72, 2.07) });
    // The TV at the back on its stand, and the couch in front of it on a rug.
    const back = L.z1;
    F.boxes.push({ min: [0.55, 0, back], max: [2.05, 0.5, back + 0.5], material: 'dark' });
    F.boxes.push({ min: [0.7, 0.5, back + 0.05], max: [1.9, 1.58, back + 0.62], material: 'plastic' });
    F.boxes.push({ min: [0.1, 0, -6.3], max: [2.6, 0.008, -3.6], material: 'rug', solid: false });
    F.obstacles.push({ minX: 0.55, maxX: 2.05, minZ: back, maxZ: back + 0.62 });
    const screen = face('screen', 'main', 'screen:main', 'z', back + 0.623, 1, 0.86, 1.74, 0.84, 1.5);
    F.screens.push({ id: 'main', decade: null, face: screen, bar: barFace('main', screen, 1.02, 0.58) });
    couch(F, 0.3, 2.3, -4.75, -4.0, 'couch', [0.95, 1.65]);
    facing(F.seats, 1.3, back + 0.62);
  },

  den(L, F, episodes) {
    shelves(L, F, episodes, { side: 'left', zStart: -1.2, rows: 4 });
    const back = L.z1;
    // The console: a cabinet on short legs, the screen above the speaker's grille.
    for (const x of [-0.72, 0.66]) for (const z of [back + 0.04, back + 0.48]) F.boxes.push({ min: [x, 0, z], max: [x + 0.06, 0.12, z + 0.06], material: 'dark', solid: false });
    F.boxes.push({ min: [-0.78, 0.12, back], max: [0.78, 1.22, back + 0.56], material: 'walnut' });
    F.boxes.push({ min: [-0.62, 0.17, back + 0.56], max: [0.62, 0.44, back + 0.565], material: 'grille', solid: false });
    F.obstacles.push({ minX: -0.78, maxX: 0.78, minZ: back, maxZ: back + 0.56 });
    const screen = face('screen', 'main', 'screen:main', 'z', back + 0.568, 1, -0.42, 0.42, 0.5, 1.13);
    F.screens.push({ id: 'main', decade: null, face: screen, bar: barFace('main', screen, 1.14, 0.22) });
    F.boxes.push({ min: [-1.5, 0, -6.25], max: [1.5, 0.008, -3.55], material: 'rug', solid: false });
    // The coffee table: its top on four legs, and one box in the way.
    F.boxes.push({ min: [-0.5, 0.38, -5.5], max: [0.5, 0.42, -5.0], material: 'walnut', solid: false });
    for (const x of [-0.47, 0.43]) for (const z of [-5.47, -5.07]) F.boxes.push({ min: [x, 0, z], max: [x + 0.04, 0.38, z + 0.04], material: 'walnut', solid: false });
    F.boxes.push({ min: [-0.5, 0, -5.5], max: [0.5, 0.42, -5.0], material: 'walnut', visible: false });
    F.obstacles.push({ minX: -0.5, maxX: 0.5, minZ: -5.5, maxZ: -5.0 });
    couch(F, -1.05, 1.05, -4.65, -3.9, 'sofa', [-0.45, 0.45]);
    facing(F.seats, 0, back + 0.56);
    // A standard lamp at the sofa's end.
    F.boxes.push({ min: [1.32, 0, -4.33], max: [1.38, 1.48, -4.27], material: 'metal' });
    F.boxes.push({ min: [1.17, 1.45, -4.48], max: [1.53, 1.75, -4.12], material: 'shade' });
    F.obstacles.push({ minX: 1.2, maxX: 1.5, minZ: -4.45, maxZ: -4.15 });
  },

  screening(L, F, episodes) {
    // The tapes either side of the way in: the 1940s and 1950s on the left, the 1960s and 1970s on the right.
    shelves(L, F, episodes, { side: 'left', zStart: -0.75, rows: 6, decades: ['1940s', '1950s'] });
    shelves(L, F, episodes, { side: 'right', zStart: -0.75, rows: 6, decades: ['1960s', '1970s'] });
    const back = L.z1;
    F.boxes.push({ min: [-2.4, 0, back], max: [2.4, 0.3, back + 0.6], material: 'stage' });
    F.boxes.push({ min: [-1.58, 0.58, back], max: [1.58, Math.min(3.04, L.height - 0.08), back + 0.03], material: 'black' });
    F.obstacles.push({ minX: -2.4, maxX: 2.4, minZ: back, maxZ: back + 0.6 });
    const top = Math.min(2.86, L.height - 0.2), height = Math.min(2.16, top - 0.7);
    const screen = face('screen', 'main', 'screen:main', 'z', back + 0.033, 1, -height * (2 / 3), height * (2 / 3), top - height, top);
    // Its bar on the stage's front, below it.
    F.screens.push({ id: 'main', decade: null, face: screen, bar: face('bar', 'main', null, 'z', back + 0.603, 1, -0.6, 0.6, 0.05, 0.25) });
    // Three rows of seats either side of the aisle.
    for (const zc of [-2.95, -3.95, -4.95]) {
      for (const s of [-1, 1]) {
        for (const c of [1.05, 1.65, 2.25]) {
          const x = s * c;
          seat(F, x, zc - 0.04, [s * 0.42, zc], { min: [x - 0.28, 0, zc - 0.27], max: [x + 0.28, 0.44, zc + 0.2], material: 'seat' },
            { min: [x - 0.29, 0, zc + 0.2], max: [x + 0.29, 0.98, zc + 0.32], material: 'seat' });
        }
        F.obstacles.push({ minX: s < 0 ? -2.54 : 0.76, maxX: s < 0 ? -0.76 : 2.54, minZ: zc - 0.27, maxZ: zc + 0.32 });
      }
    }
    facing(F.seats, 0, back);
    F.curtain = true;
    F.dim = 0.3;
  },

  gallery(L, F, episodes) {
    // A set to a decade (of those with episodes), each as sets were then: [cabinet: width, depth,
    // bottom, top], its legs, [screen: width, bottom], [bar: width, bottom], and what it is made of.
    const STYLES = {
      '1940s': { cab: [0.8, 0.5, 0.1, 1.28], screen: [0.36, 0.86], bar: [0.72, 0.62], material: 'walnut' },
      '1950s': { cab: [0.98, 0.5, 0.2, 1.06], screen: [0.52, 0.6], bar: [0.84, 0.32], material: 'oak' },
      '1960s': { cab: [1.2, 0.45, 0.3, 1.12], screen: [0.64, 0.58], bar: [0.96, 0.36], material: 'teak' },
      '1970s': { cab: [0.8, 0.52, 0.5, 1.16], screen: [0.6, 0.6], bar: [0.72, 0.24], material: 'woodgrain', cart: true },
    };
    /** @type {[decade: string, side: 'left' | 'far', along: number][]} */
    const PLACES = [['1940s', 'left', -2.1], ['1950s', 'left', -4.7], ['1960s', 'far', -1.35], ['1970s', 'far', 1.35]];
    for (const [decade, side, along] of PLACES) {
      if (!episodes.some((e) => e.decade === decade)) continue;
      const st = STYLES[decade], w = wall(L, side);
      const [cw, cd, y0, y1] = st.cab, a0 = along - cw / 2, a1 = along + cw / 2;
      F.boxes.push(w.box(a0, a1, 0.02, 0.02 + cd, y0, y1, st.material));
      // Its legs, or its cart: a shelf low down on chrome posts.
      if (st.cart) {
        F.boxes.push(w.box(a0 + 0.02, a1 - 0.02, 0.04, cd, 0.12, 0.46, st.material));
        for (const a of [a0 + 0.03, a1 - 0.05]) for (const d of [0.05, cd - 0.02]) F.boxes.push(w.box(a, a + 0.02, d, d + 0.02, 0, 0.5, 'chrome', { solid: false }));
      } else {
        const t = decade === '1960s' ? 0.035 : 0.05;
        for (const a of [a0 + 0.04, a1 - 0.04 - t]) for (const d of [0.06, cd - 0.04]) F.boxes.push(w.box(a, a + t, d, d + t, 0, y0, 'dark', { solid: false }));
        F.boxes.push(w.box(a0, a1, 0.02, 0.02 + cd, 0, y0, st.material, { visible: false }));
      }
      const front = 0.02 + cd + 0.003;
      const [sw, sy] = st.screen;
      const screen = w.face('screen', decade, `screen:${decade}`, front, along - sw / 2, along + sw / 2, sy, sy + sw * 0.75);
      const [bw, by] = st.bar;
      F.screens.push({ id: decade, decade, face: screen, bar: barFace(decade, screen, bw, by) });
      F.signs.push({ text: decade, face: w.face('sign', decade, null, 0.012, along - 0.44, along + 0.44, 1.62, 1.84) });
      F.obstacles.push(footprint(w.box(a0, a1, 0, 0.02 + cd, 0, y1, st.material)));
    }
    // A bench in the middle, facing the far wall's sets: its top on legs, and a box to each seat.
    F.boxes.push({ min: [-0.9, 0.4, -3.95], max: [0.9, 0.45, -3.55], material: 'oak', solid: false });
    for (const x of [-0.85, 0.79]) F.boxes.push({ min: [x, 0, -3.92], max: [x + 0.06, 0.4, -3.58], material: 'dark', solid: false });
    for (const x of [-0.45, 0.45]) seat(F, x, -3.75, [x, -3.55 + MARGIN + 0.1], { min: [x - 0.45, 0, -3.95], max: [x + 0.45, 0.45, -3.55], material: 'oak', visible: false });
    F.obstacles.push({ minX: -0.9, maxX: 0.9, minZ: -3.95, maxZ: -3.55 });
    facing(F.seats, 0, L.z1);
  },
};

/**
 * The room furnished as `mode` (else the default), for the layout L (room.js layoutRoom) and the
 * episodes (catalogue.js), whose tapes it shelves by decade. Set it as L.furniture for castRay and
 * clampWalk to see it.
 * @returns {Furniture}
 */
export function furnish(L, mode, episodes) {
  const m = /** @type {Mode} */ (MODES.includes(mode) ? mode : DEFAULT_MODE);
  const P = L.panel;
  /** @type {Furniture} */
  const F = {
    mode: m, boxes: [], obstacles: [], faces: [], tapes: [], screens: [], signs: [], seats: [], bar: null, curtain: false, dim: 1,
    // On the doorway's wall to the left of the doorway, as the control panel is to its right.
    panel: face('roompanel', 'room', null, 'z', -P.depth, -1, -P.x - P.width / 2, -P.x + P.width / 2, P.y - P.height / 2, P.y + P.height / 2),
  };
  F.faces.push(F.panel);
  BUILD[m](L, F, episodes);
  for (const s of F.screens) F.faces.push(s.face);
  F.bar = F.screens.find((s) => s.id === 'main')?.bar ?? null;
  return F;
}

/** The screen an episode plays on: the main one, or in the gallery its decade's set (null if none). */
export function screenFor(F, episode) {
  return F.screens.find((s) => s.id === 'main') ?? F.screens.find((s) => s.decade === episode?.decade) ?? null;
}

/** Whether (x, z) is in the way of furniture (within MARGIN of it). */
export function blocked(F, x, z) {
  for (const r of F.obstacles) {
    if (x > r.minX - MARGIN && x < r.maxX + MARGIN && z > r.minZ - MARGIN && z < r.maxZ + MARGIN) return true;
  }
  return false;
}

/**
 * room.js clampWalk, and round the furniture (L.furniture): a walk into it stops MARGIN from it on
 * the side it came from, sliding along it; one already in it (a mode changed under them) is put out
 * on its nearest side, or, where that is in something else (between rows of seats), at the nearest
 * place clear of it all.
 */
export function clampWalk(L, fx, fz, x, z, out = { x: 0, z: 0 }) {
  clampRoomWalk(L, fx, fz, x, z, out);
  const F = L.furniture;
  if (!F) return out;
  for (let pass = 0; pass < 3; pass++) {
    let moved = false;
    for (const r of F.obstacles) {
      const minX = r.minX - MARGIN, maxX = r.maxX + MARGIN, minZ = r.minZ - MARGIN, maxZ = r.maxZ + MARGIN;
      if (out.x <= minX || out.x >= maxX || out.z <= minZ || out.z >= maxZ) continue;
      const outX = fx <= minX || fx >= maxX, outZ = fz <= minZ || fz >= maxZ;
      // How far back to each side: the nearest way out, or the way it came in.
      const dx = fx <= minX || (!outX && out.x - minX < maxX - out.x) ? minX - out.x : maxX - out.x;
      const dz = fz <= minZ || (!outZ && out.z - minZ < maxZ - out.z) ? minZ - out.z : maxZ - out.z;
      if (outX && !outZ) out.x += dx;
      else if (outZ && !outX) out.z += dz;
      else if (Math.abs(dx) <= Math.abs(dz)) out.x += dx;
      else out.z += dz;
      moved = true;
    }
    if (!moved) break;
    clampRoomWalk(L, fx, fz, out.x, out.z, out);
  }
  if (!blocked(F, out.x, out.z)) return out;
  const x0 = out.x, z0 = out.z;
  for (let r = 0.1; r <= 8; r += 0.1) {
    for (let k = 0; k < 24; k++) {
      const a = (k / 12) * Math.PI, x = x0 + r * Math.cos(a), z = z0 + r * Math.sin(a);
      if (standable(L, x, z) && !blocked(F, x, z)) {
        out.x = x;
        out.z = z;
        return out;
      }
    }
  }
  return out;
}

// What castRay found nearest in the furniture, kept here so it allocates nothing.
let nearT = 0, nearFace = /** @type {Face | null} */ (null), nearBox = /** @type {Box | null} */ (null), nearAxis = 0, nearSign = 0;

/** Where a ray meets a face from in front, or -1. */
function meetFace(f, ox, oy, oz, dx, dy, dz) {
  const o = f.axis === 'x' ? ox : oz, d = f.axis === 'x' ? dx : dz;
  if (d * f.facing >= 0) return -1; // from behind it, or along it
  const s = (f.at - o) / d;
  if (s <= 0) return -1;
  const y = oy + dy * s;
  if (y < f.y0 || y > f.y1) return -1;
  const a = f.axis === 'x' ? oz + dz * s : ox + dx * s;
  return a < f.a0 || a > f.a1 ? -1 : s;
}

/**
 * room.js castRay, with the furniture (L.furniture) in the way: what a ray reaches first. Besides
 * room.js's kinds: 'tape', 'screen', 'bar', 'roompanel' or 'sign' (a face: `id` is its id, and u, v
 * where on it, 0…1 from its bottom left), 'seat' or 'furniture' (a box); `use` is what using it
 * does (a face's or a seat's), or null; and the floor is walkable only clear of the furniture.
 * Writes into out (which needs `id` and `use` too) and returns it, or null.
 */
export function castRay(L, ox, oy, oz, dx, dy, dz, out) {
  const hit = castRoomRay(L, ox, oy, oz, dx, dy, dz, out);
  if (hit) hit.id = hit.use = null;
  const F = L.furniture;
  if (!F) return hit;
  nearT = hit ? hit.t : Infinity;
  nearFace = nearBox = null;
  for (let i = 0; i < F.boxes.length; i++) {
    const b = F.boxes[i];
    if (b.solid === false) continue;
    let tmin = -Infinity, tmax = Infinity, axis = -1, sign = 0;
    for (let k = 0; k < 3 && tmin <= tmax; k++) {
      const o = k === 0 ? ox : k === 1 ? oy : oz, d = k === 0 ? dx : k === 1 ? dy : dz;
      if (Math.abs(d) < 1e-12) {
        if (o < b.min[k] || o > b.max[k]) tmin = Infinity;
        continue;
      }
      let t1 = (b.min[k] - o) / d, t2 = (b.max[k] - o) / d, s = -1; // in through its min face: the normal is -axis
      if (t1 > t2) {
        const swap = t1;
        t1 = t2;
        t2 = swap;
        s = 1;
      }
      if (t1 > tmin) {
        tmin = t1;
        axis = k;
        sign = s;
      }
      if (t2 < tmax) tmax = t2;
    }
    if (tmin <= tmax && tmin > 0 && tmin < nearT) {
      nearT = tmin;
      nearBox = b;
      nearAxis = axis;
      nearSign = sign;
    }
  }
  for (let i = 0; i <= F.faces.length; i++) {
    const f = i < F.faces.length ? F.faces[i] : F.bar;
    if (!f) continue;
    const s = meetFace(f, ox, oy, oz, dx, dy, dz);
    if (s > 0 && s <= nearT + 1e-4) {
      nearT = s;
      nearFace = f;
      nearBox = null;
    }
  }
  if (!nearFace && !nearBox) {
    if (hit?.kind === 'floor' && hit.walkable && blocked(F, hit.x, hit.z)) hit.walkable = false;
    return hit;
  }
  out.t = nearT;
  out.x = ox + dx * nearT;
  out.y = oy + dy * nearT;
  out.z = oz + dz * nearT;
  out.walkable = false;
  out.u = out.v = 0;
  out.nx = out.ny = out.nz = 0;
  if (nearFace) {
    const f = nearFace;
    out.kind = f.kind;
    out.id = f.id;
    out.use = f.use;
    if (f.axis === 'x') out.nx = f.facing;
    else out.nz = f.facing;
    // u from its left as one faces it: facing +x, its left is +z; facing -x, -z; facing +z, -x; facing -z, +x.
    const a = f.axis === 'x' ? out.z : out.x;
    const fromLeft = (f.axis === 'x') === (f.facing > 0) ? f.a1 - a : a - f.a0;
    out.u = fromLeft / (f.a1 - f.a0);
    out.v = (out.y - f.y0) / (f.y1 - f.y0);
  } else {
    out.kind = nearBox.use ? 'seat' : 'furniture';
    out.id = null;
    out.use = nearBox.use ?? null;
    if (nearAxis === 0) out.nx = nearSign;
    else if (nearAxis === 1) out.ny = nearSign;
    else out.nz = nearSign;
  }
  return out;
}
