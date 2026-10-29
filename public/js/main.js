// video: a room behind one of the Hallway's doors to watch old television in, the public-domain
// shows of archive.org's Classic TV collection, made from RoomTemplateEmpty (its README, "Making a
// room from this template"; what a copy changes is config.js). Coming in through the door, the
// visitor carries on from how they went through it (the Hallway's link: where in the doorway, which
// way they faced); behind them the doorway glows and shows the hall, and going back through it
// leads back to the Hallway, in front of this room's door (common's door.js). In the room: a floor,
// four walls, a ceiling, the lamps, a window onto common's afternoon sky, the control panel by the
// doorway, and the room's own panel on its other side. The room is one of four (modes.js): a video
// store (the first a visitor sees), a den, a screening room and a gallery of each decade's sets,
// furnished by furniture.js, its tapes and sets playing their episodes (catalogue.js, from
// public/catalogue/) on its screens (player.js, through the archive proxy). What hangs on its walls
// (config.js's pieces, none yet) may lead to other places, and back to stand in front of it again
// (common's hallLink). The shared session (layersharedsession's together.js) comes in here too, and
// goes back out; in one, everyone in the room sees the same mode and the same show at the same
// moment. In the Android TV app (common's tv.js) it is the 10-foot view, walked with the remote.
// Outside's main.js, without its garden and its book.
import * as THREE from 'three';
import { ROOM } from './config.js';
import { DOOR, EYE, doorCrossed, doorSpawn, layoutRoom, pieceSpawn } from './room.js';
import { DEFAULT_MODE, MODES, MODE_NAMES, SEATED_EYE, faceFrame, furnish, screenFor } from './modes.js';
import { buildFurniture } from './furniture.js';
import { CoverAtlas, loadStills } from './covers.js';
import { RoomPanel } from './roompanel.js';
import { Player } from './player.js';
import { clock, detailsUrl, episodeName, proxyOf, readCatalogue } from './catalogue.js';
import { buildRoom } from './scene.js';
import { Controls } from './controls.js';
import { Overlay } from './overlay.js';
import { APP_ID, noticeText, statusText } from './presence.js';
import { setAnisotropy } from './textures.js';
import { renderPreview, renderSocial, previewView, socialView } from './preview.js';
import { hallLink, hallwayViews, keptWay, leaveUrl, readVisit, wayBack, withoutVisit } from 'common/door.js';
import { Fade } from 'common/fade.js';
import { NAV_KEY, loadNav, saveNav } from 'common/nav.js';
import { ACCESS_KEY, Vignette, eyeLift, loadAccess, motionQuery, reduceMotion, saveAccess, watchMotion } from 'common/access.js';
import { Remote, tvMode } from 'common/tv.js';
import { createTogether } from 'layersharedsession/together.js';
import { roomFromUrl } from 'layersharedsession/room.js';

const params = new URLSearchParams(location.search);
// The TV app's page (?tv=emulate: as if, in any browser).
const tv = tvMode();
document.documentElement.classList.toggle('tv', tv);

// Dev: emulate a Quest 3 with IWER (before anything asks navigator.xr). Chromium has a native
// navigator.xr even without a headset, so it is replaced.
let xrDevice = null;
if (params.get('xr') === 'emulate') {
  try {
    const { XRDevice, metaQuest3 } = await import(new URL('../vendor/iwer/iwer.module.js', import.meta.url).href);
    xrDevice = new XRDevice(metaQuest3);
    xrDevice.installRuntime({ forceInstall: true });
    console.info(`${ROOM.id}: IWER WebXR emulation installed (Meta Quest 3)`);
  } catch (err) {
    console.warn(`${ROOM.id}: no WebXR emulation: ${err.message}`);
  }
}

// ── How the visitor came, and the way back ───────────────────────────────────
// What the door added to the address is read once and taken off it. The way back, and the
// doorway's size and glow, stay for this tab (a reload) in sessionStorage. Back from where a piece
// on the walls leads (?from=<its id>, with no way back of its own), the kept way back stays.

