// The page around the 3D view (not shown in a headset), as outside's and the hallway's. The card is
// the page's <nav>: the room's name, the way back to the hallway as a real link (for keyboards,
// screen readers and browsers without WebGL), its description, what the room is (its four modes,
// modes.js) and what is showing in it (the episode, a link to it on archive.org, how it's going,
// and Play / Pause, Next, Captions and Stop, with every episode on the shelves in a list to choose
// from), what hangs on its walls (each one that leads somewhere a link there, the rest buttons
// that walk up to them), Start / Leave shared session (and, in one, how it's going), and Settings,
// the control panel's choices: motion (common/access.js, for a screen too), how to move and turn in
// VR, the comfort vignette and seated mode. The view is the page's <main>, with a hint on how to
// move, the Wave, Copy invite link, Fullscreen and Enter VR buttons, the dot a gamepad aims with,
// the name of what is pointed at, and short messages, said politely. So everything the room offers
// in 3D is a control here too: the doorway is the link, the room's panel and the bars under the
// screens are the modes and the player's buttons, the tapes and the sets are the episodes, the
// control panel's buttons are Settings, the session's button and Enter VR, and the pieces on the
// walls are On the walls. In a shared session the card also has the visitor's name. On a TV
// (common's tv.js) the remote reaches only the card, so Wave is in it, and there is nothing to copy
// a link to: the invite link is shown to type on another device. Fullscreen and Enter VR are not
// offered there (main.js).
import { DECADES, episodeName } from './catalogue.js';
import { MODES, MODE_NAMES } from './modes.js';

function el(tag, attrs = {}, ...children) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') e.className = v;
    else if (k === 'style') e.style.cssText = v;
    else e.setAttribute(k, v);
  }
  for (const c of children) e.append(c);
  return e;
}

// tv: walking with a remote, and a line for TalkBack, which keeps the arrows (the view is described
// by the hint); tv-card: in the card. The hallway's.
const HINTS = {
  touch: 'Drag to look · tap the floor to walk there · tap a tape to watch it, a seat to sit',
  mouse: 'Drag to look around · WASD or arrows to walk · click the floor to walk there, a tape to watch it',
  gamepad: 'Right stick to look · left stick to walk · A on a tape plays it, on a seat sits',
  tv: 'Arrows: walk and turn · OK: what is in the middle (a tape, a screen, a seat, a panel) · Back: stop, stand up · Menu or hold Back: the room, the episodes and settings\nWith TalkBack: channel up and down walk, rewind and fast-forward turn',
  'tv-card': 'Up, down: from control to control · left, right: a choice · OK: choose · Back: walk again',
};
// With something on the walls (config.js's pieces), each names the pictures too: here beside
// video's tapes and seats.
const PIECE_HINTS = {
  ...HINTS,
  touch: 'Drag to look · tap the floor to walk there · tap a tape to watch it, a seat to sit, or a picture',
  mouse: 'Drag to look around · WASD or arrows to walk · click the floor to walk there, a tape to watch it, or a picture',
  gamepad: 'Right stick to look · left stick to walk · A on a tape plays it, on a seat sits, on a picture goes to it',
  tv: 'Arrows: walk and turn · OK: what is in the middle (a tape, a screen, a seat, a picture, a panel) · Back: stop, stand up · Menu or hold Back: the room, the episodes and settings\nWith TalkBack: channel up and down walk, rewind and fast-forward turn',
};

