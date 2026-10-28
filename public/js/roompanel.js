// The room's own panel on the doorway's wall, left of the doorway as the control panel is right of
// it (modes.js ROOM_PANEL_BUTTONS): which of the four modes the room is in, what is showing, and
// Play / Pause, Next, Captions and Stop; and the bar of the same buttons under the screen in use
// (modes.js BAR_BUTTONS). Drawn as the control panel is (panel.js), only when what they show
// changes: the time shown moves on a second at a time.
import * as THREE from 'three';
import { BAR_BUTTONS, BAR_PX, MODE_NAMES, ROOM_PANEL_BUTTONS, ROOM_PANEL_PX, faceFrame } from './modes.js';
import { GOLD, SANS, SERIF, enamel } from './textures.js';
import { canvasTexture, fitFont, wrap } from './covers.js';

/** What each mode is, in a line under the modes' buttons. */
const ABOUT = {
  store: 'Choose a tape from the shelves on the left',
  den: 'Choose a tape, or sit on the sofa to watch',
  screening: 'Choose a tape by the door, then take a seat',
  gallery: "Use a decade's set to see what it shows",
};

/**
 * What the panel and the bar show: the room's mode, the episode chosen (its name, or null), how it
 * is going (status), and whether it plays and the captions are on.
 * @typedef {{ mode: string, name: string | null, status: string, time: string, playing: boolean, captions: boolean, hasCaptions: boolean }} Showing
 */
const KEYS = ['mode', 'name', 'status', 'time', 'playing', 'captions', 'hasCaptions'];

/** A button as the control panel draws its own. */
function button(g, [x0, y0, x1, y1], label, { selected = false, hover = false, disabled = false, size = 26 } = {}) {
  hover = hover && !disabled;
  g.beginPath();
  g.roundRect(x0, y0, x1 - x0, y1 - y0, 12);
  g.fillStyle = selected ? (hover ? '#f0cf8a' : GOLD) : hover ? 'rgba(224,187,114,0.32)' : 'rgba(255,255,255,0.06)';
  g.fill();
  g.lineWidth = 2;
  g.strokeStyle = disabled ? 'rgba(224,187,114,0.3)' : GOLD;
  g.stroke();
  g.fillStyle = selected ? '#1a1208' : disabled ? 'rgba(239,229,207,0.45)' : '#efe5cf';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  fitFont(g, label, x1 - x0 - 16, size, { weight: '600' });
  g.fillText(label, (x0 + x1) / 2, (y0 + y1) / 2 + 1);
}

/** The words on Play, Captions and the rest, as the page's buttons say them (overlay.js). */
function labelOf(action, s) {
  if (action === 'play') return s.playing ? 'Pause' : 'Play';
  if (action === 'captions') return s.captions ? 'Captions on' : 'Captions off';
  return action === 'next' ? 'Next' : 'Stop';
}

/** A mesh with a canvas on a face of modes.js's, lit `color`. */
function faceMesh(face, canvas, color, anisotropy, name) {
  const texture = canvasTexture(canvas, anisotropy);
  const fr = faceFrame(face);
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(fr.width, fr.height), new THREE.MeshBasicMaterial({ map: texture, color }));
  mesh.name = name;
  mesh.position.set(fr.center[0] + fr.normal[0] * 0.001, fr.center[1], fr.center[2] + fr.normal[2] * 0.001);
  mesh.rotation.y = fr.yaw;
  return { mesh, texture };
}

class CanvasPanel {
  constructor(px) {
    this.canvas = document.createElement('canvas');
    this.canvas.width = px.width;
    this.canvas.height = px.height;
    this.ctx = this.canvas.getContext('2d');
    /** @type {Showing} */
    this.state = { mode: 'store', name: null, status: '', time: '', playing: false, captions: false, hasCaptions: false };
    this.hover = null;
    this.texture = null;
  }

  /** What it shows, all or part of it (Showing). */
  set(state) {
    const next = { ...this.state, ...state };
    if (KEYS.every((k) => next[k] === this.state[k])) return;
    this.state = next;
    this.draw();
  }

  /** The button pointed at, or null. */
  setHover(id) {
    if (id === this.hover) return;
    this.hover = id;
    this.draw();
  }

  draw() {}
}

export class RoomPanel extends CanvasPanel {
  /** @param {{ face: import('./modes.js').Face, color: THREE.Color, anisotropy?: number }} o */
  constructor({ face, color, anisotropy = 1 }) {
    super(ROOM_PANEL_PX);
    const { mesh, texture } = faceMesh(face, this.canvas, color, anisotropy, 'room panel');
    this.mesh = mesh;
    this.texture = texture;
    this.draw();
  }