const VISIT_KEY = `${ROOM.id}.visit`;
const visit = readVisit(location.search);
const backFrom = params.has('back') ? -1 : ROOM.pieces.findIndex((p) => p.id === visit.from);
const cameThrough = (visit.from !== null && backFrom < 0) || params.has('back');
function kept() {
  try {
    const k = JSON.parse(sessionStorage.getItem(VISIT_KEY) ?? 'null');
    const way = k && keptWay(JSON.stringify(k.way));
    return way ? { way, glow: /^#[0-9a-f]{6}$/.test(k.glow) ? k.glow : null, dw: k.dw ?? null, dh: k.dh ?? null } : null;
  } catch {
    return null; // no storage (a private window, blocked site data): the way back lasts this page only
  }
}
const before = cameThrough ? null : kept();
const way = before?.way ?? wayBack(location.search, ROOM.id, { origin: location.origin });
const glow = visit.glow ?? before?.glow ?? ROOM.glow;
const doorWidth = visit.dw ?? before?.dw ?? DOOR.width;
const doorHeight = visit.dh ?? before?.dh ?? DOOR.height;
try {
  sessionStorage.setItem(VISIT_KEY, JSON.stringify({ way, glow, dw: doorWidth, dh: doorHeight }));
} catch {
  // As above.
}
const unvisited = withoutVisit(location.href);
if (unvisited !== location.pathname + location.search + location.hash) history.replaceState(history.state, '', unvisited);
// Where the doorway leads, as short as on the way's label: the Hallway, or the place's own name.
const leadsTo = way.hallway ? 'Hallway' : way.label.replace(/^← /, '');

/**
 * Where piece i on the walls leads, with the way back to this room (common's hallLink: back in
 * front of it, ?from=<its id>), named by its title, and the shared session's room.
 */
function pieceUrl(i) {
  const p = ROOM.pieces[i];
  return hallLink({ id: p.id, url: p.link }, { here: location.href, name: ROOM.title, room: together?.room ?? null });
}

let together = null; // the shared session, made once the scene is (below)
let leftBy = -1; // the piece the visitor went by, else -1 (the doorway)
const overlay = new Overlay(ROOM, way, {
  href: () => leaveUrl(way, together?.room ?? null),
  pieceHref: pieceUrl,
  onLeave: (i) => {
    leftBy = i;
    together?.pause();
  },
  tv,
});

let renderer;
try {
  renderer = new THREE.WebGLRenderer({ antialias: true });
} catch (err) {
  overlay.noWebGL('This browser cannot show the room in 3D. The way back to the Hallway is above.');
  throw err;
}
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.xr.enabled = true;
renderer.xr.setReferenceSpaceType('local-floor');
// The view, to a screen reader: a picture of the room, as the mode furnishes it (what can be done
// in it is in the card).
renderer.domElement.setAttribute('role', 'img');
/** Each mode, in words. */
const DESCRIBED = {
  store: 'a video store: tapes face out on shelves down the left wall, a counter with a till by the door, and a television and a couch at the back',
  den: 'a den: a console television against the far wall, a sofa and a coffee table on a rug, a standard lamp, and shelves of tapes',
  screening: 'a screening room: a big screen over a low stage, three rows of seats either side of an aisle, and shelves of tapes by the door',
  gallery: 'a gallery of television sets, one from each decade from the 1940s to the 1970s, each showing its own shows, and a bench',
};
const onWalls = ROOM.pieces.map((p) => p.title).join(', ');
const describe = (mode) => renderer.domElement.setAttribute('aria-label', `${ROOM.title}, ${DESCRIBED[mode]}, a window onto the afternoon sky, ${onWalls ? '' : 'and '}the doorway back to the ${leadsTo}${onWalls ? `, and on the walls: ${onWalls}` : ''}`);
document.getElementById('app').append(renderer.domElement);
const anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
setAnisotropy(anisotropy);

const scene = new THREE.Scene();
scene.background = new THREE.Color('#0b0907');
const camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.03, 150);
/** A tall screen (a phone held upright) gets a taller view, as in the hallway. */
function fitCamera() {
  camera.aspect = innerWidth / innerHeight;
  const wide = (2 * Math.atan(Math.tan((60 / 2) * THREE.MathUtils.DEG2RAD) / camera.aspect)) * THREE.MathUtils.RAD2DEG;
  camera.fov = Math.min(100, Math.max(70, wide));
  camera.updateProjectionMatrix();
}
fitCamera();
const rig = new THREE.Group();
rig.name = 'rig';
rig.add(camera);
scene.add(rig);

const L = layoutRoom(ROOM, { doorWidth, doorHeight });
const room = buildRoom(L, { colors: ROOM.colors, skyYaw: ROOM.skyYaw, glow, name: leadsTo, anisotropy });
scene.add(room.group);
// Through the doorway, the view the Hallway publishes from its door to here (its views.json); until
// it has loaded, or when there is none (a Hallway without this door yet), its glow and name.
const views = hallwayViews(way, ROOM.id);
if (views) room.loadView([views]);
// The room's own panel, left of the doorway: its mode and what is showing.
const roomPanel = new RoomPanel({ face: furnish(L, DEFAULT_MODE, []).panel, color: room.lightColor([-L.panel.x, L.panel.y, -0.05], [0, 0, -1]), anisotropy });
room.group.add(roomPanel.mesh);
const roomPanelColor = roomPanel.mesh.material.color.clone();
// The pictures on the walls (their titles until they have loaded): the room is ready with them.
let pictured = false;
room.loadPictures().then(() => {
  pictured = true;
});

const controls = new Controls({ renderer, camera, rig, scene, dom: renderer.domElement, layout: L });
const nav = loadNav();
controls.setNav(nav);
// The accessibility settings every site on the origin shares (common/access.js, hallway.access):
// less motion (the system's, or the visitor's own), the comfort vignette, seated mode. Applied
// below (applyAccess), once everything they touch is made.
let access = loadAccess();
const motion = motionQuery();
let reduce = reduceMotion(access, motion);
/** With less motion, a fade of a few tenths of a second is a blink. */
const blink = (seconds) => (reduce ? 0.08 : seconds);
const fade = new Fade(camera, 1);
const vignette = new Vignette(camera, access.vignette);

