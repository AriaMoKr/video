// vendor.json, what common's tools/vendor.mjs copies from node_modules into public/vendor/ (npm
// install): in its form, covering everything the import map and the page load, from packages the
// room depends on; and, once installed, copied.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readList } from 'common/tools/vendor.mjs';

const here = join(dirname(fileURLToPath(import.meta.url)), '..');
const list = JSON.parse(readFileSync(join(here, 'vendor.json'), 'utf8'));
const html = readFileSync(join(here, 'public', 'index.html'), 'utf8');
const { imports } = JSON.parse(html.match(/<script type="importmap">(.*?)<\/script>/s)[1]);
const pkg = JSON.parse(readFileSync(join(here, 'package.json'), 'utf8'));
const source = (e) => e.from ?? e.dir;
const packageOf = (path) => path.split('/').slice(0, path.startsWith('@') ? 2 : 1).join('/');

test("the list is in common's form: each entry a file or a folder, from node_modules to public/vendor", () => {
  assert.doesNotThrow(() => readList(here));
  for (const e of list) {
    assert.ok(typeof e.to === 'string' && e.to && !e.to.startsWith('/') && !e.to.includes('..'), JSON.stringify(e));
    assert.ok((typeof e.from === 'string') !== (typeof e.dir === 'string'), `${JSON.stringify(e)}: one of from and dir`);
  }
  assert.equal(new Set(list.map((e) => e.to)).size, list.length, 'two entries copy to the same place');
});

test('it copies everything the import map maps, and IWER for ?xr=emulate', () => {
  const copied = (url) => {
    const path = url.replace(/^\.\/vendor\//, '');
    return list.some((e) => (e.from ? e.to === path : path.startsWith(`${e.to}/`) || `${path}/` === `${e.to}/`));
  };
  for (const [name, url] of Object.entries(imports)) assert.ok(copied(url.endsWith('/') ? url.slice(0, -1) : url), `${name}: ${url} is not copied`);
  const iwer = list.find((e) => e.to === 'iwer/iwer.module.js');
  assert.ok(iwer && iwer.optional, 'IWER, optional (a dev dependency)');
  assert.ok(readFileSync(join(here, 'public', 'js', 'main.js'), 'utf8').includes("'../vendor/iwer/iwer.module.js'"));
});

test('what it copies is from packages the room depends on, or theirs', () => {
  const direct = new Set([...Object.keys(pkg.dependencies), ...Object.keys(pkg.devDependencies ?? {})]);
  // Trystero's own packages, and the curve its Nostr strategy signs with.
  const through = new Set(['@trystero-p2p/core', '@trystero-p2p/nostr', '@noble/secp256k1']);
  for (const e of list) {
    const p = packageOf(source(e));
    assert.ok(direct.has(p) || through.has(p), `${source(e)}: ${p} is not a dependency`);
  }
});

test('once installed, every entry that is not optional is in node_modules and copied to public/vendor', { skip: !existsSync(join(here, 'node_modules')) && 'not installed' }, () => {
  for (const e of list) {
    if (e.optional) continue;
    assert.ok(existsSync(join(here, 'node_modules', source(e))), `node_modules/${source(e)} missing`);
    assert.ok(existsSync(join(here, 'public', 'vendor', e.to)), `public/vendor/${e.to} missing (npm install)`);
  }
});
