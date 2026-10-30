// Moving about the room: common's Controls (common/controls.js), the walking the hallway, outside
// and the rooms share, on every device (its README's table): a drag to look, the keys, a click or a
// tap, a gamepad, a TV's remote (main.js gives it useMiddle, and sets aimMiddle), and in VR the hands
// and the sticks, with less motion, seated mode and the vignette's speeds. Here is the room's own:
//   its walls, its furniture and what a ray meets: modes.js's clampWalk and castRay on its layout
//     (room.js's, with the mode's furniture in the way), the hit with where on the panel, a picture
//     or a face (u, v), which piece, which thing (id) and what using it does (use): the `hit` option
//   the control panel: a button pressed is onPanel(id), and the one pointed at hoverPanel
//   the pieces on the walls: one chosen is onPiece(i, how), the one pointed at hoverPiece, and a
//     hand's reticle on one is 1.3 times its size
//   the room's things in every mode (modes.js): a tape, a screen, the bar under it, the room's panel
//     and a seat; one used is onThing(use, how) ('tape:3', 'screen:main', 'seat:0', 'room:play',
//     'bar:next'), and the one pointed at hoverKind and hoverId
//   the seats: sit(seat, pitch) sits the viewer down facing the screen (in VR the head onto the
//     seat, as high above it as a seated head is), and stand() gets them up beside it (its `out`),
//     as common's walks, keys, gamepad, sticks and teleports do first; settle() after a mode change
//   the walks through the doorway (walkInto) and up to a piece (walkUpTo; in VR a teleport), each
//     standing up first
// What a click, a tap, A, OK or a trigger is on comes to use(hit, how): the panel, the pieces and the
// things here, and common's the doorway (onDoor) and the floor (a walk there, in VR a teleport).
import { Controls as Walking } from 'common/controls.js';
import { EYE, panelButtonAt, pieceFront } from './room.js';
import { SEATED_EYE, barButtonAt, castRay, clampWalk, roomPanelButtonAt } from './modes.js';

/** @typedef {import('./modes.js').VideoHit} VideoHit */
/** @typedef {import('./modes.js').Seat} Seat */
/** @typedef {import('common/controls.js').How} How */

/** @type {(v: number, lo: number, hi: number) => number} */
const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
/** @type {(a: number) => number} */
const wrapAngle = (a) => Math.atan2(Math.sin(a), Math.cos(a));
const PITCH = 1.35; // how far up or down the view looks on a screen, as common's

/**
 * Walking about the room, with its control panel, the pictures on its walls, and the furniture,
 * tapes, screens and seats of its mode.
 * @extends {Walking<VideoHit>}
 */
export class Controls extends Walking {
  /**
   * @param {Omit<import('common/controls.js').ControlsOptions<VideoHit>, 'eye' | 'hit'> & { layout: import('./modes.js').VideoLayout }} options
   *   common's, and the room's layout (room.js layoutRoom, furnished by modes.js furnish)
   */
  constructor({ layout, ...options }) {
    super({ ...options, eye: EYE, hit: () => ({ t: 0, kind: '', id: null, use: null, x: 0, y: 0, z: 0, nx: 0, ny: 0, nz: 0, u: 0, v: 0, walkable: false, piece: -1 }) });
    this.layout = layout; // after super(): common's constructor calls none of the methods below
    /** The control panel's button pointed at, or null. @type {string | null} */
    this.hoverPanel = null;
    /** What hangs on the walls pointed at: its index in layout.pieces, else -1. */
    this.hoverPiece = -1;
    /** What kind of thing the usable one pointed at is (castRay's kind: 'tape', 'roompanel', …), or null. @type {string | null} */
    this.hoverKind = null;
    /** Its id there (a face's: a tape's episode, a screen's id), or null. @type {string | number | null} */
    this.hoverId = null;
    /** The seat sat on (modes.js Seat), or null. @type {Seat | null} */
    this.seat = null;
    /** (button id) when a button of the control panel is pressed. @type {(id: string) => void} */
    this.onPanel = () => {};
    /** (i, how) when piece i on a wall (layout.pieces) is chosen. @type {(i: number, how: How) => void} */
    this.onPiece = () => {};
    /**
     * (use, how) when one of the room's things is used: a tape ('tape:3'), a screen ('screen:main'),
     * a seat ('seat:0'), or a button of the room's panel or a bar ('room:play', 'bar:next').
     * @type {(use: string, how: How) => void}
     */
    this.onThing = () => {};
  }

