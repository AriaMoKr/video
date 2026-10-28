// What the room's canvases show, painted once or when it changes, never per frame: the tapes'
// covers (one atlas for every tape, a cell each: its decade's colour, the show, a still from it, the
// episode and its year), the signs over the shelves and the sets (one atlas), a screen's picture
// while nothing plays on it (a still and its name, or what to do), and the captions under a show.
import * as THREE from 'three';
import { GOLD, SANS, SERIF, enamel } from './textures.js';

/** Each decade's colour, on its tapes' spines and covers, its sign and its shelf's label. */
export const DECADE_COLORS = { '1940s': '#7b2f2b', '1950s': '#1d6a6e', '1960s': '#b85d1c', '1970s': '#5f6a1f' };

/** A cover's cell in the atlas, in pixels (the tapes' faces are 0.22 × 0.30 m), and how many to a row. */
export const COVER = { width: 200, height: 272, columns: 10 };

function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

/** A texture of a canvas, as the room's others are. */
export function canvasTexture(c, anisotropy = 1) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = anisotropy;
  return t;
}

/** Sets the largest font, from `size` px down to `min`, at which `text` fits `width`; returns it. */
export function fitFont(g, text, width, size, { weight = '', family = SANS, min = 10 } = {}) {
  let s = size;
  for (; s > min; s--) {
    g.font = `${weight} ${s}px ${family}`;
    if (g.measureText(text).width <= width) break;
  }
  g.font = `${weight} ${s}px ${family}`;
  return s;
}

/** `text` broken into at most `lines` lines that fit `width` in the font set (the last one cut short with …). */
export function wrap(g, text, width, lines = 2) {
  const out = [];
  let line = '';
  const words = String(text).split(/\s+/).filter(Boolean);
  for (let i = 0; i < words.length; i++) {
    const next = line ? `${line} ${words[i]}` : words[i];
    if (g.measureText(next).width <= width || !line) {
      line = next;
      continue;
    }
    out.push(line);
    line = words[i];
    if (out.length === lines - 1) {
      line = words.slice(i).join(' ');
      break;
    }
  }
  if (line) out.push(line);
  const last = out.length - 1;
  if (last >= 0 && g.measureText(out[last]).width > width) {
    let s = out[last];
    while (s.length > 1 && g.measureText(`${s}…`).width > width) s = s.slice(0, -1);
    out[last] = `${s.trimEnd()}…`;
  }
  return out;
}

/** Draws `img` into the box, covering it (cropped to its shape), or a dark ground if there is none. */
function cover(g, img, x, y, w, h) {
  g.fillStyle = '#0d0d0d';
  g.fillRect(x, y, w, h);
  if (!img?.naturalWidth) return;
  const s = Math.max(w / img.naturalWidth, h / img.naturalHeight);
  const sw = w / s, sh = h / s;
  g.drawImage(img, (img.naturalWidth - sw) / 2, (img.naturalHeight - sh) / 2, sw, sh, x, y, w, h);
}

/** Loads the episodes' stills (same origin): a Map from an episode's id to its image, once all are in or failed. */
export async function loadStills(episodes, base = document.baseURI) {
  const stills = new Map();
  await Promise.all(episodes.map((e) => new Promise((resolve) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => {
      stills.set(e.id, img);
      resolve();
    };
    img.onerror = () => resolve();
    img.src = new URL(e.still, base).href;
  })));
  return stills;
}

/**
 * The tapes' covers, every episode's in one canvas (COVER cells, in the catalogue's order), and
 * where each one is in it as texture coordinates. Drawn with the stills there are (draw() again
 * when they have come).
 */
export class CoverAtlas {
  constructor(episodes, anisotropy = 1) {
    this.episodes = episodes;
    const rows = Math.max(1, Math.ceil(episodes.length / COVER.columns));
    this.canvas = canvas(COVER.width * COVER.columns, COVER.height * rows);
    this.texture = canvasTexture(this.canvas, anisotropy);
    this.draw(new Map());
  }

  /** Where episode i's cover is: [u0, v0, u1, v1] (v up, as the texture is flipped). */
  uv(i) {
    const W = this.canvas.width, H = this.canvas.height;
    const x = (i % COVER.columns) * COVER.width, y = Math.floor(i / COVER.columns) * COVER.height;
    return [x / W, 1 - (y + COVER.height) / H, (x + COVER.width) / W, 1 - y / H];
  }

  draw(stills) {
    const g = this.canvas.getContext('2d');
    this.episodes.forEach((e, i) => {
      const x = (i % COVER.columns) * COVER.width, y = Math.floor(i / COVER.columns) * COVER.height;
      g.save();
      g.translate(x, y);
      drawCover(g, e, stills.get(e.id));
      g.restore();
    });
    this.texture.needsUpdate = true;
  }
}

/** One cover, COVER's size, at the origin: a case's sleeve in its decade's colour. */
function drawCover(g, e, still) {
  const W = COVER.width, H = COVER.height, color = DECADE_COLORS[e.decade] ?? '#444';
  const grad = g.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, color);
  grad.addColorStop(1, shade(color, 0.55));
  g.fillStyle = grad;
  g.fillRect(0, 0, W, H);
  // The show's name across the top.
  g.fillStyle = '#fff6e6';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  fitFont(g, e.show, W - 20, 24, { weight: '700', family: SERIF, min: 15 });
  const show = wrap(g, e.show, W - 16, 2);
  show.forEach((line, k) => g.fillText(line, W / 2, (show.length === 1 ? 34 : 22) + k * 24));
  // A still from it, framed.
  g.fillStyle = 'rgba(0,0,0,0.5)';
  g.fillRect(6, 62, W - 12, 144);
  cover(g, still, 9, 65, W - 18, 138);
  // The episode, and when.
  g.fillStyle = '#f3e6cc';
  fitFont(g, e.title, W - 16, 17, { weight: '600', min: 12 });
  const title = wrap(g, e.title, W - 14, 2);
  title.forEach((line, k) => g.fillText(line, W / 2, (title.length === 1 ? 228 : 218) + k * 19));
  g.fillStyle = 'rgba(0,0,0,0.35)';
  g.fillRect(0, H - 20, W, 20);
  g.fillStyle = GOLD;
  g.font = `600 13px ${SANS}`;
  g.fillText(`${e.year ?? e.decade} · ${e.minutes} min`, W / 2, H - 10);
}

