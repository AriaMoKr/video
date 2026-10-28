// The episodes the room shows (public/catalogue/episodes.json, written by tools/catalogue.mjs from
// tools/picks.js), what to call them, where their video is, and their captions. Pure, for the page
// and the tests.

export const DECADES = ['1940s', '1950s', '1960s', '1970s'];
/** archive.org, where the videos are: through the archive proxy (config.js videoProxy), or straight. */
export const ARCHIVE = 'https://archive.org/';

/**
 * @typedef {{ id: string, show: string, title: string, decade: string, year: number | null, file: string,
 *   minutes: number, width: number | null, height: number | null, still: string, captions: string | null }} Episode
 */

/**
 * The episodes in episodes.json that can be shown: those with what the room needs, in its order.
 * @param {unknown} json
 * @returns {Episode[]}
 */
export function readCatalogue(json) {
  const list = /** @type {any} */ (json)?.episodes;
  if (!Array.isArray(list)) return [];
  return list.filter((e) => e && typeof e.id === 'string' && /^[A-Za-z0-9._-]+$/.test(e.id) && typeof e.file === 'string' && /\.(mp4|m4v|webm|ogv)$/i.test(e.file)
    && typeof e.show === 'string' && typeof e.title === 'string' && DECADES.includes(e.decade) && typeof e.still === 'string');
}

/** "Dragnet: The Big Little Jesus (1953)", the year or else the decade. */
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

/** The episode's page on archive.org. */
export function detailsUrl(e) {
  return `${ARCHIVE}details/${e.id}`;
}

/** The proxy's address from ?videoproxy= (for trying it on this machine), else config.js's; null for none. */
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

/** "12:03", or "1:02:03". */
export function clock(seconds) {
  const s = Math.max(0, Math.floor(Number.isFinite(seconds) ? seconds : 0));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60;
  const mm = h ? String(m).padStart(2, '0') : String(m);
  return `${h ? `${h}:` : ''}${mm}:${String(r).padStart(2, '0')}`;
}

/** A WebVTT time: "01:02.500" or "1:01:02.500", in seconds; NaN if it is not one. */
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
