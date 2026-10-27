// The page around the 3D view (not shown in a headset), as outside's and the hallway's. The card is
// the page's <nav>: the room's name, the way back to the hallway as a real link (for keyboards,
// screen readers and browsers without WebGL), its description, Start / Leave shared session (and,
// in one, how it's going), and Settings, the control panel's choices: motion (common/access.js, for
// a screen too), how to move and turn in VR, the comfort vignette and seated mode. The view is the
// page's <main>, with a hint on how to move, the Wave, Copy invite link, Fullscreen and Enter VR
// buttons, the dot a gamepad aims with, and short messages, said politely. So everything the room
// offers in 3D is a control here too: the doorway is the link, the panel's buttons are Settings,
// the session's button and Enter VR. In a shared session the card also has the visitor's name.
// On a TV (common's tv.js) the remote reaches only the card, so Wave is in it, and there is nothing
// to copy a link to: the invite link is shown to type on another device. Fullscreen and Enter VR
// are not offered there (main.js).

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
  touch: 'Drag to look · tap the floor to walk there · tap the doorway to go back',
  mouse: 'Drag to look around · WASD or arrows to walk · click the floor to walk there',
  gamepad: 'Right stick to look · left stick to walk · A on the doorway goes back',
  tv: 'Arrows: walk and turn · OK: the doorway or the panel in the middle · Menu or hold Back: settings and the shared session\nWith TalkBack: channel up and down walk, rewind and fast-forward turn',
  'tv-card': 'Up, down: from control to control · left, right: a choice · OK: choose · Back: walk again',
};

export class Overlay {
  /**
   * @param {{ title: string, description: string }} room config.js's ROOM
   * @param {{ url: string, label: string, title: string }} way the way back (common/door.js wayBack)
   * @param {object} o
   * @param {() => string} o.href the address the way back opens now (it carries the shared session)
   * @param {() => void} o.onLeave called when its link is followed
   * @param {boolean} o.tv the TV app's page (common's tv.js tvMode)
   */
  constructor(room, way, { href = () => way.url, onLeave = () => {}, tv = false } = {}) {
    this.root = document.getElementById('overlay');
    this.view = document.getElementById('view-overlay');
    this.tv = tv;
    this.href = href;
    this.back = el('a', { class: 'way-back', href: href(), title: way.title }, way.label);
    this.back.addEventListener('click', () => onLeave());
    this.onSession = () => {};
    /** (key, value) a movement choice for VR: 'move' 'smooth' or 'teleport', 'turn' 'snap' or 'smooth'. */
    this.onNav = () => {};
    /** (change) accessibility settings changed (common/access.js), such as { motion: 'reduce' } or { seated: true }. */
    this.onAccess = () => {};
    this.onWave = () => {};
    /** (name) when the visitor renames themself; returns the name kept. */
    this.onName = (name) => name;
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
    this.card = el('nav', { class: 'card', 'aria-label': room.title },
      el('header', {}, el('h1', { class: 'brand' }, room.title), this.back),
      el('p', { class: 'tagline' }, room.description),
      this.inRoom = el('section', { class: 'in-room', 'aria-label': 'In the room' },
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
    this.toasts = el('div', { class: 'toasts', role: 'status', 'aria-live': 'polite' });
    this.root.append(this.card);
    this.view.append(this.hint, this.buttons, this.dot, this.toasts);
    // The card stops above the buttons, however many rows they wrap to (style.css, --buttons).
    new ResizeObserver(() => {
      document.documentElement.style.setProperty('--buttons', `${this.buttons.offsetHeight}px`);
      this._placeHint();
    }).observe(this.buttons);
    this._how = 'mouse';
    addEventListener('resize', () => this._placeHint());
  }

  /** @param {'mouse'|'touch'|'gamepad'|'tv'|'tv-card'} how */
  setHint(how, seconds = 12) {
    this._how = how;
    this.hint.classList.remove('gone');
    this.hint.removeAttribute('aria-hidden');
    this.hint.textContent = HINTS[how];
    this._placeHint();
    clearTimeout(this._hintTimer);
    if (seconds) this._hintTimer = setTimeout(() => this.hideHint(), seconds * 1000);
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

  /** Works out the way back's link again (it carries the shared session's room). */
  refreshLinks() {
    const href = this.href();
    if (this.back.getAttribute('href') !== href) this.back.setAttribute('href', href);
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

  /** No 3D view: the way back is all there is. */
  noWebGL(message) {
    this.card.classList.add('alone');
    this.inRoom.remove();
    this.card.append(el('p', { class: 'no-webgl' }, message));
    this.hint.remove();
  }
}
