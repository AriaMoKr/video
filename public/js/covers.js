// What the room's canvases show, painted once or when it changes, never per frame: the tapes'
// covers (one atlas for every tape, a cell each: its decade's colour, made as its kind was shown,
// the show, a still from it, the episode, its kind and its year), the signs over the shelves and
// the sets (one atlas), a screen's picture while nothing plays on it (a still and its name, or what
// to do), and the captions under a show.
import * as THREE from 'three';
import { KIND_NAMES } from './catalogue.js';
import { GOLD, SANS, SERIF, enamel } from './textures.js';

/** Each decade's colour, on its tapes' spines and covers, its sign and its shelf's label. */
export const DECADE_COLORS = { '1920s': '#705634', '1930s': '#27466f', '1940s': '#7b2f2b', '1950s': '#1d6a6e', '1960s': '#b85d1c', '1970s': '#5f6a1f' };

/**
 * A cover's cell in the atlas, in pixels (the tapes' faces are 0.165 × 0.225 m), and how many to a
 * row at least: more as the catalogue grows, so that the atlas stays within `high` pixels high.
 */
export const COVER = { width: 200, height: 272, columns: 10, high: 4096 };

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
    this.columns = Math.max(COVER.columns, Math.ceil(episodes.length / Math.floor(COVER.high / COVER.height)));
    const rows = Math.max(1, Math.ceil(episodes.length / this.columns));
    this.canvas = canvas(COVER.width * this.columns, COVER.height * rows);
    this.texture = canvasTexture(this.canvas, anisotropy);
    this.draw(new Map());
  }

  /** Where episode i's cover is: [u0, v0, u1, v1] (v up, as the texture is flipped). */
  uv(i) {
    const W = this.canvas.width, H = this.canvas.height;
    const x = (i % this.columns) * COVER.width, y = Math.floor(i / this.columns) * COVER.height;
    return [x / W, 1 - (y + COVER.height) / H, (x + COVER.width) / W, 1 - y / H];
  }

  draw(stills) {
    const g = this.canvas.getContext('2d');
    this.episodes.forEach((e, i) => {
      const x = (i % this.columns) * COVER.width, y = Math.floor(i / this.columns) * COVER.height;
      g.save();
      g.translate(x, y);
      drawCover(g, e, stills.get(e.id));
      g.restore();
    });
    this.texture.needsUpdate = true;
  }
}

/**
 * One cover, COVER's size, at the origin: a case's sleeve in its decade's colour, made as its kind
 * (catalogue.js KINDS) was shown (KIND_COVERS), and along its bottom what it is and when.
 */
function drawCover(g, e, still) {
  const W = COVER.width, H = COVER.height, color = DECADE_COLORS[e.decade] ?? '#444';
  g.save();
  g.beginPath();
  g.rect(0, 0, W, H);
  g.clip();
  const grad = g.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, color);
  grad.addColorStop(1, shade(color, 0.55));
  g.fillStyle = grad;
  g.fillRect(0, 0, W, H);
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  (KIND_COVERS[e.kind] ?? KIND_COVERS.tv)(g, e, still, color);
  g.fillStyle = 'rgba(0,0,0,0.45)';
  g.fillRect(0, H - 20, W, 20);
  g.fillStyle = GOLD;
  const text = `${(KIND_NAMES[e.kind] ?? KIND_NAMES.tv)[0]} · ${e.year ?? e.decade} · ${e.minutes} min`;
  fitFont(g, text, W - 12, 13, { weight: '600', min: 10 });
  g.fillText(text, W / 2, H - 10);
  g.restore();
}

/** The cream of the sleeves' words, and the ink of a newspaper's. */
const CREAM = '#fff6e6', INK = '#15120e';

/**
 * Each kind's sleeve over its decade's colour (drawCover's, which adds the bottom): the show's name
 * across the top, a still from it in the middle, and the episode under it.
 * @type {Record<string, (g: CanvasRenderingContext2D, e: any, still: HTMLImageElement | undefined, color: string) => void>}
 */
