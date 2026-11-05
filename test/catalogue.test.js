// The catalogue (public/catalogue/, from tools/picks.js by tools/catalogue.mjs) and catalogue.js:
// every pick in it with its still and captions, and with why it is free; which of an item's files
// the tool takes, what the page calls them and under what it shows them, where it plays them from,
// and the captions read as the room shows them.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { PICKS } from '../tools/picks.js';
import { ROOM } from '../public/js/config.js';
import { ARCHIVE, DECADES, KINDS, KIND_ICONS, KIND_NAMES, PUBLIC_DOMAIN_US, clock, cueAt, detailsUrl, episodeName, licenceName, parseVtt, proxyOf, readCatalogue, rightsLine, videoUrl } from '../public/js/catalogue.js';
import { LISTED, refusal } from '../tools/archive-proxy/worker.js';
import { chooseFiles, kindsOf, licensing } from '../tools/catalogue.mjs';

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
    assert.equal(json.episodes[i].kind, p.kind ?? 'tv', p.id);
    assert.equal(e.year, p.year ?? null);
    if (p.year) assert.equal(`${Math.floor(p.year / 10) * 10}s`, p.decade, p.id);
    assert.ok(e.minutes > 0, p.id);
    // Each says what it is shown under: no licence (public domain in the US), or its owner's, with whom to credit.
    assert.ok('licence' in json.episodes[i] && 'credit' in json.episodes[i], `${p.id}: run node tools/catalogue.mjs`);
    if (e.licence) assert.ok(licenceName(e.licence) && e.credit, p.id);
    else assert.equal(e.credit, null, p.id);
    if (p.credit) assert.equal(e.credit, p.credit, p.id);
  }
  // Grouped by decade, as the shelves are, and in each decade by kind: its television first, its newsreels last.
  const order = episodes.map((e) => DECADES.indexOf(e.decade) * KINDS.length + KINDS.indexOf(e.kind));
  assert.deepEqual(order, [...order].sort((a, b) => a - b));
  // Every kind named and with its icon (an SVG path on a 16 × 16 grid), and those the room shows each in it.
  assert.deepEqual(Object.keys(KIND_NAMES), KINDS);
  assert.deepEqual(Object.keys(KIND_ICONS), KINDS);
  for (const kind of KINDS) {
    assert.match(KIND_ICONS[kind], /^M[\d. MLHVACZmlhvacz-]+$/, kind);
    for (const n of KIND_ICONS[kind].match(/\d+(\.\d+)?/g)) assert.ok(Number(n) <= 16, `${kind}: ${n} on its 16 × 16 grid`);
  }
  assert.deepEqual(KINDS.filter((k) => episodes.some((e) => e.kind === k)), KINDS);
});