export class Overlay {
  /**
   * @param {{ title: string, description: string, pieces?: import('./config.js').Piece[] }} room config.js's ROOM
   * @param {{ url: string, label: string, title: string }} way the way back (common/door.js wayBack)
   * @param {object} [o]
   * @param {() => string} [o.href] the address the way back opens now (it carries the shared session)
   * @param {(i: number) => string} [o.pieceHref] the address piece i's link opens now (likewise)
   * @param {(i: number) => void} [o.onLeave] called when a link is followed: the way back's (-1), or piece i's
   * @param {boolean} [o.tv] the TV app's page (common's tv.js tvMode)
   */
  constructor(room, way, { href = () => way.url, pieceHref = () => '#', onLeave = () => {}, tv = false } = {}) {
    this.root = document.getElementById('overlay');
    this.view = document.getElementById('view-overlay');
    this.tv = tv;
    this.href = href;
    this.pieceHref = pieceHref;
    this.back = el('a', { class: 'way-back', href: href(), title: way.title }, way.label);
    this.back.addEventListener('click', () => onLeave(-1));
    /** (i) a piece without a link chosen in On the walls: walk up to it. @type {(i: number) => void} */
    this.onPiece = () => {};
    // What hangs on the walls, with what each is: a link where it leads, else a button.
    /** @type {[number, HTMLAnchorElement][]} */
    this.pieceLinks = [];
    const pieces = room.pieces ?? [];
    this.walls = pieces.length ? el('section', { class: 'walls', 'aria-labelledby': 'walls-heading' },
      el('h2', { id: 'walls-heading' }, 'On the walls'),
      el('ul', {}, ...pieces.map((p, i) => {
        const about = `piece-${p.id}-about`;
        let use;
        if (p.link) {
          use = el('a', { class: 'piece', href: pieceHref(i), 'aria-describedby': about }, p.title);
          use.addEventListener('click', () => onLeave(i));
          this.pieceLinks.push([i, use]);
        } else {
          use = el('button', { class: 'piece', type: 'button', title: 'Walk up to it', 'aria-describedby': about }, p.title);
          use.addEventListener('click', () => this.onPiece(i));
        }
        return el('li', {}, use, el('span', { class: 'about', id: about }, p.description));
      }))) : null;
    this.onSession = () => {};
    /** (key, value) a movement choice for VR: 'move' 'smooth' or 'teleport', 'turn' 'snap' or 'smooth'. @type {(key: string, value: string) => void} */
    this.onNav = () => {};
    /** (change) accessibility settings changed (common/access.js), such as { motion: 'reduce' } or { seated: true }. @type {(change: Partial<import('common/access.js').Access>) => void} */
    this.onAccess = () => {};
    this.onWave = () => {};
    /** (name) when the visitor renames themself; returns the name kept. */
    this.onName = (name) => name;
    /** (mode) a mode of the room chosen (modes.js MODES). @type {(mode: string) => void} */
    this.onMode = () => {};
    /** (action) a button of the player: 'play' (or pause), 'next', 'captions' or 'stop'. @type {(action: string) => void} */
    this.onPlayer = () => {};
    /** (i) an episode chosen from the list (its index in the catalogue). @type {(i: number) => void} */
    this.onEpisode = () => {};
    this.session = el('button', { class: 'chip', type: 'button' }, 'Start shared session');
    this.session.addEventListener('click', () => this.onSession());
    // Wave: a pill at the foot of the view, or on a TV in the card, beside the session's button.
    this.wave = el('button', { class: tv ? 'chip' : 'pill', type: 'button', hidden: '' }, 'Wave');
    this.wave.addEventListener('click', () => this.onWave());
    this.settingsToggle = el('button', { class: 'chip', type: 'button', 'aria-expanded': 'false', 'aria-controls': 'settings' }, 'Settings');
    this.choices = new Map(); // 'move:smooth' → its radio button, 'vignette' → its checkbox
    const choice = (key, legend, options, apply) => el('fieldset', {}, el('legend', {}, legend), ...options.map(([value, label]) => {
      const input = el('input', { type: 'radio', name: key, value });
      input.addEventListener('change', () => {
        if (input.checked) apply(key, value);
      });
      this.choices.set(`${key}:${value}`, input);
      return el('label', {}, input, label);
    }));
    const toggle = (key, label) => {
      const input = el('input', { type: 'checkbox', name: key });
      input.addEventListener('change', () => this.onAccess({ [key]: input.checked }));
      this.choices.set(key, input);
      return el('label', {}, input, label);
    };
    this.settings = el('div', { class: 'settings', id: 'settings', hidden: '' },
      choice('motion', 'Motion', [['system', 'System'], ['reduce', 'Less'], ['full', 'Full']], (key, value) => this.onAccess({ [key]: value })),
      choice('move', 'Move in VR', [['smooth', 'Smooth'], ['teleport', 'Teleport']], (key, value) => this.onNav(key, value)),
      choice('turn', 'Turn in VR', [['snap', 'Snap'], ['smooth', 'Smooth']], (key, value) => this.onNav(key, value)),
      el('fieldset', {}, el('legend', {}, 'In VR'), toggle('vignette', 'Comfort vignette'), toggle('seated', 'Seated mode')));
    this.settingsToggle.addEventListener('click', () => {
      const open = this.settings.hidden;
      this.settings.hidden = !open;
      this.settingsToggle.setAttribute('aria-expanded', String(open));
    });
    // In a shared session: how it's going, the visitor's name in it, and on a TV the invite link.
    this.status = el('p', { class: 'together-status' });
    this.myName = el('input', { class: 'my-name', type: 'text', maxlength: '24', autocomplete: 'off', spellcheck: 'false' });
    this.myName.addEventListener('change', () => {
      this.myName.value = this.onName(this.myName.value);
    });
    this.myName.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.myName.blur();
    });
    this.inviteText = tv ? el('p', { class: 'invite-text' }) : null;
    this.together = el('div', { class: 'together', hidden: '' },
      this.status,
      el('label', { class: 'me' }, el('span', {}, 'Your name'), this.myName),
      ...(this.inviteText ? [this.inviteText] : []));
    // The room's modes, and what is showing: the room panel's and the bars' buttons.
    /** @type {Map<string, HTMLInputElement>} */
    this.modeChoices = new Map();
    this.modes = el('fieldset', { class: 'modes' }, el('legend', {}, 'Room'), ...MODES.map((mode) => {
      const input = el('input', { type: 'radio', name: 'mode', value: mode });
      input.addEventListener('change', () => {
        if (input.checked) this.onMode(mode);
      });
      this.modeChoices.set(mode, input);
      return el('label', {}, input, MODE_NAMES[mode]);
    }));
    this.now = el('p', { class: 'now' });
    this._now = '';
    const action = (name, label, attrs = {}) => {
      const b = el('button', { class: 'chip', type: 'button', ...attrs }, label);
      b.addEventListener('click', () => this.onPlayer(name));
      return b;
    };
    this.play = action('play', 'Play');
    this.next = action('next', 'Next');
    this.captions = action('captions', 'Captions', { 'aria-pressed': 'false' });
    this.stop = action('stop', 'Stop');
    this.episodesToggle = el('button', { class: 'chip', type: 'button', 'aria-expanded': 'false', 'aria-controls': 'episodes' }, 'Episodes');
    this.episodes = el('div', { class: 'episodes', id: 'episodes', hidden: '' });
    this.episodesToggle.addEventListener('click', () => {
      const open = this.episodes.hidden;
      this.episodes.hidden = !open;
      this.episodesToggle.setAttribute('aria-expanded', String(open));
    });
    /** The episodes' buttons, in the catalogue's order. @type {HTMLButtonElement[]} */
    this.episodeButtons = [];
    this.showing = el('section', { class: 'showing', 'aria-label': 'Now showing' },
      this.modes,
      this.now,
      el('div', { class: 'actions' }, this.play, this.next, this.captions, this.stop, this.episodesToggle),
      this.episodes);
    this.card = el('nav', { class: 'card', 'aria-label': room.title },
      el('header', {}, el('h1', { class: 'brand' }, room.title), this.back),
      el('p', { class: 'tagline' }, room.description),
      ...(this.walls ? [this.walls] : []),
      this.inRoom = el('section', { class: 'in-room', 'aria-label': 'In the room' },
        this.showing,
        el('div', { class: 'actions' }, this.session, ...(tv ? [this.wave] : []), this.settingsToggle),
        this.together,
        this.settings));
    this.hint = el('p', { class: 'hint', id: 'hint' });
    this.fullscreen = el('button', { class: 'pill', type: 'button', hidden: '' }, 'Fullscreen');
    this.vr = el('button', { class: 'pill vr', type: 'button', hidden: '' }, 'Enter VR');
    this.invite = el('button', { class: 'pill invite', type: 'button', hidden: '' }, 'Copy invite link');
    this.invite.addEventListener('click', () => this._copyInvite());
    this._inviteLink = '';
    this.buttons = el('div', { class: 'buttons' }, ...(tv ? [] : [this.wave]), this.invite, this.fullscreen, this.vr);
    this.dot = el('div', { class: 'aim', hidden: '', 'aria-hidden': 'true' });
    // What is pointed at, by its name (a tape's episode, a screen, a seat): a mouse's, or the dot's. The card has it all in words.
    this.label = el('div', { class: 'aim-label', hidden: '', 'aria-hidden': 'true' });
    this._label = '';
    this._at = [NaN, NaN];
    this.toasts = el('div', { class: 'toasts', role: 'status', 'aria-live': 'polite' });
    this.root.append(this.card);
    this.view.append(this.hint, this.buttons, this.dot, this.label, this.toasts);
    // The card stops above the buttons, however many rows they wrap to (style.css, --buttons).
    new ResizeObserver(() => {
      document.documentElement.style.setProperty('--buttons', `${this.buttons.offsetHeight}px`);
      this._placeHint();
    }).observe(this.buttons);
    this._how = 'mouse';
    this.pieces = pieces;
    this._hints = pieces.length ? PIECE_HINTS : HINTS;
    this._aimed = -1; // the piece a TV's dot is on (setAimed)
    this._aimShown = false; // the hint shown again for it, to fade when the dot leaves
    addEventListener('resize', () => this._placeHint());
  }

  /** @param {'mouse'|'touch'|'gamepad'|'tv'|'tv-card'} how */
  setHint(how, seconds = 12) {
    this._how = how;
    this._aimShown = false;
    this.hint.classList.remove('gone');
    this.hint.removeAttribute('aria-hidden');
    this.hint.textContent = this._hintText();
    this._placeHint();
    clearTimeout(this._hintTimer);
    if (seconds) this._hintTimer = setTimeout(() => this.hideHint(), seconds * 1000);
  }

  /** The hint's words: on a TV with the dot on a piece, its OK says what OK does there, as music's does on the gramophone. */
  _hintText() {
    const text = this._hints[this._how];
    if (this._how !== 'tv' || this._aimed < 0) return text;
    const p = this.pieces[this._aimed];
    return text.replace(/OK: [^·]*? · /, `OK: ${p.link ? p.title : `walk up to ${p.title}`} · `);
  }

  /**
   * On a TV, walking: the piece the dot is on (its index in config.js's pieces), else -1. The hint
   * says what OK does there ("OK: <its title>" for one with a link), shown again if it had faded,
   * and faded again when the dot leaves.
   */
  setAimed(i) {
    if (i === this._aimed) return;
    this._aimed = i;
    if (this._how !== 'tv') return;
    if (i >= 0) {
      const faded = this._aimShown || this.hint.classList.contains('gone');
      this.setHint('tv');
      this._aimShown = faded;
      return;
    }
    this.hint.textContent = this._hintText();
    this._placeHint();
    if (this._aimShown) {
      clearTimeout(this._hintTimer);
      this.hideHint();
    }
  }

  /**
   * Keeps the hint clear of the buttons at the foot: in the middle where it fits beside them, else
   * in the space beside them (wrapping within it), else above them (a narrow screen). Outside's.
   */
  _placeHint() {
    const s = this.hint.style;
    s.left = s.bottom = s.maxWidth = '';
    let left = Infinity, top = Infinity;
    for (const b of this.buttons.children) {
      if (b.hidden) continue;
      const r = b.getBoundingClientRect();
      left = Math.min(left, r.left);
      top = Math.min(top, r.top);
    }
    const h = this.hint.getBoundingClientRect();
    const gap = 12, margin = 16;
    if (left === Infinity || h.right <= left - gap || h.bottom <= top - 4) return;
    const room = left - gap - margin;
    if (room >= 260) {
      s.left = `${margin + room / 2}px`;
      s.maxWidth = `${room}px`;
    } else s.bottom = `${innerHeight - top + 8}px`;
  }

  /**
   * The hint fades. On a TV it also leaves the reading order, or TalkBack would stop on an empty
   * spot; it stays the view's description (main.js: aria-describedby), which a hidden element
   * named that way still gives.
   */
  hideHint() {
    this.hint.classList.add('gone');
    if (this.tv) this.hint.setAttribute('aria-hidden', 'true');
  }

  /** The room's mode (modes.js), checked in its choices. */
  setMode(mode) {
    for (const [m, input] of this.modeChoices) if (input.checked !== (m === mode)) input.checked = m === mode;
  }

  /** The episodes to choose from (catalogue.js), by decade, as on the shelves. */
  setEpisodes(episodes) {
    this.episodeButtons = [];
    const groups = DECADES.map((decade) => {
      const items = [];
      episodes.forEach((e, i) => {
        if (e.decade !== decade) return;
        const b = el('button', { class: 'episode', type: 'button' }, episodeName(e));
        b.addEventListener('click', () => this.onEpisode(i));
        this.episodeButtons[i] = b;
        items.push(el('li', {}, b));
      });
      return items.length ? el('section', { 'aria-label': decade }, el('h2', { class: 'decade' }, decade), el('ul', {}, ...items)) : null;
    }).filter(Boolean);
    this.episodes.replaceChildren(...groups);
  }

  /**
   * What is showing: the episode (its index, or -1), its name and its page on archive.org, how it
   * is going (status, and the time as "3:12 / 24:00"), whether it plays, and the captions (on or
   * off for every episode: the status says when one has none).
   * @param {{ episode: number, name: string | null, link: string | null, status: string, time: string, playing: boolean, captions: boolean, hasCaptions: boolean, hint: string }} s
   */
  setShowing(s) {
    const key = [s.episode, s.status, s.time, s.hint].join('|');
    if (key !== this._now) {
      this._now = key;
      if (s.name && s.link) {
        const a = el('a', { href: s.link, target: '_blank', rel: 'noopener' }, s.name);
        this.now.replaceChildren(a, ` · ${s.status}${s.time ? ` · ${s.time}` : ''}`);
      } else this.now.replaceChildren(s.hint);
    }
    const play = s.playing ? 'Pause' : 'Play';
    if (this.play.textContent !== play) this.play.textContent = play;
    const pressed = String(s.captions);
    if (this.captions.getAttribute('aria-pressed') !== pressed) this.captions.setAttribute('aria-pressed', pressed);
    if (this.stop.hidden !== s.episode < 0) this.stop.hidden = s.episode < 0;
    this.episodeButtons.forEach((b, i) => {
      const current = i === s.episode ? 'true' : null;
      if (b.getAttribute('aria-current') !== current) {
        if (current) b.setAttribute('aria-current', current);
        else b.removeAttribute('aria-current');
      }
    });
  }

  /** The name of what is pointed at, by the mouse at (x, y) or at the dot (x null), or nothing (''). */
  setLabel(text, x = null, y = null) {
    if (text !== this._label) {
      this._label = text;
      this.label.textContent = text;
      this.label.hidden = !text;
    }
    // Moved only when the pointer has (it is asked every frame).
    if (!text || (x === this._at[0] && y === this._at[1])) return;
    this._at[0] = x;
    this._at[1] = y;
    // Right of the pointer, or left of it in the right part of the view, so it stays on the screen.
    const flip = x !== null && x > innerWidth * 0.55;
    this.label.style.left = x === null ? '50%' : `${Math.round(flip ? x - 14 : x + 18)}px`;
    this.label.style.top = y === null ? 'calc(50% + 22px)' : `${Math.round(y + 20)}px`;
    this.label.classList.toggle('centred', x === null);
    this.label.classList.toggle('flip', flip);
  }

  /** In a shared session (or paused in one, going through the door), or not: its button leaves, or starts one. */
  setSession(on) {
    const label = on ? 'Leave shared session' : 'Start shared session';
    if (this.session.textContent !== label) this.session.textContent = label;
  }

  /** The settings as they are now: the VR movement choices (common/nav.js) and the accessibility settings (common/access.js). */
  setChoices({ move, turn }, { motion, vignette, seated }) {
    const on = new Set([`move:${move}`, `turn:${turn}`, `motion:${motion}`]);
    if (vignette) on.add('vignette');
    if (seated) on.add('seated');
    for (const [id, input] of this.choices) if (input.checked !== on.has(id)) input.checked = on.has(id);
  }

  /**
   * In a shared session (together.js active), or not: how it's going (presence.js statusText), the
   * visitor's name (together.js self), and the Wave button.
   */
  setTogether(active, status = '', self = null) {
    this.wave.hidden = this.together.hidden = !active;
    const text = active ? `Together: ${status}` : '';
    if (this.status.textContent !== text) this.status.textContent = text;
    // Not while it is being typed in.
    if (self && document.activeElement !== this.myName && this.myName.value !== self.name) this.myName.value = self.name;
    this._placeHint();
  }

  /** The shared session's invite link (together.js), or '' when not in one: hides the button. On a TV, the link to type elsewhere. */
  setInvite(link) {
    this._inviteLink = link;
    if (this.inviteText) {
      if (link) this.inviteText.replaceChildren('To join from a phone or a computer, open ', el('span', { class: 'invite-link' }, link.replace(/^https?:\/\//, '')));
      return;
    }
    this.invite.hidden = !link;
    this._placeHint();
  }

  /** Works out the way back's link again, and the pieces' (they carry the shared session's room). */
  refreshLinks() {
    const href = this.href();
    if (this.back.getAttribute('href') !== href) this.back.setAttribute('href', href);
    for (const [i, a] of this.pieceLinks) {
      const h = this.pieceHref(i);
      if (a.getAttribute('href') !== h) a.setAttribute('href', h);
    }
  }

  showVR(onClick) {
    this.vr.hidden = false;
    this._placeHint();
    this.vr.addEventListener('click', onClick);
  }

  /** In VR, or not: the button's words. */
  setVR(on) {
    this.vr.textContent = on ? 'Exit VR' : 'Enter VR';
  }

  async _copyInvite() {
    const link = this._inviteLink;
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      this.toast('Invite link copied: anyone who opens it joins you here');
    } catch {
      prompt('Copy this link to invite others:', link);
    }
  }

  showFullscreen(onClick) {
    this.fullscreen.hidden = false;
    this._placeHint();
    this.fullscreen.addEventListener('click', onClick);
  }

  setFullscreen(on) {
    this.fullscreen.textContent = on ? '✕ Exit fullscreen' : 'Fullscreen';
    this.fullscreen.classList.toggle('on', on);
    this._placeHint();
  }

  /** The dot in the middle of the view that a gamepad aims with; larger and filled on something A would use. */
  setAim(on, hover = false) {
    if (this.dot.hidden !== !on) this.dot.hidden = !on;
    if (this.dot.classList.contains('hover') !== hover) this.dot.classList.toggle('hover', hover);
  }

  toast(text, seconds = 3.5) {
    const t = el('div', { class: 'toast' }, text);
    this.toasts.append(t);
    setTimeout(() => t.remove(), seconds * 1000);
  }

  /** No 3D view: the way back is all there is, and where the pieces lead (the rest are just named). */
  noWebGL(message) {
    this.card.classList.add('alone');
    this.inRoom.remove();
    for (const b of this.walls?.querySelectorAll('button.piece') ?? []) b.replaceWith(el('span', { class: 'piece-title' }, b.textContent));
    this.card.append(el('p', { class: 'no-webgl' }, message));
    this.hint.remove();
  }
}
