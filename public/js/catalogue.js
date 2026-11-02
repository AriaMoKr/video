// The episodes the room shows (public/catalogue/episodes.json, written by tools/catalogue.mjs from
// tools/picks.js), what to call them and each kind of them, under what the room shows them, where
// their video is, and their captions. Pure, for the page and the tests.

/** @type {string[]} */
export const DECADES = ['1920s', '1930s', '1940s', '1950s', '1960s', '1970s'];
/** The kinds of video, in their order in each decade on the shelves: television first, the newsreels last. @type {string[]} */
export const KINDS = ['tv', 'silent', 'cartoon', 'film', 'newsreel'];
/**
 * What each kind is called: one of them (on its tape), and all of them (over them in the card's list
 * and on their shelves' sign).
 * @type {Record<string, [one: string, all: string]>}
 */
export const KIND_NAMES = {
  tv: ['TV', 'Television'],
  silent: ['Silent film', 'Silent films'],
  cartoon: ['Cartoon', 'Cartoons'],
  film: ['Short film', 'Short films'],
  newsreel: ['Newsreel', 'Newsreels'],
};
/** An eight-pointed star round (8, 8), for the cartoons. */
const STAR = `M${Array.from({ length: 16 }, (_, k) => {
  const a = (k / 16) * Math.PI * 2 - Math.PI / 2, r = k % 2 ? 3.2 : 6.6;
  return `${(8 + r * Math.cos(a)).toFixed(1)} ${(8 + r * Math.sin(a)).toFixed(1)}`;
}).join('L')}Z`;
/**
 * Each kind's icon, drawn as its tapes are (covers.js): an SVG path on a 16 × 16 grid, stroked 1.5
 * wide with round ends (a dot is a stroke .01 long), beside its name in the card's list
 * (overlay.js) and either side of it on its shelves' sign (covers.js SignAtlas).
 * @type {Record<string, string>}
 */
export const KIND_ICONS = {
  // A set: its cabinet, its glass, its aerial and two knobs.
  tv: 'M3.5 4.5h9a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2h-9a2 2 0 0 1-2-2v-6a2 2 0 0 1 2-2zM4.5 6.5h5a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1h-5a1 1 0 0 1-1-1v-4a1 1 0 0 1 1-1zM5 1.5l3 3 3-3M12.5 8v.01M12.5 11v.01',
  // An intertitle's frame round an oval.
  silent: 'M2.5 2.5h11a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1h-11a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1zM4 8a4 3 0 1 0 8 0a4 3 0 1 0-8 0z',
  cartoon: STAR,
  // A frame of film between its sprocket holes.
  film: 'M2.5 2.5h11a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1h-11a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1zM5 5h6v6h-6zM3.25 4.5v.01M3.25 8v.01M3.25 11.5v.01M12.75 4.5v.01M12.75 8v.01M12.75 11.5v.01',
  // A newspaper: its column of lines and its photograph.
  newsreel: 'M2.5 2.5h11v11h-11zM4.5 5h7M4.5 8h3M4.5 10.5h3M9.5 8h2v2.5h-2z',
};
/** archive.org, where the videos are: through the archive proxy (config.js videoProxy), or straight. */
export const ARCHIVE = 'https://archive.org/';
/** What the room says of an episode with no licence: it is public domain in the US (README, "Rights"). */
export const PUBLIC_DOMAIN_US = 'Public domain in the US';
/** A Creative Commons licence's deed, as the catalogue has it: https://creativecommons.org/licenses/<by…>/<version>/, or a country's port of it. */
const CC_DEED = /^https:\/\/creativecommons\.org\/licenses\/(by(?:-nc)?(?:-sa|-nd)?)\/(\d\.\d)\/(?:([a-z]{2})\/)?$/;

/**
 * An episode, as episodes.json has it. `licence` is the Creative Commons licence its owner put it
 * under (its deed's address), and `credit` whom it is by, as the licence asks it be credited; with
 * no licence (null) it is public domain in the US, and nobody need be.
 * @typedef {{ id: string, show: string, title: string, decade: string, kind: string, year: number | null, file: string,
 *   minutes: number, width: number | null, height: number | null, still: string, captions: string | null,
 *   licence: string | null, credit: string | null }} Episode
 */

/**
 * The episodes in episodes.json that can be shown: those with what the room needs, in its order,
 * each of a kind (KINDS: television, if it says none the room knows), and a licence only with whom
 * to credit (none: public domain in the US).
 * @param {unknown} json
 * @returns {Episode[]}
 */
export function readCatalogue(json) {
  const list = /** @type {any} */ (json)?.episodes;
  if (!Array.isArray(list)) return [];
  return list.filter((e) => e && typeof e.id === 'string' && /^[A-Za-z0-9._-]+$/.test(e.id) && typeof e.file === 'string' && /\.(mp4|m4v|webm|ogv)$/i.test(e.file)
    && typeof e.show === 'string' && typeof e.title === 'string' && DECADES.includes(e.decade) && typeof e.still === 'string'
    && (e.licence == null || (licenceName(e.licence) !== null && typeof e.credit === 'string' && e.credit.trim() !== '')))
    .map((e) => ({ ...e, kind: KINDS.includes(e.kind) ? e.kind : 'tv', licence: e.licence ?? null, credit: e.licence ? e.credit : null }));
}

