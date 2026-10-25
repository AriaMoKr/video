# CLAUDE.md

Guidance for Claude Code in this repository.

## What this is

An empty WebXR room behind one of the Hallway's doors, made to be copied (three.js 0.186, plain ES
modules, no bundler or build step): a floor, four walls, a ceiling with lamps, a window onto
common's afternoon sky, the doorway back to the Hallway, and the control panel beside it. Rooms
(`art`, `video`, …) are made from it, so it holds everything a room needs and nothing a particular
room has; README's "Making a room from this template" is the checklist. It follows the Hallway
(https://ariamokr.github.io/hallway/, AriaMoKr/hallway, a checkout at `../hallway`) and outside
(AriaMoKr/outside, `../outside`, the closest model: much of the code here is outside's or the
hallway's, said so at the top of each such file). `public/` is the whole site. The user asked for
the hallway to be left alone, so change `../hallway` only when asked.

Published at https://ariamokr.github.io/RoomTemplateEmpty/ from `main` of AriaMoKr/RoomTemplateEmpty
(a template repository) by `.github/workflows/pages.yml`.

## Commands

```bash
npm install          # postinstall: common's tools/vendor.mjs copies what vendor.json lists into public/vendor/ (gitignored)
npm start            # tools/serve.mjs (common's) on config.js's port, 8094
npm test             # node --test "test/*.test.js"
npm run preview      # tools/preview.mjs: public/hallway-preview.jpg and public/social.jpg (headless Chrome)
```

Node 22 or newer; CI runs Node 24 (common's Pages workflow). It runs under MSYS2 UCRT64 here
(`MSYSTEM=UCRT64 /c/msys64/usr/bin/bash -lc 'cd /c/git/my/claude/RoomTemplateEmpty && …'`).

## Layout

- `config.js`: the one module a copy changes (`ROOM`: id, title, description, sign, url, size,
  colors, window, skyYaw, port, glow) and `hallwayDoor()`, the Hallway's door entry it implies.
  `index.html` and `package.json` repeat some of it; `test/config.test.js` keeps them the same.
- `room.js`: pure (no three, tested in Node). The layout from the config (`layoutRoom`: the doorway,
  shrunk to fit the link's size, the window, the panel, the lamps, the spawn), `doorSpawn`,
  `clampWalk` (the walls, `MARGIN` from them; the doorway between its jambs to its back),
  `doorCrossed`, `standable`, `castRay` (the box's planes: door, panel with u/v, window, wall,
  floor with `walkable`, ceiling), and the panel's buttons (`PANEL_BUTTONS`, `panelButtonAt`).
  Coordinates: metres, the doorway's wall at z = 0, the room along -z, the doorway at x = 0, yaw 0
  faces -z, left is -x.
- `scene.js` builds the room as a few merged meshes with light baked into vertex colours (`bake.js`
  and `builder.js`, the hallway's): the lamps, the window's daylight and the doorway's glow. The
  window's glass is common's `sky.js` (`skyMaterial`, turned by `skyYaw`); the doorway is common's
  `portal.js`, showing the Hallway's view of this door from its views.json (`loadView`), else
  `textures.js` `previewFallback`. `textures.js`: canvas textures, seeded, nearly white so the
  config's colours are the room's.
- `controls.js`: the hallway's and outside's controls for a box room: drag to look, keys, click or
  tap the floor (`walkTo`), the doorway (`onDoor`, `walkInto`), the panel (`onPanel`), a gamepad
  (common's `gamepad.js`), and in VR the sticks per common's `nav.js` (move smooth/teleport, turn
  snap/smooth), the trigger, a grip (`onSqueeze`); `reduceMotion` makes walks jumps, `setEyeLift`
  raises the rig in VR (seated), `moveSpeed`/`turnRate` feed the vignette. Nothing allocated per
  frame.
- `panel.js`: the control panel on the wall (outside's), redrawn only on a change. `overlay.js`: the
  card (the page's `<nav>`: the title, ← Hallway, the description, Start / Leave shared session, and
  Settings with the panel's choices as radio buttons and checkboxes), the hint (kept clear of the
  buttons, `_placeHint`), Wave, Copy invite link, Fullscreen, Enter VR, the gamepad's aiming dot,
  and toasts (`role="status"`, polite). `presence.js`: the session's status and notices in words.
- `preview.js`: the two pictures (`renderPreview`, hung as the hallway hangs its doorways', and
  `renderSocial`, from `socialView`).
- `main.js`: the visit and the way back (common's `door.js`; `<id>.visit` in sessionStorage),
  arrival, `go` (fade, then `location.assign`), fullscreen, VR (`sessiongranted`, noted as
  `window.roomXrGranted` by the inline script in index.html), the panel, the shared session
  (layersharedsession's `createTogether`, page `ROOM.id`), the accessibility settings (common's
  `access.js`: `applyAccess`, `setAccess`, re-read on `storage` and `pageshow`; the `reduce-motion`
  class on `<html>`), and the frame loop.

## Conventions

- Client URLs stay relative (tested). Quest 3 is the target: few draw calls, light baked,
  `MeshBasicMaterial`, nothing allocated per frame.
- Scripted testing: `window.__room` (THREE, renderer, scene, camera, rig, room, layout, controls,
  overlay, fade, vignette, xrDevice, go, enterVR, together, way, visit, setAccess, access,
  `preview()`, `social()`, `tick(dt, n)`, `ready`). A hidden browser pane gets no animation frames:
  drive it with `tick()`. XR frames under `?xr=emulate` need frames too; headless Chrome (below)
  has them.
- Headless Chrome is common's `tools/chrome.mjs` (`launchChrome`): it writes the fresh profile's
  `Local State` first, so Windows sees no failed logon. Start Chrome for a tool through it, never by
  hand on a new profile.
- Accessibility, as the other sites pass it: every 3D control also on the page, 2 px focus rings,
  targets at least 24 px, text over the view at 4.5:1 (the card and pills nearly opaque), the card
  scrolling at 320×568 and 667×375, state shown under forced colours, and less motion stilling the
  page's transitions. Check with axe (wcag2a/aa, wcag21aa, wcag22aa, best-practice) at a desktop
  size and at 320×568.
- Shared packages, pinned by tag in package.json: AriaMoKr/common (`v0.5.0`: the door contract,
  nav, access with the vignette, fade, gamepad, portal, sky, and the tools `serve.mjs`,
  `vendor.mjs`, `chrome.mjs`, and the Pages workflow) and AriaMoKr/layersharedsession (`v0.3.0`).
  Change them there, then move the tag here and `npm install`.
- `.claude/launch.json`: `room` (8094) and `hallway` (`../hallway/public` on 8088).