const KIND_COVERS = {
  // Television: the picture on a set's rounded glass, two knobs and the speaker's slots beside it.
  tv(g, e, still) {
    lines(g, e.show, 34, { size: 24, min: 15, weight: '700', family: SERIF });
    g.beginPath();
    roundRect(g, 8, 60, 184, 148, 12);
    g.fillStyle = '#1f1a16';
    g.fill();
    g.strokeStyle = 'rgba(255,246,230,0.22)';
    g.lineWidth = 2;
    g.stroke();
    g.save();
    g.beginPath();
    roundRect(g, 16, 68, 140, 132, 18);
    g.clip();
    cover(g, still, 16, 68, 140, 132);
    const sheen = g.createLinearGradient(16, 68, 110, 200);
    sheen.addColorStop(0, 'rgba(255,255,255,0.22)');
    sheen.addColorStop(0.4, 'rgba(255,255,255,0)');
    g.fillStyle = sheen;
    g.fillRect(16, 68, 140, 132);
    g.restore();
    for (const y of [94, 126]) {
      g.beginPath();
      g.arc(174, y, 8, 0, Math.PI * 2);
      g.fillStyle = '#c9b58f';
      g.fill();
      g.fillStyle = '#3a2f25';
      g.fillRect(173, y - 7, 2, 7);
    }
    g.fillStyle = 'rgba(201,181,143,0.6)';
    for (let y = 150; y <= 192; y += 7) g.fillRect(166, y, 16, 3);
    lines(g, e.title, 229, { size: 17, min: 12, color: '#f3e6cc' });
  },

  // A silent film: an intertitle, black in a ruled frame, the picture in an oval as the iris shows it.
  silent(g, e, still) {
    const W = COVER.width, H = COVER.height;
    g.fillStyle = '#0c0b0a';
    g.fillRect(10, 10, W - 20, H - 40);
    g.strokeStyle = '#e9dfc9';
    g.lineWidth = 2;
    g.strokeRect(17, 17, W - 34, H - 54);
    g.lineWidth = 1;
    g.strokeRect(22, 22, W - 44, H - 64);
    for (const [x, y] of [[17, 17], [W - 17, 17], [17, H - 37], [W - 17, H - 37]]) {
      g.beginPath();
      g.moveTo(x, y - 6);
      g.lineTo(x + 6, y);
      g.lineTo(x, y + 6);
      g.lineTo(x - 6, y);
      g.closePath();
      g.fillStyle = '#e9dfc9';
      g.fill();
    }
    lines(g, e.show, 44, { size: 19, min: 13, weight: 'italic 600', family: SERIF, color: '#e9dfc9', width: W - 52 });
    // The oval, 140 × 112, darkening to its edge.
    g.save();
    g.translate(W / 2, 128);
    g.scale(1, 0.8);
    g.beginPath();
    g.arc(0, 0, 70, 0, Math.PI * 2);
    g.clip();
    g.scale(1, 1.25);
    cover(g, still, -70, -56, 140, 112);
    g.scale(1, 0.8);
    const iris = g.createRadialGradient(0, 0, 40, 0, 0, 70);
    iris.addColorStop(0, 'rgba(12,11,10,0)');
    iris.addColorStop(1, 'rgba(12,11,10,0.92)');
    g.fillStyle = iris;
    g.fillRect(-70, -70, 140, 140);
    g.restore();
    lines(g, e.title, 211, { size: 18, min: 12, weight: 'italic 600', family: SERIF, color: '#f5ecd8', width: W - 52 });
  },

  // A cartoon: the picture in a ring on a sunburst of its decade's colour, the words outlined.
  cartoon(g, e, still, color) {
    const W = COVER.width, cx = W / 2, cy = 134;
    g.fillStyle = shade(color, 1.5);
    for (let k = 0; k < 18; k += 2) {
      g.beginPath();
      g.moveTo(cx, cy);
      g.arc(cx, cy, 300, (k / 18) * Math.PI * 2, ((k + 1) / 18) * Math.PI * 2);
      g.closePath();
      g.fill();
    }
    g.beginPath();
    g.arc(cx, cy, 72, 0, Math.PI * 2);
    g.fillStyle = CREAM;
    g.fill();
    g.lineWidth = 3;
    g.strokeStyle = INK;
    g.stroke();
    g.save();
    g.beginPath();
    g.arc(cx, cy, 64, 0, Math.PI * 2);
    g.clip();
    cover(g, still, cx - 64, cy - 64, 128, 128);
    g.restore();
    g.beginPath();
    g.arc(cx, cy, 64, 0, Math.PI * 2);
    g.stroke();
    lines(g, e.show, 34, { size: 24, min: 15, weight: 'italic 800', stroke: INK });
    lines(g, e.title, 229, { size: 17, min: 12, weight: '700', stroke: INK });
  },

  // A short film: the picture a frame on a strip of film across the sleeve, its sprocket holes along both edges.
  film(g, e, still) {
    const W = COVER.width;
    lines(g, e.show, 34, { size: 24, min: 15, weight: '700', family: SERIF });
    g.fillStyle = '#121110';
    g.fillRect(0, 60, W, 148);
    g.fillStyle = '#ddd3bd';
    for (let x = 4; x < W; x += 19) {
      for (const y of [65, 194]) {
        g.beginPath();
        roundRect(g, x, y, 10, 9, 2);
        g.fill();
      }
    }
    g.fillStyle = '#2b2722';
    g.fillRect(0, 80, 18, 110);
    g.fillRect(W - 18, 80, 18, 110);
    g.save();
    g.beginPath();
    roundRect(g, 26, 80, 148, 110, 4);
    g.clip();
    cover(g, still, 26, 80, 148, 110);
    g.restore();
    lines(g, e.title, 229, { size: 17, min: 12, color: '#f3e6cc' });
  },

  // A newsreel: a newspaper's front page, its masthead across the top, the picture a photograph in
  // its margin and the headline under it.
  newsreel(g, e, still) {
    const W = COVER.width;
    g.fillStyle = '#efe7d4';
    g.fillRect(0, 0, W, 58);
    lines(g, e.show.toUpperCase(), 26, { size: 22, min: 13, weight: '800', family: SERIF, color: INK, width: W - 20 });
    g.fillStyle = INK;
    g.fillRect(8, 50, W - 16, 2);
    g.fillRect(8, 54, W - 16, 1);
    g.fillStyle = '#efe7d4';
    g.fillRect(10, 66, W - 20, 136);
    cover(g, still, 14, 70, W - 28, 128);
    lines(g, e.title.toUpperCase(), 228, { size: 16, min: 11, weight: '800', family: SERIF });
  },
};