  draw() {
    if (!this.texture) return;
    const g = this.ctx, W = ROOM_PANEL_PX.width, s = this.state;
    enamel(g, W, ROOM_PANEL_PX.height, 10);
    g.textAlign = 'left';
    g.textBaseline = 'alphabetic';
    g.fillStyle = GOLD;
    g.font = `600 30px ${SERIF}`;
    g.fillText('The room', 32, 58);
    for (const [id, ...box] of ROOM_PANEL_BUTTONS) {
      const [, what, mode] = id.split(':');
      if (what === 'mode') {
        button(g, box, MODE_NAMES[mode], { selected: s.mode === mode, hover: this.hover === id, size: 24 });
      } else {
        const disabled = (what === 'stop' && !s.name);
        button(g, box, labelOf(what, s), { selected: what === 'captions' && s.captions, hover: this.hover === id, disabled });
      }
    }
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillStyle = '#b9a98d';
    fitFont(g, ABOUT[s.mode] ?? '', W - 64, 19);
    g.fillText(ABOUT[s.mode] ?? '', W / 2, 238);

    g.fillStyle = 'rgba(224,187,114,0.35)';
    g.fillRect(32, 262, W - 64, 2);
    g.textAlign = 'left';
    g.fillStyle = GOLD;
    g.font = `600 26px ${SERIF}`;
    g.fillText('Now showing', 32, 294);
    if (s.time) {
      g.textAlign = 'right';
      g.fillStyle = '#efe5cf';
      g.font = `20px ${SANS}`;
      g.fillText(s.time, W - 32, 295);
    }
    g.textAlign = 'center';
    g.fillStyle = '#efe5cf';
    const name = s.name ?? 'Nothing yet';
    fitFont(g, name, W - 64, 25, { weight: '600', min: 18 });
    const lines = wrap(g, name, W - 64, 2);
    lines.forEach((line, k) => g.fillText(line, W / 2, (lines.length === 1 ? 348 : 334) + k * 32));
    g.fillStyle = '#b9a98d';
    fitFont(g, s.status, W - 64, 20);
    g.fillText(s.status, W / 2, 406);

    g.fillStyle = 'rgba(224,187,114,0.35)';
    g.fillRect(32, 602, W - 64, 2);
    g.fillStyle = '#b9a98d';
    /** @type {[string, number][]} */
    const about = [['From archive.org’s Classic TV collection', 640], ['Public domain, streamed from the Internet Archive', 672], ['Captions are archive.org’s speech to text', 704]];
    for (const [text, y] of about) {
      fitFont(g, text, W - 64, 18);
      g.fillText(text, W / 2, y);
    }
    this.texture.needsUpdate = true;
  }
}

/** The bar under the screen in use: the episode and its time, and its buttons. Moved to another screen's bar with place(). */
export class ScreenBar extends CanvasPanel {
  constructor({ color, anisotropy = 1 }) {
    super(BAR_PX);
    this.texture = canvasTexture(this.canvas, anisotropy);
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1 / 6), new THREE.MeshBasicMaterial({ map: this.texture, color }));
    this.mesh.name = 'screen bar';
    this.mesh.visible = false;
    this.draw();
  }

  /** Puts it on a bar's face (modes.js), or hides it (null). */
  place(face) {
    this.mesh.visible = !!face;
    if (!face) return;
    const fr = faceFrame(face);
    this.mesh.scale.setScalar(fr.width);
    this.mesh.position.set(fr.center[0] + fr.normal[0] * 0.002, fr.center[1], fr.center[2] + fr.normal[2] * 0.002);
    this.mesh.rotation.y = fr.yaw;
  }

  draw() {
    if (!this.texture) return;
    const g = this.ctx, W = BAR_PX.width, H = BAR_PX.height, s = this.state;
    g.fillStyle = '#121a17';
    g.fillRect(0, 0, W, H);
    g.strokeStyle = 'rgba(224,187,114,0.6)';
    g.lineWidth = 2;
    g.strokeRect(1, 1, W - 2, H - 2);
    g.textBaseline = 'middle';
    g.textAlign = 'right';
    g.fillStyle = '#efe5cf';
    g.font = `22px ${SANS}`;
    g.fillText(s.time, W - 14, 30);
    const timeW = s.time ? g.measureText(s.time).width + 30 : 0;
    g.textAlign = 'left';
    const name = s.name ?? s.status;
    fitFont(g, name, W - 28 - timeW, 24, { weight: '600', min: 14 });
    g.fillText(wrap(g, name, W - 28 - timeW, 1)[0] ?? '', 14, 30);
    for (const [id, ...box] of BAR_BUTTONS) {
      const what = id.split(':')[1];
      const disabled = (what === 'stop' && !s.name);
      button(g, box, labelOf(what, s), { selected: what === 'captions' && s.captions, hover: this.hover === id, disabled, size: 26 });
    }
    this.texture.needsUpdate = true;
  }
}
