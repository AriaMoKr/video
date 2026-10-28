// Moving about the room, as one moves about the hallway (its controls.js, with outside's walk
// through the door, less motion and seated mode), on every device:
//   desktop: drag to look, WASD / arrows to walk (Shift runs), click the floor, the doorway or the
//            control panel
//   phone:   drag to look, tap the floor, the doorway or the panel
//   gamepad: as in vrlbry, it takes over when used and the mouse takes it back: the left stick
//            walks, the right one looks, A uses what the middle of the view is on (common's
//            gamepad.js)
//   headset: point and pull the trigger (or pinch) at the floor, the doorway or the panel; the left
//            stick walks (move 'smooth') or aims a teleport (move 'teleport'), the right one turns
//            in steps (turn 'snap') or smoothly (turn 'smooth'); or walk through the doorway
//   TV:      the remote's arrows walk and turn, and OK uses the middle of the view, as a gamepad's
//            A does (common's tv.js; main.js gives it useMiddle, and sets aimMiddle)
// The walls stop the viewer (room.js clampWalk). The viewer's body is `rig` (yaw only); the camera
// is its head (pitch on a screen, the headset's pose in VR). Per frame nothing is allocated.
import * as THREE from 'three';
import { EYE, castRay, clampWalk, panelButtonAt } from './room.js';
import { firstPad, readPad } from 'common/gamepad.js';
import { keyOf } from 'common/tv.js';

const LOOK = 0.0045; // radians per pixel dragged
const WALK = 1.9, RUN = 3.8, XR_WALK = 1.8; // metres per second
const TURN = 1.9; // radians per second (arrow keys)
const SNAP = Math.PI / 6;
const SMOOTH_TURN = 1.6; // radians per second at full stick
const PITCH = 1.35;
const PAD_TURN = 2.4, PAD_PITCH = 1.6; // radians per second, a gamepad's right stick at full tilt (vrlbry's)

const KEYS = {
  KeyW: 'forward', ArrowUp: 'forward',
  KeyS: 'back', ArrowDown: 'back',
  KeyA: 'left', KeyD: 'right',
  ArrowLeft: 'turnLeft', KeyQ: 'turnLeft',
  ArrowRight: 'turnRight', KeyE: 'turnRight',
  ShiftLeft: 'run', ShiftRight: 'run',
};

const wrapAngle = (a) => Math.atan2(Math.sin(a), Math.cos(a));
const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

export class Controls {
  constructor({ renderer, camera, rig, scene, dom, layout }) {
    this.renderer = renderer;
    this.camera = camera;
    this.rig = rig;
    this.scene = scene;
    this.dom = dom;
    this.layout = layout;
    this.yaw = 0;
    this.pitch = 0;
    this.keys = new Set();
    this.hover = null; // what is pointed at that could be used: 'door', or a panel button's id
    this.hoverDoor = false;
    this.hoverPanel = null; // the control panel's button pointed at
    /** VR navigation (common/nav.js, under hallway.nav): move 'smooth' | 'teleport', turn 'snap' | 'smooth'. */
    this.move = 'smooth';
    this.turn = 'snap';
    /** Less motion (common/access.js reduceMotion): a walk (to a spot on the floor, through the doorway) jumps there. */
    this.reduceMotion = false;
    /** In VR, how far the rig stands above the floor: common/access.js eyeLift, for seated mode (setEyeLift). */
    this.eyeLift = 0;
    /** The sticks' smooth movement (m/s) and turning (rad/s) this frame in VR, for the vignette; 0 for snaps and teleports. */
    this.moveSpeed = 0;
    this.turnRate = 0;
    /** (how) when the doorway is chosen: how is 'screen' or 'xr'. @type {(how: 'screen' | 'xr') => void} */
    this.onDoor = () => {};
    /** (button id) when a button of the control panel is pressed. @type {(id: string) => void} */
    this.onPanel = () => {};
    /** (hand) when a controller's grip is squeezed in VR (main.js: a wave in the shared session). @type {(hand: object) => void} */
    this.onSqueeze = () => {};
    /** (move) for a teleport: main.js blinks the view around move(), which puts the viewer there. */
    this.onTeleport = (move) => move();
    /** The first time the viewer does anything (hides the hint). */
    this.onActivity = () => {};
    /** A gamepad was used last: the middle of the view is what it points at (main.js shows a dot there). */
    this.padActive = false;
    /** (on) when the gamepad takes over or hands back; when its B or Back is pressed (main.js leaves fullscreen). @type {(on: boolean) => void} */
    this.onPadActive = () => {};
    this.onPadBack = () => {};
    this._pad = readPad({ axes: [], buttons: [] });
    this._padUse = false;
    this._padBack = false;
    this._pads = 0; // connected; none, and nothing is polled
    /** Whether a gamepad is connected. */
    this.hasPad = false;
    /** The middle of the view is the pointer whatever is used (a TV, whose remote has none: common's tv.js). */
    this.aimMiddle = false;
    this.auto = null; // a walk under way: { points: [[x, z], …], i, face: yaw|null, speed }
    this._down = null;
    this._mouse = null;
    this._cursor = '';
    this._raycaster = new THREE.Raycaster();
    this._ndc = new THREE.Vector2();
    this._hit = { t: 0, kind: '', x: 0, y: 0, z: 0, nx: 0, ny: 0, nz: 0, u: 0, v: 0, walkable: false };
    this._head = new THREE.Vector3();
    this._dir = new THREE.Vector3();
    this._origin = new THREE.Vector3();
    this._normal = new THREE.Vector3();
    this._clamped = { x: 0, z: 0 };
    this._snapArmed = true;
    this._recenter = 0; // frames until VR lines the headset up with the pose it entered at
    this._entry = { x: 0, z: 0, yaw: 0 };
    camera.position.set(0, EYE, 0);
    camera.rotation.order = 'YXZ';
    this._bindDom();
    this._setupXR();
  }

