// Canvas textures, painted once and seeded, so the room looks the same on every visit: the floor's
// boards, the walls' plaster and the ceiling, nearly white, so the colours in config.js (baked into
// the vertices, scene.js) are the room's; and the hallway's enamel, for the control panel, and the
// picture the doorway shows until the Hallway's view of this door has loaded.
import * as THREE from 'three';

export const SERIF = '"Iowan Old Style", "Palatino Linotype", Palatino, Georgia, "Noto Serif", serif';
export const SANS = 'system-ui, -apple-system, "Segoe UI", Roboto, "Noto Sans", sans-serif';
export const GOLD = '#e0bb72';
const ENAMEL = '#14231f';

let anisotropy = 1;
export function setAnisotropy(n) {
  anisotropy = n;
}

function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

/** A seeded random number generator (mulberry32, the hallway's). */
export function rng(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function texture(c, { repeat = false } = {}) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = anisotropy;
  return t;
}

/** Soft blotches, for plaster and grain (the hallway's). */
function clouds(g, r, x0, y0, w, h, count, rgb, alpha, size) {
  for (let k = 0; k < count; k++) {
    const cx = x0 + r() * w, cy = y0 + r() * h, rad = size * (0.3 + r());
    const grad = g.createRadialGradient(cx, cy, 0, cx, cy, rad);
    grad.addColorStop(0, `rgba(${rgb},${alpha * (0.5 + r())})`);
    grad.addColorStop(1, `rgba(${rgb},0)`);
    g.fillStyle = grad;
    g.fillRect(cx - rad, cy - rad, rad * 2, rad * 2);
  }
}

function speckle(g, r, x0, y0, w, h, count, rgb, alpha) {
  for (let k = 0; k < count; k++) {
    g.fillStyle = `rgba(${rgb},${alpha * r()})`;
    g.fillRect(x0 + r() * w, y0 + r() * h, 1 + r() * 2, 1 + r() * 2);
  }
}

/** How much floor one repeat of floorTexture covers, in metres, each way. */
export const FLOOR_TILE = 1.6;

/** The floor: boards 0.16 m wide running in from the doorway, their ends staggered, with a grain. FLOOR_TILE square. */
export function floorTexture() {
  const S = 1024, boards = 10, B = S / boards;
  const c = canvas(S, S), g = c.getContext('2d'), r = rng(23);
  for (let i = 0; i < boards; i++) {
    const x0 = i * B;
    // Each board's run is cut once somewhere along the tile, so the joints don't line up.
    const cut = Math.floor(r() * S);
    for (const [y0, len] of [[cut - S, S], [cut, S]]) {
      const shade = 0.82 + r() * 0.18;
      const v = Math.round(255 * shade);
      g.save();
      g.beginPath();
      g.rect(x0, Math.max(0, y0), B, Math.min(S, y0 + len) - Math.max(0, y0));
      g.clip();
      g.fillStyle = `rgb(${v},${Math.round(v * 0.985)},${Math.round(v * 0.96)})`;
      g.fillRect(x0, 0, B, S);
      // The grain: long wavering lines down the board.
      for (let k = 0; k < 14; k++) {
        const gx = x0 + r() * B;
        g.strokeStyle = `rgba(70,50,30,${0.04 + r() * 0.07})`;
        g.lineWidth = 0.6 + r() * 1.6;
        g.beginPath();
        g.moveTo(gx, 0);
        for (let y = 0; y <= S; y += 64) g.lineTo(gx + Math.sin(y * 0.01 + k) * (2 + r() * 3), y);
        g.stroke();
      }
      clouds(g, r, x0 - 20, 0, B + 40, S, 6, '90,64,40', 0.06, 70);
      g.restore();
      // The joint across the board's end.
      g.fillStyle = 'rgba(40,28,18,0.55)';
      g.fillRect(x0, cut - 1, B, 3);
    }
    // The gap between boards (the canvas repeats, so its edge is one too).
    g.fillStyle = 'rgba(40,28,18,0.6)';
    g.fillRect(x0, 0, 2, S);
  }
  speckle(g, r, 0, 0, S, S, 1400, '60,42,26', 0.12);
  return texture(c, { repeat: true });
}

/** How much wall one repeat of the plaster covers, in metres, each way. */
export const WALL_TILE = 2;

/** The walls: plaster, nearly white, faintly mottled. WALL_TILE square. */
export function wallTexture() {
  const S = 512;
  const c = canvas(S, S), g = c.getContext('2d'), r = rng(5);
  g.fillStyle = '#f7f4ee';
  g.fillRect(0, 0, S, S);
  // Drawn three times across, so blotches at an edge carry on at the other: the canvas repeats.
  for (const ox of [-S, 0, S]) {
    for (const oy of [-S, 0, S]) {
      const rr = rng(5);
      g.save();
      g.translate(ox, oy);
      clouds(g, rr, 0, 0, S, S, 40, '150,138,118', 0.022, 90);
      clouds(g, rr, 0, 0, S, S, 30, '255,255,250', 0.04, 60);
      g.restore();
    }
  }
  speckle(g, r, 0, 0, S, S, 900, '120,110,96', 0.08);
  return texture(c, { repeat: true });
}

/** The ceiling: plain plaster, smoother than the walls'. WALL_TILE square. */
export function ceilingTexture() {
  const S = 256;
  const c = canvas(S, S), g = c.getContext('2d'), r = rng(7);
  g.fillStyle = '#f9f7f2';
  g.fillRect(0, 0, S, S);
  speckle(g, r, 0, 0, S, S, 300, '140,130,115', 0.06);
  return texture(c, { repeat: true });
}

/** A sign's ground: a wooden edge, dark green enamel and a gold line (the hallway's, for the control panel). */
export function enamel(g, w, h, inset) {
  g.fillStyle = '#2b1b10';
  g.fillRect(0, 0, w, h);
  const e = g.createLinearGradient(0, 0, 0, h);
  e.addColorStop(0, '#1b2e28');
  e.addColorStop(1, ENAMEL);
  g.fillStyle = e;
  g.fillRect(inset, inset, w - inset * 2, h - inset * 2);
  g.strokeStyle = GOLD;
  g.lineWidth = 3;
  g.strokeRect(inset + 8, inset + 8, w - (inset + 8) * 2, h - (inset + 8) * 2);
}

/**
 * The doorway's picture until the Hallway's view of this door has loaded, or when there is none
 * (a Hallway without this door yet): its glow, and the name of where it leads, as outside's.
 */
export function previewFallback(name, color) {
  const W = 1024, H = 512;
  const c = canvas(W, H), g = c.getContext('2d');
  const grad = g.createRadialGradient(W / 2, H * 0.55, 10, W / 2, H * 0.55, W * 0.6);
  grad.addColorStop(0, color);
  grad.addColorStop(1, '#050403');
  g.fillStyle = grad;
  g.fillRect(0, 0, W, H);
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillStyle = 'rgba(255,248,235,0.9)';
  // A doorway shows only the middle of the picture, less from further off: the name fits there.
  let size = 64;
  for (; size > 12; size -= 2) {
    g.font = `600 ${size}px ${SERIF}`;
    if (g.measureText(name).width <= W * 0.13) break;
  }
  g.fillText(name, W / 2, H * 0.5);
  return texture(c);
}
