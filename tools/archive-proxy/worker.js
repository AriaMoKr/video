// The archive proxy: a Cloudflare Worker that relays the classic TV episodes the room plays from
// archive.org, with the CORS headers archive.org's video servers don't send, so the page may draw
// a video into WebGL (a THREE.VideoTexture on the room's screens, in VR too). Without them a video
// plays only as itself on the page: its frames taint WebGL, and with crossOrigin it doesn't load.
// vrlbry's tools/zim-proxy/worker.js, for video.
//
// GET /download/<item>/<file> with a Range header, as a <video crossorigin> asks: archive.org's
// answer (206, the part), streamed through. Only the video files (.mp4, .webm, .ogv) of items in
// archive.org's classic_tv collection (or one of its decades, classic_tv_1950s and so on) that are
// marked public domain: each item's metadata is read once and the answer kept for a while, and
// anything else is refused, so it relays nothing else and goes nowhere else. The page uses it when
// config.js names it (ROOM.videoProxy, or ?videoproxy=), and plays a video straight from
// archive.org, on the page, when it fails.
//
// Only the pages of the sites in ALLOWED_ORIGINS (wrangler.toml) may use it: a browser names the
// page's origin in every cross-origin request, so another site's page cannot spend this one's
// daily requests (the free plan's 100,000, shared with vrlbry's zim proxy on the same account; a
// viewing is a handful, one per seek). A request without an allowed Origin is refused (403); "*"
// allows any.
//
// Each request is logged as one object (Workers Logs keep its fields searchable; wrangler.toml's
// [observability]): the item and file, where in it the part starts, the page's origin, the
// visitor's continent, the status and the time. Nothing else about the visitor: no address, no
// user agent.
//
// Deploy: `npx wrangler deploy` in this folder (wrangler.toml), with a Cloudflare account.

/** Where the files are: archive.org's download path redirects to the server that holds the item. */
export const ARCHIVE = 'https://archive.org';

/** /download/<item>/<file>: an item's identifier, and a video file at its top. */
const FILE_PATH = /^\/download\/([A-Za-z0-9._-]+)\/([^/]+\.(?:mp4|m4v|webm|ogv))$/i;
const RANGE = /^bytes=(\d+)-(\d*)$/;
/** The collections whose items it relays: classic_tv, and its decades. */
const COLLECTION = /^classic_tv(?:_\d{4}s)?$/;
/** What marks an item public domain on archive.org (its licenseurl): Creative Commons' mark, CC0, or the old dedication. */
const PUBLIC_DOMAIN = /^https?:\/\/creativecommons\.org\/(?:publicdomain\/(?:mark|zero)\/|licenses\/publicdomain\/?)/;

/** How long archive.org may take to start answering. */
const TIMEOUT_MS = 15000;
/** How long an item's verdict is kept: allowed, and refused (it may be fixed on archive.org). */
const ALLOWED_MS = 60 * 60 * 1000;
const REFUSED_MS = 10 * 60 * 1000;
/** The items' verdicts (id → { ok, why, until }), kept while the Worker's isolate lives. */
const ITEMS = new Map();
const ITEMS_MAX = 2048;

const EXPOSE = 'Content-Range, Content-Length, Accept-Ranges, Last-Modified, ETag';
/** What is passed on from archive.org's answer. */
const KEEP = ['content-range', 'content-length', 'content-type', 'last-modified', 'etag', 'accept-ranges', 'cache-control'];

function answer(status, message, headers = {}) {
  return new Response(message ? `${message}\n` : null, { status, headers: { 'content-type': 'text/plain; charset=utf-8', ...headers } });
}

/**
 * The Access-Control-Allow-Origin for a request's Origin: '*' when any is allowed, the origin
 * itself when it is listed, else null. vrlbry's zim proxy's.
 * @param {string|null} origin
 * @param {string} allowed origins separated by commas or spaces ("https://user.github.io"); a
 *   port of `*` matches any port ("http://localhost:*"); "*" alone matches any origin
 */
export function allowOrigin(origin, allowed) {
  const list = String(allowed ?? '').split(/[\s,]+/).filter(Boolean);
  if (list.includes('*')) return '*';
  if (!origin) return null;
  for (const entry of list) {
    if (entry === origin) return origin;
    const m = /^(https?:\/\/[^/:]+):\*$/.exec(entry);
    if (m && (origin === m[1] || (origin.startsWith(`${m[1]}:`) && /^\d+$/.test(origin.slice(m[1].length + 1))))) return origin;
  }
  return null;
}

/**
 * Whether an item's metadata (archive.org's /metadata/<id>/metadata `result`) lets it be relayed:
 * in classic_tv or one of its decades, and marked public domain. Returns null when it may, else why not.
 * @param {{ collection?: string | string[], licenseurl?: string } | null | undefined} md
 */
export function refusal(md) {
  if (!md || typeof md !== 'object') return 'no such item';
  if (![].concat(md.collection ?? []).some((c) => COLLECTION.test(String(c)))) return 'not in classic_tv';
  if (!PUBLIC_DOMAIN.test(String(md.licenseurl ?? ''))) return 'not marked public domain';
  return null;
}