// In through the door: where the visitor went through, turned as they were (and looking as high).
// Back from where a piece leads: in front of it, facing into the room.
{
  const s = backFrom >= 0 ? pieceSpawn(L, backFrom) : doorSpawn(L, visit.dx ?? 0, visit.yaw ?? 0);
  controls.setPose(s.x, s.z, s.yaw, backFrom >= 0 ? 0 : visit.pitch ?? 0);
}

// ── Going back out, or on ────────────────────────────────────────────────────

let leaving = false;
let leaveTimer = 0;
/** Out: back through the doorway, or with a piece's index, where it leads. */
function go(piece = -1) {
  if (leaving) return;
  leaving = true;
  leftBy = piece;
  const url = piece >= 0 ? pieceUrl(piece) : leaveUrl(way, together.room);
  // Leave the shared session now, so the others see the visitor go at once (the link carries its
  // room on): the fade, and then until it is left (half a second at most), give the leaving message
  // time to go out.
  const left = Promise.race([together.pause(), new Promise((r) => setTimeout(r, 500))]);
  fade.to(1, blink(renderer.xr.isPresenting ? 0.3 : 0.4), () => left.then(() => location.assign(url)));
  // Still here a while later (the navigation was stopped or failed): come back in.
  clearTimeout(leaveTimer);
  leaveTimer = setTimeout(arrive, 12000);
}

/** In here again (from the back/forward cache, or after a navigation that did not happen): at the doorway, or the piece gone by. */
function arrive() {
  leaving = false;
  clearTimeout(leaveTimer);
  const s = leftBy >= 0 ? pieceSpawn(L, leftBy) : doorSpawn(L);
  controls.setPose(s.x, s.z, s.yaw);
  together.resume();
  fade.to(0, blink(0.6));
}

window.addEventListener('pageshow', (e) => {
  if (!e.persisted) return;
  rereadSettings(); // changed elsewhere on the origin while this page was away
  arrive();
});
// Leaving the page another way (a link, the address bar, closing it): leave the session too.
window.addEventListener('pagehide', () => together.pause());

// On a screen, choosing the doorway walks up to it and through; with less motion, straight through.
controls.onDoor = (how) => {
  if (how === 'xr' || reduce) go();
  else controls.walkInto();
};
// Choosing something on a wall walks up to it (in VR, a step there); one that leads somewhere, then
// on through it, or straight away in VR or with less motion. In the card, its link goes at once.
controls.onPiece = (i, how) => {
  if (!L.pieces[i].link) controls.walkUpTo(i);
  else if (how === 'xr' || reduce) go(i);
  else controls.walkUpTo(i, () => go(i));
};
overlay.onPiece = (i) => controls.walkUpTo(i);

let active = false;
controls.onActivity = () => {
  if (active) return;
  active = true;
  overlay.hideHint();
};
overlay.setHint(tv ? 'tv' : matchMedia('(pointer: coarse)').matches ? 'touch' : 'mouse');

// ── On a TV, the remote ──────────────────────────────────────────────────────
// common's tv.js: walking, the view holds the focus, the arrows walk and turn (controls.js's keys)
// and OK uses the middle of the view, where the dot is; Menu moves the focus into the card. The app
// asks window.hallwayTV what Back and Menu do (answerApp): Back leaves the card, else it is the
// room's own step back (stepBack), else the app goes back a page, to this room's door in the hallway.

/**
 * Back on a TV while walking: the room's own step back, true when it took one (common's README,
 * "The TV app"): a show playing stops (the tape goes back on its shelf), and then one sitting stands
 * up; then it is the app's, back to the Hallway.
 */
function stepBack() {
  if (player.episode >= 0) {
    playerAction('stop');
    return true;
  }
  return controls.stand();
}

let remote = null;
if (tv) {
  controls.aimMiddle = true;
  renderer.domElement.setAttribute('aria-describedby', overlay.hint.id);
  remote = new Remote({ root: overlay.root, view: renderer.domElement, use: () => controls.useMiddle(), step: stepBack });
  remote.onMode = (inCard) => overlay.setHint(inCard ? 'tv-card' : 'tv');
  remote.answerApp(tv);
}

// ── Fullscreen, and the gamepad ──────────────────────────────────────────────

