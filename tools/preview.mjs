#!/usr/bin/env node
// Renders the room's two pictures (public/js/preview.js) in headless Chrome, through common's
// tools/chrome.mjs (which starts Chrome on a profile Windows sees no failed logon from, never on a
// bare new one), into public/:
//   hallway-preview.jpg  2048 × 1024, the room as one sees it through the Hallway's doorway to it
//                        (its door's `preview`: config.js hallwayDoor)
//   social.jpg           1280 × 640, for the link-preview tags (index.html og:image, twitter:image)
// Run it again after changing the room (config.js, or anything it is built from); the JPEGs are
// committed.
//   node tools/preview.mjs [--out <folder>] [--only preview|social]
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { PUBLIC, serve } from './serve.mjs';
import { launchChrome, sleep } from 'common/tools/chrome.mjs';

const arg = (name, fallback) => {
  const i = process.argv.indexOf(name);
  return i > 0 ? process.argv[i + 1] : fallback;
};
const out = arg('--out', PUBLIC);
const only = arg('--only', null);

const server = await serve(PUBLIC);
const chrome = await launchChrome();
try {
  const page = await chrome.newPage();
  await page.goto(`http://127.0.0.1:${server.address().port}/`, 1000);
  for (let i = 0; i < 100 && !(await page.evaluate('!!window.__room?.ready')); i++) await sleep(200);
  if (!(await page.evaluate('!!window.__room?.ready'))) throw new Error('the room did not load');
  // The doorway's view from the Hallway, if there is one, has a moment to come in.
  await sleep(1500);
  const write = (name, jpeg, about) => {
    const bytes = Buffer.from(jpeg.slice(jpeg.indexOf(',') + 1), 'base64');
    const file = join(out, name);
    writeFileSync(file, bytes);
    console.log(`${file}  ${(bytes.length / 1024).toFixed(0)} kB, ${about}`);
  };
  if (only !== 'social') {
    const { jpeg, params } = await page.evaluate('window.__room.preview(0.9)');
    write('hallway-preview.jpg', jpeg, `2048 x 1024, hung ${JSON.stringify(params)}`);
  }
  if (only !== 'preview') {
    const { jpeg, view } = await page.evaluate('window.__room.social(0.88)');
    write('social.jpg', jpeg, `1280 x 640, from ${JSON.stringify(view)}`);
  }
} finally {
  await chrome.close();
  server.close();
}
