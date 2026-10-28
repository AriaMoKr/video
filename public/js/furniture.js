// Draws a mode's furniture (modes.js furnish) into the room, as scene.js draws the room: the boxes
// merged into one mesh with the room's light baked into its vertices, the tapes' covers as one more
// (on the covers' atlas), the signs as one more, and then what changes: each screen (unlit, a
// still until it plays), the bar under the one in use, the captions on it, the frame round what is
// pointed at, and in the screening room the window's curtains. A mode's furniture is made when the
// room turns to it and let go of (dispose) when it turns to another; the covers' atlas stays.
import * as THREE from 'three';
import { Builder } from './builder.js';
import { bake, lightAt } from './bake.js';
import { faceFrame } from './modes.js';
import { CAPTION, CaptionStrip, ScreenCard, SignAtlas } from './covers.js';
import { ScreenBar } from './roompanel.js';

/** What everything is made of, as #rrggbb: the room's light is baked over it. */
export const MATERIALS = {
  shelf: '#7a5434', shelfBack: '#4b3423', dark: '#2b221c', walnut: '#5d3b25', oak: '#a27a4b', teak: '#84542f',
  woodgrain: '#93693f', chrome: '#cfd2d4', metal: '#5a5d61', plastic: '#333336', couch: '#7d3f2f', sofa: '#56705a',
  seat: '#7a2028', stage: '#3e2c21', black: '#0b0b0c', rug: '#82322c', counter: '#7c5b3b', grille: '#8f7d60',
  shade: '#f2e5c6', case: '#1d1d20', glass: '#050607', curtain: '#6d1a22', rail: '#3a2a1e',
};

const lin = (hex) => {
  const c = new THREE.Color(hex);
  return [c.r, c.g, c.b];
};
const ALBEDO = Object.fromEntries(Object.entries(MATERIALS).map(([k, v]) => [k, lin(v)]));

/** A face's rectangle as a quad into `b`, `d` out from its plane: its texture coordinates from uv ([u0, v0, u1, v1]), or 0…1. */
function faceQuad(b, f, { d = 0, uv = null, albedo = [1, 1, 1], grow = 0 } = {}) {
  const fr = faceFrame(f);
  const w = fr.width + 2 * grow, h = fr.height + 2 * grow;
  const o = [0, 1, 2].map((k) => fr.center[k] + fr.normal[k] * d - fr.right[k] * (w / 2) - (k === 1 ? h / 2 : 0));
  const base = b.count;
  b.quad(o, [fr.right[0] * w, 0, fr.right[2] * w], [0, h, 0], { seg: 99, albedo });
  if (uv) {
    for (let k = base; k < b.count; k++) {
      const s = b.uvs[k * 2], t = b.uvs[k * 2 + 1];
      b.uvs[k * 2] = uv[0] + s * (uv[2] - uv[0]);
      b.uvs[k * 2 + 1] = uv[1] + t * (uv[3] - uv[1]);
    }
  }
}

/** A plane mesh standing on a face, `d` in front of it. */
function onFace(mesh, f, d) {
  const fr = faceFrame(f);
  mesh.position.set(fr.center[0] + fr.normal[0] * d, fr.center[1], fr.center[2] + fr.normal[2] * d);
  mesh.rotation.y = fr.yaw;
  return mesh;
}

/** Vertical folds, for the curtains. */
function foldsTexture() {
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 4;
  const g = c.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 64, 0);
  for (const [at, v] of [[0, 0.62], [0.25, 1], [0.5, 0.7], [0.75, 0.95], [1, 0.62]]) grad.addColorStop(at, `rgb(${Math.round(255 * v)},${Math.round(255 * v)},${Math.round(255 * v)})`);
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 4);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = THREE.RepeatWrapping;
  return t;
}

/**
 * The furniture F (modes.js furnish) for the layout L, lit as the room is (scene.js buildRoom's
 * lighting and occlusion), its tapes' covers from `covers` (covers.js CoverAtlas).
 */