const root = document.documentElement;
const fullscreenElement = () => document.fullscreenElement || document.webkitFullscreenElement || null;
function toggleFullscreen() {
  const request = fullscreenElement()
    ? (document.exitFullscreen || document.webkitExitFullscreen).call(document)
    : (root.requestFullscreen || root.webkitRequestFullscreen).call(root);
  Promise.resolve(request).catch((err) => overlay.toast(`Could not change fullscreen: ${err.message}`, 5));
}
function onFullscreenChange() {
  const on = !!fullscreenElement();
  overlay.setFullscreen(on);
  if (on) overlay.toast(controls.hasPad ? 'Esc or B leaves fullscreen' : 'Esc leaves fullscreen', 4);
}
// Browsers that cannot (an iPhone's) do not get the button, nor does the TV app, which is full screen.
if (!tv && (document.fullscreenEnabled || document.webkitFullscreenEnabled)) {
  overlay.showFullscreen(toggleFullscreen);
  document.addEventListener('fullscreenchange', onFullscreenChange);
  document.addEventListener('webkitfullscreenchange', onFullscreenChange);
}
// As in the hallway: the gamepad takes over when used (its hint, and a dot in the middle of the
// view to aim with), and the mouse takes it back. B or Back leaves fullscreen; on a TV, it is the
// remote's Back.
controls.onPadActive = (on) => {
  if (on) overlay.setHint('gamepad');
};
controls.onPadBack = () => {
  if (remote) remote.padBack();
  else if (fullscreenElement()) toggleFullscreen();
};

// ── VR ───────────────────────────────────────────────────────────────────────

const SESSION_INIT = { optionalFeatures: ['local-floor', 'bounded-floor', 'hand-tracking'] };
let entering = false;
async function enterVR() {
  if (renderer.xr.isPresenting) {
    await renderer.xr.getSession().end();
    return;
  }
  if (entering || !navigator.xr) return;
  entering = true;
  try {
    const session = await navigator.xr.requestSession('immersive-vr', SESSION_INIT);
    await renderer.xr.setSession(session);
  } catch (err) {
    console.error(err);
    overlay.toast(`Could not start VR: ${err.message}`, 6);
  } finally {
    entering = false;
  }
}
let vrSupported = false;
renderer.xr.addEventListener('sessionstart', () => {
  overlay.setVR(true);
  showPanel();
});
renderer.xr.addEventListener('sessionend', () => {
  overlay.setVR(false);
  showPanel();
});
// Not on a TV, which has no headset (nor, so far, a WebXR in its WebView): the panel says so.
if (!tv) navigator.xr?.isSessionSupported?.('immersive-vr').then((ok) => {
  vrSupported = ok;
  showPanel();
  if (ok) overlay.showVR(enterVR);
}, () => {});
// Walking in from the Hallway's VR (Quest Browser): the browser grants this page a session without
// a click, for about 5 s and only within one origin (the hallway's README, "Linking back"). The
// inline script in index.html notes a grant made before this module ran.
const takeGranted = () => {
  if (!renderer.xr.isPresenting) enterVR();
};
if (!tv) {
  if (window.roomXrGranted) takeGranted();
  navigator.xr?.addEventListener?.('sessiongranted', takeGranted);
}

// ── The control panel on the wall (and the same choices in the card) ─────────