/**
 * A Creative Commons licence's name from its deed's address: "CC BY-NC-ND 4.0", or a country's port
 * "CC BY-SA 3.0 US"; null if it is not one.
 * @param {string | null | undefined} url
 * @returns {string | null}
 */
export function licenceName(url) {
  const m = CC_DEED.exec(String(url ?? ''));
  return m ? `CC ${m[1].toUpperCase()} ${m[2]}${m[3] ? ` ${m[3].toUpperCase()}` : ''}` : null;
}

/**
 * Under what the room shows an episode, in a line: its owner and its licence, as Creative Commons
 * asks a work be credited (with its title and where it is: episodeName, detailsUrl), "© California
 * Academy of Sciences · CC BY-NC-ND 4.0"; else that it is public domain in the US.
 * @param {Pick<Episode, 'licence' | 'credit'>} e
 */
export function rightsLine(e) {
  const name = licenceName(e.licence);
  return name ? `© ${e.credit} · ${name}` : PUBLIC_DOMAIN_US;
}

/**
 * "Dragnet: The Big Little Jesus (1953)", the year or else the decade.
 * @param {Pick<Episode, 'show' | 'title' | 'year' | 'decade'>} e
 */
export function episodeName(e) {
  return `${e.show}: ${e.title} (${e.year ?? e.decade})`;
}

/**
 * Where an episode's video is: through the proxy (its address, ending in '/') when there is one,
 * else archive.org's own, which plays only on the page (no CORS: it taints WebGL).
 * @param {Episode} e
 * @param {string | null} proxy
 */
export function videoUrl(e, proxy) {
  return `${proxy ?? ARCHIVE}download/${e.id}/${encodeURIComponent(e.file)}`;
}

/**
 * The episode's page on archive.org.
 * @param {Pick<Episode, 'id'>} e
 */
export function detailsUrl(e) {
  return `${ARCHIVE}details/${e.id}`;
}

/**
 * The proxy's address from ?videoproxy= (for trying it on this machine), else config.js's; null for none.
 * @param {string} search
 * @param {string | null | undefined} configured
 * @returns {string | null}
 */
export function proxyOf(search, configured) {
  const asked = new URLSearchParams(search).get('videoproxy');
  const p = asked === null ? configured : asked;
  if (!p || p === 'none') return null;
  try {
    const u = new URL(p);
    return /^https?:$/.test(u.protocol) ? u.href.replace(/\/?$/, '/') : null;
  } catch {
    return null;
  }
}

/**
 * "12:03", or "1:02:03".
 * @param {number} seconds
 */
export function clock(seconds) {
  const s = Math.max(0, Math.floor(Number.isFinite(seconds) ? seconds : 0));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60;
  const mm = h ? String(m).padStart(2, '0') : String(m);
  return `${h ? `${h}:` : ''}${mm}:${String(r).padStart(2, '0')}`;
}

/**
 * A WebVTT time: "01:02.500" or "1:01:02.500", in seconds; NaN if it is not one.
 * @param {string} t
 */
function vttTime(t) {
  const m = /^(?:(\d+):)?(\d{2}):(\d{2})\.(\d{3})$/.exec(t.trim());
  return m ? Number(m[1] ?? 0) * 3600 + Number(m[2]) * 60 + Number(m[3]) + Number(m[4]) / 1000 : NaN;
}

/**
 * The cues of a WebVTT file, in order: { start, end, text } (seconds; the text's lines joined with
 * '\n', its tags taken out). Enough for archive.org's speech to text: no styles or positions.
 * @param {string} text
 * @returns {{ start: number, end: number, text: string }[]}
 */
export function parseVtt(text) {
  const cues = [];
  for (const block of String(text).replace(/\r\n?/g, '\n').split(/\n{2,}/)) {
    const lines = block.split('\n');
    const at = lines.findIndex((l) => l.includes('-->'));
    if (at < 0) continue;
    const [a, b] = lines[at].split('-->');
    const start = vttTime(a), end = vttTime(b.trim().split(/\s+/)[0]);
    const words = lines.slice(at + 1).join('\n').replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim();
    if (Number.isFinite(start) && Number.isFinite(end) && end > start && words) cues.push({ start, end, text: words });
  }
  return cues.sort((p, q) => p.start - q.start);
}

/**
 * The cue showing at `time`: its index, or -1. `hint` is the last answer, where the next usually
 * is (it is asked every frame, and allocates nothing).
 * @param {{ start: number, end: number }[]} cues
 * @param {number} time
 */
export function cueAt(cues, time, hint = -1) {
  const n = cues.length;
  if (hint >= 0 && hint < n) {
    const c = cues[hint];
    if (time >= c.start && time < c.end) return hint;
    const next = cues[hint + 1];
    if (next && time >= next.start && time < next.end) return hint + 1;
  }
  let lo = 0, hi = n - 1, found = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (cues[mid].start <= time) {
      found = mid;
      lo = mid + 1;
    } else hi = mid - 1;
  }
  return found >= 0 && time < cues[found].end ? found : -1;
}
