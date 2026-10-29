// The shared session (layersharedsession's together.js) in the room's words: how it is going, for
// the control panel and the card, and what the toasts say when someone joins, comes in, leaves or
// waves. Pure, for the tests.
import { HALLWAY_ID } from 'common/door.js';

/** The app id every site in the session uses (and layersharedsession's test page, which can watch). */
export const APP_ID = 'ariamokr-layersharedsession-test';

/** @type {(n: number, word: string) => string} */
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

/**
 * Where a visitor on another page is: the Hallway, or that page's id (another room's).
 * @param {string} page
 */
export function placeName(page) {
  return page === HALLWAY_ID ? 'the Hallway' : page;
}

/**
 * How the session is doing, in a few words: together.js company() and condition() at once.
 * @param {{ here?: number, nearby?: number, away?: number, connecting?: number }} company
 * @param {{ online?: boolean, loaded: boolean, relays: number, slow: boolean, failed?: number }} condition
 */
export function statusText({ here = 0, nearby = 0, away = 0, connecting = 0 }, { online = true, loaded, relays, slow, failed = 0 }) {
  if (!online) return 'Offline';
  here += nearby;
  if (here || away) {
    const parts = [];
    if (here) parts.push(`${here} here`);
    if (away) parts.push(`${away} elsewhere`);
    return parts.join(' · ');
  }
  if (connecting) return `Connecting to ${plural(connecting, 'visitor')}…`;
  if (!loaded || !relays) return slow ? "Can't reach the relays" : 'Connecting…';
  if (failed) return `Couldn't connect to ${plural(failed, 'visitor')}`;
  return 'Waiting for others';
}

/**
 * A notice from the session as its toast, or '' for none: a visitor said hello (join), came in from
 * another page (arrive), left (leave) or waved (wave).
 * @param {{ kind: string, peer: { name?: string|null, readonly page?: string|null } }} notice
 * @param {string} id this room's page id (config.js ROOM.id)
 */
export function noticeText({ kind, peer }, id) {
  const name = peer.name || 'Someone';
  const here = !peer.page || peer.page === id;
  if (kind === 'join') return here ? `${name} is here` : `${name} is in the session, in ${placeName(peer.page)}`;
  if (kind === 'arrive') return `${name} came in`;
  if (kind === 'leave') return `${name} left the session`;
  if (kind === 'wave') return here ? `${name} waved` : `${name} waved, in ${placeName(peer.page)}`;
  return '';
}