export function buildFurniture(L, F, { lighting, occlusion, covers, anisotropy = 1 }) {
  const group = new THREE.Group();
  group.name = `furniture: ${F.mode}`;
  const lit = (b) => bake(b, lighting, occlusion).toGeometry();
  const owned = []; // what dispose() lets go of
  const add = (geometry, material, name) => {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = name;
    group.add(mesh);
    owned.push(geometry, material);
    return mesh;
  };
  const lightColor = (p, n) => {
    const c = lightAt(p, n, lighting);
    return new THREE.Color(Math.min(1, c[0]), Math.min(1, c[1]), Math.min(1, c[2]));
  };

  // The boxes, and behind each cover its case, round each screen its glass, and the room panel's frame.
  const body = new Builder();
  for (const box of F.boxes) {
    if (box.visible === false) continue;
    body.box(box.min, box.max, { albedo: ALBEDO[box.material] ?? [0.5, 0.5, 0.5], skip: box.min[1] <= 0.001 ? ['-y'] : [] });
  }
  for (const { face: f } of F.tapes) {
    // A case 26 mm thick, its cover just in front of it.
    const p = f.at - f.facing * 0.028, q = f.at - f.facing * 0.002, lo = Math.min(p, q), hi = Math.max(p, q);
    body.box(f.axis === 'x' ? [lo, f.y0, f.a0] : [f.a0, f.y0, lo], f.axis === 'x' ? [hi, f.y1, f.a1] : [f.a1, f.y1, hi], { albedo: ALBEDO.case, skip: ['-y'] });
  }
  for (const s of F.screens) faceQuad(body, s.face, { d: -0.001, albedo: ALBEDO.glass, grow: 0.012 });
  {
    const P = F.panel;
    body.box([P.a0 - 0.025, P.y0 - 0.025, P.at + 0.004], [P.a1 + 0.025, P.y1 + 0.025, 0], { albedo: lin('#33231a'), skip: ['+z'] });
  }
  if (F.curtain) {
    const W = L.window, a0 = W.along - W.width / 2 - 0.34, a1 = W.along + W.width / 2 + 0.34, y = W.top + 0.16;
    if (W.wall === 'far') body.box([a0, y, L.z1], [a1, y + 0.04, L.z1 + 0.12], { albedo: ALBEDO.rail });
    else {
      const x = W.wall === 'left' ? L.x0 : L.x1, s = W.wall === 'left' ? 1 : -1;
      body.box([Math.min(x, x + s * 0.12), y, a0], [Math.max(x, x + s * 0.12), y + 0.04, a1], { albedo: ALBEDO.rail });
    }
  }
  const bodyMesh = add(lit(body), new THREE.MeshBasicMaterial({ vertexColors: true }), 'furniture');

  // The tapes' covers, lit as the shelves are.
  let tapeMesh = null;
  if (F.tapes.length) {
    const b = new Builder();
    for (const { episode, face } of F.tapes) faceQuad(b, face, { uv: covers.uv(episode) });
    tapeMesh = add(lit(b), new THREE.MeshBasicMaterial({ map: covers.texture, vertexColors: true }), 'tapes');
  }

  // The signs.
  const signs = new SignAtlas(F.signs.map((s) => s.text), anisotropy);
  owned.push(signs.texture);
  let signMesh = null;
  if (F.signs.length) {
    const b = new Builder();
    F.signs.forEach((s, i) => faceQuad(b, s.face, { uv: signs.uv(i) }));
    signMesh = add(lit(b), new THREE.MeshBasicMaterial({ map: signs.texture, vertexColors: true }), 'signs');
  }

  // The screens: unlit, as a picture tube is; each a still and its words until something plays on it.
  /** @type {Map<string, { screen: import('./modes.js').Screen, mesh: THREE.Mesh, card: ScreenCard, material: THREE.MeshBasicMaterial }>} */
  const screens = new Map();
  for (const s of F.screens) {
    const card = new ScreenCard(anisotropy);
    const fr = faceFrame(s.face);
    const material = new THREE.MeshBasicMaterial({ map: card.texture });
    const mesh = add(new THREE.PlaneGeometry(fr.width, fr.height), material, `screen: ${s.id}`);
    onFace(mesh, s.face, 0.001);
    owned.push(card.texture);
    screens.set(s.id, { screen: s, mesh, card, material });
  }

  // The bar under the screen in use, and the captions on it.
  const barFace = F.bar ?? F.screens[0]?.bar ?? null;
  const bar = new ScreenBar({ color: barFace ? lightColor(faceFrame(barFace).center, faceFrame(barFace).normal) : new THREE.Color(1, 1, 1), anisotropy });
  group.add(bar.mesh);
  owned.push(bar.mesh.geometry, bar.mesh.material, bar.texture);
  bar.place(F.bar);
  const captions = new CaptionStrip(anisotropy);
  const captionMesh = add(new THREE.PlaneGeometry(1, CAPTION.height / CAPTION.width), new THREE.MeshBasicMaterial({ map: captions.texture, transparent: true, depthWrite: false }), 'captions');
  captionMesh.visible = false;
  owned.push(captions.texture);

  // The frame round what is pointed at: four thin bars, moved to it (written into, never made anew).
  const frameGeometry = new THREE.BufferGeometry();
  const framePositions = new Float32Array(16 * 3);
  frameGeometry.setAttribute('position', new THREE.BufferAttribute(framePositions, 3));
  const idx = [];
  for (let q = 0; q < 4; q++) idx.push(q * 4, q * 4 + 1, q * 4 + 2, q * 4, q * 4 + 2, q * 4 + 3);
  frameGeometry.setIndex(idx);
  const frame = add(frameGeometry, new THREE.MeshBasicMaterial({ color: '#ffd98a', side: THREE.DoubleSide }), 'highlight');
  frame.visible = false;
  frame.renderOrder = 2;
  let framed = null;

  // The screening room's curtains, either side of the window, drawn over it while a show plays.
  const curtains = [];
  if (F.curtain) {
    const W = L.window, h = W.top - W.bottom + 0.32;
    const color = lightColor(L.window.wall === 'far' ? [W.along, 1.6, L.z1 + 0.3] : [W.wall === 'left' ? L.x0 + 0.3 : L.x1 - 0.3, 1.6, W.along], [0, 0, 1]);
    for (let k = 0; k < 2; k++) {
      const map = foldsTexture();
      const material = new THREE.MeshBasicMaterial({ map, color: new THREE.Color(MATERIALS.curtain).multiply(color) });
      const mesh = add(new THREE.BoxGeometry(1, h, 0.04), material, 'curtain');
      owned.push(map);
      mesh.position.y = (W.top + W.bottom) / 2 + 0.02;
      if (W.wall === 'far') mesh.position.z = L.z1 + 0.09;
      else {
        mesh.position.x = W.wall === 'left' ? L.x0 + 0.09 : L.x1 - 0.09;
        mesh.rotation.y = Math.PI / 2;
      }
      curtains.push({ mesh, map, base: material.color.clone() });
    }
  }
  let drawn = -1;
  /** The curtains drawn this far, 0 (open) to 1 (closed). */
  function setCurtains(k) {
    if (!curtains.length || k === drawn) return;
    drawn = k;
    const W = L.window, a0 = W.along - W.width / 2, a1 = W.along + W.width / 2;
    const spans = [[a0 - 0.3, a0 + 0.02 + k * (W.width / 2 + 0.02)], [a1 - 0.02 - k * (W.width / 2 + 0.02), a1 + 0.3]];
    curtains.forEach(({ mesh, map }, i) => {
      const [p, q] = spans[i], span = q - p, mid = (p + q) / 2;
      mesh.scale.x = span;
      map.repeat.x = Math.max(1, span / 0.14);
      if (W.wall === 'far') mesh.position.x = mid;
      else mesh.position.z = mid;
    });
  }
  setCurtains(0);

  const dimmed = [bodyMesh, tapeMesh, signMesh].filter(Boolean);
  return {
    group, screens, bar, captions, captionMesh,
    /** Puts the captions on a screen (or hides them: null). */
    placeCaptions(id) {
      const s = id && screens.get(id);
      captionMesh.visible = !!s;
      if (!s) return;
      const fr = faceFrame(s.screen.face);
      captionMesh.scale.setScalar(fr.width * 0.96);
      onFace(captionMesh, s.screen.face, 0.004);
      captionMesh.position.y = s.screen.face.y0 + (fr.width * 0.96 * CAPTION.height) / CAPTION.width / 2 + fr.height * 0.03;
    },
    /** The frame round a face (modes.js), or none. */
    highlight(face) {
      if (face === framed) return;
      framed = face;
      frame.visible = !!face;
      if (!face) return;
      const fr = faceFrame(face), b = Math.max(0.006, Math.min(0.014, fr.width * 0.04)), w = fr.width / 2 + b, h = fr.height / 2 + b;
      // Each bar's corners in the face's own plane (x right, y up), then into the world.
      const rects = [[-w, h - b, w, h], [-w, -h, w, -h + b], [-w, -h, -w + b, h], [w - b, -h, w, h]];
      let i = 0;
      for (const [x0, y0, x1, y1] of rects) {
        for (const [x, y] of [[x0, y0], [x1, y0], [x1, y1], [x0, y1]]) {
          framePositions[i++] = fr.center[0] + fr.right[0] * x + fr.normal[0] * 0.006;
          framePositions[i++] = fr.center[1] + y;
          framePositions[i++] = fr.center[2] + fr.right[2] * x + fr.normal[2] * 0.006;
        }
      }
      frameGeometry.attributes.position.needsUpdate = true;
      frameGeometry.computeBoundingSphere();
    },
    setCurtains,
    /** The lights down (k < 1, as bright as it looks) while a show plays, as in the room (scene.js setDim). */
    setDim(k) {
      const lin = k ** 2.2;
      for (const m of dimmed) /** @type {THREE.MeshBasicMaterial} */ (m.material).color.setScalar(lin);
      for (const c of curtains) c.mesh.material.color.copy(c.base).multiplyScalar(lin);
    },
    dispose() {
      for (const o of owned) o.dispose();
    },
  };
}