  /** Puts the viewer at (x, z) facing yaw (and pitch). */
  setPose(x, z, yaw, pitch = 0) {
    this.rig.position.set(x, this.renderer.xr.isPresenting ? this.eyeLift : 0, z);
    this.yaw = yaw;
    this.pitch = clamp(pitch, -PITCH, PITCH);
    this.auto = null;
    this._apply();
  }

  /** Sets how to move and turn in VR (common/nav.js). */
  setNav({ move, turn }) {
    this.move = move;
    this.turn = turn;
    for (const h of this.hands) h.aiming = false;
  }

  /** Raises the rig this far above the floor in VR (common/access.js eyeLift: 0.45 m in seated mode, else 0), at once; on a screen the eye height stays. */
  setEyeLift(lift) {
    this.eyeLift = lift;
    if (this.renderer.xr.isPresenting) this.rig.position.y = lift;
  }

  /** Walks to a point on the floor; with less motion, it is there at once. */
  walkTo(x, z) {
    this._startWalk([[x, z]], null);
  }

  /** Walks up to the doorway and through it. */
  walkInto() {
    const p = this.rig.position;
    const jamb = this.layout.door.width / 2 - 0.25;
    const front = [clamp(p.x, -jamb, jamb), -1.0];
    const points = p.z > -1.2 && Math.abs(p.x) < jamb ? [] : [front];
    points.push([front[0], this.layout.door.reveal]);
    this._startWalk(points, Math.PI);
  }

  _startWalk(points, face) {
    if (this.reduceMotion) {
      // Straight to the end, facing `face` if given.
      this.auto = null;
      const [x, z] = points[points.length - 1];
      this._move(x, z);
      if (face !== null) {
        this.yaw = face;
        this.pitch = 0;
      }
      this._apply();
      return;
    }
    let length = 0, x = this.rig.position.x, z = this.rig.position.z;
    for (const [px, pz] of points) {
      length += Math.hypot(px - x, pz - z);
      x = px;
      z = pz;
    }
    // Long walks go faster, so none takes much more than a second and a half.
    this.auto = { points, i: 0, face, speed: clamp(length / 1.5, 2.2, 7) };
  }

  update(dt) {
    this.moveSpeed = 0;
    this.turnRate = 0;
    if (this.renderer.xr.isPresenting) {
      this._updateXR(dt);
      return;
    }
    if (this.auto) this._updateWalk(dt);
    else this._updateKeys(dt);
    if (this._pads) this._updatePad(dt);
    this._apply();
    this._updateHover();
  }

  _apply() {
    this.rig.rotation.y = this.yaw;
    if (!this.renderer.xr.isPresenting) this.camera.rotation.set(this.pitch, 0, 0);
  }

  _move(x, z) {
    const p = this.rig.position;
    const c = clampWalk(this.layout, p.x, p.z, x, z, this._clamped);
    p.x = c.x;
    p.z = c.z;
    return c;
  }