test('every pick has its check, as the top of tools/picks.js says, or the reason the proxy lists it for', () => {
  const ROMAN = { M: 1000, D: 500, C: 100, L: 50, X: 10, V: 5, I: 1 };
  const roman = (s) => [...s].reduce((n, c, i) => n + (ROMAN[c] < (ROMAN[s[i + 1]] ?? 0) ? -ROMAN[c] : ROMAN[c]), 0);
  assert.equal(roman('MCMLXIII'), 1963);
  const entry = new Map(json.episodes.map((e) => [e.id, e]));
  for (const p of PICKS) {
    if (LISTED.has(p.id)) {
      assert.equal(p.check, undefined, `${p.id}: the proxy's reason for listing it is its check`);
      continue;
    }
    assert.ok(typeof p.check === 'string' && p.check.trim().length >= 20, `${p.id}: no check`);
    // Its owner's licence; Universal's gift; a Prelinger Archives copy; a film of the government's;
    // else a show's notice and the renewal search, or that it has none and how it was published:
    // sold to stations, in syndication, a network's broadcast being no publication.
    if (entry.get(p.id)?.licence) assert.match(p.check, /licence/, p.id);
    else if (p.kind === 'newsreel') assert.match(p.check, /^Universal's.*1976/, p.id);
    else if (p.kind === 'film') assert.match(p.check, /^A Prelinger Archives copy/, p.id);
    else if (/^No notice/.test(p.check)) assert.match(p.check, /\bpublished\b[^.]*\b(?:syndication|sold to stations)\b/i, `${p.id}: no notice, and not how it was published`);
    else if (!/a film of the US government's\.$/.test(p.check)) assert.match(p.check, /renew/, `${p.id}: no renewal search`);
    // A notice from 1964 on was renewed of itself.
    for (const [, y] of p.check.matchAll(/© (M[CDLXVI]+|\d{4})\b/g)) assert.ok((/^\d/.test(y) ? Number(y) : roman(y)) < 1964, `${p.id}: © ${y}`);
  }
});

test('each episode has its still and, where it has captions, them; and nothing left over', () => {
  for (const e of episodes) {
    assert.equal(e.still, `catalogue/stills/${e.id}.jpg`);
    const jpg = readFileSync(new URL(e.still, PUBLIC));
    assert.ok(jpg[0] === 0xff && jpg[1] === 0xd8, `${e.id}: a JPEG`);
    if (e.captions) {
      // Four a minute at least, as long as a newsreel or an episode, and words in them: the speech
      // to text can make a cue of "..." over music, or a file of none over a silent film.
      const cues = parseVtt(readFileSync(new URL(e.captions, PUBLIC), 'utf8'));
      assert.ok(cues.length >= 4 * e.minutes, `${e.id}: ${cues.length} cues in ${e.minutes} min`);
      assert.ok(cues.filter((c) => /\p{L}/u.test(c.text)).length >= cues.length * 0.8, `${e.id}: cues without words`);
    }
  }
  const named = new Set(episodes.flatMap((e) => [e.still, e.captions]).filter(Boolean));
  for (const dir of ['stills', 'captions']) {
    for (const f of readdirSync(new URL(`catalogue/${dir}/`, PUBLIC))) assert.ok(named.has(`catalogue/${dir}/${f}`), `${dir}/${f} is not in episodes.json`);
  }
  assert.ok(episodes.filter((e) => e.captions).length >= episodes.length * 0.8, 'most have captions');
});

test("the tool takes an item's video and its captions: its own, its 512Kb copy's, or the Prelinger's older pass", () => {
  const mp4 = { name: 'Film1956.mp4', format: 'h.264', width: '640' };
  const asr = { name: 'Film1956.asr.vtt', format: 'Web Video Text Tracks' };
  const files = [{ name: 'Film1956.mpeg', format: 'MPEG2' }, mp4, { name: 'Film1956_512kb.mp4', format: '512Kb MPEG4' }, { name: 'Film1956.asr.srt', format: 'SubRip' }, asr];
  const take = (more = [], named) => {
    const c = chooseFiles([...files, ...more], named);
    return c && [c.video.name, c.captions?.name ?? null];
  };
  // A Prelinger film's: only the older pass, made from the same video.
  assert.deepEqual(take(), ['Film1956.mp4', 'Film1956.asr.vtt']);
  // Its own speech to text first, then its 512Kb copy's (all a newsreel has), then the older pass.
  assert.deepEqual(take([{ name: 'Film1956.autogenerated.vtt' }, { name: 'Film1956_512kb.autogenerated.vtt' }]), ['Film1956.mp4', 'Film1956.autogenerated.vtt']);
  assert.deepEqual(take([{ name: 'Film1956_512kb.autogenerated.vtt' }]), ['Film1956.mp4', 'Film1956_512kb.autogenerated.vtt']);
  // A video with captions before a bigger one without; a named file has only its own.
  assert.deepEqual(take([{ name: 'Other.mp4', format: 'h.264', width: '1280' }]), ['Film1956.mp4', 'Film1956.asr.vtt']);
  assert.deepEqual(take([{ name: 'Other.mp4', format: 'h.264' }], 'Other.mp4'), ['Other.mp4', null]);
  // The SubRip alone isn't read; and without a video a browser plays, nothing.
  assert.equal(chooseFiles(files.filter((f) => f !== asr))?.captions, null);
  assert.equal(chooseFiles(files.filter((f) => f !== mp4)), null);
});

test('readCatalogue keeps only what the page can show', () => {
  const good = { id: 'a_b-1.c', show: 'S', title: 'T', decade: '1950s', kind: 'newsreel', file: 'x y.mp4', still: 's.jpg' };
  assert.equal(readCatalogue({ episodes: [good] }).length, 1);
  // A kind it doesn't know, or none, is television's.
  assert.equal(readCatalogue({ episodes: [good] })[0].kind, 'newsreel');
  for (const kind of [undefined, 'opera', 7]) assert.equal(readCatalogue({ episodes: [{ ...good, kind }] })[0].kind, 'tv', String(kind));
  for (const bad of [{ id: '../x' }, { id: 'a/b' }, { file: 'x.mkv' }, { decade: '1980s' }, { show: 1 }, { still: null }]) {
    assert.equal(readCatalogue({ episodes: [{ ...good, ...bad }] }).length, 0, JSON.stringify(bad));
  }
  // With no licence it is public domain in the US, and nobody is credited; a licence is kept only
  // with whom to credit, and only one of Creative Commons'.
  assert.deepEqual(['licence', 'credit'].map((k) => readCatalogue({ episodes: [good] })[0][k]), [null, null]);
  assert.equal(readCatalogue({ episodes: [{ ...good, credit: 'Someone' }] })[0].credit, null);
  const deed = 'https://creativecommons.org/licenses/by-nc-nd/4.0/';
  assert.deepEqual(readCatalogue({ episodes: [{ ...good, licence: deed, credit: 'California Academy of Sciences' }] }).map((e) => [e.licence, e.credit]), [[deed, 'California Academy of Sciences']]);
  for (const bad of [{ licence: deed }, { licence: deed, credit: ' ' }, { licence: 'https://example.org/licence', credit: 'X' }, { licence: 'http://creativecommons.org/licenses/by/4.0/', credit: 'X' }]) {
    assert.equal(readCatalogue({ episodes: [{ ...good, ...bad }] }).length, 0, JSON.stringify(bad));
  }
  assert.deepEqual(readCatalogue(null), []);
  assert.deepEqual(readCatalogue({ episodes: 'no' }), []);
});

test('names, and where the video and its page are', () => {
  const e = { id: 'Bonanza_pd', show: 'Bonanza', title: 'San Francisco', decade: '1960s', year: 1960, file: 'Bonanza s01e28.mp4' };
  assert.equal(episodeName(e), 'Bonanza: San Francisco (1960)');
  assert.equal(episodeName({ ...e, year: null }), 'Bonanza: San Francisco (1960s)');
  assert.equal(videoUrl(e, 'https://p.example/'), 'https://p.example/download/Bonanza_pd/Bonanza%20s01e28.mp4');
  assert.equal(videoUrl(e, null), `${ARCHIVE}download/Bonanza_pd/Bonanza%20s01e28.mp4`);
  assert.equal(detailsUrl(e), 'https://archive.org/details/Bonanza_pd');
  // Every episode's video is one the proxy relays: its path matches, and its item is a pick (whose
  // metadata the tool checked as the proxy does).
  for (const ep of episodes) {
    assert.match(new URL(videoUrl(ep, 'https://p.example/')).pathname, /^\/download\/[A-Za-z0-9._-]+\/[^/]+\.(?:mp4|m4v|webm|ogv)$/i);
    assert.equal(refusal({ identifier: ep.id, collection: ['classic_tv'], licenseurl: 'http://creativecommons.org/publicdomain/mark/1.0/' }), null, ep.id);
  }
});

test('under what each is shown: public domain in the US, or its owner\'s Creative Commons licence and whom to credit', () => {
  // The licence's name from its deed, a country's port too; nothing else is one.
  assert.equal(licenceName('https://creativecommons.org/licenses/by-nc-nd/4.0/'), 'CC BY-NC-ND 4.0');
  assert.equal(licenceName('https://creativecommons.org/licenses/by/2.0/'), 'CC BY 2.0');
  assert.equal(licenceName('https://creativecommons.org/licenses/by-nc-sa/3.0/us/'), 'CC BY-NC-SA 3.0 US');
  for (const no of [null, undefined, '', 'https://creativecommons.org/publicdomain/mark/1.0/', 'https://creativecommons.org/licenses/by-nc-nd/4.0/legalcode', 'https://example.org/licenses/by/4.0/']) {
    assert.equal(licenceName(no), null, String(no));
  }
  assert.equal(rightsLine({ licence: null, credit: null }), PUBLIC_DOMAIN_US);
  assert.equal(rightsLine({ licence: 'https://creativecommons.org/licenses/by-nc-nd/4.0/', credit: 'California Academy of Sciences' }), '© California Academy of Sciences · CC BY-NC-ND 4.0');

  // The tool: what the proxy lets through as public domain is shown as public domain in the US
  // (whatever an uploader marked a film it lists); an owner's film under its licence, with the
  // owner or the pick's credit; anything else is not shown.
  const marked = { identifier: 'TheBigLittleJesus', collection: ['classic_tv'], licenseurl: 'http://creativecommons.org/publicdomain/mark/1.0/' };
  assert.deepEqual(licensing(marked), { licence: null, credit: null });
  assert.deepEqual(licensing({ identifier: [...LISTED.keys()][0], collection: ['opensource_movies'], licenseurl: 'http://creativecommons.org/licenses/by/3.0/' }), { licence: null, credit: null });
  const academy = { identifier: 'rar_sia523_breeding_salmon', collection: ['calacademyvideo', 'americana', 'californiarevealed'], licenseurl: 'http://creativecommons.org/licenses/by-nc-nd/4.0/' };
  assert.deepEqual(licensing(academy), { licence: 'https://creativecommons.org/licenses/by-nc-nd/4.0/', credit: 'California Academy of Sciences' });
  assert.deepEqual(licensing(academy, 'Someone Else'), { licence: 'https://creativecommons.org/licenses/by-nc-nd/4.0/', credit: 'Someone Else' });
  assert.deepEqual(licensing({ ...academy, licenseurl: 'http://creativecommons.org/publicdomain/zero/1.0/' }), { licence: null, credit: null });
  // Every licence the proxy takes from an owner, on a pick, comes out as a deed the page names.
  for (const url of ['http://creativecommons.org/licenses/by-sa/2.0', 'http://creativecommons.org/licenses/by-nc-sa/3.0/us', 'https://creativecommons.org/licenses/by-nd/4.0/']) {
    assert.equal(refusal({ ...academy, identifier: PICKS[0].id, licenseurl: url }), null, url);
    assert.ok(licenceName(licensing({ ...academy, licenseurl: url }).licence), url);
  }
  assert.throws(() => licensing({ ...academy, licenseurl: undefined }), /neither public domain nor/);
  assert.throws(() => licensing({ ...academy, collection: ['opensource_movies'] }), /neither public domain nor/);
  // An owner's films are television or short films.
  assert.deepEqual(kindsOf(academy), ['tv', 'film']);
  assert.deepEqual(kindsOf(marked), ['tv']);
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
