// The control panel on the doorway's wall (room.js PANEL), outside's (the hallway's): Enter / Exit
// VR, how to move and turn in VR, the accessibility settings every site shares (common/access.js:
// less motion, the comfort vignette, seated), and the shared session: Start / Leave, how it's
// going, and its invite link to read out. Its canvas is redrawn only when what it shows changes (a
// setting, a session, the button pointed at, someone coming or going), never per frame.
import * as THREE from 'three';
import { PANEL_PX, PANEL_BUTTONS } from './room.js';
import { GOLD, SANS, SERIF, enamel } from './textures.js';

const LABELS = {
  'move:teleport': 'Teleport', 'move:smooth': 'Smooth', 'turn:snap': 'Snap', 'turn:smooth': 'Smooth',
  'motion:system': 'System', 'motion:reduce': 'Less', 'motion:full': 'Full',
  'vignette:on': 'On', 'vignette:off': 'Off', 'seated:on': 'On', 'seated:off': 'Off',
};
/** The rows' names, at their middles on the canvas. */
const ROWS = [['Move', 189], ['Turn', 265], ['Motion', 381], ['Vignette', 457], ['Seated', 533]];
const VR_LABELS = { exit: 'Exit VR', enter: 'Enter VR', none: 'No VR in this browser' };
const HINTS = {
  teleport: 'Left stick forward, aim, let go: teleport',
  smooth: 'Left stick: walk · trigger at the floor: teleport',
};
const SESSION_LABELS = { on: 'Leave shared session', off: 'Start shared session' };
const KEYS = ['vr', 'move', 'turn', 'motion', 'vignette', 'seated', 'room', 'link', 'status'];
/** A button's value in the state: the vignette and seated are on or off. */
const value = (state, group) => (typeof state[group] === 'boolean' ? (state[group] ? 'on' : 'off') : state[group]);

export class ControlPanel {
  /** @param {{ panel: { x: number, y: number, width: number, height: number, depth: number }, color: THREE.Color, anisotropy?: number }} o */
  constructor({ panel, color, anisotropy = 1 }) {
    this.canvas = document.createElement('canvas');
    this.canvas.width = PANEL_PX.width;
    this.canvas.height = PANEL_PX.height;
    this.ctx = this.canvas.getContext('2d');
    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.colorSpace = THREE.SRGBColorSpace;
    this.texture.anisotropy = anisotropy;
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(panel.width, panel.height), new THREE.MeshBasicMaterial({ map: this.texture, color }));
    this.mesh.name = 'control panel';
    // On the doorway's wall (z = 0), facing into the room (-z).
    this.mesh.position.set(panel.x, panel.y, -panel.depth);
    this.mesh.rotation.y = Math.PI;
    this.state = { vr: 'none', move: 'smooth', turn: 'snap', motion: 'system', vignette: true, seated: false, room: null, link: '', status: '' };
    this.hover = null;
    this._draw();
  }

  /**
   * What it shows, all or part of it: vr is 'exit' (in VR), 'enter' (VR available) or 'none'; move
   * and turn as in common/nav.js; motion, vignette and seated as in common/access.js; room is the
   * shared session's (null when not in one), link its invite link, status how it's going.
   */
  set(state) {
    const next = { ...this.state, ...state };
    if (KEYS.every((k) => next[k] === this.state[k])) return;
    this.state = next;
    this._draw();
  }

  /** The button pointed at, or null. */
  setHover(id) {
    if (id === this.hover) return;
    this.hover = id;
    this._draw();
  }

  _draw() {
    const g = this.ctx, W = PANEL_PX.width;
    enamel(g, W, PANEL_PX.height, 10);
    g.textAlign = 'left';
    g.textBaseline = 'alphabetic';
    g.fillStyle = GOLD;
    g.font = `600 30px ${SERIF}`;
    g.fillText('Controls', 32, 58);
    g.fillStyle = '#b9a98d';
    g.font = `24px ${SANS}`;
    g.textBaseline = 'middle';
    for (const [name, y] of ROWS) g.fillText(name, 34, y);
    for (const [id, x0, y0, x1, y1] of PANEL_BUTTONS) {
      let label, selected = false, disabled = false;
      if (id === 'vr') {
        label = VR_LABELS[this.state.vr];
        disabled = this.state.vr === 'none';
      } else if (id === 'session') {
        label = SESSION_LABELS[this.state.room ? 'on' : 'off'];
      } else {
        const [group, choice] = id.split(':');
        label = LABELS[id];
        selected = value(this.state, group) === choice;
      }
      const hover = this.hover === id && !disabled;
      g.beginPath();
      g.roundRect(x0, y0, x1 - x0, y1 - y0, 12);
      g.fillStyle = selected ? (hover ? '#f0cf8a' : GOLD) : hover ? 'rgba(224,187,114,0.32)' : 'rgba(255,255,255,0.06)';
      g.fill();
      g.lineWidth = 2;
      g.strokeStyle = disabled ? 'rgba(224,187,114,0.3)' : GOLD;
      g.stroke();
      g.fillStyle = selected ? '#1a1208' : disabled ? 'rgba(239,229,207,0.45)' : '#efe5cf';
      g.font = `600 ${(id === 'vr' && disabled) || id.startsWith('motion:') ? 22 : 26}px ${SANS}`;
      g.textAlign = 'center';
      g.fillText(label, (x0 + x1) / 2, (y0 + y1) / 2 + 1);
    }
    g.fillStyle = '#b9a98d';
    g.font = `18px ${SANS}`;
    g.textAlign = 'center';
    g.fillText(HINTS[this.state.move], W / 2, 326);
    const about = 'Less motion stills the room · seated raises your view';
    fitText(g, about, W - 64, 18);
    g.fillText(about, W / 2, 586);

    // The shared session.
    g.fillStyle = 'rgba(224,187,114,0.35)';
    g.fillRect(32, 602, W - 64, 2);
    g.textAlign = 'left';
    g.fillStyle = GOLD;
    g.font = `600 26px ${SERIF}`;
    g.fillText('Together', 32, 632);
    if (this.state.room) {
      g.textAlign = 'right';
      g.fillStyle = '#efe5cf';
      fitText(g, this.state.status, W - 210, 20);
      g.fillText(this.state.status, W - 32, 633);
    }
    g.textAlign = 'center';
    g.fillStyle = '#b9a98d';
    const note = this.state.room ? this.state.link : 'Start one, share its link, and see each other here';
    fitText(g, note, W - 64, 18);
    g.fillText(note, W / 2, 734);
    this.texture.needsUpdate = true;
  }
}

/** Sets the largest font, from `size` px down, at which `text` fits `width`. */
function fitText(g, text, width, size) {
  for (let s = size; s >= 12; s--) {
    g.font = `${s}px ${SANS}`;
    if (g.measureText(text).width <= width) return;
  }
}