  _updateKeys(dt) {
    const k = this.keys;
    if (!k.size) return;
    this.yaw += ((k.has('turnLeft') ? 1 : 0) - (k.has('turnRight') ? 1 : 0)) * TURN * dt;
    const f = (k.has('forward') ? 1 : 0) - (k.has('back') ? 1 : 0);
    const s = (k.has('right') ? 1 : 0) - (k.has('left') ? 1 : 0);
    if (!f && !s) return;
    const step = ((k.has('run') ? RUN : WALK) * dt) / Math.hypot(f, s);
    const sin = Math.sin(this.yaw), cos = Math.cos(this.yaw);
    // Forward is (-sin, -cos); right is (cos, -sin).
    const p = this.rig.position;
    this._move(p.x + (-sin * f + cos * s) * step, p.z + (-cos * f - sin * s) * step);
  }

  /** The gamepad takes over the view's middle as the pointer when used; the mouse takes it back. */
  _setPadActive(on) {
    if (this.padActive === on) return;
    this.padActive = on;
    this.onPadActive(on);
  }

  /** The first connected gamepad: walking and looking like a first-person game, A to use. */
  _updatePad(dt) {
    const pad = firstPad(navigator.getGamepads?.());
    if (!pad) {
      this._setPadActive(false);
      return;
    }
    const s = readPad(pad, this._pad);
    const moving = s.moveX !== 0 || s.moveY !== 0, looking = s.lookX !== 0 || s.lookY !== 0;
    if (moving || looking || (s.use && !this._padUse) || (s.back && !this._padBack)) {
      this._setPadActive(true);
      this.onActivity();
    }
    if (!this.padActive) {
      this._padUse = s.use;
      this._padBack = s.back;
      return;
    }
    if (moving || looking) this.auto = null;
    if (looking) {
      this.yaw -= s.lookX * PAD_TURN * dt;
      this.pitch = clamp(this.pitch - s.lookY * PAD_PITCH * dt, -PITCH, PITCH);
    }
    if (moving) {
      const step = (s.run ? RUN : WALK) * dt;
      const sin = Math.sin(this.yaw), cos = Math.cos(this.yaw);
      const f = -s.moveY, r = s.moveX;
      const p = this.rig.position;
      this._move(p.x + (-sin * f + cos * r) * step, p.z + (-cos * f - sin * r) * step);
    }
    // Buttons act once per press.
    if (s.use && !this._padUse) this.useMiddle();
    if (s.back && !this._padBack) this.onPadBack();
    this._padUse = s.use;
    this._padBack = s.back;
  }

  /** A on a gamepad, or OK on a TV's remote: what the middle of the view is on, as a click there would. */
  useMiddle() {
    this.camera.updateWorldMatrix(true, false);
    this._use(this._pickNdc(0, 0), 'screen');
  }

  _updateWalk(dt) {
    const a = this.auto;
    const p = this.rig.position;
    const [tx, tz] = a.points[a.i];
    const dx = tx - p.x, dz = tz - p.z;
    const dist = Math.hypot(dx, dz);
    if (a.face !== null) {
      // Turn to face the doorway on the way.
      const turn = 1 - Math.exp(-dt * 6);
      this.yaw += wrapAngle(a.face - this.yaw) * turn;
      this.pitch += (0 - this.pitch) * turn;
    }
    const step = a.speed * dt;
    if (dist <= step) {
      this._move(tx, tz);
      if (++a.i >= a.points.length) this.auto = null;
      return;
    }
    const px = p.x, pz = p.z;
    const c = this._move(px + (dx / dist) * step, pz + (dz / dist) * step);
    if (Math.hypot(c.x - px, c.z - pz) < step * 0.05) this.auto = null; // blocked by a wall
  }

