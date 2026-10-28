# CLAUDE.md

Guidance for Claude Code in this repository.

## What this is

video: a WebXR room behind one of the Hallway's doors to watch old TV in, alone or in a shared
session (three.js 0.186, plain ES modules, no bundler or build step): 42 public-domain episodes
from archive.org's Classic TV (https://archive.org/details/classic_tv), on tapes, played on the
room's screens, in four modes (video store, the default; den; screening room; decades gallery).
The room is AriaMoKr/RoomTemplateEmpty's (a checkout at `../RoomTemplateEmpty`): a floor, four
walls, a ceiling with lamps, a window in the right-hand wall onto common's afternoon sky, the
doorway back to the Hallway, and the control panel beside it. Its own are `public/js/config.js`,
the modules of the modes and the shows (below), their additions to the template's `controls.js`,
`overlay.js`, `scene.js`, `main.js` and `style.css`, the page's title and link-preview tags,
package.json, the catalogue, the archive proxy, the pictures and these docs; the rest is the
template's code, which follows the Hallway (https://ariamokr.github.io/hallway/, AriaMoKr/hallway,
a checkout at `../hallway`) and outside (AriaMoKr/outside, `../outside`), said so at the top of each
such file. `public/` is the whole site. The user asked for the hallway to be left alone, so change
`../hallway` only when asked; its door to here comes in the Hallway's own round (README, "The
Hallway's door", is the entry to give it).

Published at https://ariamokr.github.io/video/ from `main` of AriaMoKr/video by
`.github/workflows/pages.yml`.

## Commands

```bash
npm install          # postinstall: common's tools/vendor.mjs copies what vendor.json lists into public/vendor/ (gitignored)
npm start            # tools/serve.mjs (common's) on config.js's port, 8098
npm test             # node --test "test/*.test.js", tsc's check among them (test/types.test.js)
npm run types        # tsc -p tsconfig.json alone
npm run preview      # tools/preview.mjs: public/hallway-preview.jpg and public/social.jpg (headless Chrome)
node tools/catalogue.mjs                 # public/catalogue/ from tools/picks.js and archive.org's metadata
node tools/archive-proxy/serve.mjs       # the archive proxy on 127.0.0.1:8099 (?videoproxy=http://127.0.0.1:8099/)
cd tools/archive-proxy && npx wrangler deploy   # the proxy to Cloudflare (vrlbry's account)
```