  /**
   * What a ray meets first in the room and its furniture (modes.js castRay), with u, v, piece, id
   * and use.
   * @param {number} ox
   * @param {number} oy
   * @param {number} oz
   * @param {number} dx
   * @param {number} dy
   * @param {number} dz
   * @param {VideoHit} out
   */
  castRay(ox, oy, oz, dx, dy, dz, out) {
    return castRay(this.layout, ox, oy, oz, dx, dy, dz, out);
  }

  /**
   * The room's walls and the doorway between its jambs, and round the furniture (modes.js clampWalk).
   * @param {number} fx
   * @param {number} fz
   * @param {number} x
   * @param {number} z
   * @param {{ x: number, z: number }} out
   */
  clampWalk(fx, fz, x, z, out) {
    return clampWalk(this.layout, fx, fz, x, z, out);
  }

  /**
   * What could be used where a hit is: a button's id (the control panel's, the room panel's or a
   * bar's), 'piece', a thing's use ('tape:3', 'seat:0', …), or common's ('door').
   * @param {VideoHit | null} hit
   */
  usable(hit) {
    if (!hit) return null;
    if (hit.kind === 'panel') return panelButtonAt(hit.u, hit.v);
    if (hit.kind === 'roompanel') return roomPanelButtonAt(hit.u, hit.v);
    if (hit.kind === 'bar') return barButtonAt(hit.u, hit.v);
    if (hit.kind === 'piece') return 'piece';
    return super.usable(hit) ?? hit.use;
  }

  /**
   * Uses what a hit is on: a panel button, a piece on a wall, one of the room's things (onThing), or
   * common's (the doorway, the floor).
   * @param {VideoHit | null} hit
   * @param {How} how
   */
  use(hit, how) {
    if (hit?.kind === 'panel') this._press(panelButtonAt(hit.u, hit.v));
    else if (hit?.kind === 'piece') this.onPiece(hit.piece, how);
    else if (hit && (hit.kind === 'roompanel' || hit.kind === 'bar' || hit.use)) {
      const use = this.usable(hit);
      if (use) this.onThing(use, how);
    } else super.use(hit, how);
  }

  /**
   * @protected
   * @param {string | null} usable
   * @param {VideoHit | null} hit
   */
  _setHover(usable, hit) {
    super._setHover(usable, hit);
    this.hoverPanel = hit?.kind === 'panel' ? usable : null;
    this.hoverPiece = hit?.kind === 'piece' ? hit.piece : -1;
    this.hoverKind = usable && hit ? hit.kind : null;
    this.hoverId = usable && hit ? hit.id : null;
  }

  /**
   * A hand's reticle on a piece; the rest as common's.
   * @param {string | null} use
   * @param {VideoHit} hit
   */
  reticleScale(use, hit) {
    return use === 'piece' ? 1.3 : super.reticleScale(use, hit);
  }

  /**
   * Gets up, then walks up to the doorway and through it, facing it from the first step: the view
   * goes on to the Hallway (main.js) before the walk ends.
   */
  walkInto() {
    this.stand();
    const p = this.rig.position;
    const jamb = this.layout.door.width / 2 - 0.25;
    /** @type {[number, number]} */
    const front = [clamp(p.x, -jamb, jamb), -1.0];
    /** @type {[number, number][]} */
    const points = p.z > -1.2 && Math.abs(p.x) < jamb ? [] : [front];
    points.push([front[0], this.layout.door.reveal]);
    this._startWalk(points, Math.PI, null, false);
  }