  _pickScreen(clientX, clientY) {
    const r = this.dom.getBoundingClientRect();
    this.camera.updateWorldMatrix(true, false);
    return this._pickNdc(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
  }

  /** What is at (x, y) in the view, -1…1 from its bottom left. */
  _pickNdc(x, y) {
    this._ndc.set(x, y);
    this._raycaster.setFromCamera(this._ndc, this.camera);
    const { origin: o, direction: d } = this._raycaster.ray;
    return castRay(this.layout, o.x, o.y, o.z, d.x, d.y, d.z, this._hit);
  }

  /** What could be used where a hit is: 'door', a panel button's id, or null. */
  _usable(hit) {
    if (!hit) return null;
    if (hit.kind === 'panel') return panelButtonAt(hit.u, hit.v);
    return hit.kind === 'door' ? 'door' : null;
  }

  _updateHover() {
    let hit = null;
    const aim = this.padActive || this.aimMiddle;
    if (aim || (this._mouse && !this._down)) {
      if (aim) this.camera.updateWorldMatrix(true, false);
      hit = aim ? this._pickNdc(0, 0) : this._pickScreen(this._mouse.x, this._mouse.y);
    }
    this._setHover(this._usable(hit), hit);
    const cursor = this.hover ? 'pointer' : this._down?.moved ? 'grabbing' : '';
    if (cursor !== this._cursor) this.dom.style.cursor = this._cursor = cursor;
  }

  _setHover(usable, hit) {
    this.hover = usable;
    this.hoverDoor = usable === 'door';
    this.hoverPanel = hit?.kind === 'panel' ? usable : null;
  }

  /** Uses what a hit is on: the doorway, a panel button, or the floor (walks there, or in VR teleports). */
  _use(hit, how) {
    if (!hit) return;
    if (hit.kind === 'door') this.onDoor(how);
    else if (hit.kind === 'panel') this._press(panelButtonAt(hit.u, hit.v));
    else if (hit.kind === 'floor' && hit.walkable) {
      if (how === 'xr') this._teleport(hit.x, hit.z);
      else this.walkTo(hit.x, hit.z);
    }
  }

  _bindDom() {
    const el = this.dom;
    el.addEventListener('pointerdown', (e) => {
      this._setPadActive(false);
      if (this._down || (e.pointerType === 'mouse' && e.button !== 0)) return;
      this._down = { id: e.pointerId, x: e.clientX, y: e.clientY, lx: e.clientX, ly: e.clientY, touch: e.pointerType !== 'mouse', moved: false };
      el.setPointerCapture?.(e.pointerId);
      this.onActivity();
    });
    el.addEventListener('pointermove', (e) => {
      if (e.pointerType === 'mouse') this._mouse = { x: e.clientX, y: e.clientY };
      if (e.movementX || e.movementY) this._setPadActive(false);
      const d = this._down;
      if (!d || d.id !== e.pointerId) return;
      const dx = e.clientX - d.lx, dy = e.clientY - d.ly;
      d.lx = e.clientX;
      d.ly = e.clientY;
      if (!d.moved && Math.hypot(e.clientX - d.x, e.clientY - d.y) > (d.touch ? 10 : 5)) d.moved = true;
      if (!d.moved) return;
      // The mouse turns the view the way it is dragged; a finger drags the scene (the opposite).
      const k = d.touch ? -LOOK * 1.15 : LOOK;
      this.yaw -= dx * k;
      this.pitch = clamp(this.pitch - dy * k, -PITCH, PITCH);
      this.auto = null;
    });
    const end = (e) => {
      const d = this._down;
      if (!d || d.id !== e.pointerId) return;
      this._down = null;
      if (e.type === 'pointerup' && !d.moved) this._use(this._pickScreen(e.clientX, e.clientY), 'screen');
    };
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);
    el.addEventListener('pointerleave', (e) => {
      if (e.pointerType === 'mouse') this._mouse = null;
    });
    el.addEventListener('contextmenu', (e) => e.preventDefault());
    window.addEventListener('keydown', (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      // The page's own controls keep their keys: a radio button its arrows, and a button or a link
      // the Space or Enter that presses it.
      if (/** @type {Element} */ (e.target)?.closest?.('input, textarea, select, [contenteditable]')) return;
      // A TV remote's keys come without a code (common's tv.js keyOf): their key names them.
      const name = keyOf(e);
      if ((name === 'Space' || name === ' ' || name === 'Enter' || name === 'NumpadEnter') && /** @type {Element} */ (e.target)?.closest?.('button, a[href]')) return;
      const k = KEYS[name];
      if (!k) return;
      // The arrows are walking's, not the TV's spatial navigation (or a page scroll).
      if (name.startsWith('Arrow')) e.preventDefault();
      this.keys.add(k);
      if (k !== 'run') this.auto = null;
      this.onActivity();
    });
    window.addEventListener('keyup', (e) => {
      const k = KEYS[keyOf(e)];
      if (k) this.keys.delete(k);
    });
    window.addEventListener('blur', () => this.keys.clear());
    // A browser shows a page a gamepad once one of its buttons is pressed.
    window.addEventListener('gamepadconnected', () => {
      this._pads++;
      this.hasPad = true;
    });
    window.addEventListener('gamepaddisconnected', () => {
      this._pads = Math.max(0, this._pads - 1);
      this.hasPad = this._pads > 0;
      if (!this.hasPad) this._setPadActive(false);
    });
  }

