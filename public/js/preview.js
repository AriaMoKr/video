// The room's two pictures, which tools/preview.mjs writes to public/:
//   hallway-preview.jpg, the picture the hallway's doorway to here shows (its README, "Adding a
//     door": 2:1, the room seen through the doorway, taken at eye height looking straight ahead,
//     its horizon a little above the middle): the room as one sees it coming in, from where the
//     visitor arrives (room.js layout's spawn), projected onto a picture hung as the hallway hangs
//     its doorways' pictures (its hall.js PICTURE: 2.4 m behind the opening, 3 m high, the horizon
//     at eye height and 56 % up), so through the doorway it looks like the room with some parallax.
//     Outside's preview.js.
//   social.jpg, 1280 × 640, for the link-preview tags (index.html og:image): the room from the
//     corner across from the doorway, so the doorway and the window are both in it.
import * as THREE from 'three';
import { EYE } from './room.js';

export const PREVIEW = { width: 2048, height: 1024, depth: 2.4, pictureHeight: 3.0, eye: 1.6, horizon: 0.56 };
export const SOCIAL = { width: 1280, height: 640, fov: 60 };

/** Where the hallway's picture is taken from and how wide it looks (the frustum at 1 m), and how it is hung. Pure. */
export function previewView(p = PREVIEW, from = { x: 0, y: 0, z: -0.6 }) {
  const half = (p.pictureHeight * (p.width / p.height)) / 2;
  return {
    eye: { x: from.x, y: from.y + p.eye, z: from.z },
    frustum: { left: -half / p.depth, right: half / p.depth, top: (p.pictureHeight * (1 - p.horizon)) / p.depth, bottom: -(p.pictureHeight * p.horizon) / p.depth },
    params: { depth: p.depth, pictureHeight: p.pictureHeight, eye: p.eye, horizon: p.horizon, aspect: p.width / p.height },
  };
}

/**
 * Where the social picture is taken from, and what it looks at: from near the far wall, off to one
 * side (not so far that the doorway's picture is seen edge on), looking back across the room to the
 * doorway's wall. With the window in a side wall, the side across from it, so the window is in view
 * along with the doorway; with the window in the far wall, from beside the doorway, looking at it.
 * Pure.
 * @param {object} L the room's layout (room.js layoutRoom)
 */
export function socialView(L) {
  const inset = 0.55;
  const side = L.window.wall === 'right' ? -1 : 1; // the camera's side: across from a side window
  if (L.window.wall === 'far') {
    return {
      eye: { x: L.x1 - inset, y: EYE, z: -inset - 0.2 },
      target: { x: L.window.along - L.width * 0.12, y: (L.window.bottom + L.window.top) / 2 - 0.25, z: L.z1 },
    };
  }
  const x = side * Math.min(L.width / 2 - inset, Math.max(L.door.width * 0.8, L.width * 0.15));
  return {
    eye: { x, y: EYE, z: L.z1 + inset },
    target: { x: -side * L.door.width * 0.9, y: L.door.height * 0.55, z: 0 },
  };
}

/**
 * Renders the scene from `shot` (a camera) into a canvas of its own, as the screen would show it
 * (tone mapped, sRGB): the renderer is resized for it, drawn, read at once, then put back. `hide`
 * is what the viewer has in front of their eyes (the fade, the vignette).
 * @returns {HTMLCanvasElement}
 */
function renderShot(renderer, scene, camera, shot, width, height, hide) {
  const size = renderer.getSize(new THREE.Vector2()), ratio = renderer.getPixelRatio();
  const shown = hide.map((o) => o.visible);
  for (const o of hide) o.visible = false;
  try {
    renderer.setPixelRatio(1);
    renderer.setSize(width, height, false);
    renderer.render(scene, shot);
    const out = document.createElement('canvas');
    out.width = width;
    out.height = height;
    out.getContext('2d').drawImage(renderer.domElement, 0, 0);
    return out;
  } finally {
    hide.forEach((o, i) => {
      o.visible = shown[i];
    });
    renderer.setPixelRatio(ratio);
    renderer.setSize(size.x, size.y, false);
    renderer.render(scene, camera);
  }
}

/**
 * The hallway's picture of the room, in a canvas.
 * @param {THREE.WebGLRenderer} renderer
 * @param {THREE.Scene} scene
 * @param {THREE.Camera} camera
 * @param {{ hide?: THREE.Object3D[], from?: { x: number, y: number, z: number }, view?: typeof PREVIEW }} [o] what to leave out (as renderShot's), where it is taken from (previewView's), and its size and hanging
 */
export function renderPreview(renderer, scene, camera, { hide = [], from, view = PREVIEW } = {}) {
  const f = previewView(view, from);
  const near = 0.05;
  const shot = new THREE.PerspectiveCamera();
  shot.position.set(f.eye.x, f.eye.y, f.eye.z);
  shot.updateMatrixWorld(true);
  const { left, right, top, bottom } = f.frustum;
  shot.projectionMatrix.makePerspective(left * near, right * near, top * near, bottom * near, near, 150);
  shot.projectionMatrixInverse.copy(shot.projectionMatrix).invert();
  return renderShot(renderer, scene, camera, shot, view.width, view.height, hide);
}

/** The social picture of the room, in a canvas. */
export function renderSocial(renderer, scene, camera, L, { hide = [], view = SOCIAL } = {}) {
  const v = socialView(L);
  const shot = new THREE.PerspectiveCamera(view.fov, view.width / view.height, 0.05, 150);
  shot.position.set(v.eye.x, v.eye.y, v.eye.z);
  shot.lookAt(v.target.x, v.target.y, v.target.z);
  shot.updateMatrixWorld(true);
  return renderShot(renderer, scene, camera, shot, view.width, view.height, hide);
}