function showPanel() {
  room.panel.set({
    vr: renderer.xr.isPresenting ? 'exit' : vrSupported ? 'enter' : 'none',
    move: nav.move,
    turn: nav.turn,
    motion: access.motion,
    vignette: access.vignette,
    seated: access.seated,
    room: together?.room ?? null,
    link: together?.inviteLink.replace(/^https?:\/\//, '') ?? '',
    status: together?.active ? statusText(together.company(), together.condition()) : '',
  });
  overlay.setChoices(nav, access);
  overlay.setSession(!!together?.room);
}
showPanel();
/** Starts a shared session, or leaves the one this is in. */
function toggleSession() {
  if (together.room) {
    together.stop();
    overlay.toast('You left the shared session');
  } else {
    together.start();
    overlay.toast(tv ? 'Shared session started: the card (Menu) shows the link that brings others in here' : 'Shared session started: Copy invite link to bring others in here', 5);
  }
}
/** A VR movement choice ('move' or 'turn'), kept for here and the hallway (common/nav.js). */
function choose(key, value) {
  nav[key] = value;
  controls.setNav(nav);
  saveNav(nav);
  showPanel();
}
controls.onPanel = (id) => {
  if (id === 'vr') {
    if (renderer.xr.isPresenting || vrSupported) enterVR(); // enters, or exits when in VR
    return;
  }
  if (id === 'session') {
    toggleSession();
    return;
  }
  const [key, value] = id.split(':');
  if (key === 'motion') setAccess({ motion: value });
  else if (key === 'vignette' || key === 'seated') setAccess({ [key]: value === 'on' });
  else choose(key, value);
};
overlay.onSession = toggleSession;
overlay.onNav = choose;
overlay.onAccess = (change) => setAccess(change);
// A teleport in VR blinks: a moment of black hides the jump.
controls.onTeleport = (move) => {
  if (leaving || !renderer.xr.isPresenting) {
    move();
    return;
  }
  fade.to(1, 0.08, () => {
    move();
    fade.to(0, blink(0.2));
  });
};

// ── The room's modes, its episodes and what is showing ───────────────────────
// The mode is kept for the next visit (localStorage, video.room, with the captions), unless the
// address asks for one (?mode=den, for this visit). The catalogue (public/catalogue/) is loaded once;
// the furniture is made for the mode, and made again for another.

const ROOM_KEY = `${ROOM.id}.room`;
function loadRoom() {
  try {
    const k = JSON.parse(localStorage.getItem(ROOM_KEY) ?? 'null');
    return { mode: MODES.includes(k?.mode) ? k.mode : DEFAULT_MODE, captions: k?.captions === true };
  } catch {
    return { mode: DEFAULT_MODE, captions: false };
  }
}
const keptRoom = loadRoom();
const asked = params.get('mode');
let mode = MODES.includes(/** @type {any} */ (asked)) ? asked : keptRoom.mode;
function saveRoom() {
  try {
    localStorage.setItem(ROOM_KEY, JSON.stringify({ mode, captions: player.captions }));
  } catch {
    // No storage: the choice lasts this visit.
  }
}
/** What to do, while nothing is showing: in the card, and in the room. */
const CHOOSE = {
  store: 'Choose a tape from the shelves, or an episode below',
  den: 'Choose a tape from the shelves, or an episode below',
  screening: 'Choose a tape by the door, or an episode below',
  gallery: "Use a decade's set to watch what it shows, or choose an episode below",
};
const PICK = { store: 'Choose a tape to watch it', den: 'Choose a tape to watch it', screening: 'Choose a tape to watch it', gallery: 'Use a set to watch what it shows' };

/** @type {import('./catalogue.js').Episode[]} */
let episodes = [];
let names = []; // episodeName of each, made once
let covers = null; // covers.js CoverAtlas, of every episode
let stills = new Map();
let furniture = null; // furniture.js, of the mode
/** What a thing's use is in the room: 'tape:3' → its face, for the frame round it, and its name. @type {Map<string, { face: any, label: string }>} */
const things = new Map();
/** In the gallery, the episode each decade's set shows while it is not playing, and when it changes to the next. */
const showsOn = new Map();
let nextStill = 0;

const player = new Player({ episodes, proxy: proxyOf(location.search, ROOM.videoProxy), host: overlay.view });
player.captions = keptRoom.captions;
player.inVR = () => renderer.xr.isPresenting;
player.onNotice = (text) => overlay.toast(text, 5);
player.onChange = () => showShowing();

/** The screen the show is on (or would be on): the main one, or in the gallery its decade's set (none until one plays). */
function activeScreen() {
  const F = L.furniture;
  if (!F) return null;
  return player.current ? screenFor(F, player.current) : F.screens.find((sc) => sc.id === 'main') ?? null;
}

/** Furnishes the room as the mode, and puts the viewer out of the furniture's way. */
function furnishRoom() {
  if (furniture) {
    room.group.remove(furniture.group);
    furniture.dispose();
  }
  const F = furnish(L, mode, episodes);
  L.furniture = F;
  furniture = buildFurniture(L, F, { lighting: room.lighting, occlusion: room.occlusion, covers, anisotropy });
  room.group.add(furniture.group);
  things.clear();
  for (const t of F.tapes) things.set(`tape:${t.episode}`, { face: t.face, label: names[t.episode] });
  F.seats.forEach((_, i) => things.set(`seat:${i}`, { face: null, label: 'Sit here' }));
  showsOn.clear();
  for (const sc of F.screens) {
    if (sc.decade) showsOn.set(sc.decade, episodes.findIndex((e) => e.decade === sc.decade));
  }
  controls.stand();
  controls.settle();
  describe(mode);
  showShowing();
}

/** Turns the room to `m`: furnished as it, kept for the next visit (save), and in a shared session the same for everyone (share). */
function setMode(m, { share = true, save = true } = {}) {
  if (!MODES.includes(m)) return;
  const changed = m !== mode || !furniture;
  mode = m;
  if (save) saveRoom();
  overlay.setMode(m);
  if (changed && covers) furnishRoom();
  if (changed) overlay.toast(MODE_NAMES[m], 2);
  if (share) shareShow();
}

/** Plays episode i (a tape, a set, the list), for everyone in a shared session. */
function playEpisode(i) {
  if (!episodes[i]) return;
  if (mode === 'gallery') showsOn.set(episodes[i].decade, i);
  player.load(i);
  shareShow();
}

/** A button of the player's (the room's panel, a bar, the card): 'play' (or pause), 'next', 'captions' or 'stop'. */
function playerAction(name) {
  if (name === 'captions') {
    player.setCaptions(!player.captions);
    saveRoom();
    overlay.toast(player.captions ? 'Captions on' : 'Captions off', 2);
    return;
  }
  if (name === 'play') {
    if (player.episode < 0) playEpisode(mode === 'gallery' ? showsOn.get('1950s') ?? 0 : 0);
    else player.toggle();
  } else if (name === 'next') {
    // In the gallery, the next on the same set; elsewhere the next tape on the shelves.
    const e = player.current;
    const among = mode === 'gallery' && e ? episodes.map((x, i) => (x.decade === e.decade ? i : -1)).filter((i) => i >= 0) : null;
    if (player.episode < 0) playEpisode(0);
    else player.next(among);
    if (mode === 'gallery' && player.current) showsOn.set(player.current.decade, player.episode);
  } else if (name === 'stop') player.stop();
  shareShow();
}

/** Sits on seat i, facing the screen, its eye on its middle. */
function sitOn(i) {
  const seat = L.furniture?.seats[i];
  if (!seat) return;
  const sc = activeScreen() ?? L.furniture.screens[0];
  const fr = sc && faceFrame(sc.face);
  const pitch = fr ? Math.atan2(fr.center[1] - SEATED_EYE, Math.hypot(fr.center[0] - seat.x, fr.center[2] - seat.z)) : 0;
  controls.onTeleport(() => controls.sit(seat, pitch));
}

controls.onThing = (use) => {
  const [kind, a, b] = use.split(':');
  if (kind === 'tape') playEpisode(Number(a));
  else if (kind === 'seat') sitOn(Number(a));
  else if (kind === 'screen') {
    // The screen playing pauses or plays; a set in the gallery not playing plays what it shows.
    const sc = L.furniture?.screens.find((x) => x.id === a);
    if (sc?.decade && player.current?.decade !== sc.decade) playEpisode(showsOn.get(sc.decade) ?? 0);
    else playerAction('play');
  } else if (kind === 'room' && a === 'mode') setMode(b);
  else if (kind === 'room' || kind === 'bar') playerAction(a);
};
overlay.onMode = (m) => setMode(m);
overlay.onPlayer = (name) => playerAction(name);
overlay.onEpisode = (i) => playEpisode(i);
overlay.setMode(mode);
describe(mode);

let shownSecond = -1;
let activeId = ''; // the screen in use's id, as showShowing last found it (the frame loop asks it)
/** What is showing, on the room's panel, the bar, the screens and the card. */
function showShowing() {
  const e = player.current, F = L.furniture;
  const status = player.status();
  const time = e ? `${clock(player.time)} / ${clock(player.duration)}` : '';
  shownSecond = Math.floor(player.time);
  const state = { mode, name: e ? names[player.episode] : null, status: e ? status : PICK[mode], time, playing: player.playing, captions: player.captions, hasCaptions: !!e?.captions };
  roomPanel.set(state);
  overlay.setShowing({ ...state, episode: player.episode, link: e ? detailsUrl(e) : null, status: e && !e.captions ? `${status}, no captions` : status, hint: CHOOSE[mode] });
  if (!furniture || !F) return;
  furniture.bar.set(state);
  const active = activeScreen();
  activeId = active?.id ?? '';
  if (F.mode === 'gallery') {
    F.bar = e && active ? active.bar : null;
    furniture.bar.place(F.bar);
  }
  furniture.placeCaptions(null);
  for (const [id, { screen, card, material }] of furniture.screens) {
    const on = screen === active && !!e;
    if (on && player.showing) {
      material.map = player.texture;
      fitVideo(furniture.screens.get(id).mesh);
      if (player.captions) furniture.placeCaptions(id);
    } else {
      material.map = card.texture;
      furniture.screens.get(id).mesh.scale.set(1, 1, 1);
      if (on) card.show(stills.get(e.id) ?? null, [e.show, e.title, status]);
      else if (screen.decade) {
        const shown = episodes[showsOn.get(screen.decade)];
        card.show(shown ? stills.get(shown.id) ?? null : null, shown ? [shown.show, shown.title, `${screen.decade}: use the set to watch`] : [screen.decade]);
      } else card.show(null, ['Nothing showing', PICK[mode]]);
    }
    const sc = things.get(`screen:${id}`);
    const label = on ? names[player.episode] : screen.decade ? `The ${screen.decade} set` : 'The screen';
    if (sc) sc.label = label;
    else things.set(`screen:${id}`, { face: screen.face, label });
  }
}

/** A video not 4:3 fills as much of its 4:3 screen as it can, its shape kept (a DVD's 720 × 480 is 4:3 too). */
function fitVideo(mesh) {
  const v = player.video, w = v.videoWidth, h = v.videoHeight;
  let a = w && h ? w / h : 4 / 3;
  if ((w === 720 || w === 704) && h === 480) a = 4 / 3;
  mesh.scale.set(a < 4 / 3 ? a / (4 / 3) : 1, a > 4 / 3 ? (4 / 3) / a : 1, 1);
}

let dimmed = 0; // how far the screening room's lights are down and its curtains drawn, 0 to 1
/** Per frame: the time shown, the captions, the frame round what is pointed at, the lights and the curtains, the gallery's stills. */
function updateShowing(dt) {
  if (!furniture) return;
  if (player.episode >= 0 && Math.floor(player.time) !== shownSecond) showShowing();
  if (player.showing && furniture.screens.get(activeId)?.material.map !== player.texture) showShowing();
  const words = player.caption();
  furniture.captions.set(words);
  furniture.captionMesh.visible = !!words && player.showing;
  const thing = controls.hover ? things.get(controls.hover) : undefined;
  furniture.highlight(thing?.face ?? null);
  roomPanel.setHover(controls.hoverKind === 'roompanel' ? controls.hover : null);
  furniture.bar.setHover(controls.hoverKind === 'bar' ? controls.hover : null);
  const mouse = controls._mouse;
  const aim = controls.padActive || (remote !== null && !remote.inCard);
  overlay.setLabel(renderer.xr.isPresenting ? '' : thing?.label ?? '', aim || !mouse ? null : mouse.x, aim || !mouse ? null : mouse.y);
  // The screening room: the lights down and the curtains drawn while a show plays.
  const F = L.furniture;
  const target = F.dim < 1 && player.playing ? 1 : 0;
  if (target !== dimmed) {
    dimmed = reduce ? target : target > dimmed ? Math.min(target, dimmed + dt / 2) : Math.max(target, dimmed - dt / 1.5);
    const k = 1 - (1 - F.dim) * dimmed;
    room.setDim(k);
    furniture.setDim(k);
    roomPanel.mesh.material.color.copy(roomPanelColor).multiplyScalar(Math.max(k, 0.6) ** 2.2);
    furniture.setCurtains(dimmed);
  }
  // The gallery's sets not playing show another of their decade's every 8 s (not with less motion).
  if (F.mode === 'gallery' && !reduce && (nextStill -= dt) <= 0) {
    nextStill = 8;
    for (const [decade, i] of showsOn) {
      if (player.current?.decade === decade) continue;
      const list = episodes.map((e, k) => (e.decade === decade ? k : -1)).filter((k) => k >= 0);
      showsOn.set(decade, list[(list.indexOf(i) + 1) % list.length]);
    }
    showShowing();
  }
}

/** Loads the catalogue and the covers, and furnishes the room. */
async function loadCatalogue() {
  try {
    const res = await fetch(new URL('catalogue/episodes.json', document.baseURI));
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    episodes = readCatalogue(await res.json());
  } catch (err) {
    console.warn(`${ROOM.id}: no catalogue (${err.message})`);
    overlay.toast('The episodes could not be loaded: try again later', 6);
  }
  names = episodes.map(episodeName);
  player.episodes = episodes;
  overlay.setEpisodes(episodes);
  covers = new CoverAtlas(episodes, anisotropy);
  furnishRoom();
  stills = await loadStills(episodes);
  covers.draw(stills);
  showShowing();
}

// ── The shared session ───────────────────────────────────────────────────────
// layersharedsession's together.js: peer to peer over WebRTC (Trystero, loaded only when a session
// starts). Its room is in the address (?room=), so the address is the invitation; the Hallway's
// door carries it in and the doorway back carries it out (leaveUrl), so the visitor stays in it.
// This page is ROOM.id in the session; the others in here are drawn by the layer's avatars.js.

together = createTogether({ appId: APP_ID, page: ROOM.id, camera, renderer, hands: () => controls.hands, avatars: { parent: scene } });
together.on('change', () => {
  showPanel();
  overlay.setInvite(together.active ? together.inviteLink : '');
  overlay.setTogether(together.active, together.active ? statusText(together.company(), together.condition()) : '', together.self);
  overlay.refreshLinks();
});
overlay.onName = (name) => together.setName(name);
// The session's notices (someone joined, came in, left, waved), in the room's words.
together.on('notice', (notice) => {
  const text = noticeText(notice, ROOM.id);
  if (text) overlay.toast(text, 4);
});
// A wave: the Wave button, or a controller's grip in VR (which pulses, so the waver feels it go).
overlay.onWave = () => {
  if (together.wave()) overlay.toast('You waved', 2);
};
controls.onSqueeze = (hand) => {
  if (together.wave()) hand.source?.gamepad?.hapticActuators?.[0]?.pulse?.(0.6, 60);
};
// What is showing, the same for everyone in here: the mode, the episode, whether it plays and
// where it is (at `at` seconds, `since` then, by the writer's clock), a shared value of the session
// (layersharedsession's shared.js) that only this page writes. Each visitor's own Play, Next, Stop,
// a tape or a mode writes it; another's is taken as it comes, and the last one by whoever joins.
const SHOW_KEY = `${ROOM.id}:show`;
function shareShow() {
  const s = together.session;
  if (!s) return;
  s.set(SHOW_KEY, { mode, id: player.current?.id ?? null, playing: player.playing || player.loading, at: Math.round(player.time * 10) / 10, since: Date.now() });
}
/** Another visitor's show, if it is one this room can show. */
function takeShow(v) {
  if (!v || typeof v !== 'object' || !MODES.includes(v.mode) || typeof v.playing !== 'boolean' || !Number.isFinite(v.at) || !Number.isFinite(v.since)) return;
  if (v.mode !== mode) setMode(v.mode, { share: false, save: false });
  const i = typeof v.id === 'string' ? episodes.findIndex((e) => e.id === v.id) : -1;
  if (i < 0) {
    player.stop();
    return;
  }
  const late = v.playing ? Math.min(6 * 3600, Math.max(0, (Date.now() - v.since) / 1000)) : 0;
  if (mode === 'gallery') showsOn.set(episodes[i].decade, i);
  player.load(i, { at: Math.max(0, v.at + late), play: v.playing });
}
together.on('session', (s) => {
  s.on('shared', ({ key, value, from }) => {
    if (key === SHOW_KEY && from) takeShow(value);
  });
});
// An invite link, or the Hallway's door, names the room: join it.
const invitedRoom = roomFromUrl(location.href);
if (invitedRoom) together.start(invitedRoom);

// ── Accessibility (common/access.js) ─────────────────────────────────────────

/**
 * The settings as they are now: with less motion the walks jump (controls), the fades blink
 * (blink), a wave doesn't bob, the doorway's veil holds still (the frame loop's time) and the page's
 * own transitions stop (style.css .reduce-motion); the vignette as the visitor wants it; seated
 * mode's lift in VR.
 */
function applyAccess() {
  reduce = reduceMotion(access, motion);
  controls.reduceMotion = together.reduceMotion = reduce;
  document.documentElement.classList.toggle('reduce-motion', reduce);
  vignette.enabled = access.vignette;
  controls.setEyeLift(eyeLift(access));
  showPanel();
}
/** A setting changed, on the panel or in the card: applied, and kept for every site on the origin. */
function setAccess(change) {
  access = { ...access, ...change };
  saveAccess(access); // false when storage is blocked: they then last this visit
  applyAccess();
}
/** The settings and the movement choice again, as another page on the origin (the hallway) left them. */
function rereadSettings() {
  access = loadAccess();
  Object.assign(nav, loadNav());
  controls.setNav(nav);
  applyAccess();
}
applyAccess();
watchMotion(applyAccess, motion); // the system's setting, followed with motion 'system'
addEventListener('storage', (e) => {
  if (e.key === ACCESS_KEY || e.key === NAV_KEY || e.key === null) rereadSettings();
});

// ── The frame loop ───────────────────────────────────────────────────────────

const head = new THREE.Vector3();
let last = performance.now();
let time = 0; // what moves on its own (the doorway's veil) goes by this

function step(dt) {
  if (!reduce) time += dt;
  controls.update(dt);
  vignette.update(dt, controls.moveSpeed, controls.turnRate, renderer.xr.isPresenting);
  camera.getWorldPosition(head);
  room.update(time, dt, head, controls.hoverDoor);
  together.update(performance.now());
  room.panel.setHover(controls.hoverPanel);
  updateShowing(dt);
  // The dot: a gamepad's aim, or on a TV the remote's OK while walking.
  overlay.setAim((controls.padActive || (remote !== null && !remote.inCard)) && !renderer.xr.isPresenting, !!controls.hover);
  // On a TV, walking, the hint says what OK does with the dot on something on the walls.
  if (remote) overlay.setAimed(remote.inCard ? -1 : controls.hoverPiece);
  if (!leaving && doorCrossed(L, head.x, head.z)) go();
  fade.update(dt);
}

renderer.setAnimationLoop(() => {
  const now = performance.now();
  step(Math.min(0.1, (now - last) / 1000));
  last = now;
  renderer.render(scene, camera);
});

addEventListener('resize', () => {
  if (renderer.xr.isPresenting) return;
  fitCamera();
  renderer.setSize(innerWidth, innerHeight);
});

fade.to(0, blink(0.8));

// For scripted testing, and tools/preview.mjs. A hidden page gets no animation frames: drive it with tick().
window.__room = {
  THREE, renderer, scene, camera, rig, room, layout: L, controls, overlay, fade, vignette, xrDevice, go, enterVR, together, remote, tv, way, visit, setAccess,
  player, roomPanel, setMode, playEpisode, playerAction, sitOn,
  get mode() {
    return mode;
  },
  get furniture() {
    return furniture;
  },
  get episodes() {
    return episodes;
  },
  /** The accessibility settings now, and whether motion is reduced. */
  get access() {
    return { ...access, reduce };
  },
  /** The picture the hallway's doorway to here shows (preview.js), as a data: URL, with how it is hung. */
  preview(quality = 0.9) {
    return { jpeg: renderPreview(renderer, scene, camera, { hide: [fade.mesh, vignette.mesh] }).toDataURL('image/jpeg', quality), params: previewView().params };
  },
  /** The picture for link previews (preview.js), as a data: URL, with where it is taken from. */
  social(quality = 0.88) {
    return { jpeg: renderSocial(renderer, scene, camera, L, { hide: [fade.mesh, vignette.mesh] }).toDataURL('image/jpeg', quality), view: socialView(L) };
  },
  tick(dt = 1 / 60, n = 1) {
    for (let i = 0; i < n; i++) step(dt);
    renderer.render(scene, camera);
  },
  /** The catalogue, the covers and their stills are in, the room furnished, and the pictures on the walls loaded (or given up on). */
  get ready() {
    return pictured && catalogued;
  },
};
let catalogued = false;
loadCatalogue().finally(() => {
  catalogued = true;
});