  // ── VR ──────────────────────────────────────────────────────────────────────

  _setupXR() {
    const laserGeometry = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -1)]);
    const laserMaterial = new THREE.LineBasicMaterial({ color: 0xfff0d6, transparent: true, opacity: 0.6 });
    const ringGeometry = new THREE.RingGeometry(0.022, 0.034, 28);
    this.hands = [];
    for (let i = 0; i < 2; i++) {
      const controller = this.renderer.xr.getController(i);
      const laser = new THREE.Line(laserGeometry, laserMaterial);
      laser.visible = false;
      controller.add(laser);
      const tip = new THREE.Mesh(new THREE.SphereGeometry(0.008, 10, 8), new THREE.MeshBasicMaterial({ color: 0xfff0d6 }));
      controller.add(tip);
      const reticle = new THREE.Mesh(ringGeometry, new THREE.MeshBasicMaterial({ color: 0xfff0d6, transparent: true, opacity: 0.85, depthWrite: false }));
      reticle.visible = false;
      this.scene.add(reticle);
      const hand = { controller, laser, tip, reticle, source: null, hit: { ...this._hit }, last: null, aiming: false };
      controller.addEventListener('connected', (e) => {
        hand.source = e.data;
      });
      controller.addEventListener('disconnected', () => {
        hand.source = null;
        hand.last = null;
        hand.aiming = false;
        laser.visible = reticle.visible = false;
      });
      controller.addEventListener('select', () => this._xrSelect(hand));
      controller.addEventListener('squeezestart', () => this.onSqueeze(hand));
      this.rig.add(controller);
      this.hands.push(hand);
    }
    this.renderer.xr.addEventListener('sessionstart', () => {
      this._entry.x = this.rig.position.x;
      this._entry.z = this.rig.position.z;
      this._entry.yaw = this.yaw;
      this._recenter = 2;
      this.auto = null;
      this.keys.clear();
      this.rig.position.y = this.eyeLift;
    });
    this.renderer.xr.addEventListener('sessionend', () => this._onSessionEnd());
  }

  _headYaw() {
    this.camera.getWorldDirection(this._dir);
    return Math.atan2(-this._dir.x, -this._dir.z);
  }

  /** Turns the rig by angle about the head, so the viewer turns in place. */
  _turnAboutHead(angle) {
    this.camera.getWorldPosition(this._head);
    const p = this.rig.position;
    const ox = p.x - this._head.x, oz = p.z - this._head.z;
    const c = Math.cos(angle), s = Math.sin(angle);
    p.x = this._head.x + ox * c + oz * s;
    p.z = this._head.z - ox * s + oz * c;
    this.yaw += angle;
    this.rig.rotation.y = this.yaw;
  }

  /** Moves the rig so the head goes to (x, z), or as near as the walls allow. */
  _moveHead(x, z) {
    this.camera.getWorldPosition(this._head);
    const c = clampWalk(this.layout, this._head.x, this._head.z, x, z, this._clamped);
    this.rig.position.x += c.x - this._head.x;
    this.rig.position.z += c.z - this._head.z;
  }

  _updateXR(dt) {
    // A moment after entering, line the headset up with where the viewer stood and looked.
    if (this._recenter > 0 && --this._recenter === 0) {
      this._turnAboutHead(wrapAngle(this._entry.yaw - this._headYaw()));
      this.rig.updateMatrixWorld();
      this._moveHead(this._entry.x, this._entry.z);
    }
    // The sticks: the right one turns, the left one walks or aims a teleport.
    for (const h of this.hands) {
      const pad = h.source?.gamepad;
      if (!pad || pad.axes.length < 2) continue;
      const ax = pad.axes.length >= 4 ? pad.axes[2] : pad.axes[0];
      const ay = pad.axes.length >= 4 ? pad.axes[3] : pad.axes[1];
      if (h.source.handedness === 'right') this._turnStick(ax, dt);
      else if (this.move === 'teleport') this._teleportStick(h, ay);
      else this._walkStick(ax, ay, dt);
    }
    this.rig.updateMatrixWorld();
    let usable = null, usableHit = null;
    for (const h of this.hands) {
      if (h.source?.targetRayMode !== 'tracked-pointer') {
        h.laser.visible = h.reticle.visible = false;
        h.last = null;
        continue;
      }
      const m = h.controller.matrixWorld;
      this._origin.setFromMatrixPosition(m);
      this._dir.set(0, 0, -1).transformDirection(m);
      const o = this._origin, d = this._dir;
      const hit = castRay(this.layout, o.x, o.y, o.z, d.x, d.y, d.z, h.hit);
      h.last = hit;
      h.laser.visible = true;
      h.laser.scale.z = hit ? hit.t : 4;
      if (!hit || hit.kind === 'ceiling') {
        h.reticle.visible = false;
        continue;
      }
      const use = this._usable(hit);
      const target = h.aiming && hit.kind === 'floor';
      if (use && !usable) {
        usable = use;
        usableHit = hit;
      }
      this._normal.set(hit.nx, hit.ny, hit.nz);
      h.reticle.position.set(hit.x + hit.nx * 0.01, hit.y + hit.ny * 0.01, hit.z + hit.nz * 0.01);
      h.reticle.quaternion.setFromUnitVectors(Z_AXIS, this._normal);
      h.reticle.scale.setScalar(target ? 3.2 : use === 'door' ? 1.8 : use ? 0.7 : 1);
      h.reticle.material.color.setHex(target ? (hit.walkable ? 0xe8c47c : 0x8a7f72) : use ? 0xe8c47c : hit.walkable ? 0xfff0d6 : 0x9a8f80);
      h.reticle.visible = true;
    }
    this._setHover(usable, usableHit);
  }

  /** Right stick: a 30 degree step each push (snap), or turning while held (smooth). */
  _turnStick(ax, dt) {
    if (this.turn === 'smooth') {
      if (Math.abs(ax) > 0.15) {
        this._turnAboutHead(-ax * SMOOTH_TURN * dt);
        this.turnRate = Math.max(this.turnRate, Math.abs(ax) * SMOOTH_TURN);
      }
      return;
    }
    if (this._snapArmed && Math.abs(ax) > 0.6) {
      this._turnAboutHead(-Math.sign(ax) * SNAP);
      this._snapArmed = false;
    } else if (Math.abs(ax) < 0.3) this._snapArmed = true;
  }

  /** Left stick, move 'smooth': walk the way the head faces. */
  _walkStick(ax, ay, dt) {
    if (Math.hypot(ax, ay) <= 0.15) return;
    this.camera.getWorldDirection(this._dir);
    let fx = this._dir.x, fz = this._dir.z;
    const fl = Math.hypot(fx, fz) || 1;
    fx /= fl;
    fz /= fl;
    // Right of forward (fx, fz) is (-fz, fx).
    const step = XR_WALK * dt;
    this.moveSpeed = Math.max(this.moveSpeed, XR_WALK * Math.min(1, Math.hypot(ax, ay)));
    this.camera.getWorldPosition(this._head);
    this._moveHead(this._head.x + (-fz * ax - fx * ay) * step, this._head.z + (fx * ax - fz * ay) * step);
  }

  /** Left stick, move 'teleport': pushed forward, that hand's ray aims; let go, and the viewer is there. */
  _teleportStick(h, ay) {
    if (ay < -0.6) h.aiming = true;
    else if (h.aiming && ay > -0.3) {
      h.aiming = false;
      const hit = h.last;
      if (hit?.kind === 'floor' && hit.walkable) this._teleport(hit.x, hit.z);
    }
  }

  _teleport(x, z) {
    this.onTeleport(() => this._moveHead(x, z));
  }

  _press(id) {
    if (id) this.onPanel(id);
  }

  _xrSelect(hand) {
    this.onActivity();
    this._use(hand.last, 'xr');
  }

  _onSessionEnd() {
    // Carry on from where the headset was, facing the way it faced.
    this.camera.getWorldPosition(this._head);
    const yaw = this._headYaw();
    const c = clampWalk(this.layout, this._head.x, this._head.z, this._head.x, this._head.z, this._clamped);
    this.camera.position.set(0, EYE, 0);
    this.camera.quaternion.identity();
    for (const h of this.hands) {
      h.laser.visible = h.reticle.visible = false;
      h.last = null;
      h.aiming = false;
    }
    this._setHover(null, null);
    this.setPose(c.x, c.z, yaw);
  }
}

const Z_AXIS = new THREE.Vector3(0, 0, 1);