/** A '#rrggbb' colour times k. */
function shade(hex, k) {
  const n = parseInt(hex.slice(1), 16);
  const c = [n >> 16, (n >> 8) & 255, n & 255].map((v) => Math.round(v * k));
  return `rgb(${c.join(',')})`;
}

/** A sign's cell, 4:1 as every sign's face is. */
export const SIGN = { width: 512, height: 128 };

/** The signs' words in one canvas, a cell each, top to bottom; uv(i) as CoverAtlas's. */
export class SignAtlas {
  constructor(texts, anisotropy = 1) {
    this.canvas = canvas(SIGN.width, SIGN.height * Math.max(1, texts.length));
    this.texture = canvasTexture(this.canvas, anisotropy);
    const g = this.canvas.getContext('2d');
    texts.forEach((text, i) => {
      g.save();
      g.translate(0, i * SIGN.height);
      enamel(g, SIGN.width, SIGN.height, 6);
      const color = DECADE_COLORS[text];
      if (color) {
        g.fillStyle = color;
        g.fillRect(24, 24, 18, SIGN.height - 48);
        g.fillRect(SIGN.width - 42, 24, 18, SIGN.height - 48);
      }
      g.fillStyle = GOLD;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      fitFont(g, text, SIGN.width - 110, 64, { weight: '600', family: SERIF });
      g.fillText(text, SIGN.width / 2, SIGN.height / 2 + 3);
      g.restore();
    });
    this.texture.needsUpdate = true;
    this.count = texts.length;
  }

  uv(i) {
    const n = this.count;
    return [0, 1 - (i + 1) / n, 1, 1 - i / n];
  }
}

/** A screen's picture while nothing plays on it: 4:3. */
export const CARD = { width: 512, height: 384 };

/**
 * What a screen shows while it is not playing: a still, dimmed as a set's glass, and its words (the
 * show and the episode, or what to do), redrawn only when they change.
 */
export class ScreenCard {
  constructor(anisotropy = 1) {
    this.canvas = canvas(CARD.width, CARD.height);
    this.texture = canvasTexture(this.canvas, anisotropy);
    this._key = null;
    this.show(null, ['']);
  }

  /** The still (an image, or null) and up to three lines: the first large, the rest smaller. */
  show(still, lines) {
    const key = `${still?.src ?? ''}|${lines.join('|')}`;
    if (key === this._key) return;
    this._key = key;
    const g = this.canvas.getContext('2d'), W = CARD.width, H = CARD.height;
    cover(g, still, 0, 0, W, H);
    // The glass: darker at its edges, and the words in a band across the bottom.
    const v = g.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, W * 0.65);
    v.addColorStop(0, still ? 'rgba(0,0,0,0.15)' : 'rgba(40,60,70,0.9)');
    v.addColorStop(1, still ? 'rgba(0,0,0,0.6)' : 'rgba(6,10,12,1)');
    g.fillStyle = v;
    g.fillRect(0, 0, W, H);
    const text = lines.filter(Boolean);
    if (text.length) {
      const band = 34 + text.length * 34;
      g.fillStyle = 'rgba(0,0,0,0.72)';
      g.fillRect(0, H - band, W, band);
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      text.forEach((line, k) => {
        g.fillStyle = k ? '#e9dcc2' : '#fff6e6';
        fitFont(g, line, W - 40, k ? 24 : 32, { weight: k ? '' : '600', family: k ? SANS : SERIF });
        g.fillText(line, W / 2, H - band + 32 + k * 36);
      });
    }
    this.texture.needsUpdate = true;
  }
}

/** The captions' strip under a show: wide and short, drawn when the words change. */
export const CAPTION = { width: 1024, height: 160 };

export class CaptionStrip {
  constructor(anisotropy = 1) {
    this.canvas = canvas(CAPTION.width, CAPTION.height);
    this.texture = canvasTexture(this.canvas, anisotropy);
    this.text = null;
    this.set('');
  }

  /** The words showing ('' for none): up to two lines, on a dark box as a TV's captions are. */
  set(text) {
    if (text === this.text) return;
    this.text = text;
    const g = this.canvas.getContext('2d'), W = CAPTION.width, H = CAPTION.height;
    g.clearRect(0, 0, W, H);
    if (!text) {
      this.texture.needsUpdate = true;
      return;
    }
    g.font = `600 52px ${SANS}`;
    let lines = wrap(g, text.replace(/\n/g, ' '), W - 60, 2);
    if (lines.length > 1) {
      g.font = `600 46px ${SANS}`;
      lines = wrap(g, text.replace(/\n/g, ' '), W - 60, 2);
    }
    const lh = lines.length > 1 ? 58 : 64;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    const top = H - lines.length * lh - 8;
    for (const [k, line] of lines.entries()) {
      const w = g.measureText(line).width + 32;
      g.fillStyle = 'rgba(0,0,0,0.8)';
      g.fillRect((W - w) / 2, top + k * lh, w, lh);
      g.fillStyle = '#ffffff';
      g.fillText(line, W / 2, top + k * lh + lh / 2 + 2);
    }
    this.texture.needsUpdate = true;
  }
}