  /**
   * Gets up, then walks up to piece i on a wall, to stand in front of it facing it, then done()
   * (unless the walk is taken over on the way); with less motion, there at once. In VR, a teleport
   * there.
   * @param {number} i
   * @param {(() => void) | null} [done]
   */
  walkUpTo(i, done = null) {
    this.stand();
    const f = pieceFront(this.layout, i);
    if (this.renderer.xr.isPresenting) {
      this._teleport(f.x, f.z);
      done?.();
      return;
    }
    this._startWalk([[f.x, f.z]], f.yaw, done);
  }

  /** @param {string | null} id a panel button's, or null where there is none */
  _press(id) {
    if (id) this.onPanel(id);
  }

  // ── The seats ───────────────────────────────────────────────────────────────

  /**
   * Puts the viewer at (x, z) facing yaw, as common's, standing: off any seat, and on a screen the
   * eye back at its height.
   * @param {number} x
   * @param {number} z
   * @param {number} yaw
   * @param {number} [pitch]
   */
  setPose(x, z, yaw, pitch = this.restPitch) {
    this.seat = null;
    if (!this.renderer.xr.isPresenting) this.camera.position.y = this.eye;
    super.setPose(x, z, yaw, pitch);
  }

  /**
   * In VR, the rig's height: seated mode's lift, less the drop to a seated head when sitting.
   * @protected
   */
  _riseXR() {
    return this.eyeLift - (this.seat ? this.eye - SEATED_EYE : 0);
  }

  /**
   * Sits on a seat (modes.js): there, facing the way it faces and looking down by `pitch` (at the
   * screen), the eye at SEATED_EYE; in VR the headset as high above the seat as a seated head is.
   * @param {Seat} seat
   * @param {number} [pitch]
   */
  sit(seat, pitch = 0) {
    this.auto = null;
    this.seat = seat;
    if (this.renderer.xr.isPresenting) {
      this.rig.updateMatrixWorld();
      this._turnAboutHead(wrapAngle(seat.yaw - this._headYaw()));
      this.rig.updateMatrixWorld();
      this._placeHead(seat.x, seat.z);
      this.rig.position.y = this.groundAt(seat.x, seat.z) + this._riseXR();
      return;
    }
    this.rig.position.set(seat.x, this.groundAt(seat.x, seat.z), seat.z);
    this.camera.position.y = SEATED_EYE;
    this.yaw = seat.yaw;
    this.pitch = clamp(pitch, -PITCH, PITCH);
    this._apply();
  }

  /**
   * Gets up from the seat, if sitting, beside it (its `out`): whether one was sat on. Common's walks,
   * keys, gamepad, sticks and teleports call it first, and so do walkInto and walkUpTo.
   */
  stand() {
    const s = this.seat;
    if (!s) return false;
    this.seat = null;
    const c = this.clampWalk(s.out[0], s.out[1], s.out[0], s.out[1], this._clamped);
    if (this.renderer.xr.isPresenting) {
      this.rig.position.y = this.groundAt(c.x, c.z) + this._riseXR();
      this.rig.updateMatrixWorld();
      this._placeHead(c.x, c.z);
    } else {
      this.camera.position.y = this.eye;
      this.rig.position.x = c.x;
      this.rig.position.z = c.z;
    }
    return true;
  }

  /** Puts the viewer out of the furniture's way, if they are in it (the room was furnished anew round them). */
  settle() {
    this.auto = null;
    if (this.renderer.xr.isPresenting) {
      this.rig.updateMatrixWorld();
      this.camera.getWorldPosition(this._head);
      this._moveHead(this._head.x, this._head.z);
    } else this._move(this.rig.position.x, this.rig.position.z);
  }

  /**
   * A moment after entering VR, the headset lined up as common's; seated, the head then onto the
   * seat (common's puts it where the viewer was, as near as the furniture lets it: beside the seat).
   * @protected
   */
  _lineUp() {
    super._lineUp();
    if (!this.seat) return;
    this.rig.updateMatrixWorld();
    this._placeHead(this.seat.x, this.seat.z);
  }

  /**
   * Leaving VR, as common's (setPose, which stands the viewer up), and sitting again if sat.
   * @protected
   */
  _onSessionEnd() {
    const seat = this.seat;
    super._onSessionEnd();
    if (seat) this.sit(seat);
  }
}