/** The item's verdict, from what is kept or from archive.org: { ok, why }. */
async function verdict(id, { fetchImpl, items, now, timeoutMs }) {
  const t = now();
  const kept = items.get(id);
  if (kept && kept.until > t) return kept;
  const timeout = new AbortController();
  const timer = setTimeout(() => timeout.abort(), timeoutMs);
  let v;
  try {
    const res = await fetchImpl(`${ARCHIVE}/metadata/${id}/metadata`, { signal: timeout.signal, redirect: 'follow' });
    if (!res.ok) return { ok: false, why: `metadata: HTTP ${res.status}`, until: 0 }; // not kept: archive.org's trouble, not the item's
    const why = refusal((await res.json())?.result);
    v = { ok: !why, why, until: t + (why ? REFUSED_MS : ALLOWED_MS) };
  } catch (err) {
    return { ok: false, why: `metadata: ${err.message}`, until: 0 };
  } finally {
    clearTimeout(timer);
  }
  if (items.size >= ITEMS_MAX) items.clear();
  items.set(id, v);
  return v;
}

/**
 * The proxy itself, for the Worker and tests.
 * @param {Request} request
 * @param {{ fetch?: typeof fetch, continent?: string, items?: Map<string, { ok: boolean, why: string|null, until: number }>,
 *   now?: () => number, timeoutMs?: number, origins?: string, log?: (entry: object) => void }} [opts] fetch:
 *   archive.org's (tests); continent: the visitor's; items: the items' verdicts (kept between
 *   requests); origins: the pages allowed (allowOrigin; any by default, the Worker's from
 *   ALLOWED_ORIGINS); log: given one entry per request (the Worker's is console.log; none by default)
 * @returns {Promise<Response>}
 */
export async function handle(request, {
  fetch: fetchImpl = (...a) => globalThis.fetch(...a), continent = /** @type {any} */ (request).cf?.continent, items = ITEMS,
  now = Date.now, timeoutMs = TIMEOUT_MS, origins = '*', log = null,
} = {}) {
  const started = now();
  const url = new URL(request.url);
  // The request's log entry: what was asked, from which page and continent, and how it ended (ms:
  // until the answer began; the part then streams through).
  const entry = { method: request.method, item: null, file: null, from: null, origin: request.headers.get('origin'), continent: continent ?? null };
  const done = (response, fields = {}) => {
    log?.({ ...entry, ...fields, status: response.status, ms: now() - started });
    return response;
  };
  const origin = allowOrigin(entry.origin, origins);
  if (!origin) return done(answer(403, 'this proxy serves the pages of its own sites only'), { refused: 'origin' });
  const CORS = {
    'access-control-allow-origin': origin,
    'access-control-expose-headers': EXPOSE,
    ...(origin === '*' ? {} : { vary: 'Origin' }),
  };
  if (request.method === 'OPTIONS') {
    return done(new Response(null, {
      status: 204,
      headers: { ...CORS, 'access-control-allow-methods': 'GET, HEAD, OPTIONS', 'access-control-allow-headers': 'Range', 'access-control-max-age': '86400' },
    }));
  }
  if (request.method !== 'GET' && request.method !== 'HEAD') return done(answer(405, 'only GET and HEAD', { ...CORS, allow: 'GET, HEAD, OPTIONS' }), { refused: 'method' });
  const m = FILE_PATH.exec(url.pathname);
  if (!m || url.pathname.includes('..')) return done(answer(404, 'only the video files of archive.org\'s classic TV: /download/<item>/<file>.mp4', CORS), { refused: 'path' });
  const [, id, file] = m;
  entry.item = id;
  try {
    entry.file = decodeURIComponent(file);
  } catch {
    return done(answer(404, 'a file name that is not one', CORS), { refused: 'path' });
  }
  const range = request.headers.get('range');
  const r = RANGE.exec(range ?? '');
  if (r) entry.from = Number(r[1]);
  if (request.method === 'GET') {
    if (!r) return done(answer(416, 'a Range header is needed: bytes=<start>- (as a video asks)', CORS), { refused: 'range' });
    if (r[2] && Number(r[2]) < Number(r[1])) return done(answer(416, 'a range that ends before it starts', CORS), { refused: 'range' });
  }
  const v = await verdict(id, { fetchImpl, items, now, timeoutMs });
  if (!v.ok) {
    const status = v.why.startsWith('metadata:') ? 502 : 403;
    return done(answer(status, `${id}: ${v.why}`, CORS), { refused: status === 403 ? 'item' : undefined, why: v.why });
  }
  const timeout = new AbortController();
  const timer = setTimeout(() => timeout.abort(), timeoutMs);
  let res;
  try {
    res = await fetchImpl(`${ARCHIVE}${url.pathname}`, {
      method: request.method,
      headers: range ? { range } : {},
      signal: timeout.signal,
      redirect: 'follow',
    });
  } catch (err) {
    return done(answer(502, `archive.org did not answer (${err.message})`, CORS), { why: err.message });
  } finally {
    clearTimeout(timer);
  }
  // The part (206), or the whole file when archive.org ignored the range (200), or past its end
  // (416, which says how long it is): passed on with its headers. Anything else is said, not relayed.
  if (res.status !== 200 && res.status !== 206 && res.status !== 416) {
    await res.body?.cancel().catch(() => {});
    return done(answer(res.status === 404 ? 404 : 502, `archive.org: HTTP ${res.status}`, CORS), { why: `HTTP ${res.status}` });
  }
  const headers = { ...CORS };
  for (const h of KEEP) {
    const value = res.headers.get(h);
    if (value != null) headers[h] = value;
  }
  return done(new Response(request.method === 'HEAD' || res.status === 416 ? null : res.body, { status: res.status, headers }));
}

export default {
  fetch(request, env) {
    return handle(request, { origins: env?.ALLOWED_ORIGINS ?? '*', log: (entry) => console.log(entry) });
  },
};