/**
 * `text` across the sleeve in a line or two centred on y, as large as fits from `size` px down to
 * `min` (outlined in `stroke` if given).
 */
function lines(g, text, y, { size, min, weight = '600', family = SANS, color = CREAM, width = COVER.width - 16, stroke = '' }) {
  const words = String(text).split(/\s+/).filter(Boolean).join(' ');
  let out = [], s = size;
  for (; s >= min; s--) {
    g.font = `${weight} ${s}px ${family}`;
    out = wrap(g, words, width, 2);
    if (out.join(' ') === words) break;
  }
  const lead = Math.max(s, min) * 1.1, top = y - ((out.length - 1) * lead) / 2;
  out.forEach((line, k) => {
    if (stroke) {
      g.lineWidth = 4;
      g.lineJoin = 'round';
      g.strokeStyle = stroke;
      g.strokeText(line, COVER.width / 2, top + k * lead);
    }
    g.fillStyle = color;
    g.fillText(line, COVER.width / 2, top + k * lead);
  });
}

/** A rounded rectangle into the path (a plain one where the browser has no roundRect). */
function roundRect(g, x, y, w, h, r) {
  if (g.roundRect) g.roundRect(x, y, w, h, r);
  else g.rect(x, y, w, h);
}

/** A '#rrggbb' colour times k. */
function shade(hex, k) {
  const n = parseInt(hex.slice(1), 16);
  const c = [n >> 16, (n >> 8) & 255, n & 255].map((v) => Math.min(255, Math.round(v * k)));
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
