// The catalogue (public/catalogue/, from tools/picks.js by tools/catalogue.mjs) and catalogue.js:
// every pick in it with its still and captions, what the page calls them, where it plays them from,
// and the captions read as the room shows them.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { PICKS } from '../tools/picks.js';
import { ROOM } from '../public/js/config.js';
import { ARCHIVE, DECADES, clock, cueAt, detailsUrl, episodeName, parseVtt, proxyOf, readCatalogue, videoUrl } from '../public/js/catalogue.js';
import { refusal } from '../tools/archive-proxy/worker.js';

const PUBLIC = new URL('../public/', import.meta.url);
const json = JSON.parse(readFileSync(new URL('catalogue/episodes.json', PUBLIC), 'utf8'));
const episodes = readCatalogue(json);

test('every pick is in the catalogue, in order, and nothing else', () => {
  assert.deepEqual(json.episodes.map((e) => e.id), PICKS.map((p) => p.id), 'run node tools/catalogue.mjs after changing tools/picks.js');
  assert.equal(episodes.length, json.episodes.length, 'every entry is one the page can show');
  for (const [i, p] of PICKS.entries()) {
    const e = episodes[i];
    assert.equal(e.show, p.show);
    assert.equal(e.title, p.title);
    assert.equal(e.decade, p.decade);
    assert.equal(e.year, p.year ?? null);
    if (p.year) assert.equal(`${Math.floor(p.year / 10) * 10}s`, p.decade, p.id);
    assert.ok(e.minutes > 0, p.id);
  }
  // Grouped by decade, as the shelves are.
  const decades = episodes.map((e) => e.decade);
  assert.deepEqual(decades, [...decades].sort((a, b) => DECADES.indexOf(a) - DECADES.indexOf(b)));
});

test('each episode has its still and, where it has captions, them; and nothing left over', () => {
  for (const e of episodes) {
    assert.equal(e.still, `catalogue/stills/${e.id}.jpg`);
    const jpg = readFileSync(new URL(e.still, PUBLIC));
    assert.ok(jpg[0] === 0xff && jpg[1] === 0xd8, `${e.id}: a JPEG`);
    if (e.captions) {
      const cues = parseVtt(readFileSync(new URL(e.captions, PUBLIC), 'utf8'));
      assert.ok(cues.length > 20, `${e.id}: ${cues.length} cues`);
    }
  }
  const named = new Set(episodes.flatMap((e) => [e.still, e.captions]).filter(Boolean));
  for (const dir of ['stills', 'captions']) {
    for (const f of readdirSync(new URL(`catalogue/${dir}/`, PUBLIC))) assert.ok(named.has(`catalogue/${dir}/${f}`), `${dir}/${f} is not in episodes.json`);
  }
  assert.ok(episodes.filter((e) => e.captions).length >= episodes.length * 0.8, 'most have captions');
});

test('readCatalogue keeps only what the page can show', () => {
  const good = { id: 'a_b-1.c', show: 'S', title: 'T', decade: '1950s', file: 'x y.mp4', still: 's.jpg' };
  assert.equal(readCatalogue({ episodes: [good] }).length, 1);
  for (const bad of [{ id: '../x' }, { id: 'a/b' }, { file: 'x.mkv' }, { decade: '1980s' }, { show: 1 }, { still: null }]) {
    assert.equal(readCatalogue({ episodes: [{ ...good, ...bad }] }).length, 0, JSON.stringify(bad));
  }
  assert.deepEqual(readCatalogue(null), []);
  assert.deepEqual(readCatalogue({ episodes: 'no' }), []);
});

test('names, and where the video and its page are', () => {
  const e = { id: 'Mama1950', show: 'Mama', title: "Mama's Bad Day", decade: '1950s', year: 1950, file: 'Mama 1950.mp4' };
  assert.equal(episodeName(e), "Mama: Mama's Bad Day (1950)");
  assert.equal(episodeName({ ...e, year: null }), "Mama: Mama's Bad Day (1950s)");
  assert.equal(videoUrl(e, 'https://p.example/'), 'https://p.example/download/Mama1950/Mama%201950.mp4');
  assert.equal(videoUrl(e, null), `${ARCHIVE}download/Mama1950/Mama%201950.mp4`);
  assert.equal(detailsUrl(e), 'https://archive.org/details/Mama1950');
  // Every episode's video is one the proxy relays (its path matches, and its item is allowed).
  for (const ep of episodes) assert.match(new URL(videoUrl(ep, 'https://p.example/')).pathname, /^\/download\/[A-Za-z0-9._-]+\/[^/]+\.(?:mp4|m4v|webm|ogv)$/i);
  assert.equal(refusal({ collection: ['classic_tv'], licenseurl: 'http://creativecommons.org/publicdomain/mark/1.0/' }), null);
});

test('the proxy: config.js, or ?videoproxy= to try another, or none', () => {
  assert.match(ROOM.videoProxy, /^https:\/\/[a-z0-9.-]+\.workers\.dev\/$/);
  assert.equal(proxyOf('', ROOM.videoProxy), ROOM.videoProxy);
  assert.equal(proxyOf('?videoproxy=http://127.0.0.1:8099', ROOM.videoProxy), 'http://127.0.0.1:8099/');
  assert.equal(proxyOf('?videoproxy=none', ROOM.videoProxy), null);
  assert.equal(proxyOf('?videoproxy=javascript:alert(1)', ROOM.videoProxy), null);
  assert.equal(proxyOf('', null), null);
});

test('clock', () => {
  assert.equal(clock(0), '0:00');
  assert.equal(clock(65.9), '1:05');
  assert.equal(clock(3723), '1:02:03');
  assert.equal(clock(NaN), '0:00');
});

test('captions: WebVTT read, and the cue at a time', () => {
  const vtt = 'WEBVTT\n\n1\n00:01.000 --> 00:03.500\nHello <i>there</i>\n\n2\n00:04.000 --> 00:06.000 align:start\nTwo\nlines &amp; more\n\nNOTE nothing\n\n01:00:00.000 --> 01:00:01.000\nLate\r\n';
  const cues = parseVtt(vtt);
  assert.deepEqual(cues, [
    { start: 1, end: 3.5, text: 'Hello there' },
    { start: 4, end: 6, text: 'Two\nlines & more' },
    { start: 3600, end: 3601, text: 'Late' },
  ]);
  assert.equal(cueAt(cues, 0.5), -1);
  assert.equal(cueAt(cues, 1), 0);
  assert.equal(cueAt(cues, 3.7), -1);
  assert.equal(cueAt(cues, 5, 0), 1);
  assert.equal(cueAt(cues, 5, 1), 1);
  assert.equal(cueAt(cues, 3600.5, 1), 2);
  assert.equal(cueAt(cues, 9999, 2), -1);
  assert.equal(cueAt([], 1), -1);
  assert.ok(existsSync(new URL('catalogue/episodes.json', PUBLIC)));
});