Node 22 or newer; CI runs Node 24 (common's Pages workflow). It runs under MSYS2 UCRT64 here
(`MSYSTEM=UCRT64 /c/msys64/usr/bin/bash -lc 'cd /c/git/my/claude/video && …'`). `npm start` listens
on `localhost` only: open http://localhost:8098/, not 127.0.0.1 (or pass `--host 127.0.0.1`).

## Layout

- `config.js`: the one module a copy of the template changes (`ROOM`: id `video`, title, description,
  sign, url, size, colors, window `right`, skyYaw -π/2, port 8098, glow `#6cb8e0`, `videoProxy`) and
  `hallwayDoor()`, the Hallway's door entry it implies. `index.html` and `package.json` repeat some
  of it; `test/config.test.js` keeps them the same. The `@satisfies` line above `ROOM` (the
  template's, outside it, so merges leave it be) checks the window's wall for tsc.
- `room.js`: pure (no three, tested in Node). The layout from the config (`layoutRoom`: the doorway,
  shrunk to fit the link's size, the window, the panel, the lamps, the spawn), `doorSpawn`,
  `clampWalk` (the walls, `MARGIN` from them; the doorway between its jambs to its back),
  `doorCrossed`, `standable`, `castRay` (the box's planes: door, panel with u/v, window, wall,
  floor with `walkable`, ceiling), and the panel's buttons (`PANEL_BUTTONS`, `panelButtonAt`).
  Coordinates: metres, the doorway's wall at z = 0, the room along -z, the doorway at x = 0, yaw 0
  faces -z, left is -x.
- `modes.js`: pure. The four modes (`MODES`, `MODE_NAMES`, `DEFAULT_MODE` 'store') furnished
  (`furnish(L, mode, episodes)`) into `L.furniture`: boxes, faces (`{kind, id, use, axis, at, ...}`:
  tapes, screens, bars, signs, the room panel), obstacles (rects, `MARGIN` from them), seats
  (`{x, z, yaw, out}`) and screens (`{id, decade, face, bar}`); the room panel's and a screen bar's
  buttons (`ROOM_PANEL_BUTTONS`, `roomPanelButtonAt`, `BAR_BUTTONS`, `barButtonAt`); and `castRay`
  and `clampWalk` as room.js's with the furniture in the way (one stood in it after a mode change
  is put out, at the nearest clear place where its nearest side is blocked too). `SEATED_EYE` 1.15.
- `furniture.js`: `buildFurniture` makes a mode's meshes, baked like the room: the boxes, the tapes
  on `covers.js`'s atlas, the signs, the screens (a `VideoTexture` or a card), the bar, the
  captions strip, the hover frame and the screening room's curtains; `setDim` (k**2.2, colours
  being linear) and `setCurtains`. `covers.js`: the canvas textures (tape covers, signs, a screen's
  card, the captions) from the stills. `roompanel.js`: the room panel (`RoomPanel`, at -x beside
  the doorway, across it from the control panel) and a screen's bar (`ScreenBar`), redrawn only on a change.
- `player.js`: one `<video crossorigin>` through the archive proxy into a `VideoTexture`, with
  captions (`cueAt`); where that fails, out of VR it plays the direct archive.org URL on the page
  (`section.player`, `<video controls>` and a `<track>`), in VR it says so; a blocked autoplay waits
  for Play. `catalogue.js`: `readCatalogue` of `public/catalogue/episodes.json`, `proxyOf`
  (`?videoproxy=`, `none`), `videoUrl`, `detailsUrl`, `parseVtt`, `cueAt`, `clock`.
- `scene.js` builds the room as a few merged meshes with light baked into vertex colours (`bake.js`
  and `builder.js`, the hallway's): the lamps, the window's daylight and the doorway's glow. The
  window's glass is common's `sky.js` (`skyMaterial`, turned by `skyYaw`); the doorway is common's
  `portal.js`, showing the Hallway's view of this door from its views.json (`loadView`), else
  `textures.js` `previewFallback`. `textures.js`: canvas textures, seeded, nearly white so the
  config's colours are the room's. It returns `lighting`, `occlusion` and `lightColor` for the
  furniture's bake, and `setDim` for the screening room.
- `controls.js`: the hallway's and outside's controls for a box room: drag to look, keys, click or
  tap the floor (`walkTo`), the doorway (`onDoor`, `walkInto`), the panel (`onPanel`), a gamepad
  (common's `gamepad.js`), and in VR the sticks per common's `nav.js` (move smooth/teleport, turn
  snap/smooth), the trigger, a grip (`onSqueeze`); `reduceMotion` makes walks jumps, `setEyeLift`
  raises the rig in VR (seated), `moveSpeed`/`turnRate` feed the vignette. Keys go through common's
  `tv.js` `keyOf` (a TV remote's come with no `code`); `aimMiddle` makes the middle of the view the
  pointer (on a TV) and `useMiddle()` uses it (a gamepad's A, the remote's OK). Things in a mode
  (`use` 'tape:i', 'seat:i', 'screen:id', the bar and the room panel) go to `onThing`; `sit(seat)`
  (in VR the head onto the seat, `_riseXR` lowered by EYE − SEATED_EYE) and `stand()` (to its
  `out`), and every walk stands first; `settle()` after a mode change. Nothing allocated per frame.
- `panel.js`: the control panel on the wall (outside's), redrawn only on a change. `overlay.js`: the
  card (the page's `<nav>`: the title, ← Hallway, the description, Start / Leave shared session, in
  a session its status and the visitor's name (`onName`), and Settings with the panel's choices as
  radio buttons and checkboxes; before them, in the room, the modes as radios, what is showing,
  Play, Next, Captions, Stop and the episodes by decade: `setMode`, `setEpisodes`, `setShowing`,
  `onMode`, `onPlayer`, `onEpisode`), the hint (`#hint`, kept clear of the buttons, `_placeHint`),
  the label beside the aiming dot (`setLabel`), Wave,
  Copy invite link, Fullscreen, Enter VR, the aiming dot, and toasts (`role="status"`, polite). With
  `tv`, Wave is in the card and the invite is text there (`inviteText`), and the hints are the
  remote's (`tv`, `tv-card`). On a TV, a faded hint is `aria-hidden` (out of TalkBack's reading
  order) but stays the canvas's description (`aria-describedby`). `presence.js`: the session's status and notices in words.
- `preview.js`: the two pictures (`renderPreview`, hung as the hallway hangs its doorways', and
  `renderSocial`, from `socialView`).
- `main.js`: the visit and the way back (common's `door.js`; `<id>.visit` in sessionStorage),
  arrival, `go` (fade, then `location.assign`), fullscreen, VR (`sessiongranted`, noted as
  `window.roomXrGranted` by the inline script in index.html), the panel, the shared session
  (layersharedsession's `createTogether`, page `ROOM.id`), the accessibility settings (common's
  `access.js`: `applyAccess`, `setAccess`, re-read on `storage` and `pageshow`; the `reduce-motion`
  class on `<html>`), the TV (common's `tv.js`: `tvMode()`, the `tv` class on `<html>`, a `Remote`
  over the card and the canvas with `use` = `controls.useMiddle()` and `step` = `stepBack`, the
  room's own step back for Back: stop a show, then stand up; `answerApp`; no fullscreen or XR), the
  modes (`video.room` in localStorage, `?mode=`; `setMode`, `furnishRoom`), the player and what is
  showing (`playEpisode`, `playerAction`, `sitOn`, `showShowing`, `updateShowing` each frame), the
  show shared in a session (`video:show`: mode, episode, playing, where, when; `shareShow`,
  `takeShow`), and the frame loop.
- `public/catalogue/`: `episodes.json`, `stills/<id>.jpg` and `captions/<id>.vtt`, written by
  `tools/catalogue.mjs` from `tools/picks.js` (42 picks, 1940s–1970s: public domain and fit for the
  family) and committed; the page never searches archive.org.
- `tools/archive-proxy/`: `worker.js`, the Cloudflare Worker `video-archive-proxy` on vrlbry's
  account (https://video-archive-proxy.vrlbry.workers.dev/, beside vrlbry-zim-proxy, sharing the
  free plan's 100,000 requests a day): Range GETs of video files of classic_tv items marked public
  domain, for `ALLOWED_ORIGINS` (wrangler.toml) only, with CORS. `serve.mjs` runs it locally.
- `style.css`: the page over the view, and the 10-foot view under `html.tv` (the hallway's: 960 × 540
  at a pixel ratio of 2, 18 px text, 4 px focus rings, the TV's safe margins, the hint and toasts
  beside the card).

## Conventions

- Client URLs stay relative (tested). Quest 3 is the target: few draw calls, light baked,
  `MeshBasicMaterial`, nothing allocated per frame.
- Types, with no build: `tsconfig.json` checks `public/js/` from its JSDoc (`allowJs`, `checkJs`,
  `noEmit`, bundler resolution: three's types from `@types/three`, common's and
  layersharedsession's from their `.d.ts`), and the page is served as it is, the import map
  unchanged. `test/types.test.js` runs tsc, so `npm test` and the Pages workflow do, and fails
  rather than skips without TypeScript. What TypeScript's DOM library leaves out (WebKit's
  fullscreen names, `window.__room`, `window.roomXrGranted`) is in `types/globals.d.ts`, never
  served. Not `strict` yet (437 errors with it, nearly all untyped parameters): that comes a file
  at a time. `tools/` and `test/` wait for `@types/node`.
- Scripted testing: `window.__room` (THREE, renderer, scene, camera, rig, room, layout, controls,
  overlay, fade, vignette, xrDevice, go, enterVR, together, remote, tv, way, visit, setAccess, access,
  player, roomPanel, setMode, playEpisode, playerAction, sitOn, mode, furniture, episodes,
  `preview()`, `social()`, `tick(dt, n)`, `ready`, true once the catalogue and stills have loaded). A hidden browser pane gets no animation frames:
  drive it with `tick()`. XR frames under `?xr=emulate` need frames too; headless Chrome (below)
  has them.
- Headless Chrome is common's `tools/chrome.mjs` (`launchChrome`): it writes the fresh profile's
  `Local State` first, so Windows sees no failed logon. Start Chrome for a tool through it, never by
  hand on a new profile.
- Accessibility, as the other sites pass it: every 3D control also on the page, 2 px focus rings,
  targets at least 24 px, text over the view at 4.5:1 (the card and pills nearly opaque), the card
  scrolling at 320×568 and 667×375, state shown under forced colours, and less motion stilling the
  page's transitions. Check with axe (wcag2a/aa, wcag21aa, wcag22aa, best-practice) at a desktop
  size and at 320×568, and with `?tv=emulate` at 960×540.
- The TV (README, "On a TV"; common's README, "The TV app"): test with `?tv=emulate` and real key
  presses (OK is Enter with no `code`; `hallwayTV.menu()` / `.back()` for Menu and Back; Escape is
  Back in the card). On the TV, HallwayApp's `tools/tv-check.mjs --url <url>` needs its debug build
  (a localhost URL goes over adb reverse); the empty room holds 60 fps at 1080p at a pixel ratio of
  2, the budget a room's contents can spend. Other sessions may use the same TV: don't restart its
  app under them.
- Shared packages, pinned by tag in package.json: AriaMoKr/common (`v0.6.2`: the door contract,
  nav, access with the vignette, fade, gamepad, portal, sky, tv, and the tools `serve.mjs`,
  `vendor.mjs`, `chrome.mjs`, and the Pages workflow) and AriaMoKr/layersharedsession (`v0.3.0`).
  Change them there, then move the tag here and `npm install`.
- The template's fixes come by merge, as music takes vrlbry's and art the template's: `git fetch
  template` and `git merge template/main` (the remote `template` is
  `github-custom-remote:AriaMoKr/RoomTemplateEmpty.git`; video's history joins the template's at
  `3504bd5`, which its GitHub-made "Initial commit" copies). In a conflict keep video's own:
  `config.js`, `index.html`, `package.json`'s name, description, homepage and repository, the two
  pictures, port 8098, `main.js`'s opening comment, video's additions to `controls.js`,
  `overlay.js`, `scene.js`, `main.js`, `style.css` and `test/site.test.js`, and what README and
  CLAUDE.md say about video.
  A fix to the template's code goes into RoomTemplateEmpty first and comes here by that merge.
- `.claude/launch.json`: `room` (8098), `archive-proxy` (8099) and `hallway` (`../hallway/public`
  on 8088).
